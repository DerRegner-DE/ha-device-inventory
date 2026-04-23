"""Home Assistant proxy endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import ha_client
from app.services.device_sync import sync_ha_areas
from app.services.ha_import import import_ha_devices

router = APIRouter(prefix="/ha", tags=["home-assistant"])


class AreaUpdateRequest(BaseModel):
    area_id: str


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
    """Import all HA devices into the Geräteverwaltung inventory.

    - Fetches device + entity registries via WebSocket API
    - Maps HA fields to inventory fields (type, area, integration, network)
    - Deduplicates by ha_device_id (safe to run multiple times)
    - Returns import statistics
    """
    try:
        result = await import_ha_devices()
        if result.get("status") == "error":
            raise HTTPException(status_code=502, detail=result.get("message"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/recategorize")
async def recategorize_ha_devices():
    """Re-run the device-type classifier on all imported devices.

    Fetches fresh entity/device registries from HA and applies the current
    classification logic to every inventory device that has an ``ha_device_id``.
    Returns stats: how many devices changed type, how many stayed the same.

    Use this after upgrading to a new categorisation version (e.g. v2.4.0)
    to fix categories that were assigned by an older buggy classifier.
    """
    from app.database import get_db, dicts_from_rows
    from app.services.ha_client import get_ha_device_registry, get_ha_entity_registry
    from app.services.ha_import import _guess_device_type, _guess_type_from_integration
    from app.services.snapshots import create_snapshot

    try:
        ha_devices = await get_ha_device_registry()
        ha_entities = await get_ha_entity_registry()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch HA registry: {e}")

    if not ha_devices:
        raise HTTPException(status_code=502, detail="HA device registry empty — is the token valid?")

    # Snapshot before we mass-update categories — restorable via /api/snapshots.
    create_snapshot("recategorize")

    # Build lookups
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

    updated = 0
    unchanged = 0
    skipped_no_ha = 0
    changes: list[dict] = []

    with get_db() as conn:
        rows = dicts_from_rows(conn.execute(
            "SELECT uuid, ha_device_id, typ, bezeichnung "
            "FROM devices WHERE ha_device_id IS NOT NULL AND deleted_at IS NULL"
        ).fetchall())

        for row in rows:
            uuid_ = row["uuid"]
            ha_id = row["ha_device_id"]
            old_type = row["typ"]
            ha_dev = ha_device_map.get(ha_id)
            if not ha_dev:
                skipped_no_ha += 1
                continue

            device_entities = entity_map.get(ha_id, [])
            integration_domain = None
            for ce_id in ha_dev.get("config_entries", []):
                if ce_id in config_entry_domains:
                    integration_domain = config_entry_domains[ce_id]
                    break

            type_from_integration = _guess_type_from_integration(integration_domain)
            if type_from_integration is None:
                new_type = _guess_device_type(ha_dev, device_entities, integration_domain)
            else:
                new_type = type_from_integration

            if new_type != old_type:
                conn.execute(
                    "UPDATE devices SET typ = ?, updated_at = datetime('now'), "
                    "sync_version = sync_version + 1 WHERE uuid = ?",
                    (str(new_type), uuid_),
                )
                updated += 1
                # Capture first 50 changes so the UI can show them for review.
                if len(changes) < 50:
                    changes.append({
                        "uuid": uuid_,
                        "bezeichnung": row["bezeichnung"],
                        "old_type": old_type,
                        "new_type": new_type,
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
