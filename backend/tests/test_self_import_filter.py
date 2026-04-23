"""Regression tests for the MQTT-self-import filter introduced in v2.5.2.

Pre-v2.5.2 the HA-Importer pulled every device out of HA's registry,
including devices that the Geraeteverwaltung add-on had previously
published to HA via MQTT Discovery. That created a feedback loop:

    inventory row  ->  publish to HA (MQTT)
            ^                  |
            |                  v
     HA-Import re-imports  <-  HA device with
                              identifiers=['geraeteverwaltung_<uuid>']

Each run doubled the inventory count. Forum report (v2.5.0/v2.5.1):
860 -> 1269 -> 1678 -> 2087 devices with 1 integration and 20 locations.
The fix filters any HA device whose identifiers[*][1] begins with
"geraeteverwaltung".
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.ha_import import _is_non_physical_device


def test_self_published_inventory_device_is_filtered():
    dev = {
        "id": "xyz",
        "identifiers": [["mqtt", "geraeteverwaltung_abc123"]],
        "manufacturer": "DerRegner",
    }
    assert _is_non_physical_device(dev, [], "mqtt") is True


def test_self_published_hub_device_is_filtered():
    dev = {
        "id": "hub_id",
        "identifiers": [["mqtt", "geraeteverwaltung_hub"]],
    }
    assert _is_non_physical_device(dev, [], "mqtt") is True


def test_regular_mqtt_device_is_not_filtered_by_identifier():
    """A real MQTT device (e.g. Tasmota) must NOT trip the self-import filter."""
    dev = {
        "id": "tas1",
        "identifiers": [["mqtt", "tasmota_FA12B4"]],
        "manufacturer": "Tasmota",
    }
    # Filter only matches on "geraeteverwaltung" prefix — Tasmota passes through.
    assert _is_non_physical_device(dev, [], "mqtt") is False


def test_flat_string_identifier_is_handled():
    """HA sometimes stores a single-string identifier. The filter must not crash."""
    dev = {
        "id": "xyz",
        "identifiers": ["geraeteverwaltung_uuid_legacy"],
    }
    assert _is_non_physical_device(dev, [], "mqtt") is True


def test_no_identifiers_falls_through():
    dev = {"id": "dev1", "identifiers": []}
    # No self-import marker, no skip-integration, no skip-manufacturer → keep.
    assert _is_non_physical_device(dev, [], "shelly") is False


def test_shelly_with_geraeteverwaltung_in_name_not_filtered():
    """Substring must be at start of second identifier element, not in name."""
    dev = {
        "id": "shelly_1",
        "identifiers": [["shelly", "shelly_abc_for_geraeteverwaltung"]],
        "manufacturer": "Shelly",
        "name": "Shelly for geraeteverwaltung app",
    }
    # "shelly_abc..." doesn't start with "geraeteverwaltung" → passes through.
    assert _is_non_physical_device(dev, [], "shelly") is False
