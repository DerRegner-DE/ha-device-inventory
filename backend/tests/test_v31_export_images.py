"""GitHub #26: Bildanhang im PDF -- Einbauort-Bilder und Fotos, jedes Bild
einmal (gleicher Inhalt = ein Bild), mit Verweisen B1, B2 ... je Geraet."""

from __future__ import annotations

import io
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def _png(color) -> bytes:
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (1200, 800), color).save(buf, "PNG")
    return buf.getvalue()


@pytest.fixture
def setup(tmp_path, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(settings, "PHOTOS_DIR", tmp_path / "photos")
    from app.database import init_db, get_db

    init_db()
    photos = tmp_path / "photos"
    photos.mkdir(exist_ok=True)
    (photos / "a.png").write_bytes(_png((255, 0, 0)))
    (photos / "a_copy.png").write_bytes(_png((255, 0, 0)))  # gleicher Inhalt
    (photos / "b.png").write_bytes(_png((0, 0, 255)))
    with get_db() as conn:
        conn.execute("INSERT INTO devices (id, uuid, typ, bezeichnung) VALUES (1, 'd1', 'Aktor/Relais', 'Shelly Flur')")
        conn.execute("INSERT INTO devices (id, uuid, typ, bezeichnung) VALUES (2, 'd2', 'Aktor/Relais', 'Shelly Bad')")
        conn.execute("INSERT INTO attachments (uuid, device_id, filename, caption) VALUES ('t1', 1, 'a.png', 'Dose links')")
        conn.execute("INSERT INTO attachments (uuid, device_id, filename, caption) VALUES ('t2', 2, 'a_copy.png', 'Dose links')")
        conn.execute("INSERT INTO photos (uuid, device_id, filename, mime_type, is_primary) VALUES ('p1', 2, 'b.png', 'image/png', 1)")
    return tmp_path


def test_collect_dedupes_and_respects_kinds(setup):
    from app.database import get_db, dicts_from_rows
    from app.services.export_images import collect_images

    with get_db() as conn:
        rows = dicts_from_rows(conn.execute("SELECT * FROM devices ORDER BY id").fetchall())
        refs, appendix = collect_images(conn, rows, ["einbauort"])
        assert [i.label for i in appendix] == ["B1"]
        assert appendix[0].devices == ["Shelly Flur", "Shelly Bad"]
        assert refs == {1: ["B1"], 2: ["B1"]}

        refs, appendix = collect_images(conn, rows, ["einbauort", "fotos"])
        assert [i.label for i in appendix] == ["B1", "B2"]
        assert refs[2] == ["B1", "B2"]

        assert collect_images(conn, rows, []) == ({}, [])


def test_pdf_with_image_appendix(setup):
    from fastapi import FastAPI
    from app.routers import export

    app = FastAPI()
    app.include_router(export.router, prefix="/api")
    client = TestClient(app)

    plain = client.get("/api/export/pdf", params={"fields": "nr,bezeichnung"})
    with_images = client.get("/api/export/pdf", params={"fields": "nr,bezeichnung", "images": "einbauort,fotos,quatsch"})
    assert with_images.status_code == 200
    assert with_images.content.startswith(b"%PDF")
    assert len(with_images.content) > len(plain.content) + 5000
    # Verkleinert eingebettet, nicht als Rohbild: weit unter der Summe der PNGs x 10.
    assert len(with_images.content) < 2_000_000
