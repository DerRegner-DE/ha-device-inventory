"""Regression tests for the MQTT-Discovery purge endpoint (v2.6.0).

Forum-report: a community user reported 282 retained discovery topics
under ``homeassistant/+/geraeteverwaltung/+/config`` that survived even
after emptying the inventory's trash. The only available workaround was
MQTT Explorer — manual topic-by-topic deletion.

The new ``POST /api/mqtt/purge-discovery`` endpoint implements the same
cleanup in one call: subscribe to the namespace, collect retained
config payloads, then publish empty retained payloads on each topic
(MQTT-Discovery's documented "remove this entity" convention).

These tests pin the *contract* — endpoint exists, takes a scope param,
returns the expected shape — without spinning up a real broker.
"""

from __future__ import annotations

import inspect
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def test_purge_discovery_function_exists():
    """The service module must expose a coroutine ``purge_discovery``."""
    from app.services import mqtt_discovery

    assert hasattr(mqtt_discovery, "purge_discovery"), (
        "mqtt_discovery.purge_discovery must exist — it's the Forum-fix "
        "for retained-topic cleanup."
    )
    assert inspect.iscoroutinefunction(mqtt_discovery.purge_discovery), (
        "purge_discovery must be async (uses aiomqtt.Client async ctx)."
    )


def test_purge_discovery_signature():
    """Required parameters: ``scope`` (str) and ``active_uuids`` (set[str]).

    The router builds ``active_uuids`` from the live device list before
    calling this — if the signature drifts, the router would silently
    pass garbage. Pin it.
    """
    from app.services.mqtt_discovery import purge_discovery

    sig = inspect.signature(purge_discovery)
    params = list(sig.parameters.keys())
    assert params[0] == "scope", (
        f"first param must be 'scope', got {params[0]}"
    )
    assert params[1] == "active_uuids", (
        f"second param must be 'active_uuids', got {params[1]}"
    )


def test_purge_discovery_rejects_invalid_scope():
    """An invalid scope (e.g. typo'd 'orphan' or 'everything') must
    short-circuit with an error, not silently subscribe + delete topics.
    """
    import asyncio
    from app.services.mqtt_discovery import purge_discovery

    result = asyncio.run(purge_discovery("nonsense_scope", set()))
    assert result.get("error"), (
        f"invalid scope should set 'error' in result, got {result}"
    )
    assert result.get("purged") == 0, (
        "no topics should be purged when scope is invalid"
    )


def test_purge_endpoint_registered_in_main():
    """The FastAPI app must expose ``POST /api/mqtt/purge-discovery``.

    We grep the main.py source instead of importing the full app —
    main.py drags in fpdf, python-multipart and other heavy deps that
    are present in the production image but not necessarily in a slim
    test environment. The decorator literal is what matters: if it's
    not in source, the route never registers at runtime either.
    """
    main_path = Path(__file__).resolve().parent.parent / "app" / "main.py"
    src = main_path.read_text(encoding="utf-8")
    assert '@app.post("/api/mqtt/purge-discovery")' in src, (
        "POST /api/mqtt/purge-discovery is missing — the Settings UI "
        "buttons depend on it. v2.6.0 forum-fix."
    )


def test_purge_body_default_scope_is_orphans():
    """Default scope should be the *safe* one (orphans) so a stray
    POST without body doesn't wipe everything.

    Same source-grep approach as the endpoint test — the literal in the
    Pydantic class definition is what FastAPI binds at startup.
    """
    main_path = Path(__file__).resolve().parent.parent / "app" / "main.py"
    src = main_path.read_text(encoding="utf-8")
    assert "class MqttPurgeBody" in src, "MqttPurgeBody class missing"
    # Find the class block and check the scope default.
    cls_start = src.index("class MqttPurgeBody")
    cls_block = src[cls_start:cls_start + 500]
    assert 'scope: str = "orphans"' in cls_block, (
        "Default scope must be 'orphans' (safe) — sending an empty body "
        "must NOT trigger the destructive 'all' purge."
    )
