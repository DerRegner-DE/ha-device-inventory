"""Async Home Assistant REST API client."""

from __future__ import annotations

import logging
import os
from typing import Any

import aiohttp

from app.config import settings

logger = logging.getLogger(__name__)


def _get_base_url() -> str:
    """Determine HA API base URL.

    When running as an HA Add-on, SUPERVISOR_TOKEN is set and we use the
    Supervisor internal API at http://supervisor/core/api.  Otherwise fall
    back to the configured HA_URL.
    """
    if os.environ.get("SUPERVISOR_TOKEN"):
        return "http://supervisor/core/api"
    return settings.HA_URL.rstrip("/") + "/api"


_BASE = _get_base_url()


def _get_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    # Prefer SUPERVISOR_TOKEN (set automatically inside Add-on container)
    token = os.environ.get("SUPERVISOR_TOKEN") or settings.HA_TOKEN
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


async def _get(path: str) -> Any:
    # _BASE already ends with /api, so path should start with / (e.g. /states)
    url = f"{_BASE}{path}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=_get_headers(), timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status != 200:
                text = await resp.text()
                logger.error("HA GET %s -> %s: %s", path, resp.status, text[:200])
                raise RuntimeError(f"HA API error {resp.status}: {text[:200]}")
            return await resp.json()


async def _post(path: str, data: dict | None = None) -> Any:
    url = f"{_BASE}{path}"
    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=_get_headers(), json=data or {}, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status not in (200, 201):
                text = await resp.text()
                logger.error("HA POST %s -> %s: %s", path, resp.status, text[:200])
                raise RuntimeError(f"HA API error {resp.status}: {text[:200]}")
            return await resp.json()


async def _post_template(data: dict) -> str:
    """POST to /api/template which returns plain text, not JSON."""
    url = f"{_BASE}/template"
    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=_get_headers(), json=data, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status not in (200, 201):
                text = await resp.text()
                logger.error("HA POST /api/template -> %s: %s", resp.status, text[:200])
                raise RuntimeError(f"HA API error {resp.status}: {text[:200]}")
            return await resp.text()


# ---- Areas ----------------------------------------------------------------

async def get_areas() -> list[dict[str, Any]]:
    """Fetch all HA areas via REST API (template endpoint workaround)."""
    result = await _post_template({"template": """
[{% for area in areas() %}{% set floor_found = namespace(id=None) %}{% for floor in floors() %}{% if area in floor_areas(floor) %}{% set floor_found.id = floor %}{% endif %}{% endfor %}{"area_id": "{{ area }}", "name": "{{ area_name(area) }}", "floor_id": {{ floor_found.id | tojson }}}{% if not loop.last %},{% endif %}{% endfor %}]
"""})
    import json
    try:
        return json.loads(result)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Could not parse areas template response, returning empty list")
        return []


async def get_floors() -> list[dict[str, Any]]:
    """Fetch all HA floors via template endpoint."""
    result = await _post_template({"template": """
[{% for floor in floors() %}
  {"floor_id": "{{ floor }}", "name": "{{ floor_name(floor) }}"}{% if not loop.last %},{% endif %}
{% endfor %}]
"""})
    import json
    try:
        return json.loads(result)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Could not parse floors template response, returning empty list")
        return []


async def get_area_details(area_id: str) -> dict[str, Any] | None:
    """Get area details including floor."""
    result = await _post_template({"template": f"""
{{% set aid = "{area_id}" %}}
{{% set a = area_id(aid) %}}
{{% if a %}}
  {{"area_id": "{{{{ aid }}}}", "name": "{{{{ area_name(aid) }}}}"}}
{{% else %}}
  null
{{% endif %}}
"""})
    import json
    try:
        return json.loads(result)
    except (json.JSONDecodeError, TypeError):
        return None


# ---- Devices --------------------------------------------------------------

async def get_devices() -> list[dict[str, Any]]:
    """Fetch device list from HA REST API."""
    # Use /api/states as a workaround to gather device info
    # The actual device registry needs websocket, so we use the config endpoint
    try:
        states = await _get("/states")
        # Group by device_id concept - extract unique device-like entities
        # This is a simplified approach; real device registry needs WS
        devices: dict[str, dict] = {}
        for state in states:
            attrs = state.get("attributes", {})
            entity_id = state.get("entity_id", "")
            friendly_name = attrs.get("friendly_name", entity_id)

            # We return entity-level data since REST API doesn't expose device registry directly
            devices[entity_id] = {
                "entity_id": entity_id,
                "friendly_name": friendly_name,
                "state": state.get("state"),
            }
        return list(devices.values())
    except Exception as e:
        logger.error("Failed to get devices: %s", e)
        return []


async def get_device_detail(device_id: str) -> dict[str, Any] | None:
    """Get single device detail. Since REST API is limited, return what we can."""
    try:
        # Try fetching via template to get device info
        result = await _post_template({"template": f"""
{{% set did = "{device_id}" %}}
{{% set ents = device_entities(did) %}}
{{
  "device_id": "{{{{ did }}}}",
  "entities": [
    {{% for e in ents %}}
      {{"entity_id": "{{{{ e }}}}", "state": "{{{{ states(e) }}}}"}}{{%- if not loop.last %}},"{{%- endif %}}
    {{% endfor %}}
  ]
}}
"""})
        import json
        try:
            return json.loads(result)
        except (json.JSONDecodeError, TypeError):
            return None
    except Exception as e:
        logger.error("Failed to get device %s: %s", device_id, e)
        return None


async def update_device_area(device_id: str, area_id: str) -> dict[str, Any]:
    """Update device area via HA service call."""
    # This requires the config API which uses websocket.
    # For REST, we can use the service call approach if available.
    # In practice this would need websocket; we log a warning.
    logger.warning(
        "update_device_area called for device=%s area=%s - "
        "REST API has limited device registry support. "
        "Consider using WebSocket API for full device management.",
        device_id, area_id
    )
    return {"status": "not_supported_via_rest", "device_id": device_id, "area_id": area_id}
