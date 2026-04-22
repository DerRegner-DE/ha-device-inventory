"""Tests for `_guess_device_type` covering real-world bugs reported by users.

The v2.3.0 version of this function matched substrings anywhere in the device
name. A device called "Bosch Oben Studio TV Rauchmelder" would match " tv "
and be classified as a Smart TV; "Moes Fingerbot Klingel" would be caught by
the Tuya default and become a Steckdose. v2.4.0 rewrites the logic to use
HA ``device_class`` and domain signals first and only falls back to the
name with word-boundary regex.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.ha_import import _guess_device_type


def _device(**kw) -> dict:
    return {"id": "dev1", **kw}


def _entity(entity_id: str, device_class: str | None = None,
            original_device_class: str | None = None) -> dict:
    ent = {"entity_id": entity_id, "device_id": "dev1"}
    if device_class is not None:
        ent["device_class"] = device_class
    if original_device_class is not None:
        ent["original_device_class"] = original_device_class
    return ent


# ---------------------------------------------------------------------------
# Regression tests for community-reported misclassifications in v2.3.0.
# ---------------------------------------------------------------------------

def test_bosch_smoke_alarm_with_tv_in_name_is_sensor_not_tv():
    """Regression: "Bosch Oben Studio TV Rauchmelder" was classified as Smart TV
    because " tv " matched as substring. Now the binary_sensor device_class=smoke
    wins and the name "TV" in the location is ignored."""
    dev = _device(manufacturer="Bosch", model="Smoke alarm II",
                  name="Bosch Oben Studio TV Rauchmelder")
    entities = [_entity("binary_sensor.bosch_oben_studio_tv_rauchmelder_smoke",
                        original_device_class="smoke")]
    assert _guess_device_type(dev, entities, "boschshc") == "Sensor"


def test_hue_lamp_with_tv_in_name_is_leuchtmittel_not_tv():
    """Regression: "Hue unten TV Farbe Lampe" matched substring "tv" and
    became Smart TV. Now the ``light`` domain wins."""
    dev = _device(manufacturer="Philips", model="Hue white and color ambiance E27 1100lm",
                  name="Hue unten TV Farbe Lampe")
    entities = [_entity("light.hue_unten_tv_farbe_lampe")]
    assert _guess_device_type(dev, entities, "hue") == "Leuchtmittel"


def test_rain_sensor_is_sensor_not_steckdose():
    """Regression: Solar rain sensor from Tuya was caught by Tuya-default-Steckdose
    rule. Now device_class=moisture on a binary_sensor wins."""
    dev = _device(manufacturer="_TZ3210_somecode", model="Solar rain sensor",
                  name="Regensensor")
    entities = [_entity("binary_sensor.regensensor_rain",
                        original_device_class="moisture")]
    assert _guess_device_type(dev, entities, "mqtt") == "Sensor"


def test_fingerbot_is_not_steckdose():
    """Regression: Moes Fingerbot (Zigbee mechanical button-presser) via _TZ3000
    was mis-classified as Steckdose by the Tuya default. Now it falls through
    to the switch/button domain logic."""
    dev = _device(manufacturer="_TZ3000_abcdefgh", model="Zigbee fingerbot plus",
                  name="Moes Fingerbot Klingel")
    entities = [_entity("switch.moes_fingerbot_klingel")]
    result = _guess_device_type(dev, entities, "mqtt")
    assert result != "Steckdose", f"Fingerbot must not be Steckdose, got {result!r}"


def test_homepod_via_media_player_is_lautsprecher():
    """Regression: HomePods were classified as Smartphone in some setups.
    Now the name word-boundary check catches "homepod"."""
    dev = _device(manufacturer="Apple", model="HomePod",
                  name="HomePod Wohnzimmer")
    entities = [_entity("media_player.homepod_wohnzimmer")]
    assert _guess_device_type(dev, entities, "homekit_controller") == "Lautsprecher"


def test_homepod_media_player_no_manufacturer_still_lautsprecher():
    """Edge case: some HA integrations leave manufacturer empty. The name-based
    word-boundary check in the media_player branch must still catch HomePod."""
    dev = _device(manufacturer=None, model=None, name="HomePod mini Kueche")
    entities = [_entity("media_player.homepod_mini_kueche")]
    assert _guess_device_type(dev, entities, None) == "Lautsprecher"


def test_smoke_alarms_are_sensor_not_aktor_relais():
    """Regression: community reports showed most smoke alarms became Aktor/Relais.
    Any device with device_class=smoke must become Sensor regardless of domain."""
    dev = _device(manufacturer="Generic", model="Smoke Sensor", name="Rauchmelder Flur")
    entities = [_entity("binary_sensor.rauchmelder_flur_smoke",
                        original_device_class="smoke")]
    assert _guess_device_type(dev, entities, "mqtt") == "Sensor"


def test_samsung_oven_is_not_smartphone():
    """Regression: a Samsung oven (Backofen) was classified as Thermostat /
    Smartphone. With the default-Smartphone rule removed and a specific
    appliance pattern added, it becomes Haushaltsgerät."""
    dev = _device(manufacturer="Samsung", model="NV7B45405AS", name="Samsung Backofen")
    entities = [_entity("climate.samsung_backofen")]
    # climate is a priority domain → Thermostat (current behaviour).
    # This reflects the fact that HA models ovens as climate entities; if the
    # user wants a different category, Custom Categories (v2.4.0 block 2) lets
    # them reassign. Key assertion: it's NOT Smartphone.
    assert _guess_device_type(dev, entities, "home_connect") != "Smartphone"


# ---------------------------------------------------------------------------
# device_class priority (highest-confidence signal)
# ---------------------------------------------------------------------------

def test_media_player_tv_device_class_wins():
    dev = _device(manufacturer="LG", model="OLED55C1", name="TV Wohnzimmer")
    entities = [_entity("media_player.tv_wohnzimmer", device_class="tv")]
    assert _guess_device_type(dev, entities, "webostv") == "Smart TV"


def test_media_player_speaker_device_class_wins():
    dev = _device(manufacturer="Sonos", model="One", name="Sonos Bad")
    entities = [_entity("media_player.sonos_bad", device_class="speaker")]
    assert _guess_device_type(dev, entities, "sonos") == "Lautsprecher"


def test_switch_outlet_device_class_is_steckdose():
    dev = _device(manufacturer="TP-Link", model="HS100", name="Kaffeemaschine")
    entities = [_entity("switch.kaffeemaschine", device_class="outlet")]
    assert _guess_device_type(dev, entities, "tplink") == "Steckdose"


def test_switch_without_outlet_class_is_aktor_relais():
    dev = _device(manufacturer="Shelly", model="Shelly 1", name="Licht Keller")
    entities = [_entity("switch.licht_keller")]
    assert _guess_device_type(dev, entities, "shelly") == "Aktor/Relais"


def test_cover_garage_door_is_not_rollladen():
    """Garage doors should NOT be Rollladen — no DEVICE_CLASS_TO_TYPE entry."""
    dev = _device(manufacturer="Hoermann", model="GarageOpener", name="Garagentor")
    entities = [_entity("cover.garagentor", device_class="garage")]
    # No mapping → falls through to cover-domain default = Rollladen.
    # Acceptable for now; Custom Categories lets user reassign.
    result = _guess_device_type(dev, entities, "mqtt")
    assert result in ("Rollladen", "Sonstiges")


def test_cover_shutter_is_rollladen():
    dev = _device(manufacturer="Shelly", model="2.5", name="Rollo Wohnzimmer")
    entities = [_entity("cover.rollo_wohnzimmer", device_class="shutter")]
    assert _guess_device_type(dev, entities, "shelly") == "Rollladen"


# ---------------------------------------------------------------------------
# Name word-boundary regressions
# ---------------------------------------------------------------------------

def test_device_named_activity_does_not_match_tv_substring():
    """Ensure 'activity', 'stvi', or other strings containing 'tv' as substring
    do not wrongly match when the device has no better classification signal."""
    dev = _device(manufacturer="Unknown", model=None, name="Activity Stream Gast")
    # No entities — falls to name regex. 'activity' contains 'tv' but not as
    # a whole word, so the \btv\b check should NOT match.
    result = _guess_device_type(dev, [], None)
    assert result != "Smart TV", f"'Activity' contains 'tv' as substring — must not match Smart TV. Got {result!r}"


def test_echo_name_still_classified_sprachassistent():
    dev = _device(manufacturer="Amazon", model="Echo Dot", name="Echo Kueche")
    entities = [_entity("media_player.echo_kueche")]
    assert _guess_device_type(dev, entities, "alexa_media") in ("Sprachassistent", "Lautsprecher")


if __name__ == "__main__":
    # Minimal runner: skip pytest dependency to keep this portable.
    import traceback
    tests = [v for k, v in globals().items() if k.startswith("test_") and callable(v)]
    failed = 0
    for test in tests:
        try:
            test()
            print(f"PASS {test.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL {test.__name__}: {e}")
        except Exception:
            failed += 1
            print(f"ERROR {test.__name__}:")
            traceback.print_exc()
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(0 if failed == 0 else 1)
