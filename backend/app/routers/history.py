"""Per-device change history endpoints (v2.5.0)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.services import history as history_svc

router = APIRouter(tags=["history"])


@router.get("/devices/{device_uuid}/history")
def get_device_history(device_uuid: str, limit: int = 100):
    """Newest-first list of per-field changes for one device."""
    with get_db() as conn:
        exists = conn.execute(
            "SELECT 1 FROM devices WHERE uuid = ?", (device_uuid,)
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Device not found")
        rows = history_svc.fetch_history(conn, device_uuid, limit=max(1, min(limit, 500)))
    return {"items": rows, "total": len(rows)}


@router.post("/devices/{device_uuid}/history/{entry_id}/revert")
def revert_history_entry(device_uuid: str, entry_id: int):
    """Revert a single past field-change. The revert itself is logged as a
    new entry tagged ``source='revert'`` so it's visible in the history."""
    with get_db() as conn:
        reverted = history_svc.revert_entry(conn, device_uuid, entry_id)
        if not reverted:
            raise HTTPException(
                status_code=404,
                detail="History entry not found (or field is no longer trackable)",
            )
    return {"status": "ok", "reverted": reverted}
