"""v3.1.0: Foto- und Einbauort-Bild-Zaehler in HA bleiben aktuell.

- "Alle Geraete synchronisieren" liefert Zeilen ohne Fotos; die Zaehler
  werden beim Veroeffentlichen nachgeladen.
- Hochladen und Loeschen von Fotos/Einbauort-Bildern veroeffentlicht das
  Geraet neu.
"""

from __future__ import annotations

import asyncio
import io
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture
def env(tmp_path, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(settings, "PHOTOS_DIR", tmp_path / "photos")
    from app.database import init_db

    init_db()
    return settings


def _x(sql, args=()):
    from app.database import get_db

    with get_db() as conn:
        conn.execute(sql, args)


def test_counts_loaded_for_rows_without_photos(env, monkeypatch):
    from app.services import mqtt_discovery as md

    _x("INSERT INTO devices (id, uuid, typ, bezeichnung) VALUES (1, 'd1', 'Sensor', 'Fenster')")
    _x("INSERT INTO photos (uuid, device_id, filename, mime_type) VALUES ('p1', 1, 'a.jpg', 'image/jpeg')")
    _x("INSERT INTO photos (uuid, device_id, filename, mime_type) VALUES ('p2', 1, 'b.jpg', 'image/jpeg')")
    _x("INSERT INTO attachments (uuid, device_id, filename, mime_type) VALUES ('a1', 1, 'att_a.jpg', 'image/jpeg')")

    sent = {}

    class FakeClient:
        def __init__(self, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def publish(self, topic, payload, retain=False):
            sent[topic] = payload

    monkeypatch.setattr(env, "MQTT_DISCOVERY_ENABLED", True)
    monkeypatch.setattr(md.aiomqtt, "Client", FakeClient)

    async def _slug():
        return None

    monkeypatch.setattr(md, "ensure_addon_slug", _slug)
    row = {"id": 1, "uuid": "d1", "typ": "Sensor", "bezeichnung": "Fenster"}  # wie aus SELECT * FROM devices
    assert asyncio.run(md.publish_device(row))
    import json

    state = next(json.loads(v) for k, v in sent.items() if k.endswith("/state"))
    assert state["details"]["fotos"] == 2
    assert state["details"]["einbauort_bilder"] == 1


def test_photo_and_attachment_changes_republish(env, monkeypatch):
    from fastapi import FastAPI
    from app.routers import attachments, photos

    calls = []

    async def _rep(device_id):
        calls.append(device_id)

    monkeypatch.setattr(photos, "republish_device_id", _rep)
    monkeypatch.setattr(attachments, "republish_device_id", _rep)
    _x("INSERT INTO devices (id, uuid, typ, bezeichnung) VALUES (7, 'd7', 'Sensor', 'Tuer')")

    app = FastAPI()
    app.include_router(photos.router, prefix="/api")
    app.include_router(attachments.router, prefix="/api")
    c = TestClient(app)

    r = c.post("/api/devices/d7/photos", files={"file": ("x.png", io.BytesIO(PNG), "image/png")})
    assert r.status_code == 201
    c.delete(f"/api/photos/{r.json()['uuid']}")
    r = c.post("/api/devices/d7/attachments", files={"file": ("y.png", io.BytesIO(PNG), "image/png")})
    assert r.status_code == 201
    c.delete(f"/api/attachments/{r.json()['uuid']}")
    assert calls == [7, 7, 7, 7]
