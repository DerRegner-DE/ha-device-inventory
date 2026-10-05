"""v3.1.0: endgueltiges Loeschen raeumt alle Kind-Daten und Dateien weg,
Schnappschuss von Hand."""

from __future__ import annotations

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
    from app.database import init_db
    from app.routers import devices, snapshots

    async def _noop(*a, **kw):
        return None

    monkeypatch.setattr(devices, "publish_device", _noop)
    monkeypatch.setattr(devices, "mqtt_remove_device", _noop)
    init_db()
    app = FastAPI()
    app.include_router(devices.router, prefix="/api")
    app.include_router(snapshots.router, prefix="/api")
    return TestClient(app)


def _x(sql, args=()):
    from app.database import get_db

    with get_db() as conn:
        conn.execute(sql, args)


def _count(sql, args=()):
    from app.database import get_db

    with get_db() as conn:
        return conn.execute(sql, args).fetchone()[0]


def _trashed_device_with_children(uuid: str, dev_id: int):
    from app.config import settings

    photos = settings.PHOTOS_DIR
    docs = photos.parent / "documents"
    photos.mkdir(parents=True, exist_ok=True)
    docs.mkdir(parents=True, exist_ok=True)
    (photos / f"p{dev_id}.jpg").write_bytes(b"x")
    (photos / f"att_a{dev_id}.jpg").write_bytes(b"x")
    (docs / f"d{dev_id}.pdf").write_bytes(b"x")
    _x("INSERT INTO devices (id, uuid, typ, bezeichnung, deleted_at) VALUES (?, ?, 'Sensor', 'Alt', datetime('now'))",
       (dev_id, uuid))
    _x("INSERT INTO photos (uuid, device_id, filename, mime_type) VALUES (?, ?, ?, 'image/jpeg')",
       (f"p{dev_id}", dev_id, f"p{dev_id}.jpg"))
    _x("INSERT INTO attachments (uuid, device_id, filename, mime_type) VALUES (?, ?, ?, 'image/jpeg')",
       (f"a{dev_id}", dev_id, f"att_a{dev_id}.jpg"))
    _x("INSERT INTO documents (uuid, device_id, filename, mime_type, file_size) VALUES (?, ?, 'r.pdf', 'application/pdf', 1)",
       (f"d{dev_id}", dev_id))
    _x("INSERT INTO device_aliases (device_uuid, ha_device_id) VALUES (?, ?)", (uuid, f"ha-{dev_id}"))
    return [photos / f"p{dev_id}.jpg", photos / f"att_a{dev_id}.jpg", docs / f"d{dev_id}.pdf"]


def test_single_hard_delete_with_attachments_and_documents(client):
    files = _trashed_device_with_children("t1", 1)
    r = client.delete("/api/devices/trash/t1")
    assert r.status_code == 204
    assert _count("SELECT COUNT(*) FROM devices") == 0
    for table in ("photos", "attachments", "documents", "device_aliases"):
        assert _count(f"SELECT COUNT(*) FROM {table}") == 0
    assert not any(f.exists() for f in files)


def test_empty_trash_purges_everything(client):
    files = _trashed_device_with_children("t1", 1) + _trashed_device_with_children("t2", 2)
    _x("INSERT INTO devices (id, uuid, typ, bezeichnung) VALUES (3, 'live', 'Sensor', 'Aktiv')")
    r = client.post("/api/devices/trash/purge", json={"uuids": ["t1", "t2", "live"]})
    assert r.json()["purged"] == 2
    assert _count("SELECT COUNT(*) FROM devices") == 1  # aktives Geraet bleibt
    assert not any(f.exists() for f in files)


def test_manual_snapshot(client):
    r = client.post("/api/snapshots")
    assert r.status_code == 201
    listed = client.get("/api/snapshots").json()["snapshots"]
    assert any(s["op"] == "manual" for s in listed)


def test_trash_older_than_30_days_is_purged_with_snapshot(client):
    from app.routers.devices import purge_expired_trash
    from app.services.snapshots import snapshots_dir

    files = _trashed_device_with_children("old", 1)
    _x("UPDATE devices SET deleted_at = datetime('now', '-31 days') WHERE uuid = 'old'")
    _x("INSERT INTO devices (id, uuid, typ, bezeichnung, deleted_at) VALUES (2, 'new', 'Sensor', 'Neu', datetime('now', '-5 days'))")
    _x("INSERT INTO devices (id, uuid, typ, bezeichnung) VALUES (3, 'live', 'Sensor', 'Aktiv')")

    assert purge_expired_trash() == 1
    from app.database import get_db

    with get_db() as conn:
        remaining = {r["uuid"] for r in conn.execute("SELECT uuid FROM devices").fetchall()}
    assert remaining == {"new", "live"}
    assert not any(f.exists() for f in files)
    assert any("trash_expired" in p.name for p in snapshots_dir().iterdir())
    assert purge_expired_trash() == 0
