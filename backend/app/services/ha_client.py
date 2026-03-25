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


# ---- Devices (WebSocket API) ---------------------------------------------

def _get_ws_url() -> str:
    """Determine HA WebSocket URL."""
    if os.environ.get("SUPERVISOR_TOKEN"):
        return "ws://supervisor/core/websocket"
    base = settings.HA_URL.rstrip("/")
    return base.replace("http://", "ws://").replace("https://", "wss://") + "/api/websocket"


async def _ws_command(cmd: dict) -> Any:
    """Execute a single WebSocket command and return the result."""
    token = os.environ.get("SUPERVISOR_TOKEN") or settings.HA_TOKEN
    url = _get_ws_url()

    async with aiohttp.ClientSession() as session:
        async with session.ws_connect(url, timeout=aiohttp.ClientTimeout(total=30)) as ws:
            # Wait for auth_required
            msg = await ws.receive_json()
            if msg.get("type") != "auth_required":
                raise RuntimeError(f"Unexpected WS message: {msg}")

            # Authenticate
            await ws.send_json({"type": "auth", "access_token": token})
            msg = await ws.receive_json()
            if msg.get("type") != "auth_ok":
                raise RuntimeError(f"WS auth failed: {msg}")

            # Send command
            await ws.send_json({"id": 1, **cmd})
            msg = await ws.receive_json()
            if not msg.get("success"):
                raise RuntimeError(f"WS command failed: {msg}")

            return msg.get("result", [])


async def get_ha_device_registry() -> list[dict[str, Any]]:
    """Fetch complete HA device registry via WebSocket API."""
    try:
        return await _ws_command({"type": "config/device_registry/list"})
    except Exception as e:
        logger.error("Failed to get device registry: %s", e)
        return []


async def get_ha_entity_registry() -> list[dict[str, Any]]:
    """Fetch complete HA entity registry via WebSocket API."""
    try:
        return await _ws_command({"type": "config/entity_registry/list"})
    except Exception as e:
        logger.error("Failed to get entity registry: %s", e)
        return []
