"""Self-Import-Bereinigung: seit 3.1.0 mit Knopf in der Oberflaeche und
Schnappschuss vor dem Verschieben in den Papierkorb."""

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
    from app.routers import ha_proxy
    import app.services.ha_client as ha_client

    async def _registry():
        return [
            {"id": "ha-self", "identifiers": [["mqtt", "geraeteverwaltung_abc"]]},
            {"id": "ha-shelly", "identifiers": [["shelly", "shelly-1"]]},
        ]

    monkeypatch.setattr(ha_client, "get_ha_device_registry", _registry)
    init_db()
    app = FastAPI()
    app.include_router(ha_proxy.router, prefix="/api")
    return TestClient(app)


def _q(sql, args=()):
    from app.database import get_db

    with get_db() as conn:
        return [dict(r) for r in conn.execute(sql, args).fetchall()]


def _x(sql, args=()):
    from app.database import get_db

    with get_db() as conn:
        conn.execute(sql, args)


def test_cleanup_moves_only_self_imports_and_snapshots(client):
    from app.services.snapshots import snapshots_dir

    _x("INSERT INTO devices (uuid, typ, bezeichnung, ha_device_id) VALUES ('self', 'Sonstiges', 'Echo', 'ha-self')")
    _x("INSERT INTO devices (uuid, typ, bezeichnung, ha_device_id) VALUES ('real', 'Aktor/Relais', 'Shelly', 'ha-shelly')")

    r = client.post("/api/ha/cleanup-self-imports")
    assert r.status_code == 200
    assert r.json()["purged"] == 1

    rows = {d["uuid"]: d for d in _q("SELECT uuid, deleted_at FROM devices")}
    assert rows["self"]["deleted_at"] is not None
    assert rows["real"]["deleted_at"] is None
    assert any("cleanup_self_imports" in p.name for p in snapshots_dir().iterdir())


def test_cleanup_without_self_imports_changes_nothing(client):
    from app.services.snapshots import snapshots_dir

    _x("INSERT INTO devices (uuid, typ, bezeichnung, ha_device_id) VALUES ('real', 'Aktor/Relais', 'Shelly', 'ha-shelly')")

    r = client.post("/api/ha/cleanup-self-imports")
    assert r.status_code == 200
    assert r.json()["purged"] == 0
    assert not any("cleanup_self_imports" in p.name for p in snapshots_dir().iterdir())
