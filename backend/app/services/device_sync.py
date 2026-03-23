"""Reconcile HA devices with local inventory."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.database import get_db, dicts_from_rows
from app.services import ha_client

logger = logging.getLogger(__name__)


async def sync_ha_areas() -> dict[str, Any]:
    """Sync HA areas and floors into ha_areas table."""
    try:
        areas = await ha_client.get_areas()
        floors = await ha_client.get_floors()
    except Exception as e:
        logger.error("Failed to fetch HA areas/floors: %s", e)
        return {"status": "error", "message": str(e)}

    floor_map: dict[str, str] = {}
    for f in floors:
        fid = f.get("floor_id", "")
        fname = f.get("name", "")
        if fid:
            floor_map[fid] = fname

    now = datetime.now(timezone.utc).isoformat()
    synced = 0

    with get_db() as conn:
        for area in areas:
            area_id = area.get("area_id", "")
            name = area.get("name", "")
            floor_id = area.get("floor_id")
            floor_name = floor_map.get(floor_id, "") if floor_id else None
            icon = area.get("icon")

            if not area_id:
                continue

            conn.execute("""
                INSERT INTO ha_areas (area_id, name, floor_id, floor_name, icon, last_synced)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(area_id) DO UPDATE SET
                    name = excluded.name,
                    floor_id = excluded.floor_id,
                    floor_name = excluded.floor_name,
                    icon = excluded.icon,
                    last_synced = excluded.last_synced
            """, (area_id, name, floor_id, floor_name, icon, now))
            synced += 1

    logger.info("Synced %d areas from HA", synced)
    return {"status": "ok", "areas_synced": synced}


async def find_unlinked_ha_devices() -> list[dict[str, Any]]:
    """Find HA devices that are not yet linked to any inventory device."""
    try:
        ha_devices = await ha_client.get_devices()
    except Exception as e:
        logger.error("Failed to fetch HA devices: %s", e)
        return []

    with get_db() as conn:
        rows = conn.execute(
            "SELECT ha_entity_id, ha_device_id FROM devices WHERE deleted_at IS NULL"
        ).fetchall()
        linked_entity_ids = {r["ha_entity_id"] for r in rows if r["ha_entity_id"]}
        linked_device_ids = {r["ha_device_id"] for r in rows if r["ha_device_id"]}

    unlinked = []
    for d in ha_devices:
        eid = d.get("entity_id", "")
        did = d.get("device_id", "")
        if eid not in linked_entity_ids and did not in linked_device_ids:
            unlinked.append(d)

    return unlinked


def link_device_to_ha(device_uuid: str, ha_entity_id: str | None = None, ha_device_id: str | None = None) -> bool:
    """Link an inventory device to an HA entity/device."""
    if not ha_entity_id and not ha_device_id:
        return False

    with get_db() as conn:
        updates = []
        params: list[Any] = []

        if ha_entity_id:
            updates.append("ha_entity_id = ?")
            params.append(ha_entity_id)
        if ha_device_id:
            updates.append("ha_device_id = ?")
            params.append(ha_device_id)

        updates.append("updated_at = datetime('now')")
        updates.append("sync_version = sync_version + 1")

        params.append(device_uuid)
        sql = f"UPDATE devices SET {', '.join(updates)} WHERE uuid = ? AND deleted_at IS NULL"

        cursor = conn.execute(sql, params)
        return cursor.rowcount > 0


def get_sync_version() -> int:
    """Get the current maximum sync version across all devices."""
    with get_db() as conn:
        row = conn.execute("SELECT COALESCE(MAX(sync_version), 0) as v FROM devices").fetchone()
        return row["v"] if row else 0


def get_changes_since(since_version: int) -> dict[str, Any]:
    """Get all changes since the given sync version."""
    with get_db() as conn:
        devices = dicts_from_rows(
            conn.execute(
                "SELECT * FROM devices WHERE sync_version > ?",
                (since_version,)
            ).fetchall()
        )
        photos = dicts_from_rows(
            conn.execute(
                "SELECT p.* FROM photos p JOIN devices d ON p.device_id = d.id WHERE d.sync_version > ?",
                (since_version,)
            ).fetchall()
        )
        areas = dicts_from_rows(
            conn.execute("SELECT * FROM ha_areas").fetchall()
        )

    return {
        "devices": devices,
        "photos": photos,
        "areas": areas,
        "current_version": get_sync_version(),
    }


def apply_sync_push(client_id: str, changes: list[dict[str, Any]]) -> dict[str, Any]:
    """Apply a batch of changes from a client."""
    applied = 0
    errors: list[str] = []

    with get_db() as conn:
        for change in changes:
            entity_type = change.get("entity_type", "")
            entity_uuid = change.get("entity_uuid", "")
            action = change.get("action", "")
            payload = change.get("payload")

            try:
                if entity_type == "device":
                    _apply_device_change(conn, entity_uuid, action, payload)
                elif entity_type == "photo":
                    _apply_photo_change(conn, entity_uuid, action, payload)
                else:
                    errors.append(f"Unknown entity_type: {entity_type}")
                    continue

                # Log the sync
                conn.execute(
                    "INSERT INTO sync_log (entity_type, entity_uuid, action, payload, client_id, synced_at) "
                    "VALUES (?, ?, ?, ?, ?, datetime('now'))",
                    (entity_type, entity_uuid, action, json.dumps(payload) if payload else None, client_id)
                )
                applied += 1

            except Exception as e:
                errors.append(f"{entity_type}/{entity_uuid}: {str(e)}")

    return {"applied": applied, "errors": errors, "current_version": get_sync_version()}


def _apply_device_change(conn, uuid: str, action: str, payload: dict | None) -> None:
    if action == "create" and payload:
        fields = [k for k in payload.keys() if k not in ("id", "created_at", "updated_at", "sync_version")]
        if "uuid" not in fields:
            fields.insert(0, "uuid")
            payload["uuid"] = uuid
        placeholders = ", ".join(["?"] * len(fields))
        columns = ", ".join(fields)
        values = [payload.get(f) for f in fields]
        conn.execute(f"INSERT INTO devices ({columns}) VALUES ({placeholders})", values)

    elif action == "update" and payload:
        sets = []
        values = []
        for k, v in payload.items():
            if k in ("id", "uuid", "created_at"):
                continue
            sets.append(f"{k} = ?")
            values.append(v)
        sets.append("updated_at = datetime('now')")
        sets.append("sync_version = sync_version + 1")
        values.append(uuid)
        conn.execute(f"UPDATE devices SET {', '.join(sets)} WHERE uuid = ?", values)

    elif action == "delete":
        conn.execute(
            "UPDATE devices SET deleted_at = datetime('now'), sync_version = sync_version + 1 WHERE uuid = ?",
            (uuid,)
        )


def _apply_photo_change(conn, uuid: str, action: str, payload: dict | None) -> None:
    if action == "delete":
        conn.execute("UPDATE photos SET deleted_at = datetime('now') WHERE uuid = ?", (uuid,))
