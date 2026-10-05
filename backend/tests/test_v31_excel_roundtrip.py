"""v3.1.0: Eigene Excel-Exporte lassen sich wieder einlesen -- Spalten nach
Ueberschrift, beliebige Feldauswahl, gruppiert oder flach."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

DEVICES = [
    {"id": 1, "typ": "Steckdose", "bezeichnung": "Shelly Flur", "hersteller": "Shelly", "integration": "shelly",
     "anschaffungsdatum": "2024-03-01", "garantie_bis": "2026-03-01", "ohne_ha": "yes",
     "ohne_ha_hinweis": "Taster an der Wand", "schalter_gebrueckt": "no", "external_url": "https://x.example/1",
     "mac_adresse": "AA:BB:CC:DD:EE:FF"},
    {"id": 2, "typ": "Sensor", "bezeichnung": "Fenster Bad", "hersteller": "Aqara", "integration": "zha"},
]

FIELDS = ["nr", "typ", "bezeichnung", "hersteller", "integration", "mac_adresse", "anschaffungsdatum",
          "garantie_bis", "ohne_ha", "ohne_ha_hinweis", "schalter_gebrueckt", "external_url"]


@pytest.mark.parametrize("flat", [False, True])
def test_roundtrip(flat):
    from app.services.excel_export import export_devices_to_xlsx
    from app.services.excel_import import parse_xlsx

    data = export_devices_to_xlsx(DEVICES, fields=FIELDS, flat=flat)
    parsed = parse_xlsx(data)
    assert [d["bezeichnung"] for d in parsed] == ["Shelly Flur", "Fenster Bad"] or \
        sorted(d["bezeichnung"] for d in parsed) == ["Fenster Bad", "Shelly Flur"]
    shelly = next(d for d in parsed if d["bezeichnung"] == "Shelly Flur")
    assert shelly["typ"] == "Steckdose"
    assert shelly["integration"] == "shelly"
    assert shelly["mac_adresse"] == "AA:BB:CC:DD:EE:FF"
    assert shelly["anschaffungsdatum"] == "2024-03-01"
    assert shelly["ohne_ha"] == "yes"
    assert shelly["schalter_gebrueckt"] == "no"
    assert shelly["external_url"] == "https://x.example/1"


def test_import_endpoint_append_and_replace(tmp_path, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.config import settings

    monkeypatch.setattr(settings, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(settings, "PHOTOS_DIR", tmp_path / "photos")
    from app.database import get_db, init_db
    from app.routers import import_data
    from app.services.excel_export import export_devices_to_xlsx

    init_db()
    app = FastAPI()
    app.include_router(import_data.router, prefix="/api")
    c = TestClient(app)
    data = export_devices_to_xlsx(DEVICES, fields=FIELDS)
    xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    r = c.post("/api/import/xlsx", files={"file": ("e.xlsx", data, xlsx)})
    assert r.json()["imported"] == 2
    r = c.post("/api/import/xlsx?replace=true", files={"file": ("e.xlsx", data, xlsx)})
    assert r.json()["imported"] == 2
    with get_db() as conn:
        live = conn.execute("SELECT COUNT(*) FROM devices WHERE deleted_at IS NULL").fetchone()[0]
        trashed = conn.execute("SELECT COUNT(*) FROM devices WHERE deleted_at IS NOT NULL").fetchone()[0]
    assert (live, trashed) == (2, 2)
