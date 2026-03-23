"""Sync endpoints for offline-first PWA support."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.models import SyncPush, SyncPullResponse, SyncStatus
from app.services.device_sync import get_changes_since, apply_sync_push, get_sync_version
from app.database import get_db

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("/pull", response_model=SyncPullResponse)
def sync_pull(since_version: int = Query(0, ge=0, description="Get changes since this version")):
    data = get_changes_since(since_version)
    return SyncPullResponse(**data)


@router.post("/push")
def sync_push(body: SyncPush):
    changes = [c.model_dump() for c in body.changes]
    result = apply_sync_push(body.client_id, changes)
    return result


@router.get("/status", response_model=SyncStatus)
def sync_status():
    with get_db() as conn:
        dev_count = conn.execute("SELECT COUNT(*) as c FROM devices WHERE deleted_at IS NULL").fetchone()["c"]
        photo_count = conn.execute("SELECT COUNT(*) as c FROM photos WHERE deleted_at IS NULL").fetchone()["c"]
        area_count = conn.execute("SELECT COUNT(*) as c FROM ha_areas").fetchone()["c"]
        last_sync_row = conn.execute("SELECT MAX(last_synced) as ls FROM ha_areas").fetchone()
        last_sync = last_sync_row["ls"] if last_sync_row else None

    return SyncStatus(
        current_version=get_sync_version(),
        total_devices=dev_count,
        total_photos=photo_count,
        total_areas=area_count,
        last_ha_sync=last_sync,
    )
