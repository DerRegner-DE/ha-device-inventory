"""Excel import endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, File, Query

from app.database import get_db
from app.services.excel_import import parse_xlsx, import_devices_to_db

router = APIRouter(prefix="/import", tags=["import"])

MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/xlsx")
async def import_xlsx(
    file: UploadFile = File(...),
    replace: bool = Query(False, description="If true, delete all existing devices before import"),
):
    """Import devices from an Excel file in Geraeteuebersicht format."""
    content_type = file.content_type or ""
    if "spreadsheet" not in content_type and not (file.filename or "").endswith(".xlsx"):
        raise HTTPException(
            status_code=400,
            detail="File must be an Excel .xlsx file",
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_UPLOAD_SIZE // (1024*1024)} MB",
        )

    # Parse the Excel file
    try:
        devices = parse_xlsx(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {str(e)}")

    if not devices:
        raise HTTPException(status_code=400, detail="No devices found in the Excel file")

    # Import into DB
    with get_db() as conn:
        if replace:
            # Soft-delete all existing devices
            conn.execute("UPDATE devices SET deleted_at = datetime('now') WHERE deleted_at IS NULL")
            conn.execute("UPDATE photos SET deleted_at = datetime('now') WHERE deleted_at IS NULL")

        count = import_devices_to_db(conn, devices)

    return {
        "status": "ok",
        "imported": count,
        "total_parsed": len(devices),
        "replaced_existing": replace,
    }
