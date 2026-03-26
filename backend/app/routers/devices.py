"""Device CRUD endpoints."""

from __future__ import annotations

import asyncio
import math
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from app.database import get_db, dict_from_row, dicts_from_rows
from app.models import Device, DeviceCreate, DeviceUpdate, DeviceListResponse, Photo
from app.services.mqtt_discovery import publish_device, remove_device as mqtt_remove_device

router = APIRouter(prefix="/devices", tags=["devices"])

SORTABLE_FIELDS = {
    "nr", "typ", "bezeichnung", "modell", "hersteller", "standort_name",
    "integration", "netzwerk", "created_at", "updated_at",
}


def _build_device_response(device_row: dict, conn) -> dict:
    """Attach photos to a device dict."""
    photos = dicts_from_rows(
        conn.execute(
            "SELECT * FROM photos WHERE device_id = ? AND deleted_at IS NULL ORDER BY is_primary DESC, created_at",
            (device_row["id"],)
        ).fetchall()
    )
    device_row["photos"] = photos
    return device_row


@router.get("", response_model=DeviceListResponse)
def list_devices(
    q: str | None = Query(None, description="Search query (bezeichnung, modell, hersteller, funktion)"),
    typ: str | None = Query(None, description="Filter by typ"),
    standort: str | None = Query(None, description="Filter by standort_area_id or standort_name"),
    floor: str | None = Query(None, description="Filter by standort_floor_id"),
    integration: str | None = Query(None, description="Filter by integration"),
    netzwerk: str | None = Query(None, description="Filter by netzwerk"),
    sort: str = Query("nr", description="Sort field"),
    order: str = Query("asc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=500, description="Items per page"),
):
    where_clauses = ["deleted_at IS NULL"]
    params: list[Any] = []

    if q:
        where_clauses.append(
            "(bezeichnung LIKE ? OR modell LIKE ? OR hersteller LIKE ? OR funktion LIKE ? OR anmerkungen LIKE ?)"
        )
        like = f"%{q}%"
        params.extend([like, like, like, like, like])

    if typ:
        where_clauses.append("typ = ?")
        params.append(typ)

    if standort:
        where_clauses.append("(standort_area_id = ? OR standort_name LIKE ?)")
        params.extend([standort, f"%{standort}%"])

    if floor:
        where_clauses.append("standort_floor_id = ?")
        params.append(floor)

    if integration:
        where_clauses.append("integration LIKE ?")
        params.append(f"%{integration}%")

    if netzwerk:
        where_clauses.append("netzwerk LIKE ?")
        params.append(f"%{netzwerk}%")

    where_sql = " AND ".join(where_clauses)

    # Validate sort field
    sort_field = sort if sort in SORTABLE_FIELDS else "nr"
    sort_order = "DESC" if order.lower() == "desc" else "ASC"

    with get_db() as conn:
        # Count
        count_row = conn.execute(f"SELECT COUNT(*) as cnt FROM devices WHERE {where_sql}", params).fetchone()
        total = count_row["cnt"]

        # Paginated query
        offset = (page - 1) * per_page
        rows = dicts_from_rows(
            conn.execute(
                f"SELECT * FROM devices WHERE {where_sql} ORDER BY {sort_field} {sort_order} LIMIT ? OFFSET ?",
                params + [per_page, offset],
            ).fetchall()
        )

        items = [_build_device_response(r, conn) for r in rows]

    return DeviceListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 1,
    )


@router.get("/{uuid}", response_model=Device)
def get_device(uuid: str):
    with get_db() as conn:
        row = dict_from_row(
            conn.execute("SELECT * FROM devices WHERE uuid = ? AND deleted_at IS NULL", (uuid,)).fetchone()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Device not found")
        return _build_device_response(row, conn)


@router.post("", response_model=Device, status_code=201)
def create_device(body: DeviceCreate, background_tasks: BackgroundTasks):
    device_uuid = body.uuid or uuid4().hex

    fields = {
        "uuid": device_uuid,
        "typ": body.typ,
        "bezeichnung": body.bezeichnung,
    }

    # Add optional fields if provided
    optional = [
        "nr", "modell", "hersteller", "standort_area_id", "standort_name",
        "standort_floor_id", "seriennummer", "mac_adresse", "ip_adresse",
        "firmware", "integration", "stromversorgung", "netzwerk",
        "anschaffungsdatum", "garantie_bis", "funktion", "anmerkungen",
        "ha_entity_id", "ha_device_id", "ain_artikelnr",
    ]
    for f in optional:
        val = getattr(body, f, None)
        if val is not None:
            fields[f] = val

    columns = ", ".join(fields.keys())
    placeholders = ", ".join(["?"] * len(fields))
    values = list(fields.values())

    with get_db() as conn:
        conn.execute(f"INSERT INTO devices ({columns}) VALUES ({placeholders})", values)
        row = dict_from_row(
            conn.execute("SELECT * FROM devices WHERE uuid = ?", (device_uuid,)).fetchone()
        )
        result = _build_device_response(row, conn)

    # Publish to HA via MQTT discovery (non-blocking)
    background_tasks.add_task(asyncio.create_task, publish_device(result))
    return result


@router.put("/{uuid}", response_model=Device)
def update_device(uuid: str, body: DeviceUpdate, background_tasks: BackgroundTasks):
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    sets = []
    params: list[Any] = []
    for k, v in update_data.items():
        sets.append(f"{k} = ?")
        params.append(v)

    sets.append("updated_at = datetime('now')")
    sets.append("sync_version = sync_version + 1")
    params.append(uuid)

    with get_db() as conn:
        cursor = conn.execute(
            f"UPDATE devices SET {', '.join(sets)} WHERE uuid = ? AND deleted_at IS NULL",
            params,
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Device not found")

        row = dict_from_row(
            conn.execute("SELECT * FROM devices WHERE uuid = ?", (uuid,)).fetchone()
        )
        result = _build_device_response(row, conn)

    # Re-publish to HA via MQTT discovery (non-blocking)
    background_tasks.add_task(asyncio.create_task, publish_device(result))
    return result


@router.delete("/{uuid}", status_code=204)
def delete_device(uuid: str, background_tasks: BackgroundTasks):
    with get_db() as conn:
        cursor = conn.execute(
            "UPDATE devices SET deleted_at = datetime('now'), sync_version = sync_version + 1 "
            "WHERE uuid = ? AND deleted_at IS NULL",
            (uuid,),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Device not found")

        # Soft-delete associated photos
        conn.execute(
            "UPDATE photos SET deleted_at = datetime('now') "
            "WHERE device_id = (SELECT id FROM devices WHERE uuid = ?)",
            (uuid,),
        )

    # Remove from HA via MQTT discovery (non-blocking)
    background_tasks.add_task(asyncio.create_task, mqtt_remove_device(uuid))
