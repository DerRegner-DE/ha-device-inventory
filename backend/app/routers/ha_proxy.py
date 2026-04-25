"""Home Assistant proxy endpoints."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import ha_client
from app.services.device_sync import sync_ha_areas
from app.services.ha_import import import_ha_devices

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ha", tags=["home-assistant"])

# v2.5.3: HA imports on large setups (388+ devices) regularly took longer
# than HA Ingress' HTTP timeout, giving the client a 502 Bad Gateway even
# when the work itself completed successfully. We now run the import as a
# background asyncio task and expose a progress endpoint the frontend polls.
_IMPORT_STATE: dict = {
    "running": False,
    "stage": "idle",        # idle | fetching_registry | processing | linking_parents | done | error
    "progress": 0,          # devices processed so far
    "total": 0,             # total devices to process
    "started_at": None,
    "finished_at": None,
    "result": None,         # final result dict from import_ha_devices
    "error": None,          # error string, set when stage == "error"
}


def _progress_cb(stage: str, current: int, total: int) -> None:
    _IMPORT_STATE["stage"] = stage
    _IMPORT_STATE["progress"] = current
    _IMPORT_STATE["total"] = total


async def _run_import_task() -> None:
    _IMPORT_STATE.update({
        "running": True,
        "stage": "starting",
        "progress": 0,
        "total": 0,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "finished_at": None,
        "result": None,
        "error": None,
    })
    try:
        result = await import_ha_devices(progress_cb=_progress_cb)
        _IMPORT_STATE.update({
            "running": False,
            "stage": "done" if result.get("status") != "error" else "error",
            "result": result,
            "error": result.get("message") if result.get("status") == "error" else None,
            "finished_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:  # pragma: no cover - defensive catch-all
        logger.exception("HA import task failed")
        _IMPORT_STATE.update({
            "running": False,
            "stage": "error",
            "error": f"{type(e).__name__}: {e}",
            "finished_at": datetime.now(timezone.utc).isoformat(),
        })


class AreaUpdateRequest(BaseModel):
    area_id: str


class RecategorizeBody(BaseModel):
    """Optional filter for ``POST /recategorize`` and ``/recategorize/preview``.

    If ``uuids`` is None, the operation runs over *all* HA-imported devices.
    If present, it's scoped to just those devices — used by the "Kategorie
    auto-ermitteln"-bulk-action on selected rows in the device list.
    """
    uuids: Optional[list[str]] = None


class RecategorizeApplyItem(BaseModel):
    uuid: str
    expected_new_type: str  # TOCTOU guard: reject if the classifier now proposes
                             # something else (e.g. user changed the device in between).


class RecategorizeApplyBody(BaseModel):
    items: list[RecategorizeApplyItem]


@router.get("/areas")
async def get_ha_areas():
    """Fetch all HA areas and sync them to local DB."""
    result = await sync_ha_areas()
    if result.get("status") == "error":
        raise HTTPException(status_code=502, detail=result.get("message", "HA sync failed"))

    areas = await ha_client.get_areas()
    return {"areas": areas, "synced": result.get("areas_synced", 0)}


@router.get("/floors")
async def get_ha_floors():
    """Fetch all HA floors."""
    try:
        floors = await ha_client.get_floors()
        return {"floors": floors}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/devices")
async def get_ha_devices():
    """Fetch HA device/entity list."""
    try:
        devices = await ha_client.get_devices()
        return {"devices": devices, "total": len(devices)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/device/{device_id}")
async def get_ha_device(device_id: str):
    """Get detail for a single HA device."""
    try:
        detail = await ha_client.get_device_detail(device_id)
        if detail is None:
            raise HTTPException(status_code=404, detail="HA device not found")
        return detail
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/device/{device_id}/area")
async def update_ha_device_area(device_id: str, body: AreaUpdateRequest):
    """Update a device's area assignment in HA."""
    try:
        result = await ha_client.update_device_area(device_id, body.area_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/import-devices")
async def import_devices_from_ha():
    """Start a background HA-device import.

    v2.5.3: runs asynchronously so large setups don't hit the HA Ingress
    timeout. Returns immediately after kicking off the task; the frontend
    polls ``GET /api/ha/import-devices/status`` for progress and the final
    result.
    """
    if _IMPORT_STATE["running"]:
        return {
            "status": "already_running",
            "message": "Ein Import laeuft bereits.",
            "state": _IMPORT_STATE,
        }
    # Fire-and-forget; the task writes its progress into _IMPORT_STATE.
    asyncio.create_task(_run_import_task())
    # Give the task a tick to move out of "idle" so the first poll sees "starting".
    await asyncio.sleep(0)
    return {
        "status": "started",
        "message": "Import gestartet. Fortschritt ueber /api/ha/import-devices/status abrufen.",
        "state": _IMPORT_STATE,
    }


@router.get("/import-devices/status")
def get_import_status():
    """Return the current (or last completed) import state.

    Poll this endpoint every ~2 s while an import is running. When
    ``state.running`` goes back to ``false``, inspect ``state.stage``:
    ``done`` + ``state.result`` carries the final stats, ``error`` +
    ``state.error`` carries the failure reason.
    """
    return _IMPORT_STATE


@router.post("/cleanup-self-imports")
async def cleanup_self_imports():
    """One-shot cleanup for installations that ran HA-Import *before* v2.5.2.

    Pre-v2.5.2, the importer didn't filter out devices that the add-on
    itself had published via MQTT Discovery. Those devices have HA device
    identifiers like ``geraeteverwaltung_<uuid>`` and ``geraeteverwaltung_hub``.
    Each re-import doubled the inventory count. This endpoint soft-deletes
    inventory rows whose ha_device_id maps to such a device in HA today.
    """
    from app.database import get_db, dicts_from_rows
    from app.services.ha_client import get_ha_device_registry

    try:
        ha_devices = await get_ha_device_registry()
    except Exception as e:
        raise HTTPException(
            status_code=502, detail=f"Could not fetch HA registry: {e}"
        )

    self_ha_ids: set[str] = set()
    for dev in ha_devices or []:
        for ident in dev.get("identifiers") or []:
            if isinstance(ident, (list, tuple)) and len(ident) >= 2:
                second = ident[1]
            elif isinstance(ident, str):
                second = ident
            else:
                continue
            if isinstance(second, str) and second.startswith("geraeteverwaltung"):
                self_ha_ids.add(dev["id"])
                break

    if not self_ha_ids:
        return {"status": "ok", "purged": 0, "message": "Keine Self-Imports gefunden."}

    with get_db() as conn:
        placeholders = ", ".join(["?"] * len(self_ha_ids))
        affected = dicts_from_rows(
            conn.execute(
                f"SELECT uuid FROM devices WHERE ha_device_id IN ({placeholders}) "
                f"AND deleted_at IS NULL",
                tuple(self_ha_ids),
            ).fetchall()
        )
        if affected:
            conn.execute(
                f"UPDATE devices SET deleted_at = datetime('now'), "
                f"sync_version = sync_version + 1 "
                f"WHERE ha_device_id IN ({placeholders}) AND deleted_at IS NULL",
                tuple(self_ha_ids),
            )

    return {
        "status": "ok",
        "purged": len(affected),
        "ha_self_devices_in_registry": len(self_ha_ids),
        "message": (
            f"{len(affected)} Self-Import-Eintraege in den Papierkorb verschoben "
            "(wiederherstellbar fuer 30 Tage)."
        ),
    }


async def _load_recategorize_context(uuids: Optional[list[str]]):
    """Shared plumbing for recategorize preview + apply.

    Fetches HA registries, builds lookup maps, and returns the inventory
    rows to evaluate (optionally filtered by UUIDs). Raises HTTPException
    on registry fetch failures.
    """
    from app.database import get_db, dicts_from_rows
    from app.services.ha_client import get_ha_device_registry, get_ha_entity_registry

    try:
        ha_devices = await get_ha_device_registry()
        ha_entities = await get_ha_entity_registry()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch HA registry: {e}")

    if not ha_devices:
        raise HTTPException(status_code=502, detail="HA device registry empty — is the token valid?")

    entity_map: dict[str, list[dict]] = {}
    config_entry_domains: dict[str, str] = {}
    for ent in ha_entities:
        did = ent.get("device_id")
        if did:
            entity_map.setdefault(did, []).append(ent)
        ce = ent.get("config_entry_id")
        platform = ent.get("platform")
        if ce and platform:
            config_entry_domains[ce] = platform
    ha_device_map = {d["id"]: d for d in ha_devices}

    query = (
        "SELECT uuid, ha_device_id, typ, bezeichnung, hersteller, modell "
        "FROM devices WHERE ha_device_id IS NOT NULL AND deleted_at IS NULL"
    )
    params: list = []
    if uuids:
        placeholders = ", ".join(["?"] * len(uuids))
        query += f" AND uuid IN ({placeholders})"
        params.extend(uuids)

    with get_db() as conn:
        rows = dicts_from_rows(conn.execute(query, params).fetchall())

    return rows, ha_device_map, entity_map, config_entry_domains


def _classify_row(row: dict, ha_device_map: dict, entity_map: dict,
                  config_entry_domains: dict) -> tuple[Optional[str], str] | None:
    """Evaluate a single inventory row. Returns ``(new_type, evidence)`` or
    None if the device has no matching HA device (shouldn't happen normally).
    """
    from app.services.ha_import import (
        _guess_device_type_with_evidence,
        _guess_type_from_integration_with_evidence,
        _resolve_primary_integration,
    )

    ha_dev = ha_device_map.get(row["ha_device_id"])
    if not ha_dev:
        return None

    device_entities = entity_map.get(row["ha_device_id"], [])
    integration_domain = _resolve_primary_integration(ha_dev, config_entry_domains)

    int_type, int_evidence = _guess_type_from_integration_with_evidence(integration_domain)
    if int_type is not None:
        return int_type, int_evidence or f"integration={integration_domain}"

    return _guess_device_type_with_evidence(ha_dev, device_entities, integration_domain)


@router.post("/recategorize/preview")
async def recategorize_preview(body: Optional[RecategorizeBody] = None):
    """Compute what the classifier *would* assign, without writing.

    Returns the full diff list so the UI can render a table with checkboxes.
    The frontend then posts the confirmed subset back via ``/recategorize/apply``.
    """
    uuids = body.uuids if body else None
    rows, ha_device_map, entity_map, config_entry_domains = await _load_recategorize_context(uuids)

    changes: list[dict] = []
    unchanged = 0
    skipped_no_ha = 0

    for row in rows:
        classified = _classify_row(row, ha_device_map, entity_map, config_entry_domains)
        if classified is None:
            skipped_no_ha += 1
            continue
        new_type, evidence = classified
        if new_type != row["typ"]:
            changes.append({
                "uuid": row["uuid"],
                "bezeichnung": row["bezeichnung"],
                "hersteller": row["hersteller"],
                "modell": row["modell"],
                "old_type": row["typ"],
                "new_type": new_type,
                "evidence": evidence,
            })
        else:
            unchanged += 1

    return {
        "status": "ok",
        "changes": changes,
        "unchanged": unchanged,
        "skipped_no_ha": skipped_no_ha,
        "total": len(rows),
    }


@router.post("/recategorize/apply")
async def recategorize_apply(body: RecategorizeApplyBody):
    """Apply only the explicitly confirmed subset from a preview.

    Each item includes ``expected_new_type`` — we re-run the classifier and
    skip the device if the proposal has changed since preview (TOCTOU guard,
    e.g. user renamed the device in HA in between).
    Takes a DB snapshot before writing so the whole batch is rollback-able.
    """
    from app.database import get_db
    from app.services.snapshots import create_snapshot

    if not body.items:
        raise HTTPException(status_code=400, detail="No items to apply")

    uuids = [it.uuid for it in body.items]
    expected = {it.uuid: it.expected_new_type for it in body.items}

    rows, ha_device_map, entity_map, config_entry_domains = await _load_recategorize_context(uuids)

    # Snapshot once for the whole apply batch.
    create_snapshot("recategorize_apply")

    applied = 0
    skipped_toctou = 0
    skipped_no_ha = 0

    with get_db() as conn:
        for row in rows:
            classified = _classify_row(row, ha_device_map, entity_map, config_entry_domains)
            if classified is None:
                skipped_no_ha += 1
                continue
            new_type, _evidence = classified
            if new_type != expected.get(row["uuid"]):
                # Proposal drifted between preview and apply — don't silently
                # apply something the user didn't see in the preview.
                skipped_toctou += 1
                continue
            if new_type == row["typ"]:
                continue  # nothing to do
            from app.services.history import log_changes  # local import, avoid startup-time coupling
            conn.execute(
                "UPDATE devices SET typ = ?, updated_at = datetime('now'), "
                "sync_version = sync_version + 1 WHERE uuid = ?",
                (str(new_type), row["uuid"]),
            )
            log_changes(
                conn, row["uuid"],
                {"typ": row["typ"]}, {"typ": new_type},
                source="recategorize",
            )
            applied += 1

    return {
        "status": "ok",
        "applied": applied,
        "skipped_toctou": skipped_toctou,
        "skipped_no_ha": skipped_no_ha,
        "total_requested": len(body.items),
    }


@router.post("/recategorize")
async def recategorize_ha_devices(body: Optional[RecategorizeBody] = None):
    """Legacy "apply immediately" endpoint. Kept for backward compat with v2.4.0
    Settings UI. New UI uses the preview+apply pair instead.

    If ``body.uuids`` is provided, only those devices are evaluated —
    supports the "Kategorie auto-ermitteln"-Bulk-Aktion on the device list.
    """
    from app.database import get_db
    from app.services.snapshots import create_snapshot

    uuids = body.uuids if body else None
    rows, ha_device_map, entity_map, config_entry_domains = await _load_recategorize_context(uuids)

    create_snapshot("recategorize")

    updated = 0
    unchanged = 0
    skipped_no_ha = 0
    changes: list[dict] = []

    with get_db() as conn:
        for row in rows:
            classified = _classify_row(row, ha_device_map, entity_map, config_entry_domains)
            if classified is None:
                skipped_no_ha += 1
                continue
            new_type, evidence = classified
            if new_type != row["typ"]:
                from app.services.history import log_changes
                conn.execute(
                    "UPDATE devices SET typ = ?, updated_at = datetime('now'), "
                    "sync_version = sync_version + 1 WHERE uuid = ?",
                    (str(new_type), row["uuid"]),
                )
                log_changes(
                    conn, row["uuid"],
                    {"typ": row["typ"]}, {"typ": new_type},
                    source="recategorize",
                )
                updated += 1
                if len(changes) < 50:
                    changes.append({
                        "uuid": row["uuid"],
                        "bezeichnung": row["bezeichnung"],
                        "old_type": row["typ"],
                        "new_type": new_type,
                        "evidence": evidence,
                    })
            else:
                unchanged += 1

    return {
        "status": "ok",
        "updated": updated,
        "unchanged": unchanged,
        "skipped_no_ha": skipped_no_ha,
        "total": len(rows),
        "sample_changes": changes,
    }
