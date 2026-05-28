"""Regression tests for v2.6.6 — two forum-reported issues (simon42 #84).

1. Papierkorb "endgültig löschen" bulk action
   ``POST /devices/trash/purge`` permanently deletes several already-trashed
   devices in one call (selecting all + purge = empty the trash). Before this
   the UI only had a per-row purge button, so emptying the trash meant clicking
   every single row.

   Guards:
     - only rows that are actually in the trash are removed; a live device whose
       UUID is passed must survive (no accidental wipe of active inventory).
     - child rows (photos/documents/attachments) go too — their foreign keys
       have no ON DELETE CASCADE, so the purge must delete them first or the
       device delete fails under ``foreign_keys=ON``.

2. Bare-host links 401 inside the HA Ingress iframe
   A link entered as ``heise.de`` was stored verbatim and rendered as a
   *relative* href, which resolves into the add-on path and returns 401.
   ``normalize_link_url`` now prepends a scheme so the link is absolute.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


# --------------------------------------------------------------------------- #
# Unit tests for the URL normalizer (no app/DB needed).
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize(
    "raw,expected",
    [
        ("heise.de", "https://heise.de"),
        ("www.heise.de", "https://www.heise.de"),
        ("  heise.de  ", "https://heise.de"),               # trimmed
        ("heise.de/manual.pdf", "https://heise.de/manual.pdf"),
        ("http://heise.de", "http://heise.de"),             # scheme kept
        ("https://heise.de", "https://heise.de"),
        ("HTTPS://Heise.DE", "HTTPS://Heise.DE"),           # case-insensitive
        ("ftp://files.x.de", "ftp://files.x.de"),           # other scheme kept
        ("mailto:info@heise.de", "mailto:info@heise.de"),   # mailto kept
        ("tel:+49123", "tel:+49123"),                       # tel kept
        ("//cdn.heise.de/x", "https://cdn.heise.de/x"),     # protocol-relative
        ("localhost:8123/x", "https://localhost:8123/x"),   # host:port, not scheme
        ("192.168.1.1:8080/p", "https://192.168.1.1:8080/p"),
    ],
)
def test_normalize_link_url(raw, expected):
    from app.routers.documents import normalize_link_url

    assert normalize_link_url(raw) == expected


# --------------------------------------------------------------------------- #
# Functional tests against a throwaway SQLite DB.
# --------------------------------------------------------------------------- #

@pytest.fixture
def client(tmp_path, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(settings, "PHOTOS_DIR", tmp_path / "photos")

    # Build a minimal app with only the routers under test instead of importing
    # app.main — the full app pulls in the PDF export service (optional dep
    # ``fpdf``) which need not be installed to exercise trash/link behaviour.
    from fastapi import FastAPI
    from app.database import init_db
    from app.routers import devices, documents

    init_db()  # creates the schema at the monkeypatched DB_PATH

    app = FastAPI()
    app.include_router(devices.router, prefix="/api")
    app.include_router(documents.router, prefix="/api")
    return TestClient(app)


def _insert_device(uuid: str, *, trashed: bool) -> int:
    """Insert a minimal device row, return its integer id."""
    from app.database import get_db

    deleted = "datetime('now')" if trashed else "NULL"
    with get_db() as conn:
        cur = conn.execute(
            f"INSERT INTO devices (uuid, typ, bezeichnung, deleted_at) "
            f"VALUES (?, 'Sensor', ?, {deleted})",
            (uuid, f"Gerät {uuid}"),
        )
        return cur.lastrowid


def _add_children(device_id: int) -> None:
    from app.database import get_db

    with get_db() as conn:
        conn.execute(
            "INSERT INTO photos (uuid, device_id, filename) VALUES (?, ?, 'p.jpg')",
            (f"ph-{device_id}", device_id),
        )
        conn.execute(
            "INSERT INTO documents (uuid, device_id, filename, mime_type, url) "
            "VALUES (?, ?, 'Link', 'text/uri-list', 'https://x.de')",
            (f"doc-{device_id}", device_id),
        )
        conn.execute(
            "INSERT INTO attachments (uuid, device_id, filename) VALUES (?, ?, 'a.jpg')",
            (f"att-{device_id}", device_id),
        )


def _count(table: str, device_id: int) -> int:
    from app.database import get_db

    with get_db() as conn:
        return conn.execute(
            f"SELECT COUNT(*) AS n FROM {table} WHERE device_id = ?", (device_id,)
        ).fetchone()["n"]


def test_purge_removes_trashed_devices_and_their_children(client):
    t1 = _insert_device("trash-1", trashed=True)
    t2 = _insert_device("trash-2", trashed=True)
    live = _insert_device("live-1", trashed=False)
    for did in (t1, t2, live):
        _add_children(did)

    resp = client.post(
        "/api/devices/trash/purge",
        json={"uuids": ["trash-1", "trash-2", "live-1"]},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body == {"purged": 2, "total": 3}

    from app.database import get_db

    with get_db() as conn:
        rows = {
            r["uuid"]
            for r in conn.execute("SELECT uuid FROM devices").fetchall()
        }
    # Trashed devices gone, live one survives.
    assert rows == {"live-1"}

    # Child rows of the purged devices are gone; the live device keeps its own.
    for table in ("photos", "documents", "attachments"):
        assert _count(table, t1) == 0
        assert _count(table, t2) == 0
        assert _count(table, live) == 1


def test_purge_never_touches_live_devices(client):
    live = _insert_device("only-live", trashed=False)

    resp = client.post(
        "/api/devices/trash/purge", json={"uuids": ["only-live"]}
    )
    assert resp.status_code == 200
    assert resp.json() == {"purged": 0, "total": 1}

    from app.database import get_db

    with get_db() as conn:
        n = conn.execute(
            "SELECT COUNT(*) AS n FROM devices WHERE id = ?", (live,)
        ).fetchone()["n"]
    assert n == 1


def test_purge_empty_body_is_rejected(client):
    resp = client.post("/api/devices/trash/purge", json={"uuids": []})
    assert resp.status_code == 400


def test_add_document_link_normalizes_bare_host(client):
    _insert_device("dev-link", trashed=False)

    resp = client.post(
        "/api/devices/dev-link/documents/link",
        json={"url": "heise.de", "caption": "Handbuch"},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["url"] == "https://heise.de"
