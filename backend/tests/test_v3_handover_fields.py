"""Regression tests for v3.0.0 — Übergabe-Doku (handover documentation).

Three new device fields, all born out of simon42 thread 92060 ("Updates
einstellen? Ich mag nicht mehr!"), where the recurring advice was: make sure
someone else can take the installation over.

* ``ohne_ha`` / ``ohne_ha_hinweis`` — does the device's basic function survive
  a dead Home Assistant, and what does the successor need to know?
* ``external_url`` — deep link into another system (Paperless-ngx, a manual).

Guards here:
  - the migration adds all three columns to a database created before v3.0.0
    (existing installs must not need a re-import),
  - ``external_url`` is stored absolute, same rule as document links (v2.6.5) —
    a bare host resolves relative to the Ingress path and 401s,
  - ``ohne_ha`` only ever stores the language-neutral ``yes``/``no``, so the
    export cannot print a value the user never picked,
  - the "rueckbau" export preset exists and stays free of purchase data.
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


# --------------------------------------------------------------------------- #
# Tri-state cleaner (no app/DB needed)
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize(
    "raw,expected",
    [
        ("yes", "yes"),
        ("no", "no"),
        ("YES", "yes"),          # case-insensitive
        ("  no  ", "no"),        # trimmed
        ("", None),              # cleared select -> unknown
        (None, None),
        ("ja", None),            # localised label never reaches the DB
        ("maybe", None),
    ],
)
def test_clean_ohne_ha(raw, expected):
    from app.routers.devices import _clean_ohne_ha

    assert _clean_ohne_ha(raw) == expected


# --------------------------------------------------------------------------- #
# Migration of a pre-v3.0.0 database
# --------------------------------------------------------------------------- #

def test_migration_adds_handover_columns(tmp_path, monkeypatch):
    """A DB created before v3.0.0 gains the three columns, keeps its rows."""
    from app.config import settings

    db_path = tmp_path / "old.db"
    monkeypatch.setattr(settings, "DB_PATH", db_path)
    monkeypatch.setattr(settings, "PHOTOS_DIR", tmp_path / "photos")

    # v2.6.7-era table: no external_url / ohne_ha / ohne_ha_hinweis.
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            typ TEXT NOT NULL,
            bezeichnung TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            sync_version INTEGER NOT NULL DEFAULT 1
        )
        """
    )
    conn.execute(
        "INSERT INTO devices (uuid, typ, bezeichnung) VALUES ('old-1', 'Sensor', 'Altgerät')"
    )
    conn.commit()
    conn.close()

    from app.database import init_db, get_db

    init_db()

    with get_db() as c:
        cols = {row[1] for row in c.execute("PRAGMA table_info(devices)").fetchall()}
        assert {"external_url", "ohne_ha", "ohne_ha_hinweis"} <= cols
        row = c.execute("SELECT * FROM devices WHERE uuid = 'old-1'").fetchone()
        assert row["bezeichnung"] == "Altgerät"      # untouched
        assert row["ohne_ha"] is None                # unknown, not a default


# --------------------------------------------------------------------------- #
# Round-trip through the API
# --------------------------------------------------------------------------- #

@pytest.fixture
def client(tmp_path, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(settings, "PHOTOS_DIR", tmp_path / "photos")

    # Minimal app — the full app pulls in the PDF exporter (optional dep).
    from fastapi import FastAPI
    from app.database import init_db
    from app.routers import devices

    init_db()
    app = FastAPI()
    app.include_router(devices.router, prefix="/api")
    return TestClient(app)


def test_create_normalizes_external_url_and_tristate(client):
    resp = client.post(
        "/api/devices",
        json={
            "typ": "Sensor",
            "bezeichnung": "Rauchmelder Flur",
            "external_url": "paperless.local/documents/42",
            "ohne_ha": "YES",
            "ohne_ha_hinweis": "Piept autark, Batterie im Gerät",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["external_url"] == "https://paperless.local/documents/42"
    assert body["ohne_ha"] == "yes"
    assert body["ohne_ha_hinweis"] == "Piept autark, Batterie im Gerät"


def test_update_normalizes_and_rejects_unknown_tristate(client):
    created = client.post(
        "/api/devices", json={"typ": "Licht", "bezeichnung": "Hue Küche"}
    ).json()

    resp = client.put(
        f"/api/devices/{created['uuid']}",
        json={"external_url": "www.philips-hue.com/manual", "ohne_ha": "vielleicht"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["external_url"] == "https://www.philips-hue.com/manual"
    assert body["ohne_ha"] is None


def test_handover_fields_are_tracked_in_history(client):
    """Changes must show up in the per-device history like any other field —
    a successor should see when the handover note was last touched."""
    created = client.post(
        "/api/devices", json={"typ": "Schalter", "bezeichnung": "Shelly Bad"}
    ).json()
    client.put(f"/api/devices/{created['uuid']}", json={"ohne_ha": "no"})

    from app.database import get_db

    with get_db() as conn:
        fields = [
            r["field"]
            for r in conn.execute(
                "SELECT field FROM device_history WHERE device_uuid = ?",
                (created["uuid"],),
            ).fetchall()
        ]
    assert "ohne_ha" in fields


# --------------------------------------------------------------------------- #
# Export preset
# --------------------------------------------------------------------------- #

def test_rueckbau_preset_is_handover_shaped():
    from app.routers.export import EXPORT_FIELD_PRESETS

    preset = EXPORT_FIELD_PRESETS["rueckbau"]
    # What the electrician needs: where it sits, how it hangs on the network,
    # and whether ripping it out kills a basic function.
    for field in ("standort_name", "netzwerk", "stromversorgung", "ohne_ha", "ohne_ha_hinweis"):
        assert field in preset
    # What they do not need — and what nobody wants on a sheet left in a hallway.
    for field in ("seriennummer", "anschaffungsdatum", "garantie_bis"):
        assert field not in preset


def test_exporters_know_the_new_fields():
    from app.services.excel_export import FIELD_LABELS, FIELD_WIDTHS
    from app.services.pdf_export import FIELD_LABELS_EN, FIELD_WEIGHTS
    from app.routers.export import EXPORT_FIELD_PRESETS

    # A preset field the exporter does not know is silently dropped
    # (``selected = [f for f in fields if f in FIELD_LABELS]``), which would
    # make the preset look broken rather than fail loudly.
    for field in EXPORT_FIELD_PRESETS["rueckbau"]:
        assert field in FIELD_LABELS, field
        assert field in FIELD_LABELS_EN, field
        assert field in FIELD_WIDTHS, field
        assert field in FIELD_WEIGHTS, field


def test_excel_row_renders_tristate_as_label():
    from app.services.excel_export import _device_to_row

    row = _device_to_row({"ohne_ha": "yes"}, nr=1, fields=["nr", "ohne_ha"])
    assert row == [1, "Ja"]
    assert _device_to_row({"ohne_ha": None}, nr=2, fields=["ohne_ha"]) == [""]
