"""Home Assistant proxy endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import ha_client
from app.services.device_sync import sync_ha_areas

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
