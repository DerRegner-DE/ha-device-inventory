"""Roadmap Nr. 2 / GitHub #27: Die per MQTT veroeffentlichten Geraete tragen
einen Ruecklink in die App (configuration_url mit homeassistant://)."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def _reset(md):
    md._addon_slug = None
    md._addon_slug_checked = False


def test_no_link_without_supervisor(monkeypatch):
    from app.services import mqtt_discovery as md

    _reset(md)
    monkeypatch.delenv("SUPERVISOR_TOKEN", raising=False)
    monkeypatch.setenv("HOSTNAME", "mein-pc")
    assert asyncio.run(md.ensure_addon_slug()) is None
    assert "configuration_url" not in md._device_info({"uuid": "abc", "bezeichnung": "X"})
    _reset(md)


def test_link_from_container_hostname_when_supervisor_call_fails(monkeypatch):
    import aiohttp
    from app.services import mqtt_discovery as md

    _reset(md)
    monkeypatch.setenv("SUPERVISOR_TOKEN", "x")
    monkeypatch.setenv("HOSTNAME", "a0d7b954-geraeteverwaltung")

    def boom(*a, **kw):
        raise aiohttp.ClientError("supervisor nicht erreichbar")

    monkeypatch.setattr(aiohttp, "ClientSession", boom)
    assert asyncio.run(md.ensure_addon_slug()) == "a0d7b954_geraeteverwaltung"
    info = md._device_info({"uuid": "0123456789abcdef", "bezeichnung": "Cam"})
    assert info["configuration_url"] == (
        "homeassistant://app/a0d7b954_geraeteverwaltung/devices/0123456789abcdef"
    )
    _reset(md)
    # Lokales Preview-Add-on auf der Testbox: Slug enthaelt selbst einen Bindestrich.
    monkeypatch.setenv("HOSTNAME", "local-geraeteverwaltung-preview")
    assert asyncio.run(md.ensure_addon_slug()) == "local_geraeteverwaltung-preview"
    _reset(md)
