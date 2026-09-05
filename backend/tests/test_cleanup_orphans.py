"""Verwaiste Spiegel-Eintraege erkennen, ohne Handarbeit zu loeschen.

Hintergrund (Testrunde 05.09.2026): Eine Produktivinstallation zeigte 530
Eintraege bei 314 echten Geraeten. Der aeltere ``cleanup-self-imports`` fand
nichts, weil er die Spiegelbilder an ihrer HA-Kennung erkennt -- und die
Geraete waren aus der HA-Registry laengst verschwunden, nachdem das
Veroeffentlichen abgeschaltet wurde. Zurueck blieben Karteileichen, die kein
Aufraeumer mehr sah.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(settings, "PHOTOS_DIR", tmp_path / "photos")

    from fastapi import FastAPI
    from app.database import init_db
    from app.routers import devices, ha_proxy

    init_db()
    app = FastAPI()
    app.include_router(devices.router, prefix="/api")
    app.include_router(ha_proxy.router, prefix="/api")
    return TestClient(app)


@pytest.fixture
def ha_registry(monkeypatch):
    """HA kennt nur noch 'lebt-noch'."""
    async def fake_registry():
        return [{"id": "ha-lebt", "identifiers": [["mqtt", "irgendwas"]]}]

    import app.services.ha_client as hc
    monkeypatch.setattr(hc, "get_ha_device_registry", fake_registry)
    return fake_registry


def _anlegen(client, bezeichnung, ha_device_id, **felder):
    payload = {"bezeichnung": bezeichnung, "typ": "Sensor", "ha_device_id": ha_device_id}
    payload.update(felder)
    resp = client.post("/api/devices", json=payload)
    assert resp.status_code in (200, 201), resp.text
    return resp.json()["uuid"]


def test_spiegelbild_ohne_handarbeit_gilt_als_sicher(client, ha_registry):
    _anlegen(client, "Lampe Flur", "ha-lebt")
    waise = _anlegen(client, "Lampe Flur", "ha-weg")

    r = client.post("/api/ha/cleanup-orphans", json={"apply": False}).json()
    assert r["sicher_entfernbar"] == 1
    assert r["braucht_bestaetigung"] == 0
    assert r["beispiele_sicher"][0]["uuid"] == waise
    # Ohne apply wird nichts angefasst.
    assert r["entfernt"] == 0
    assert client.get(f"/api/devices/{waise}").status_code == 200


def test_gepflegter_eintrag_braucht_bestaetigung(client, ha_registry):
    _anlegen(client, "Waschmaschine", "ha-lebt")
    gepflegt = _anlegen(client, "Waschmaschine", "ha-weg", anmerkungen="Garantie beim Haendler")

    r = client.post("/api/ha/cleanup-orphans", json={"apply": True}).json()
    assert r["sicher_entfernbar"] == 0
    assert r["braucht_bestaetigung"] == 1
    assert "anmerkungen" in " ".join(r["nachfrage"][0]["gruende"])
    # apply allein darf ihn nicht loeschen.
    assert r["entfernt"] == 0
    assert client.get(f"/api/devices/{gepflegt}").status_code == 200

    # Erst mit ausdruecklicher UUID.
    r2 = client.post(
        "/api/ha/cleanup-orphans", json={"apply": True, "uuids": [gepflegt]}
    ).json()
    assert r2["entfernt"] == 1
    assert client.get(f"/api/devices/{gepflegt}").status_code == 404


def test_waise_ohne_zwilling_bleibt(client, ha_registry):
    """Ein ausgestecktes Geraet ist immer noch ein Geraet."""
    einzelstueck = _anlegen(client, "Alter Drucker", "ha-weg")

    r = client.post("/api/ha/cleanup-orphans", json={"apply": True}).json()
    assert r["bleibt_erhalten"] == 1
    assert r["sicher_entfernbar"] == 0
    assert client.get(f"/api/devices/{einzelstueck}").status_code == 200


def test_apply_verschiebt_in_den_papierkorb(client, ha_registry):
    _anlegen(client, "Steckdose", "ha-lebt")
    waise = _anlegen(client, "Steckdose", "ha-weg")

    r = client.post("/api/ha/cleanup-orphans", json={"apply": True}).json()
    assert r["entfernt"] == 1
    assert client.get(f"/api/devices/{waise}").status_code == 404
    # Weich geloescht: im Papierkorb wiederfindbar.
    trash = client.get("/api/devices/trash/list").json()
    eintraege = trash.get("items") if isinstance(trash, dict) else trash
    uuids = [d["uuid"] for d in eintraege]
    assert waise in uuids
