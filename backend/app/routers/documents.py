"""Document upload and retrieval endpoints (manuals, datasheets, etc.)."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import settings
from app.database import get_db, dict_from_row, dicts_from_rows

router = APIRouter(tags=["documents"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/jpeg",
    "image/png",
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
DOCS_DIR = settings.PHOTOS_DIR.parent / "documents"


class DocumentLinkBody(BaseModel):
    url: str
    caption: str | None = None


@router.get("/devices/{device_uuid}/documents")
def list_documents(device_uuid: str):
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
                "SELECT uuid, filename, mime_type, file_size, caption, url, created_at "
                "FROM documents WHERE device_id = ? AND deleted_at IS NULL "
                "ORDER BY created_at DESC",
                (device["id"],),
            ).fetchall()
        )
    return rows


@router.post("/devices/{device_uuid}/documents", status_code=201)
async def upload_document(
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

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type {content_type} not allowed",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max: {MAX_FILE_SIZE // (1024*1024)} MB",
        )

    doc_uuid = uuid4().hex
    original_name = file.filename or "document"
    # Keep original extension
    ext = ""
    if "." in original_name:
        ext = "." + original_name.rsplit(".", 1)[-1].lower()
    stored_name = f"{doc_uuid}{ext}"

    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    filepath = DOCS_DIR / stored_name
    with open(filepath, "wb") as f:
        f.write(content)

    with get_db() as conn:
        conn.execute(
            "INSERT INTO documents (uuid, device_id, filename, mime_type, file_size, caption) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (doc_uuid, device["id"], original_name, content_type, len(content), caption),
        )
        conn.execute(
            "UPDATE devices SET sync_version = sync_version + 1, updated_at = datetime('now') WHERE id = ?",
            (device["id"],),
        )
        row = dict_from_row(
            conn.execute("SELECT * FROM documents WHERE uuid = ?", (doc_uuid,)).fetchone()
        )
    return row


@router.post("/devices/{device_uuid}/documents/link", status_code=201)
def add_document_link(device_uuid: str, body: DocumentLinkBody):
    """Add an external link as a document (e.g., manufacturer manual URL)."""
    with get_db() as conn:
        device = dict_from_row(
            conn.execute(
                "SELECT id FROM devices WHERE uuid = ? AND deleted_at IS NULL",
                (device_uuid,),
            ).fetchone()
        )
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

        doc_uuid = uuid4().hex
        conn.execute(
            "INSERT INTO documents (uuid, device_id, filename, mime_type, file_size, caption, url) "
            "VALUES (?, ?, ?, ?, 0, ?, ?)",
            (doc_uuid, device["id"], body.url.split("/")[-1] or "Link", "text/uri-list", body.caption, body.url),
        )
        conn.execute(
            "UPDATE devices SET sync_version = sync_version + 1, updated_at = datetime('now') WHERE id = ?",
            (device["id"],),
        )
        row = dict_from_row(
            conn.execute("SELECT * FROM documents WHERE uuid = ?", (doc_uuid,)).fetchone()
        )
    return row


@router.get("/documents/{doc_uuid}")
def get_document(doc_uuid: str):
    with get_db() as conn:
        row = dict_from_row(
            conn.execute(
                "SELECT * FROM documents WHERE uuid = ? AND deleted_at IS NULL",
                (doc_uuid,),
            ).fetchone()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

    # External link
    if row.get("url"):
        return {"url": row["url"], "filename": row["filename"]}

    filepath = DOCS_DIR / f"{doc_uuid}.{row['filename'].rsplit('.', 1)[-1]}" if "." in row["filename"] else DOCS_DIR / doc_uuid
    # Try to find the file by UUID prefix
    matches = list(DOCS_DIR.glob(f"{doc_uuid}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Document file not found")

    return FileResponse(
        path=str(matches[0]),
        media_type=row["mime_type"],
        filename=row["filename"],
    )


@router.delete("/documents/{doc_uuid}", status_code=204)
def delete_document(doc_uuid: str):
    with get_db() as conn:
        row = dict_from_row(
            conn.execute(
                "SELECT * FROM documents WHERE uuid = ? AND deleted_at IS NULL",
                (doc_uuid,),
            ).fetchone()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        conn.execute("UPDATE documents SET deleted_at = datetime('now') WHERE uuid = ?", (doc_uuid,))
        conn.execute(
            "UPDATE devices SET sync_version = sync_version + 1, updated_at = datetime('now') WHERE id = ?",
            (row["device_id"],),
        )

    # Delete file from disk if it's an upload (not a link)
    if not row.get("url"):
        matches = list(DOCS_DIR.glob(f"{doc_uuid}.*"))
        for f in matches:
            f.unlink(missing_ok=True)
