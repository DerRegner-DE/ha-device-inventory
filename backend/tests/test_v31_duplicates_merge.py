"""Roadmap Nr. 12 + 15: HA-2026.8-Zwillinge beim Import zusammenfassen,
Dubletten anzeigen, manuell zusammenfuehren."""

from __future__ import annotations

import asyncio
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
    from app.routers import devices

    async def _noop(*a, **kw):
        return None

    monkeypatch.setattr(devices, "publish_device", _noop)
    monkeypatch.setattr(devices, "mqtt_remove_device", _noop)
    init_db()
    app = FastAPI()
    app.include_router(devices.router, prefix="/api")
    return TestClient(app)


def _q(sql, args=()):
    from app.database import get_db

    with get_db() as conn:
        return [dict(r) for r in conn.execute(sql, args).fetchall()]


def _x(sql, args=()):
    from app.database import get_db

    with get_db() as conn:
        conn.execute(sql, args)


def test_connection_keys():
    from app.services.merge import connection_keys

    keys = connection_keys({"connections": [["mac", "AA:BB:CC:DD:EE:FF"], ["zigbee", "0x00158d0001a2b3c4"], ["upnp", "x"]]})
    assert keys == {"mac:aabbccddeeff", "ieee:00158d0001a2b3c4"}


def test_merge_moves_everything_and_fills_gaps(client):
    _x("INSERT INTO devices (id, uuid, typ, bezeichnung, ha_device_id, integration, anmerkungen) "
       "VALUES (1, 'keep', 'Aktor/Relais', 'Shelly Flur', 'ha-shelly', 'shelly', 'Hinter Taster')")
    _x("INSERT INTO devices (id, uuid, typ, bezeichnung, ha_device_id, integration, ip_adresse, "
       "seriennummer, anmerkungen) VALUES (2, 'twin', 'Router', 'shelly1pm-ab12', 'ha-fritz', 'fritz', "
       "'192.168.178.50', 'SN-1', 'IP fest vergeben')")
    _x("INSERT INTO devices (id, uuid, typ, bezeichnung, parent_uuid) VALUES (3, 'child', 'Sensor', 'Kanal', 'twin')")
    _x("INSERT INTO photos (uuid, device_id, filename, is_primary) VALUES ('p1', 1, 'a.jpg', 1)")
    _x("INSERT INTO photos (uuid, device_id, filename, is_primary) VALUES ('p2', 2, 'b.jpg', 1)")
    _x("INSERT INTO attachments (uuid, device_id, filename) VALUES ('a1', 2, 'c.jpg')")

    r = client.post("/api/devices/twin/merge", json={"into": "keep"})
    assert r.status_code == 200, r.text
    dev = r.json()["device"]
    assert dev["ip_adresse"] == "192.168.178.50" and dev["seriennummer"] == "SN-1"
    assert dev["integration"] == "shelly", "Ziel behaelt seine Werte"
    assert "Hinter Taster" in dev["anmerkungen"] and "IP fest vergeben" in dev["anmerkungen"]
    assert sorted(p["uuid"] for p in dev["photos"]) == ["p1", "p2"]
    assert [p["uuid"] for p in dev["photos"] if p["is_primary"]] == ["p1"]
    assert _q("SELECT device_id FROM attachments WHERE uuid = 'a1'") == [{"device_id": 1}]
    assert _q("SELECT parent_uuid FROM devices WHERE uuid = 'child'") == [{"parent_uuid": "keep"}]
    assert _q("SELECT device_uuid, ha_device_id FROM device_aliases") == [{"device_uuid": "keep", "ha_device_id": "ha-fritz"}]
    twin = _q("SELECT deleted_at, ha_device_id FROM devices WHERE uuid = 'twin'")[0]
    assert twin["deleted_at"] is not None and twin["ha_device_id"] is None

    assert client.post("/api/devices/keep/merge", json={"into": "keep"}).status_code == 400
    assert client.post("/api/devices/twin/merge", json={"into": "keep"}).status_code == 404


def test_duplicates_list_suggests_controlling_integration(client):
    _x("INSERT INTO devices (uuid, typ, bezeichnung, integration, mac_adresse) VALUES ('f', 'Router', 'ring-doorbell01', 'fritz', 'aa-bb-cc-dd-ee-ff')")
    _x("INSERT INTO devices (uuid, typ, bezeichnung, integration, mac_adresse) VALUES ('r', 'Türklingel', 'Tor', 'ring', 'AA:BB:CC:DD:EE:FF')")
    _x("INSERT INTO devices (uuid, typ, bezeichnung, integration, mac_adresse) VALUES ('x', 'Sensor', 'Allein', 'zha', '11:22:33:44:55:66')")
    groups = client.get("/api/devices/duplicates/list").json()["groups"]
    assert len(groups) == 1
    assert [d["uuid"] for d in groups[0]["devices"]] == ["r", "f"]
    assert groups[0]["mac"] == "AA:BB:CC:DD:EE:FF"


def _registry(monkeypatch, devices, entities):
    from app.services import ha_import

    async def devs():
        return devices

    async def ents():
        return entities

    async def areas():
        return []

    monkeypatch.setattr(ha_import, "get_ha_device_registry", devs)
    monkeypatch.setattr(ha_import, "get_ha_entity_registry", ents)
    monkeypatch.setattr(ha_import, "get_areas", areas)


def test_import_keeps_controlling_entry_and_aliases_the_tracker_twin(client, monkeypatch):
    from app.services.ha_import import import_ha_devices

    mac = [["mac", "ec:64:c9:00:11:22"]]
    devices = [
        # Tracker zuerst in der Registry -- darf trotzdem nicht gewinnen.
        {"id": "ha-fritz", "name": "shellyplus1pm-ab12", "config_entries": ["ce-fritz"],
         "primary_config_entry": "ce-fritz", "connections": mac},
        {"id": "ha-shelly", "name": "Licht Flur", "manufacturer": "Shelly", "model": "Plus 1PM",
         "config_entries": ["ce-shelly"], "primary_config_entry": "ce-shelly", "connections": mac},
        # Gleiche MAC, gleiche Integration: kein Zwilling, beide bleiben.
        {"id": "esp-a", "name": "ESP A", "config_entries": ["ce-esp"], "primary_config_entry": "ce-esp",
         "connections": [["mac", "11:11:11:11:11:11"]]},
        {"id": "esp-b", "name": "ESP B", "config_entries": ["ce-esp"], "primary_config_entry": "ce-esp",
         "connections": [["mac", "11:11:11:11:11:11"]]},
    ]
    entities = [
        {"entity_id": "device_tracker.shelly", "device_id": "ha-fritz", "config_entry_id": "ce-fritz", "platform": "fritz"},
        {"entity_id": "switch.licht_flur", "device_id": "ha-shelly", "config_entry_id": "ce-shelly", "platform": "shelly"},
        {"entity_id": "sensor.esp_a", "device_id": "esp-a", "config_entry_id": "ce-esp", "platform": "esphome"},
        {"entity_id": "sensor.esp_b", "device_id": "esp-b", "config_entry_id": "ce-esp", "platform": "esphome"},
    ]
    _registry(monkeypatch, devices, entities)
    result = asyncio.run(import_ha_devices())
    assert result["aliased_twins"] == 1
    names = sorted(r["bezeichnung"] for r in _q("SELECT bezeichnung FROM devices WHERE deleted_at IS NULL"))
    assert names == ["ESP A", "ESP B", "Licht Flur"]
    alias = _q("SELECT a.ha_device_id, d.bezeichnung FROM device_aliases a JOIN devices d ON d.uuid = a.device_uuid")
    assert alias == [{"ha_device_id": "ha-fritz", "bezeichnung": "Licht Flur"}]

    # Zweiter Import: nichts Neues, Alias wird nicht wieder angelegt.
    result = asyncio.run(import_ha_devices())
    assert result["imported"] == 0 and result["aliased_twins"] == 0
    assert len(_q("SELECT * FROM devices WHERE deleted_at IS NULL")) == 3
