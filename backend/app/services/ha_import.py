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
    # Samsung – TV vs Smartphone
    (["samsung"], r"tv|ue\d|qe\d|qn\d|un\d|frame|serif|sero|neo|crystal|qled|oled", "Smart TV"),
    (["samsung"], r"galaxy|sm-", "Smartphone"),
    (["samsung"], r"tab", "Tablet"),
    (["samsung"], None, "Smartphone"),
    # Xiaomi – NOT always Smartphone!
    (["xiaomi"], r"tv|mi.*box|stick", "Smart TV"),
    (["xiaomi"], r"vacuum|roborock|dreame", "Mähroboter"),
    (["xiaomi"], r"gateway|hub", "Controller/Gateway"),
    (["xiaomi"], r"lamp|bulb|yeelight|ceiling", "Leuchtmittel"),
    (["xiaomi"], r"plug|socket|power.*strip", "Steckdose"),
    (["xiaomi"], r"sensor|thermo|hygro|door|window|motion|button", "Sensor"),
    (["xiaomi"], r"tab|pad", "Tablet"),
    (["xiaomi"], None, "Smartphone"),
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
    # Tuya / generic
    (["tuya", "_tz3"], None, "Steckdose"),
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
# Entry types to skip (not physical devices)
# ---------------------------------------------------------------------------
SKIP_ENTRY_TYPES = {"service"}


def _guess_device_type(device: dict, entities: list[dict],
                       integration_domain: str | None = None) -> str:
    """Guess the device type from integration, manufacturer, model, and entity domains."""
    manufacturer = (device.get("manufacturer") or "").lower()
    model = (device.get("model") or "").lower()
    name = (device.get("name_by_user") or device.get("name") or "").lower()

    # 1. Check manufacturer + model hints (most specific)
    for mfr_keywords, model_pattern, dtype in MANUFACTURER_MODEL_HINTS:
        if any(kw in manufacturer for kw in mfr_keywords):
            if model_pattern is None:
                return dtype
            if re.search(model_pattern, model, re.IGNORECASE):
                return dtype
            if re.search(model_pattern, name, re.IGNORECASE):
                return dtype

    # 2. Check model string for common patterns
    if any(kw in model for kw in ("tv", "television", "fernseh")):
        return "Smart TV"
    if any(kw in model for kw in ("echo", "alexa")):
        return "Sprachassistent"
    if any(kw in model for kw in ("fire tv", "firetv", "fire stick")):
        return "Streaming"
    if "repeater" in model:
        return "Repeater"
    if any(kw in model for kw in ("homepod", "home pod")):
        return "Lautsprecher"
    if any(kw in model for kw in ("ipad", "tab ")):
        return "Tablet"
    if any(kw in model for kw in ("display", "show", "dashboard")):
        return "Display"

    # 3. Check name for common patterns
    if any(kw in name for kw in ("fernseher", "tv ", " tv", "smart tv")):
        return "Smart TV"
    if any(kw in name for kw in ("display", "dashboard", "wandpanel")):
        return "Display"

    # 4. Check entity domains
    domains = set()
    for ent in entities:
        domain = ent.get("entity_id", "").split(".")[0] if ent.get("entity_id") else ""
        if domain:
            domains.add(domain)

    # Prefer more specific domains
    priority_domains = [
        "camera", "climate", "cover", "lock", "alarm_control_panel",
        "fan", "vacuum", "lawn_mower", "siren", "valve", "water_heater",
        "humidifier", "remote",
    ]
    for domain in priority_domains:
        if domain in domains:
            return DOMAIN_TO_TYPE.get(domain, "Sonstiges")

    # Light is specific enough
    if "light" in domains:
        return "Leuchtmittel"

    # Media player needs more context – could be TV, speaker, or streaming
    if "media_player" in domains:
        if any(kw in manufacturer for kw in ("sonos", "denon", "yamaha", "bang", "bose")):
            return "Lautsprecher"
        if any(kw in manufacturer for kw in ("samsung", "lg", "sony", "philips", "vizio")):
            return "Smart TV"
        return "Streaming"

    # Switch – could be outlet, relay, light switch
    if "switch" in domains and not domains.intersection(priority_domains):
        return "Aktor/Relais"

    # Check if it's primarily a sensor device
    sensor_only = {"sensor", "binary_sensor", "update", "button", "number",
                   "select", "device_tracker", "event", "text"}
    if domains and domains <= sensor_only:
        if "sensor" in domains or "binary_sensor" in domains:
            return "Sensor"

    return "Sonstiges"


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


def _is_non_physical_device(device: dict, entities: list[dict],
                             integration_domain: str | None) -> bool:
    """Check if the device is non-physical (automation, service, helper, add-on, etc.)
    and should be skipped during import."""
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


async def import_ha_devices() -> dict[str, Any]:
    """
    Import all HA devices into the Geräteverwaltung database.

    - Fetches device + entity registries via WebSocket
    - Filters out non-physical devices (automations, helpers, services)
    - Maps HA fields to Geräteverwaltung fields using 50+ integration mappings
    - Deduplicates by ha_device_id (skips already imported devices)
    - Returns import statistics
    """
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

    with get_db() as conn:
        for idx, dev in enumerate(ha_devices):
            # Progress log every 50 devices (helps diagnose where imports hang on large setups)
            if idx > 0 and idx % 50 == 0:
                logger.info(
                    "HA import progress: %d/%d processed (imported=%d, dup=%d, non_phys=%d, err=%d)",
                    idx, total, imported, skipped_duplicates, skipped_non_physical, len(errors),
                )

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

                # Determine integration domain from config entries
                integration_domain = None
                for ce_id in dev.get("config_entries", []):
                    if ce_id in config_entry_domains:
                        integration_domain = config_entry_domains[ce_id]
                        break

                # Skip non-physical devices (automations, helpers, services, etc.)
                if _is_non_physical_device(dev, device_entities, integration_domain):
                    skipped_non_physical += 1
                    continue

                # Determine device type (3-tier: integration → manufacturer+model → entity domains)
                type_from_integration = _guess_type_from_integration(integration_domain)
                # Integration map returned None → use smart guesser
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

    logger.info(
        "HA import done: %d imported, %d duplicates, %d non-physical, %d errors (of %d total)",
        imported, skipped_duplicates, skipped_non_physical, len(errors), total,
    )

    return {
        "status": "ok",
        "imported": imported,
        "skipped_duplicates": skipped_duplicates,
        "skipped_no_name": skipped_no_name,
        "skipped_non_physical": skipped_non_physical,
        "errors": errors[:20],  # cap at 20 entries so response stays reasonable
        "error_count": len(errors),
        "total_ha_devices": total,
    }
