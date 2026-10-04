"""Roadmap Nr. 11: Foto-Miniatur in der Geraeteliste. ``/photos/{uuid}?thumb=1``
liefert ein kleines JPEG statt des Originals und legt es einmalig ab."""

from __future__ import annotations

import io
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture
def client(tmp_path, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(settings, "PHOTOS_DIR", tmp_path / "photos")

    from fastapi import FastAPI
    from app.database import init_db, get_db
    from app.routers import photos

    init_db()
    with get_db() as conn:
        conn.execute("INSERT INTO devices (uuid, typ, bezeichnung) VALUES ('d1', 'Kamera', 'Cam')")
    app = FastAPI()
    app.include_router(photos.router, prefix="/api")
    return TestClient(app)


def test_thumbnail_is_small_jpeg_and_original_unchanged(client, tmp_path):
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (2000, 1500), (200, 30, 30)).save(buf, "PNG")
    r = client.post("/api/devices/d1/photos",
                    files={"file": ("big.png", buf.getvalue(), "image/png")},
                    data={"is_primary": "true"})
    assert r.status_code == 201, r.text
    uuid = r.json()["uuid"]

    full = client.get(f"/api/photos/{uuid}")
    assert full.headers["content-type"] == "image/png"

    small = client.get(f"/api/photos/{uuid}", params={"thumb": 1})
    assert small.status_code == 200
    assert small.headers["content-type"] == "image/jpeg"
    with Image.open(io.BytesIO(small.content)) as img:
        assert max(img.size) <= 160
    assert len(small.content) < len(full.content)
    assert (tmp_path / "photos" / "thumbs" / f"{uuid}.jpg").exists()
