"""MQTT Discovery service for publishing inventory devices to Home Assistant.

Publishes MQTT auto-discovery messages so that HA creates entities
for each inventory device (warranty sensor, purchase date, etc.).
Requires Mosquitto broker (HA add-on).
"""

from __future__ import annotations

import json
import logging
from datetime import date, datetime

import aiomqtt

from app.config import settings

logger = logging.getLogger(__name__)

DISCOVERY_PREFIX = "homeassistant"
STATE_PREFIX = "geraeteverwaltung"

# Shared MQTT client (initialized at startup)
_mqtt_client: aiomqtt.Client | None = None


def _slugify(text: str) -> str:
    """Convert text to a safe slug for MQTT topics and entity IDs."""
    import re
    slug = text.lower().strip()
    slug = re.sub(r"[äÄ]", "ae", slug)
    slug = re.sub(r"[öÖ]", "oe", slug)
    slug = re.sub(r"[üÜ]", "ue", slug)
    slug = re.sub(r"[ß]", "ss", slug)
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    return slug.strip("_")[:64]


def _warranty_days(garantie_bis: str | None) -> int | None:
    """Calculate days until warranty expires. None if no date set."""
    if not garantie_bis:
        return None
    try:
        exp = date.fromisoformat(garantie_bis)
        return (exp - date.today()).days
    except (ValueError, TypeError):
        return None


def _device_info(device: dict) -> dict:
    """Build HA device info block from inventory device."""
    info: dict = {
        "identifiers": [f"geraeteverwaltung_{device['uuid']}"],
        "name": device.get("bezeichnung") or "Unknown Device",
        "via_device": "geraeteverwaltung_hub",
    }
    if device.get("hersteller"):
        info["manufacturer"] = device["hersteller"]
    if device.get("modell"):
        info["model"] = device["modell"]
    if device.get("firmware"):
        info["sw_version"] = device["firmware"]
    return info


def _build_discovery_messages(device: dict) -> list[tuple[str, dict]]:
    """Build all MQTT discovery config messages for a device.

    Returns list of (topic, payload) tuples.
    """
    uuid = device["uuid"]
    dev_info = _device_info(device)
    state_topic = f"{STATE_PREFIX}/{uuid}/state"
    messages: list[tuple[str, dict]] = []

    # --- Sensor: Warranty expiry date ---
    if device.get("garantie_bis"):
        messages.append((
            f"{DISCOVERY_PREFIX}/sensor/geraeteverwaltung/{uuid}_warranty/config",
            {
                "name": "Warranty expires",
                "unique_id": f"gv_{uuid}_warranty",
                "state_topic": state_topic,
                "value_template": "{{ value_json.garantie_bis }}",
                "icon": "mdi:shield-check",
                "device": dev_info,
            },
        ))

    # --- Sensor: Days until warranty expires ---
    if device.get("garantie_bis"):
        messages.append((
            f"{DISCOVERY_PREFIX}/sensor/geraeteverwaltung/{uuid}_warranty_days/config",
            {
                "name": "Warranty days remaining",
                "unique_id": f"gv_{uuid}_warranty_days",
                "state_topic": state_topic,
                "value_template": "{{ value_json.warranty_days }}",
                "unit_of_measurement": "d",
                "icon": "mdi:calendar-clock",
                "device": dev_info,
            },
        ))

    # --- Binary Sensor: Warranty active ---
    if device.get("garantie_bis"):
        messages.append((
            f"{DISCOVERY_PREFIX}/binary_sensor/geraeteverwaltung/{uuid}_warranty_active/config",
            {
                "name": "Warranty active",
                "unique_id": f"gv_{uuid}_warranty_active",
                "state_topic": state_topic,
                "value_template": "{{ 'ON' if value_json.warranty_active else 'OFF' }}",
                "device_class": "safety",
                "icon": "mdi:shield-alert",
                "device": dev_info,
            },
        ))

    # --- Sensor: Purchase date ---
    if device.get("anschaffungsdatum"):
        messages.append((
            f"{DISCOVERY_PREFIX}/sensor/geraeteverwaltung/{uuid}_purchase/config",
            {
                "name": "Purchase date",
                "unique_id": f"gv_{uuid}_purchase",
                "state_topic": state_topic,
                "value_template": "{{ value_json.anschaffungsdatum }}",
                "icon": "mdi:cart",
                "device": dev_info,
            },
        ))

    # --- Sensor: Device type ---
    messages.append((
        f"{DISCOVERY_PREFIX}/sensor/geraeteverwaltung/{uuid}_type/config",
        {
            "name": "Device type",
            "unique_id": f"gv_{uuid}_type",
            "state_topic": state_topic,
            "value_template": "{{ value_json.typ }}",
            "icon": "mdi:devices",
            "device": dev_info,
        },
    ))

    # --- Sensor: Location ---
    if device.get("standort_name"):
        messages.append((
            f"{DISCOVERY_PREFIX}/sensor/geraeteverwaltung/{uuid}_location/config",
            {
                "name": "Location",
                "unique_id": f"gv_{uuid}_location",
                "state_topic": state_topic,
                "value_template": "{{ value_json.standort_name }}",
                "icon": "mdi:map-marker",
                "device": dev_info,
            },
        ))

    return messages


def _build_state_payload(device: dict) -> dict:
    """Build the state JSON payload for a device."""
    days = _warranty_days(device.get("garantie_bis"))
    return {
        "typ": device.get("typ", ""),
        "bezeichnung": device.get("bezeichnung", ""),
        "hersteller": device.get("hersteller", ""),
        "modell": device.get("modell", ""),
        "standort_name": device.get("standort_name", ""),
        "garantie_bis": device.get("garantie_bis", ""),
        "anschaffungsdatum": device.get("anschaffungsdatum", ""),
        "warranty_days": days if days is not None else -1,
        "warranty_active": days is not None and days >= 0,
        "seriennummer": device.get("seriennummer", ""),
        "ip_adresse": device.get("ip_adresse", ""),
        "firmware": device.get("firmware", ""),
        "integration": device.get("integration", ""),
        "netzwerk": device.get("netzwerk", ""),
    }


async def publish_device(device: dict) -> bool:
    """Publish MQTT discovery + state for a single device."""
    if not settings.MQTT_DISCOVERY_ENABLED:
        return False

    try:
        connect_kwargs: dict = {
            "hostname": settings.MQTT_HOST,
            "port": settings.MQTT_PORT,
        }
        if settings.MQTT_USER:
            connect_kwargs["username"] = settings.MQTT_USER
            connect_kwargs["password"] = settings.MQTT_PASSWORD

        async with aiomqtt.Client(**connect_kwargs) as client:
            # Publish discovery configs (retained)
            for topic, payload in _build_discovery_messages(device):
                await client.publish(
                    topic,
                    json.dumps(payload),
                    retain=True,
                )

            # Publish state (retained)
            state_topic = f"{STATE_PREFIX}/{device['uuid']}/state"
            await client.publish(
                state_topic,
                json.dumps(_build_state_payload(device)),
                retain=True,
            )

        logger.info("MQTT discovery published for device %s", device.get("bezeichnung"))
        return True

    except Exception as e:
        logger.warning("MQTT publish failed for %s: %s", device.get("uuid"), e)
        return False


async def remove_device(device_uuid: str) -> bool:
    """Remove MQTT discovery messages for a device (empty payload = delete)."""
    if not settings.MQTT_DISCOVERY_ENABLED:
        return False

    try:
        connect_kwargs: dict = {
            "hostname": settings.MQTT_HOST,
            "port": settings.MQTT_PORT,
        }
        if settings.MQTT_USER:
            connect_kwargs["username"] = settings.MQTT_USER
            connect_kwargs["password"] = settings.MQTT_PASSWORD

        # All possible entity suffixes
        suffixes = [
            ("sensor", "warranty"),
            ("sensor", "warranty_days"),
            ("sensor", "purchase"),
            ("sensor", "type"),
            ("sensor", "location"),
            ("binary_sensor", "warranty_active"),
        ]

        async with aiomqtt.Client(**connect_kwargs) as client:
            for component, suffix in suffixes:
                topic = f"{DISCOVERY_PREFIX}/{component}/geraeteverwaltung/{device_uuid}_{suffix}/config"
                await client.publish(topic, b"", retain=True)

            # Clear state
            await client.publish(
                f"{STATE_PREFIX}/{device_uuid}/state", b"", retain=True
            )

        logger.info("MQTT discovery removed for device %s", device_uuid)
        return True

    except Exception as e:
        logger.warning("MQTT remove failed for %s: %s", device_uuid, e)
        return False


async def sync_all_devices(devices: list[dict]) -> dict:
    """Publish MQTT discovery for all devices. Returns stats."""
    if not settings.MQTT_DISCOVERY_ENABLED:
        return {"published": 0, "failed": 0, "disabled": True}

    published = 0
    failed = 0

    for device in devices:
        if await publish_device(device):
            published += 1
        else:
            failed += 1

    logger.info("MQTT sync complete: %d published, %d failed", published, failed)
    return {"published": published, "failed": failed, "total": len(devices)}
