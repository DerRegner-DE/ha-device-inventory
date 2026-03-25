"""Import HA devices into Geräteverwaltung inventory."""

from __future__ import annotations

import logging
from uuid import uuid4
from typing import Any

from app.database import get_db, dicts_from_rows
from app.services.ha_client import get_ha_device_registry, get_ha_entity_registry, get_areas

logger = logging.getLogger(__name__)

# Map HA entity domains / integration types to our device types
DOMAIN_TO_TYPE = {
    "light": "Leuchtmittel",
    "switch": "Steckdose",
    "cover": "Rollladen",
    "climate": "Thermostat",
    "camera": "Kamera",
    "media_player": "Sprachassistent",
    "sensor": "Sensor",
    "binary_sensor": "Sensor",
    "vacuum": "Mähroboter",
    "lawn_mower": "Mähroboter",
    "lock": "Sonstiges",
    "fan": "Sonstiges",
    "alarm_control_panel": "Sonstiges",
    "number": "Sonstiges",
    "select": "Sonstiges",
    "button": "Sonstiges",
    "update": "Sonstiges",
    "device_tracker": "Sonstiges",
}

MANUFACTURER_TYPE_HINTS = {
    ("amazon",): "Sprachassistent",
    ("google",): "Sprachassistent",
    ("sonos",): "Lautsprecher",
    ("avm", "fritz"): "Router",
    ("ring",): "Türklingel",
    ("blink",): "Kamera",
    ("worx", "landroid"): "Mähroboter",
    ("hp", "canon", "epson", "brother"): "Drucker",
    ("apple",): "Smartphone",
    ("samsung",): "Smartphone",
    ("xiaomi",): "Smartphone",
    ("tp-link",): "Steckdose",
    ("tuya",): "Steckdose",
    ("bosch", "shc"): "Thermostat",
    ("homematic",): "Thermostat",
}

INTEGRATION_TYPE_MAP = {
    "fritz": "Router",
    "fritzbox": "Router",
    "ring": "Türklingel",
    "blink": "Kamera",
    "alexa_media": "Sprachassistent",
    "alexa_devices": "Sprachassistent",
    "hue": "Leuchtmittel",
    "zha": "Sonstiges",
    "mqtt": "Sonstiges",
    "tasmota": "Steckdose",
    "tplink": "Steckdose",
    "tuya": "Steckdose",
    "mobile_app": "Smartphone",
    "dlna_dmr": "Streaming",
    "ipp": "Drucker",
    "home_connect": "Sonstiges",
    "landroid_cloud": "Mähroboter",
    "playstation_network": "Streaming",
}

NETWORK_MAP = {
    "zha": "Zigbee",
    "zigbee2mqtt": "Zigbee",
    "mqtt": "WLAN",
    "tasmota": "WLAN",
    "hue": "Zigbee",
    "fritz": "LAN",
    "fritzbox": "LAN",
    "mobile_app": "WLAN",
    "bluetooth": "Bluetooth",
    "ble": "Bluetooth",
    "esphome": "WLAN",
    "tplink": "WLAN",
    "tuya": "WLAN",
    "homematicip_cloud": "HomeMatic RF",
}


def _guess_device_type(device: dict, entities: list[dict]) -> str:
    """Guess the device type from integration, manufacturer, and entity domains."""
    # 1. Check integration type
    for config_entry in device.get("config_entries", []):
        # config entries are just IDs, but we have the integration type from identifiers
        pass

    # Check manufacturer hints
    manufacturer = (device.get("manufacturer") or "").lower()
    for keywords, dtype in MANUFACTURER_TYPE_HINTS.items():
        if any(kw in manufacturer for kw in keywords):
            return dtype

    # Check model for hints
    model = (device.get("model") or "").lower()
    if "echo" in model or "alexa" in model:
        return "Sprachassistent"
    if "fire tv" in model or "firetv" in model:
        return "Streaming"
    if "repeater" in model:
        return "Repeater"

    # Check entity domains
    domains = set()
    for ent in entities:
        domain = ent.get("entity_id", "").split(".")[0] if ent.get("entity_id") else ""
        if domain:
            domains.add(domain)

    # Prefer more specific domains
    for domain in ["camera", "climate", "cover", "light", "media_player", "vacuum", "lawn_mower"]:
        if domain in domains:
            return DOMAIN_TO_TYPE.get(domain, "Sonstiges")

    # Check if it's primarily a sensor device
    if domains <= {"sensor", "binary_sensor", "update", "button", "number", "select", "device_tracker"}:
        if "sensor" in domains or "binary_sensor" in domains:
            return "Sensor"

    return "Sonstiges"


def _guess_network(integration_domain: str | None) -> str | None:
    """Guess network type from integration."""
    if not integration_domain:
        return None
    return NETWORK_MAP.get(integration_domain)


def _guess_type_from_integration(integration_domain: str | None) -> str | None:
    """Try to get device type from integration domain."""
    if not integration_domain:
        return None
    return INTEGRATION_TYPE_MAP.get(integration_domain)


async def import_ha_devices() -> dict[str, Any]:
    """
    Import all HA devices into the Geräteverwaltung database.

    - Fetches device + entity registries via WebSocket
    - Maps HA fields to Geräteverwaltung fields
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

    with get_db() as conn:
        for dev in ha_devices:
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

            # Determine device type
            type_from_integration = _guess_type_from_integration(integration_domain)
            device_type = type_from_integration or _guess_device_type(dev, device_entities)

            # Map area
            area_id = dev.get("area_id")
            area_name = area_lookup.get(area_id, {}).get("name") if area_id else None
            floor_id = area_lookup.get(area_id, {}).get("floor_id") if area_id else None

            # Map primary entity
            primary_entity = device_entities[0]["entity_id"] if device_entities else None

            # Network type
            network = _guess_network(integration_domain)

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
                    device_type,
                    name,
                    dev.get("model") or None,
                    dev.get("manufacturer") or None,
                    area_id,
                    area_name,
                    floor_id,
                    dev.get("sw_version") or None,
                    integration_domain or "Sonstiges",
                    network,
                    device_id,
                    primary_entity,
                ),
            )
            imported += 1

    return {
        "status": "ok",
        "imported": imported,
        "skipped_duplicates": skipped_duplicates,
        "skipped_no_name": skipped_no_name,
        "total_ha_devices": len(ha_devices),
    }
