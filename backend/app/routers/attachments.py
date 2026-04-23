"""Per-device image attachments (v2.5.0, Todo82 feature).

Distinct from ``photos`` — which holds a single representative image.
Attachments are many, captioned, and meant for Einbauort-/Nachlass-Doku
("Schalter hinter Abdeckung, unter Bett", "Sicherungskasten Ebene 2"
etc.). Up to a small limit per device so the SQLite DB and filesystem
don't explode.
"""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Form, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from app.config import settings
from app.database import dict_from_row, dicts_from_rows, get_db

router = APIRouter(tags=["attachments"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB per file
MAX_PER_DEVICE = 20  # Plenty for installation docs, keeps DB sane.

# Share the photos directory but distinguish filenames with an ``att_`` prefix
# so a future migration can split them if needed.
_FILE_PREFIX = "att_"


@router.post("/devices/{device_uuid}/attachments", status_code=201)
async def upload_attachment(
    device_uuid: str,
    file: UploadFile = File(...),
    caption: str | None = Form(None),
):
    with get_db() as conn:
        device = dict_from_row(
            conn.execute(
                "SELECT id FROM devices WHERE uuid = ? AND deleted_at IS NULL",
                (device_uuid,),
            ).fetchone()
        )
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

        existing = conn.execute(
            "SELECT COUNT(*) FROM attachments WHERE device_id = ? AND deleted_at IS NULL",
            (device["id"],),
        ).fetchone()[0]
        if existing >= MAX_PER_DEVICE:
            raise HTTPException(
                status_code=400,
                detail=f"Device already has {MAX_PER_DEVICE} attachments (max).",
            )

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type {content_type} not allowed. Allowed: {sorted(ALLOWED_MIME_TYPES)}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)} MB",
        )

    att_uuid = uuid4().hex
    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }.get(content_type, ".jpg")
    filename = f"{_FILE_PREFIX}{att_uuid}{ext}"
    filepath = settings.PHOTOS_DIR / filename

    settings.PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(content)

    with get_db() as conn:
        # sort_order = current max + 1 so new ones go to the bottom.
        next_order = conn.execute(
            "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM attachments WHERE device_id = ?",
            (device["id"],),
        ).fetchone()[0]
        conn.execute(
            "INSERT INTO attachments (uuid, device_id, filename, mime_type, caption, sort_order) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (att_uuid, device["id"], filename, content_type, caption, next_order),
        )
        conn.execute(
            "UPDATE devices SET sync_version = sync_version + 1, updated_at = datetime('now') WHERE id = ?",
            (device["id"],),
        )
        row = dict_from_row(
            conn.execute("SELECT * FROM attachments WHERE uuid = ?", (att_uuid,)).fetchone()
        )
    return row


@router.get("/devices/{device_uuid}/attachments")
def list_attachments(device_uuid: str):
    with get_db() as conn:
        device = dict_from_row(
            conn.execute(
                "SELECT id FROM devices WHERE uuid = ? AND deleted_at IS NULL",
                (device_uuid,),
            ).fetchone()
        )
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        rows = dicts_from_rows(
            conn.execute(
                "SELECT uuid, filename, mime_type, caption, sort_order, created_at "
                "FROM attachments WHERE device_id = ? AND deleted_at IS NULL "
                "ORDER BY sort_order ASC, created_at ASC",
                (device["id"],),
            ).fetchall()
        )
    return {"items": rows, "total": len(rows)}


@router.get("/attachments/{att_uuid}")
def get_attachment(att_uuid: str):
    with get_db() as conn:
        row = dict_from_row(
            conn.execute(
                "SELECT * FROM attachments WHERE uuid = ? AND deleted_at IS NULL",
                (att_uuid,),
            ).fetchone()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Attachment not found")
    filepath = settings.PHOTOS_DIR / row["filename"]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Attachment file not found on disk")
    return FileResponse(
        path=str(filepath),
        media_type=row["mime_type"],
        filename=row["filename"],
    )


@router.patch("/attachments/{att_uuid}")
def update_attachment(att_uuid: str, caption: str | None = Form(None)):
    """Update caption of an attachment. Caption-only for now — reordering
    would need a separate bulk endpoint."""
    with get_db() as conn:
        row = dict_from_row(
            conn.execute(
                "SELECT * FROM attachments WHERE uuid = ? AND deleted_at IS NULL",
                (att_uuid,),
            ).fetchone()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Attachment not found")
        conn.execute(
            "UPDATE attachments SET caption = ? WHERE uuid = ?",
            (caption, att_uuid),
        )
        conn.execute(
            "UPDATE devices SET sync_version = sync_version + 1, updated_at = datetime('now') WHERE id = ?",
            (row["device_id"],),
        )
    return {"status": "ok", "uuid": att_uuid, "caption": caption}


@router.delete("/attachments/{att_uuid}", status_code=204)
def delete_attachment(att_uuid: str):
    with get_db() as conn:
        row = dict_from_row(
            conn.execute(
                "SELECT * FROM attachments WHERE uuid = ? AND deleted_at IS NULL",
                (att_uuid,),
            ).fetchone()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Attachment not found")
        conn.execute(
            "UPDATE attachments SET deleted_at = datetime('now') WHERE uuid = ?",
            (att_uuid,),
        )
        conn.execute(
            "UPDATE devices SET sync_version = sync_version + 1, updated_at = datetime('now') WHERE id = ?",
            (row["device_id"],),
        )
