"""Import HA devices into Geräteverwaltung inventory."""

from __future__ import annotations

import logging
import re
from uuid import uuid4
from typing import Any

from app.database import get_db, dicts_from_rows
from app.services.ha_client import get_ha_device_registry, get_ha_entity_registry, get_areas

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Map HA entity domains to device types
# ---------------------------------------------------------------------------
DOMAIN_TO_TYPE = {
    "light": "Leuchtmittel",
    "switch": "Aktor/Relais",
    "cover": "Rollladen",
    "climate": "Thermostat",
    "camera": "Kamera",
    "media_player": "Streaming",
    "sensor": "Sensor",
    "binary_sensor": "Sensor",
    "vacuum": "Mähroboter",
    "lawn_mower": "Mähroboter",
    "lock": "Schloss",
    "fan": "Ventilator",
    "alarm_control_panel": "Alarmanlage",
    "siren": "Alarmanlage",
    "valve": "Bewässerung",
    "water_heater": "Haushaltsgerät",
    "humidifier": "Haushaltsgerät",
    "remote": "Fernbedienung",
    "number": "Sensor",
    "select": "Sensor",
    "button": "Sonstiges",
    "update": "Sonstiges",
    "device_tracker": "Sonstiges",
    "weather": "Sensor",
    "image": "Kamera",
    "event": "Sensor",
    "text": "Sonstiges",
    "todo": "Sonstiges",
    "calendar": "Sonstiges",
    "scene": "Sonstiges",
    "automation": "Sonstiges",
    "script": "Sonstiges",
}

# ---------------------------------------------------------------------------
# Integration → device type (50+ entries)
# ---------------------------------------------------------------------------
INTEGRATION_TYPE_MAP = {
    # Netzwerk
    "fritz": "Router",
    "fritzbox": "Router",
    "unifi": "Router",
    "mikrotik": "Router",
    "netgear": "Router",
    "linksys": "Router",
    "synology_dsm": "Router",
    "speedtest": "Router",
    # Klingeln & Kameras
    "ring": "Türklingel",
    "blink": "Kamera",
    "nest": "Kamera",
    "amcrest": "Kamera",
    "reolink": "Kamera",
    "dahua": "Kamera",
    "onvif": "Kamera",
    "doorbird": "Türklingel",
    "eufy": "Kamera",
    "yi": "Kamera",
    # Sprachassistenten
    "alexa_media": "Sprachassistent",
    "alexa_devices": "Sprachassistent",
    # Licht
    "hue": "Leuchtmittel",
    "tradfri": "Leuchtmittel",
    "yeelight": "Leuchtmittel",
    "wled": "Leuchtmittel",
    "lifx": "Leuchtmittel",
    "nanoleaf": "Leuchtmittel",
    "govee": "Leuchtmittel",
    # Aktoren / Relais / Steckdosen
    "shelly": "Aktor/Relais",
    "tasmota": "Aktor/Relais",
    "tplink": "Steckdose",
    "tuya": "Steckdose",
    "localtuya": "Steckdose",
    "esphome": "Sensor",
    "switchbot": "Aktor/Relais",
    "wemo": "Steckdose",
    "kasa": "Steckdose",
    "meross": "Steckdose",
    # Thermostate & Heizung
    "boschshc": "Thermostat",
    "homematicip_cloud": "Thermostat",
    "tado": "Thermostat",
    "netatmo": "Thermostat",
    "ecobee": "Thermostat",
    "honeywell": "Thermostat",
    "evohome": "Thermostat",
    # Haushaltsgeräte
    "home_connect": "Haushaltsgerät",
    "roomba": "Mähroboter",
    "roborock": "Mähroboter",
    "ecovacs": "Mähroboter",
    "irobot": "Mähroboter",
    "landroid_cloud": "Mähroboter",
    "husqvarna_automower": "Mähroboter",
    # Medien & Streaming
    "dlna_dmr": "Streaming",
    "dlna_dms": "Streaming",
    "playstation_network": "Streaming",
    "xbox": "Streaming",
    "apple_tv": "Streaming",
    "androidtv": "Smart TV",
    "samsungtv": "Smart TV",
    "webostv": "Smart TV",
    "sony_bravia": "Smart TV",
    "philips_tv": "Smart TV",
    "vizio": "Smart TV",
    "plex": "Streaming",
    "kodi": "Streaming",
    "roku": "Streaming",
    "chromecast": "Streaming",
    # Lautsprecher
    "sonos": "Lautsprecher",
    "google_cast": "Lautsprecher",
    "snapcast": "Lautsprecher",
    "squeezebox": "Lautsprecher",
    "bluesound": "Lautsprecher",
    "denon": "Lautsprecher",
    "yamaha": "Lautsprecher",
    "bang_olufsen": "Lautsprecher",
    # Smartphone / Mobile
    "mobile_app": "Smartphone",
    # Drucker
    "ipp": "Drucker",
    # Displays / Dashboards
    "browser_mod": "Display",
    "fully_kiosk": "Display",
    # Gateways & Controller
    "zha": "Controller/Gateway",
    "deconz": "Controller/Gateway",
    "zigbee2mqtt": "Controller/Gateway",
    "zwave_js": "Controller/Gateway",
    "matter": "Controller/Gateway",
    "homekit_controller": "Controller/Gateway",
    # Fernbedienung
    "broadlink": "Fernbedienung",
    "harmony": "Fernbedienung",
    # Sicherheit
    "verisure": "Alarmanlage",
    "arlo": "Kamera",
    # Energie
    "shelly": "Aktor/Relais",
    "fronius": "Sensor",
    "solar_edge": "Sensor",
    "enphase_envoy": "Sensor",
    "tibber": "Sensor",
    # MQTT / generisch – type depends on entities
    "mqtt": None,
    # Sensoren / Wetter
    "openweathermap": "Sensor",
    "met": "Sensor",
    "co2signal": "Sensor",
    "airvisual": "Sensor",
}

# ---------------------------------------------------------------------------
# Manufacturer + Model → device type (more specific)
# Uses (manufacturer_keyword, model_pattern) → type
# ---------------------------------------------------------------------------
MANUFACTURER_MODEL_HINTS: list[tuple[list[str], str | None, str]] = [
    # (manufacturer_keywords, model_regex_or_None, device_type)
    # Sprachassistenten
    (["amazon"], r"echo|alexa", "Sprachassistent"),
    (["amazon"], r"fire.*tv|firetv|fire.*stick", "Streaming"),
    (["amazon"], r"fire.*tablet|kindle", "Tablet"),
    (["amazon"], None, "Sprachassistent"),  # default Amazon
    (["google"], r"home|nest.*hub|nest.*mini|nest.*audio", "Sprachassistent"),
    (["google"], r"chromecast|chrome.*cast", "Streaming"),
    (["google"], r"pixel", "Smartphone"),
    (["google"], None, "Sprachassistent"),  # default Google
    # Apple
    (["apple"], r"apple.*tv|appletv", "Streaming"),
    (["apple"], r"homepod", "Lautsprecher"),
    (["apple"], r"ipad", "Tablet"),
    (["apple"], r"iphone", "Smartphone"),
    (["apple"], r"mac|imac|macbook", "Sonstiges"),
    (["apple"], None, "Streaming"),  # default Apple
    # Samsung – TV vs Smartphone vs appliance. NO default: Samsung makes
    # fridges, ovens, washers, printers, monitors — defaulting to "Smartphone"
    # miscategorises those.
    (["samsung"], r"tv|ue\d|qe\d|qn\d|un\d|frame|serif|sero|neo|crystal|qled|oled", "Smart TV"),
    (["samsung"], r"galaxy|sm-", "Smartphone"),
    (["samsung"], r"tab", "Tablet"),
    (["samsung"], r"wasch|trockn|kühl|gefrier|oven|herd|spül|geschirr", "Haushaltsgerät"),
    # Xiaomi – NO default: Xiaomi covers sensors, vacuums, lights, cameras,
    # air purifiers, kettles, toothbrushes, etc. Previous default "Smartphone"
    # mis-classified everything that didn't match a specific pattern.
    (["xiaomi"], r"tv|mi.*box|stick", "Smart TV"),
    (["xiaomi"], r"vacuum|roborock|dreame", "Mähroboter"),
    (["xiaomi"], r"gateway|hub", "Controller/Gateway"),
    (["xiaomi"], r"lamp|bulb|yeelight|ceiling", "Leuchtmittel"),
    (["xiaomi"], r"plug|socket|power.*strip", "Steckdose"),
    (["xiaomi"], r"sensor|thermo|hygro|door|window|motion|button", "Sensor"),
    (["xiaomi"], r"tab|pad", "Tablet"),
    (["xiaomi"], r"phone|redmi|mi\s?\d", "Smartphone"),
    # Sonos
    (["sonos"], None, "Lautsprecher"),
    # Netzwerk
    (["avm", "fritz"], None, "Router"),
    (["ubiquiti", "unifi"], None, "Router"),
    (["netgear"], None, "Router"),
    (["tp-link", "tplink"], r"deco|archer|router", "Router"),
    (["tp-link", "tplink"], r"tapo.*cam|kasa.*cam", "Kamera"),
    (["tp-link", "tplink"], None, "Steckdose"),
    # Kameras
    (["ring"], None, "Türklingel"),
    (["blink"], None, "Kamera"),
    (["reolink"], None, "Kamera"),
    (["eufy"], r"cam", "Kamera"),
    (["eufy"], r"lock", "Schloss"),
    (["eufy"], None, "Kamera"),
    # Shelly – Aktoren
    (["shelly"], None, "Aktor/Relais"),
    # Drucker
    (["hp", "hewlett"], r"laser|mfp|officejet|deskjet|envy|pagewide", "Drucker"),
    (["canon"], r"pixma|selphy|imageclass", "Drucker"),
    (["epson"], r"et-|xp-|wf-|ecotank|workforce", "Drucker"),
    (["brother"], r"mfc|dcp|hl-", "Drucker"),
    (["hp", "canon", "epson", "brother"], None, "Drucker"),
    # Garten
    (["worx", "landroid"], None, "Mähroboter"),
    (["gardena"], None, "Bewässerung"),
    (["husqvarna"], None, "Mähroboter"),
    # Haushaltsgeräte
    (["siemens"], r"sn\d|wm\d|wt\d|iq\d|oven|herd|kühl|küchen|spül|geschirr|wasch|trockn", "Haushaltsgerät"),
    (["bosch"], r"sms|wan|wgg|hbs|serie|oven|herd|kühl|küchen|spül|geschirr|wasch|trockn", "Haushaltsgerät"),
    (["miele"], None, "Haushaltsgerät"),
    (["lg"], r"tv|oled|nano|55|65|75|43|webos", "Smart TV"),
    (["lg"], r"wasch|trockn|kühl|dishwash", "Haushaltsgerät"),
    (["lg"], None, "Smart TV"),
    # Tuya / generic: NO default category. Tuya covers plugs, sensors,
    # fingerbots, rain sensors, switches, lights, curtains, etc. — a default of
    # "Steckdose" historically mis-categorised >50% of Tuya devices. Let the
    # entity-domain / device_class logic classify these instead.
    # Thermostate
    (["bosch"], r"shc|smart.*home|therm|room.*climate", "Thermostat"),
    (["homematic", "eq-3", "eqiva"], None, "Thermostat"),
    (["tado"], None, "Thermostat"),
    (["netatmo"], r"therm|valve", "Thermostat"),
    (["netatmo"], None, "Sensor"),
    # Ikea
    (["ikea"], None, "Leuchtmittel"),
    # Sony
    (["sony"], r"tv|bravia|xr-|kd-", "Smart TV"),
    (["sony"], r"playstation|ps\d", "Streaming"),
    (["sony"], None, "Smart TV"),
    # Denon / Yamaha
    (["denon", "marantz"], None, "Lautsprecher"),
    (["yamaha"], r"receiver|av|rx-", "Lautsprecher"),
]

# Simple manufacturer fallback (no model check needed)
MANUFACTURER_SIMPLE_HINTS = {
    ("worx", "landroid"): "Mähroboter",
}

# ---------------------------------------------------------------------------
# Network type mapping
# ---------------------------------------------------------------------------
NETWORK_MAP = {
    "zha": "Zigbee",
    "zigbee2mqtt": "Zigbee",
    "deconz": "Zigbee",
    "hue": "Zigbee",
    "tradfri": "Zigbee",
    "zwave_js": "Z-Wave",
    "zwave": "Z-Wave",
    "mqtt": "WLAN",
    "tasmota": "WLAN",
    "esphome": "WLAN",
    "shelly": "WLAN",
    "tplink": "WLAN",
    "kasa": "WLAN",
    "tuya": "WLAN",
    "localtuya": "WLAN",
    "wled": "WLAN",
    "yeelight": "WLAN",
    "meross": "WLAN",
    "switchbot": "Bluetooth",
    "fritz": "LAN",
    "fritzbox": "LAN",
    "unifi": "LAN",
    "synology_dsm": "LAN",
    "mobile_app": "WLAN",
    "bluetooth": "Bluetooth",
    "ble": "Bluetooth",
    "homematicip_cloud": "HomeMatic RF",
    "matter": "Thread/Matter",
    "homekit_controller": "WLAN",
    "homekit": "WLAN",
    "broadlink": "WLAN",
    "sonos": "WLAN",
    "google_cast": "WLAN",
    "apple_tv": "WLAN",
    "samsungtv": "LAN",
    "webostv": "LAN",
    "dlna_dmr": "LAN",
    "ipp": "LAN",
    "ring": "WLAN",
    "blink": "WLAN",
    "nest": "WLAN",
    "ecobee": "WLAN",
    "tado": "WLAN",
}

# ---------------------------------------------------------------------------
# Integrations that passively observe a device on the network (device
# trackers, presence detection, MAC-level routers) instead of actually
# controlling it. A Shelly plug on WiFi often has both a ``shelly`` config
# entry (controls it) and a ``fritz`` config entry (FritzBox sees it as a
# LAN client) — the controlling integration should win when we derive the
# network type, otherwise every WiFi-Shelly ends up as "LAN".
# ---------------------------------------------------------------------------
TRACKER_INTEGRATIONS = {
    "fritz", "fritzbox",
    "unifi", "unifi_direct",
    "asuswrt",
    "mikrotik", "keenetic_ndms2", "tplink_omada",
    "nmap_tracker", "ping",
    "dhcp", "snmp",
    "device_tracker",
    "bluetooth_le_tracker", "bluetooth_tracker",
    "ibeacon", "private_ble_device",
    "huawei_lte",
    "mqtt_room",
}


def _resolve_primary_integration(
    device: dict, config_entry_domains: dict[str, str]
) -> str | None:
    """Pick the primary controlling integration for a device.

    HA 2024.10+ sets ``primary_config_entry`` on the device record — that is
    authoritative. On older versions fall back to scanning ``config_entries``
    but prefer non-tracker integrations, so a Shelly plug with both
    ``shelly`` and ``fritz`` config entries is reported as Shelly (WLAN),
    not as FritzBox (LAN).
    """
    primary = device.get("primary_config_entry")
    if primary and primary in config_entry_domains:
        return config_entry_domains[primary]

    non_tracker: str | None = None
    tracker: str | None = None
    for ce_id in device.get("config_entries", []):
        domain = config_entry_domains.get(ce_id)
        if not domain:
            continue
        if domain in TRACKER_INTEGRATIONS:
            if tracker is None:
                tracker = domain
        else:
            non_tracker = domain
            break

    return non_tracker or tracker


# ---------------------------------------------------------------------------
# Entry types to skip (not physical devices)
# ---------------------------------------------------------------------------
SKIP_ENTRY_TYPES = {"service"}


# ---------------------------------------------------------------------------
# device_class → category mapping. HA device_class is the most authoritative
# signal available (set by the integration itself, not guessed). Tuples of
# (domain, device_class) map to categories. Use None for "any domain".
# ---------------------------------------------------------------------------
DEVICE_CLASS_TO_TYPE: dict[tuple[str | None, str], str] = {
    # media_player device_classes
    ("media_player", "tv"): "Smart TV",
    ("media_player", "speaker"): "Lautsprecher",
    ("media_player", "receiver"): "Lautsprecher",
    # switch device_classes
    ("switch", "outlet"): "Steckdose",
    ("switch", "switch"): "Aktor/Relais",
    # cover device_classes (window covers → Rollladen; garage/gate/door → Sonstiges for now)
    ("cover", "awning"): "Rollladen",
    ("cover", "blind"): "Rollladen",
    ("cover", "curtain"): "Rollladen",
    ("cover", "shade"): "Rollladen",
    ("cover", "shutter"): "Rollladen",
    ("cover", "window"): "Rollladen",
    # Any-domain: these are almost always sensor-like
    (None, "smoke"): "Sensor",
    (None, "gas"): "Sensor",
    (None, "co"): "Sensor",
    (None, "co2"): "Sensor",
    (None, "carbon_dioxide"): "Sensor",
    (None, "carbon_monoxide"): "Sensor",
    (None, "door"): "Sensor",
    (None, "window"): "Sensor",
    (None, "opening"): "Sensor",
    (None, "motion"): "Sensor",
    (None, "moisture"): "Sensor",
    (None, "occupancy"): "Sensor",
    (None, "presence"): "Sensor",
    (None, "temperature"): "Sensor",
    (None, "humidity"): "Sensor",
    (None, "illuminance"): "Sensor",
    (None, "pressure"): "Sensor",
    (None, "battery"): "Sensor",
    (None, "vibration"): "Sensor",
    (None, "sound"): "Sensor",
    (None, "tamper"): "Sensor",
    (None, "safety"): "Sensor",
    (None, "heat"): "Sensor",
    (None, "cold"): "Sensor",
    (None, "power"): "Sensor",
    (None, "energy"): "Sensor",
    (None, "voltage"): "Sensor",
    (None, "current"): "Sensor",
}


def _entity_classes_and_domains(entities: list[dict]) -> tuple[set[tuple[str, str]], set[str]]:
    """Extract (domain, device_class) tuples and domain set from entity list.

    Uses ``device_class`` (user override) or ``original_device_class`` (set by
    integration) — both are part of the entity registry and don't require
    state fetches.
    """
    dc_pairs: set[tuple[str, str]] = set()
    domains: set[str] = set()
    for ent in entities:
        entity_id = ent.get("entity_id") or ""
        if not entity_id or "." not in entity_id:
            continue
        domain = entity_id.split(".", 1)[0]
        domains.add(domain)
        dc = ent.get("device_class") or ent.get("original_device_class")
        if dc:
            dc_pairs.add((domain, dc.lower()))
    return dc_pairs, domains


def _guess_device_type_with_evidence(
    device: dict, entities: list[dict],
    integration_domain: str | None = None,
) -> tuple[str, str]:
    """Guess the device type and return the reasoning as a short string.

    Classifier priority (unchanged from v2.4.0):
    1. Entity ``device_class`` (set by integration)
    2. Entity domain (unambiguous HA typing)
    3. Manufacturer + model/name patterns with word boundaries
    4. Name patterns as last resort with word boundaries
    5. Remaining-domain fallbacks (switch, sensor-only)

    Returns ``(type, evidence)`` where ``evidence`` is a machine-ish short
    string meant for the preview UI, e.g.
    ``"device_class=smoke on binary_sensor"`` or ``"name match: fernseher"``.
    """
    manufacturer = (device.get("manufacturer") or "").lower()
    model = (device.get("model") or "").lower()
    name = (device.get("name_by_user") or device.get("name") or "").lower()

    dc_pairs, domains = _entity_classes_and_domains(entities)

    # --- 1. device_class is king ---------------------------------------------
    for domain, dc in dc_pairs:
        if (domain, dc) in DEVICE_CLASS_TO_TYPE:
            return DEVICE_CLASS_TO_TYPE[(domain, dc)], f"device_class={dc} on {domain}"
        if (None, dc) in DEVICE_CLASS_TO_TYPE:
            return DEVICE_CLASS_TO_TYPE[(None, dc)], f"device_class={dc}"

    # --- 2. Entity domain (unambiguous HA typing) ----------------------------
    priority_domains = [
        ("lawn_mower", "Mähroboter"),
        ("vacuum", "Mähroboter"),
        ("lock", "Schloss"),
        ("camera", "Kamera"),
        ("alarm_control_panel", "Alarmanlage"),
        ("siren", "Alarmanlage"),
        ("cover", "Rollladen"),
        ("climate", "Thermostat"),
        ("fan", "Ventilator"),
        ("humidifier", "Haushaltsgerät"),
        ("water_heater", "Haushaltsgerät"),
        ("valve", "Bewässerung"),
        ("remote", "Fernbedienung"),
        ("light", "Leuchtmittel"),
    ]
    for domain_name, category in priority_domains:
        if domain_name in domains:
            return category, f"domain={domain_name}"

    # media_player without device_class — use manufacturer then word-boundary name match.
    if "media_player" in domains:
        name_and_model = f"{model} {name}"
        if any(kw in manufacturer for kw in ("amazon",)) or \
                re.search(r"\b(echo|alexa)\b", name_and_model, re.IGNORECASE):
            return "Sprachassistent", "media_player + manufacturer/name: amazon/echo/alexa"
        if any(kw in manufacturer for kw in ("google",)) and \
                re.search(r"\b(nest.*hub|home.*mini|nest.*audio|nest.*mini)\b", name_and_model, re.IGNORECASE):
            return "Sprachassistent", "media_player + google + nest/home match"
        if any(kw in manufacturer for kw in ("sonos", "denon", "yamaha", "bang", "bose", "marantz")):
            return "Lautsprecher", f"media_player + manufacturer={manufacturer}"
        if any(kw in manufacturer for kw in ("samsung", "lg", "sony", "philips", "vizio", "tcl", "hisense", "panasonic")):
            return "Smart TV", f"media_player + TV-manufacturer={manufacturer}"
        if re.search(r"\b(tv|television|fernseher|smart[- ]?tv)\b", name_and_model, re.IGNORECASE):
            return "Smart TV", "media_player + name match: tv/fernseher"
        if re.search(r"\b(speaker|lautsprecher|soundbar|homepod|home[- ]?pod)\b", name_and_model, re.IGNORECASE):
            return "Lautsprecher", "media_player + name match: speaker/lautsprecher/homepod"
        return "Streaming", "media_player fallback"

    # --- 3. Manufacturer + model patterns ------------------------------------
    for mfr_keywords, model_pattern, dtype in MANUFACTURER_MODEL_HINTS:
        if any(kw in manufacturer for kw in mfr_keywords):
            matched_mfr = next(kw for kw in mfr_keywords if kw in manufacturer)
            if model_pattern is None:
                return dtype, f"manufacturer={matched_mfr} (no model pattern)"
            if re.search(model_pattern, model, re.IGNORECASE):
                return dtype, f"manufacturer={matched_mfr} + model pattern"
            if re.search(rf"\b(?:{model_pattern})\b", name, re.IGNORECASE):
                return dtype, f"manufacturer={matched_mfr} + name pattern (word-boundary)"

    # --- 4. Name/model patterns — LAST resort, word boundaries only ----------
    name_and_model = f"{model} {name}"
    if re.search(r"\b(tv|television|fernseher|smart[- ]?tv)\b", name_and_model, re.IGNORECASE):
        return "Smart TV", "name match: tv/fernseher (no device_class/domain hint)"
    if re.search(r"\b(echo|alexa)\b", name_and_model, re.IGNORECASE):
        return "Sprachassistent", "name match: echo/alexa"
    if re.search(r"\b(fire[- ]?tv|fire[- ]?stick)\b", name_and_model, re.IGNORECASE):
        return "Streaming", "name match: fire tv/stick"
    if re.search(r"\brepeater\b", name_and_model, re.IGNORECASE):
        return "Repeater", "name match: repeater"
    if re.search(r"\b(homepod|home[- ]?pod)\b", name_and_model, re.IGNORECASE):
        return "Lautsprecher", "name match: homepod"
    if re.search(r"\b(ipad|tablet)\b", name_and_model, re.IGNORECASE):
        return "Tablet", "name match: ipad/tablet"
    if re.search(r"\b(display|dashboard|wandpanel)\b", name_and_model, re.IGNORECASE):
        return "Display", "name match: display/dashboard/wandpanel"

    # --- 5. Fallbacks on remaining domains -----------------------------------
    if "switch" in domains:
        return "Aktor/Relais", "domain=switch (no device_class — could be relay or outlet)"

    sensor_only = {"sensor", "binary_sensor", "update", "button", "number",
                   "select", "device_tracker", "event", "text"}
    if domains and domains <= sensor_only:
        if "sensor" in domains or "binary_sensor" in domains:
            return "Sensor", "only sensor/binary_sensor domains"

    return "Sonstiges", "no matching signal — default"


def _guess_device_type(device: dict, entities: list[dict],
                       integration_domain: str | None = None) -> str:
    """Thin wrapper that returns only the type, for existing callers.

    New preview/apply endpoints use ``_guess_device_type_with_evidence``
    directly to also get the reasoning string.
    """
    return _guess_device_type_with_evidence(device, entities, integration_domain)[0]


def _guess_network(integration_domain: str | None,
                    device: dict | None = None) -> str | None:
    """Guess network type from integration and device info."""
    if not integration_domain:
        return None

    # MQTT devices might actually be Zigbee (via zigbee2mqtt) or Z-Wave
    if integration_domain == "mqtt" and device:
        model = (device.get("model") or "").lower()
        name = (device.get("name_by_user") or device.get("name") or "").lower()
        manufacturer = (device.get("manufacturer") or "").lower()
        combined = f"{model} {name} {manufacturer}"
        if "zigbee" in combined:
            return "Zigbee"
        if "zwave" in combined or "z-wave" in combined:
            return "Z-Wave"
        if "bluetooth" in combined or "ble" in combined:
            return "Bluetooth"

    return NETWORK_MAP.get(integration_domain)


def _guess_type_from_integration(integration_domain: str | None) -> str | None:
    """Try to get device type from integration domain."""
    if not integration_domain:
        return None
    return INTEGRATION_TYPE_MAP.get(integration_domain)


def _guess_type_from_integration_with_evidence(
    integration_domain: str | None,
) -> tuple[str | None, str | None]:
    """Integration-based lookup with the matched integration returned as evidence."""
    if not integration_domain:
        return None, None
    hit = INTEGRATION_TYPE_MAP.get(integration_domain)
    if hit is None:
        return None, None
    return hit, f"integration={integration_domain}"


def _is_non_physical_device(device: dict, entities: list[dict],
                             integration_domain: str | None) -> bool:
    """Check if the device is non-physical (automation, service, helper, add-on, etc.)
    and should be skipped during import."""
    # Skip devices that the Geräteverwaltung add-on itself published via MQTT
    # Discovery. Each inventory item publishes to HA with identifiers of the
    # form ``[["mqtt", "geraeteverwaltung_<uuid>"]]`` (and a hub device
    # ``geraeteverwaltung_hub``). Without this filter, every re-import pulls
    # those virtual devices back into the inventory and doubles the count.
    identifiers = device.get("identifiers") or []
    for ident in identifiers:
        if isinstance(ident, (list, tuple)) and len(ident) >= 2:
            second = ident[1]
        elif isinstance(ident, str):
            second = ident
        else:
            continue
        if isinstance(second, str) and second.startswith("geraeteverwaltung"):
            return True

    # HA marks service-type entries with entry_type
    entry_type = device.get("entry_type")
    if entry_type in SKIP_ENTRY_TYPES:
        return True

    # Skip devices from integrations that don't represent physical hardware
    skip_integrations = {
        # HA internal / add-ons
        "hassio", "homeassistant", "hacs",
        # Weather / forecast
        "sun", "met", "openweathermap", "co2signal", "airvisual",
        "nws", "forecast_solar",
        # Virtual / helpers
        "google_translate", "shopping_list", "tod", "worldclock", "moon",
        "min_max", "bayesian", "trend", "derivative", "integration",
        "statistics", "utility_meter", "input_boolean", "input_number",
        "input_text", "input_select", "input_datetime", "input_button",
        "counter", "timer", "schedule", "template", "group",
        "person", "zone", "tag", "generic_thermostat",
        "threshold", "filter", "random", "switch_as_x",
        "uptime", "time_date", "workday", "season",
        # Voice pipeline (software, not hardware)
        "wyoming", "whisper", "piper", "openwakeword",
        # Virtual sensor integrations (no physical devices)
        "thermal_comfort", "ping", "dnsip", "systemmonitor",
        "cpu_speed", "command_line", "rest", "scrape",
        "snmp", "sql", "file", "folder", "history_stats",
        "generic", "local_ip", "version", "release",
        "compensation", "average",
        # Other software-only
        "bluetooth_adapters", "usb", "hardware",
        "energy", "backup", "analytics",
    }
    if integration_domain and integration_domain in skip_integrations:
        return True

    # Skip HA add-ons and software components by manufacturer
    manufacturer = (device.get("manufacturer") or "").lower()
    model = (device.get("model") or "").lower()

    skip_manufacturers = [
        "home assistant",
        "home assistant community",
        "nabu casa",
        "esphome dashboard",
        "thermal comfort",
        "ping",
    ]
    if any(m in manufacturer for m in skip_manufacturers):
        return True

    # Skip if model indicates software, not hardware
    skip_models = [
        "home assistant app",
        "home assistant add-on",
        "home assistant operating system",
        "home assistant supervisor",
        "home assistant core",
    ]
    if any(m in model for m in skip_models):
        return True

    # Skip if all entities are purely virtual (no physical representation)
    if entities:
        entity_domains = {
            ent.get("entity_id", "").split(".")[0]
            for ent in entities if ent.get("entity_id")
        }
        virtual_only = {
            "automation", "script", "scene", "input_boolean",
            "input_number", "input_text", "input_select", "input_datetime",
            "input_button", "counter", "timer", "schedule", "person",
            "zone", "tag", "calendar", "todo", "weather",
        }
        if entity_domains and entity_domains <= virtual_only:
            return True

    return False


async def import_ha_devices(
    progress_cb: "callable | None" = None,
) -> dict[str, Any]:
    """
    Import all HA devices into the Geräteverwaltung database.

    - Fetches device + entity registries via WebSocket
    - Filters out non-physical devices (automations, helpers, services)
    - Maps HA fields to Geräteverwaltung fields using 50+ integration mappings
    - Deduplicates by ha_device_id (skips already imported devices)
    - Returns import statistics

    v2.5.3: ``progress_cb(stage: str, current: int, total: int)`` is called
    at every meaningful milestone so a background-task wrapper can surface
    live progress to the frontend. The Forum-reported 502 Bad Gateway on
    large setups (388 devices) came from a purely synchronous call that
    blocked the HTTP response past the HA Ingress timeout — this decouples
    the long work from the HTTP request.
    """
    def _report(stage: str, current: int = 0, total: int = 0) -> None:
        if progress_cb:
            try:
                progress_cb(stage, current, total)
            except Exception:
                pass  # progress reporting must never break the import

    _report("fetching_registry")

    # Respect the user's auto-categorize preference.
    from app.routers.settings import get_bool_setting
    auto_categorize = get_bool_setting("auto_categorize", True)

    # Fetch all data from HA
    ha_devices = await get_ha_device_registry()
    ha_entities = await get_ha_entity_registry()
    ha_areas = await get_areas()

    if not ha_devices:
        return {"status": "error", "message": "Could not fetch HA device registry", "imported": 0}

    # Build area name lookup
    area_lookup = {a["area_id"]: a for a in ha_areas}

    # Build entity lookup: device_id → [entities]
    entity_map: dict[str, list[dict]] = {}
    for ent in ha_entities:
        did = ent.get("device_id")
        if did:
            entity_map.setdefault(did, []).append(ent)

    # Build config_entry → domain lookup from entities
    config_entry_domains: dict[str, str] = {}
    for ent in ha_entities:
        ce = ent.get("config_entry_id")
        platform = ent.get("platform")
        if ce and platform:
            config_entry_domains[ce] = platform

    # Get existing devices to check for duplicates
    with get_db() as conn:
        existing = dicts_from_rows(
            conn.execute(
                "SELECT ha_device_id FROM devices WHERE ha_device_id IS NOT NULL AND deleted_at IS NULL"
            ).fetchall()
        )
    existing_ids = {d["ha_device_id"] for d in existing}

    imported = 0
    skipped_duplicates = 0
    skipped_no_name = 0
    skipped_non_physical = 0
    errors: list[dict] = []

    total = len(ha_devices)
    logger.info("HA import starting: %d HA devices to process", total)
    _report("processing", 0, total)

    with get_db() as conn:
        for idx, dev in enumerate(ha_devices):
            # Progress log every 50 devices (helps diagnose where imports hang on large setups)
            if idx > 0 and idx % 50 == 0:
                logger.info(
                    "HA import progress: %d/%d processed (imported=%d, dup=%d, non_phys=%d, err=%d)",
                    idx, total, imported, skipped_duplicates, skipped_non_physical, len(errors),
                )
                _report("processing", idx, total)

            # Per-device try/except so one broken device cannot abort the whole import
            try:
                device_id = dev.get("id", "")
                name = dev.get("name_by_user") or dev.get("name") or ""

                # Skip devices without a name
                if not name or name.strip() == "":
                    skipped_no_name += 1
                    continue

                # Skip duplicates (already imported)
                if device_id in existing_ids:
                    skipped_duplicates += 1
                    continue

                # Get entities for this device
                device_entities = entity_map.get(device_id, [])

                # Determine integration domain. Prefer the device's primary
                # config entry and demote passive trackers (see
                # ``_resolve_primary_integration``).
                integration_domain = _resolve_primary_integration(
                    dev, config_entry_domains
                )

                # Skip non-physical devices (automations, helpers, services, etc.)
                if _is_non_physical_device(dev, device_entities, integration_domain):
                    skipped_non_physical += 1
                    continue

                # Determine device type. When the user disabled auto-categorisation
                # (settings.auto_categorize = false) we leave everything as
                # "Sonstiges" and let them assign types manually.
                if not auto_categorize:
                    device_type = "Sonstiges"
                else:
                    type_from_integration = _guess_type_from_integration(integration_domain)
                    if type_from_integration is None:
                        device_type = _guess_device_type(dev, device_entities, integration_domain)
                    else:
                        device_type = type_from_integration

                # Map area
                area_id = dev.get("area_id")
                area_name = area_lookup.get(area_id, {}).get("name") if area_id else None
                floor_id = area_lookup.get(area_id, {}).get("floor_id") if area_id else None

                # Map primary entity - prefer the most representative one
                # Priority: switch > light > cover > climate > media_player > sensor > binary_sensor > rest
                primary_entity = None
                if device_entities:
                    domain_priority = [
                        "switch", "light", "cover", "climate", "fan", "lock",
                        "media_player", "camera", "vacuum", "lawn_mower",
                        "alarm_control_panel", "remote", "valve", "humidifier",
                        "sensor", "binary_sensor", "number", "select",
                    ]
                    sorted_entities = sorted(
                        device_entities,
                        key=lambda e: next(
                            (i for i, d in enumerate(domain_priority)
                             if e.get("entity_id", "").startswith(d + ".")),
                            len(domain_priority),
                        ),
                    )
                    primary_entity = sorted_entities[0]["entity_id"]

                # Network type
                network = _guess_network(integration_domain, dev)

                # Safely convert fields that might be lists
                sw_version = dev.get("sw_version")
                if isinstance(sw_version, list):
                    sw_version = ", ".join(str(v) for v in sw_version) if sw_version else None
                model = dev.get("model")
                if isinstance(model, list):
                    model = ", ".join(str(m) for m in model) if model else None
                manufacturer = dev.get("manufacturer")
                if isinstance(manufacturer, list):
                    manufacturer = ", ".join(str(m) for m in manufacturer) if manufacturer else None

                # Build device record
                uuid = uuid4().hex
                conn.execute(
                    """INSERT INTO devices (
                        uuid, typ, bezeichnung, modell, hersteller,
                        standort_area_id, standort_name, standort_floor_id,
                        firmware, integration, netzwerk,
                        ha_device_id, ha_entity_id,
                        sync_version
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)""",
                    (
                        uuid,
                        str(device_type),
                        str(name),
                        str(model) if model else None,
                        str(manufacturer) if manufacturer else None,
                        str(area_id) if area_id else None,
                        str(area_name) if area_name else None,
                        str(floor_id) if floor_id else None,
                        str(sw_version) if sw_version else None,
                        str(integration_domain) if integration_domain else "Sonstiges",
                        str(network) if network else None,
                        str(device_id),
                        str(primary_entity) if primary_entity else None,
                    ),
                )
                imported += 1
            except Exception as e:
                # Log the bad device and keep going so a single broken record
                # does not kill an import of 500+ devices.
                err_name = dev.get("name_by_user") or dev.get("name") or dev.get("id") or "<unknown>"
                logger.warning(
                    "HA import: skipping device '%s' due to error: %s: %s",
                    err_name, type(e).__name__, e,
                )
                errors.append({
                    "device": str(err_name),
                    "error_type": type(e).__name__,
                    "error": str(e),
                })

    # v2.5.0: Second pass — populate ``parent_uuid`` using HA's ``via_device_id``.
    # HA sets via_device_id on sub-devices (e.g. Shelly channels point to the
    # Shelly main device). After all rows are inserted, we can resolve the
    # inventory UUID of each parent and wire the relationship.
    # v2.5.3: the loop variable was ``devices`` — a NameError in Python since
    # the local name was never bound. Fixed to ``ha_devices`` (the registry
    # list) so parent-child links actually get written on import.
    _report("linking_parents", total, total)
    linked_parents = 0
    with get_db() as conn:
        # Map ha_device_id -> inventory uuid for every imported device.
        rows = dicts_from_rows(conn.execute(
            "SELECT uuid, ha_device_id FROM devices "
            "WHERE ha_device_id IS NOT NULL AND deleted_at IS NULL"
        ).fetchall())
        ha_id_to_uuid = {r["ha_device_id"]: r["uuid"] for r in rows}

        for dev in ha_devices:
            via = dev.get("via_device_id")
            if not via:
                continue
            dev_id = dev.get("id")
            if not dev_id:
                continue
            parent_uuid = ha_id_to_uuid.get(via)
            child_uuid = ha_id_to_uuid.get(dev_id)
            if parent_uuid and child_uuid and parent_uuid != child_uuid:
                cur = conn.execute(
                    "UPDATE devices SET parent_uuid = ? WHERE uuid = ? "
                    "AND (parent_uuid IS NULL OR parent_uuid != ?)",
                    (parent_uuid, child_uuid, parent_uuid),
                )
                if cur.rowcount > 0:
                    linked_parents += 1

    logger.info(
        "HA import done: %d imported, %d duplicates, %d non-physical, %d errors, "
        "%d parent-child links (of %d total)",
        imported, skipped_duplicates, skipped_non_physical, len(errors),
        linked_parents, total,
    )

    return {
        "status": "ok",
        "imported": imported,
        "skipped_duplicates": skipped_duplicates,
        "skipped_no_name": skipped_no_name,
        "skipped_non_physical": skipped_non_physical,
        "parent_links": linked_parents,
        "errors": errors[:20],  # cap at 20 entries so response stays reasonable
        "error_count": len(errors),
        "total_ha_devices": total,
    }
