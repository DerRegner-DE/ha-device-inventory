"""GitHub #25: Seriennummer und MAC kommen beim HA-Import mit; ein erneuter
Import traegt sie bei Bestandsgeraeten nach, ohne Handeingaben zu
ueberschreiben."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def test_device_identity_normalises_mac():
    from app.services.ha_import import _device_identity

    dev = {"serial_number": " SN123 ", "connections": [["zigbee", "0x00158d0001"], ["mac", "aa-bb-cc-dd-ee-0f"]]}
    assert _device_identity(dev) == ("SN123", "AA:BB:CC:DD:EE:0F")
    assert _device_identity({"connections": [["mac", "kaputt"]]}) == (None, None)
    assert _device_identity({}) == (None, None)


@pytest.fixture
def db(tmp_path, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(settings, "PHOTOS_DIR", tmp_path / "photos")
    from app.database import init_db

    init_db()


def _registry(monkeypatch, devices):
    from app.services import ha_import

    async def devs():
        return devices

    async def ents():
        return [{"entity_id": "camera.cam_garten", "device_id": "cam1",
                 "config_entry_id": "ce1", "platform": "reolink"}]

    async def areas():
        return []

    monkeypatch.setattr(ha_import, "get_ha_device_registry", devs)
    monkeypatch.setattr(ha_import, "get_ha_entity_registry", ents)
    monkeypatch.setattr(ha_import, "get_areas", areas)


def _row(ha_id: str) -> dict:
    from app.database import get_db, dict_from_row

    with get_db() as conn:
        return dict_from_row(conn.execute(
            "SELECT * FROM devices WHERE ha_device_id = ?", (ha_id,)).fetchone())


def test_import_fills_serial_and_mac_and_backfills_existing(db, monkeypatch):
    from app.services.ha_import import import_ha_devices
    from app.database import get_db

    cam = {"id": "cam1", "name": "Cam Garten", "manufacturer": "Reolink", "model": "RLC-810A",
           "config_entries": ["ce1"], "primary_config_entry": "ce1",
           "serial_number": None, "connections": []}
    _registry(monkeypatch, [cam])
    asyncio.run(import_ha_devices())
    assert _row("cam1")["seriennummer"] is None

    # HA kennt die Werte inzwischen; die Seriennummer hat der Nutzer schon von Hand gepflegt.
    with get_db() as conn:
        conn.execute("UPDATE devices SET seriennummer = 'VON HAND' WHERE ha_device_id = 'cam1'")
    cam = {**cam, "serial_number": "HA-SN", "connections": [["mac", "ec:71:db:00:11:22"]]}
    _registry(monkeypatch, [cam])
    result = asyncio.run(import_ha_devices())

    row = _row("cam1")
    assert row["seriennummer"] == "VON HAND"
    assert row["mac_adresse"] == "EC:71:DB:00:11:22"
    assert result["backfilled_identity"] == 1
    assert result["imported"] == 0

    with get_db() as conn:
        hist = conn.execute(
            "SELECT field, new_value FROM device_history WHERE device_uuid = ?", (row["uuid"],)
        ).fetchall()
    assert ("mac_adresse", "EC:71:DB:00:11:22") in [tuple(h) for h in hist]


def test_new_import_carries_serial_and_mac(db, monkeypatch):
    from app.services.ha_import import import_ha_devices

    cam = {"id": "cam1", "name": "Cam Garten", "manufacturer": "Reolink", "model": "RLC-810A",
           "config_entries": ["ce1"], "primary_config_entry": "ce1",
           "serial_number": "192600012345", "connections": [["mac", "ec:71:db:00:11:22"]]}
    _registry(monkeypatch, [cam])
    asyncio.run(import_ha_devices())
    row = _row("cam1")
    assert row["seriennummer"] == "192600012345"
    assert row["mac_adresse"] == "EC:71:DB:00:11:22"
    assert row["typ"] == "Kamera"
