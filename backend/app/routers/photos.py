"""Photo upload and retrieval endpoints."""

from __future__ import annotations

import os
import shutil
from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse

from app.config import settings
from app.database import get_db, dict_from_row

router = APIRouter(tags=["photos"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/devices/{device_uuid}/photos", status_code=201)
async def upload_photo(
    device_uuid: str,
    file: UploadFile = File(...),
    caption: str | None = Form(None),
    is_primary: bool = Form(False),
):
    # Validate device exists
    with get_db() as conn:
        device = dict_from_row(
            conn.execute("SELECT id FROM devices WHERE uuid = ? AND deleted_at IS NULL", (device_uuid,)).fetchone()
        )
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

    # Validate mime type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail=f"File type {content_type} not allowed. Allowed: {ALLOWED_MIME_TYPES}")

    # Read file
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)} MB")

    # Generate filename
    photo_uuid = uuid4().hex
    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }.get(content_type, ".jpg")

    filename = f"{photo_uuid}{ext}"
    filepath = settings.PHOTOS_DIR / filename

    # Ensure photos dir exists
    settings.PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

    # Write file
    with open(filepath, "wb") as f:
        f.write(content)

    # Insert DB record
    with get_db() as conn:
        device_id = device["id"]

        # If is_primary, clear other primaries
        if is_primary:
            conn.execute(
                "UPDATE photos SET is_primary = 0 WHERE device_id = ? AND deleted_at IS NULL",
                (device_id,),
            )

        conn.execute(
            "INSERT INTO photos (uuid, device_id, filename, mime_type, caption, is_primary) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (photo_uuid, device_id, filename, content_type, caption, 1 if is_primary else 0),
        )

        # Update device sync_version
        conn.execute(
            "UPDATE devices SET sync_version = sync_version + 1, updated_at = datetime('now') WHERE id = ?",
            (device_id,),
        )

        row = dict_from_row(
            conn.execute("SELECT * FROM photos WHERE uuid = ?", (photo_uuid,)).fetchone()
        )

    return row


THUMB_SIZE = 160  # px, lange Kante -- reicht fuer die 56-px-Kachel auf Retina


def _thumbnail_path(filepath, photo_uuid: str):
    """v3.1.0 (Roadmap Nr. 11): kleine JPEG-Miniatur fuer die Geraeteliste.

    Einmal erzeugt und neben den Fotos abgelegt. Schlaegt Pillow fehl
    (exotisches Format), liefert der Aufrufer das Original.
    """
    thumbs = settings.PHOTOS_DIR / "thumbs"
    target = thumbs / f"{photo_uuid}.jpg"
    if target.exists():
        return target
    try:
        from PIL import Image, ImageOps

        thumbs.mkdir(parents=True, exist_ok=True)
        with Image.open(filepath) as img:
            img = ImageOps.exif_transpose(img)
            img.thumbnail((THUMB_SIZE, THUMB_SIZE))
            img.convert("RGB").save(target, "JPEG", quality=80)
        return target
    except Exception:
        return None


@router.get("/photos/{photo_uuid}")
def get_photo(photo_uuid: str, thumb: bool = False):
    with get_db() as conn:
        row = dict_from_row(
            conn.execute("SELECT * FROM photos WHERE uuid = ? AND deleted_at IS NULL", (photo_uuid,)).fetchone()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Photo not found")

    filepath = settings.PHOTOS_DIR / row["filename"]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Photo file not found on disk")

    if thumb:
        small = _thumbnail_path(filepath, photo_uuid)
        if small is not None:
            return FileResponse(path=str(small), media_type="image/jpeg",
                                headers={"Cache-Control": "max-age=86400"})

    return FileResponse(
        path=str(filepath),
        media_type=row["mime_type"],
        filename=row["filename"],
    )


@router.delete("/photos/{photo_uuid}", status_code=204)
def delete_photo(photo_uuid: str):
    with get_db() as conn:
        row = dict_from_row(
            conn.execute("SELECT * FROM photos WHERE uuid = ? AND deleted_at IS NULL", (photo_uuid,)).fetchone()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Photo not found")

        conn.execute("UPDATE photos SET deleted_at = datetime('now') WHERE uuid = ?", (photo_uuid,))

        # Update device sync_version
        conn.execute(
            "UPDATE devices SET sync_version = sync_version + 1, updated_at = datetime('now') WHERE id = ?",
            (row["device_id"],),
        )

    # Optionally remove file from disk (soft delete keeps DB record)
    filepath = settings.PHOTOS_DIR / row["filename"]
    if filepath.exists():
        filepath.unlink()
