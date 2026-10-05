"""v3.1.0: die komplette App muss starten (Lifespan inkl. Papierkorb-Schleife).

Hintergrund: In 3.1.0-preview.7 hing der @asynccontextmanager versehentlich an
_trash_retention_loop statt an lifespan -- alle Router-Tests waren gruen, das
Add-on startete trotzdem nicht ("Uvicorn failed to start")."""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def test_full_app_lifespan_starts(tmp_path, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(settings, "PHOTOS_DIR", tmp_path / "photos")
    monkeypatch.setattr(settings, "HA_TOKEN", "")
    monkeypatch.setattr(settings, "MQTT_DISCOVERY_ENABLED", False)

    from app import main

    with TestClient(main.app) as client:  # fuehrt Startup + Shutdown aus
        r = client.get("/api/devices")
        assert r.status_code == 200
