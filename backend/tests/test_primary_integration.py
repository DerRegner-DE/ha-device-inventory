"""Tests for ``_resolve_primary_integration``.

Regression: v2.5.0 and earlier iterated ``dev.config_entries`` and took the
first matching integration. A Shelly plug on WiFi that the FritzBox also
tracks as a LAN client ended up classified as ``fritz`` (→ network = "LAN")
if the fritz config entry happened to be listed first — which it almost
always was in practice, because the FritzBox integration predates the
Shelly integration in most setups. The result: ~100 WiFi Shellys reported
as "LAN" in the network-filter panel.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.ha_import import _resolve_primary_integration


def test_primary_config_entry_wins():
    dev = {
        "config_entries": ["fritz_ce", "shelly_ce"],
        "primary_config_entry": "shelly_ce",
    }
    domains = {"fritz_ce": "fritz", "shelly_ce": "shelly"}
    assert _resolve_primary_integration(dev, domains) == "shelly"


def test_shelly_wins_over_fritz_without_primary():
    dev = {"config_entries": ["fritz_ce", "shelly_ce"]}
    domains = {"fritz_ce": "fritz", "shelly_ce": "shelly"}
    assert _resolve_primary_integration(dev, domains) == "shelly"


def test_fritz_still_wins_when_its_the_only_integration():
    dev = {"config_entries": ["fritz_ce"]}
    domains = {"fritz_ce": "fritz"}
    assert _resolve_primary_integration(dev, domains) == "fritz"


def test_tuya_wins_over_fritz():
    dev = {"config_entries": ["fritz_ce", "tuya_ce"]}
    domains = {"fritz_ce": "fritz", "tuya_ce": "tuya"}
    assert _resolve_primary_integration(dev, domains) == "tuya"


def test_tasmota_wins_over_unifi():
    dev = {"config_entries": ["unifi_ce", "tasmota_ce"]}
    domains = {"unifi_ce": "unifi", "tasmota_ce": "tasmota"}
    assert _resolve_primary_integration(dev, domains) == "tasmota"


def test_no_config_entries_returns_none():
    assert _resolve_primary_integration({"config_entries": []}, {}) is None


def test_unknown_config_entry_id_is_skipped():
    dev = {"config_entries": ["unknown_ce", "shelly_ce"]}
    domains = {"shelly_ce": "shelly"}
    assert _resolve_primary_integration(dev, domains) == "shelly"


def test_bluetooth_tracker_demoted_for_bluetooth_real_device():
    """A BLE sensor tracked by bluetooth_le_tracker that's also controlled by
    ``switchbot`` should be resolved as switchbot (→ Bluetooth), not
    tracker."""
    dev = {"config_entries": ["ble_tracker_ce", "switchbot_ce"]}
    domains = {"ble_tracker_ce": "bluetooth_le_tracker", "switchbot_ce": "switchbot"}
    assert _resolve_primary_integration(dev, domains) == "switchbot"


def test_primary_points_to_tracker_is_still_honoured():
    """If HA explicitly set a tracker as the primary, we trust HA — the user
    may only have the tracker integration for this device."""
    dev = {
        "config_entries": ["fritz_ce"],
        "primary_config_entry": "fritz_ce",
    }
    domains = {"fritz_ce": "fritz"}
    assert _resolve_primary_integration(dev, domains) == "fritz"
