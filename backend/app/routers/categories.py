"""Device categories CRUD endpoints (v2.4.0).

Categories are stored in ``device_categories`` table. Built-in categories
(seeded on first startup) have ``is_custom=0`` and a ``label_key`` that
maps to an i18n key for translation. Custom categories created by the user
have ``is_custom=1`` and their ``name`` is shown verbatim in all languages.

Devices reference categories by name (``devices.typ``) — no foreign key,
so renaming a category requires updating all devices that use it.
"""

from __future__ import annotations

import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.database import get_db, dicts_from_rows
from app.services.snapshots import create_snapshot

router = APIRouter(prefix="/categories", tags=["categories"])


class CategoryIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    icon: Optional[str] = Field(None, max_length=80)


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    icon: Optional[str] = Field(None, max_length=80)
    sort_order: Optional[int] = None


def _is_valid_name(name: str) -> bool:
    # Allow letters (incl. umlauts), digits, spaces, /, -, &, (), .
    return bool(re.fullmatch(r"[\w\säöüÄÖÜß/\-&().,]+", name))


@router.get("")
async def list_categories():
    """Return all active categories sorted by sort_order, then name."""
    with get_db() as conn:
        rows = dicts_from_rows(conn.execute(
            "SELECT id, name, label_key, icon, is_custom, sort_order "
            "FROM device_categories WHERE deleted_at IS NULL "
            "ORDER BY sort_order ASC, name ASC"
        ).fetchall())
    return {"categories": rows, "total": len(rows)}


@router.post("")
async def create_category(body: CategoryIn):
    if not _is_valid_name(body.name):
        raise HTTPException(status_code=400, detail="Invalid category name")

    name = body.name.strip()
    with get_db() as conn:
        # Check for existing (including soft-deleted)
        existing = conn.execute(
            "SELECT id, deleted_at FROM device_categories WHERE name = ?",
            (name,),
        ).fetchone()
        if existing and existing["deleted_at"] is None:
            raise HTTPException(status_code=409, detail="Category already exists")

        # Resurrect soft-deleted if name matches
        if existing and existing["deleted_at"] is not None:
            conn.execute(
                "UPDATE device_categories SET deleted_at = NULL, icon = ?, is_custom = 1 "
                "WHERE id = ?",
                (body.icon, existing["id"]),
            )
            row = dict(conn.execute(
                "SELECT id, name, label_key, icon, is_custom, sort_order "
                "FROM device_categories WHERE id = ?",
                (existing["id"],),
            ).fetchone())
            return {"status": "ok", "category": row, "resurrected": True}

        # Determine next sort_order (append at the end, before "Sonstiges")
        max_order = conn.execute(
            "SELECT COALESCE(MAX(sort_order), 0) FROM device_categories "
            "WHERE deleted_at IS NULL AND name != 'Sonstiges'"
        ).fetchone()[0]

        cursor = conn.execute(
            "INSERT INTO device_categories (name, icon, is_custom, sort_order) "
            "VALUES (?, ?, 1, ?)",
            (name, body.icon, max_order + 1),
        )
        row = dict(conn.execute(
            "SELECT id, name, label_key, icon, is_custom, sort_order "
            "FROM device_categories WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone())
    return {"status": "ok", "category": row}


@router.put("/{category_id}")
async def update_category(category_id: int, body: CategoryUpdate):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id, name, is_custom FROM device_categories "
            "WHERE id = ? AND deleted_at IS NULL",
            (category_id,),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Category not found")

        # Renaming a built-in would break the label_key mapping, so disallow.
        if body.name is not None and body.name.strip() != existing["name"]:
            if not existing["is_custom"]:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot rename built-in category. Create a custom one instead.",
                )
            new_name = body.name.strip()
            if not _is_valid_name(new_name):
                raise HTTPException(status_code=400, detail="Invalid category name")
            # Name collision check
            collision = conn.execute(
                "SELECT id FROM device_categories WHERE name = ? AND id != ? AND deleted_at IS NULL",
                (new_name, category_id),
            ).fetchone()
            if collision:
                raise HTTPException(status_code=409, detail="Name already exists")
            # Cascade-rename in devices.typ
            conn.execute(
                "UPDATE devices SET typ = ?, sync_version = sync_version + 1, "
                "updated_at = datetime('now') WHERE typ = ? AND deleted_at IS NULL",
                (new_name, existing["name"]),
            )
            conn.execute(
                "UPDATE device_categories SET name = ? WHERE id = ?",
                (new_name, category_id),
            )

        if body.icon is not None:
            conn.execute(
                "UPDATE device_categories SET icon = ? WHERE id = ?",
                (body.icon, category_id),
            )
        if body.sort_order is not None:
            conn.execute(
                "UPDATE device_categories SET sort_order = ? WHERE id = ?",
                (body.sort_order, category_id),
            )

        row = dict(conn.execute(
            "SELECT id, name, label_key, icon, is_custom, sort_order "
            "FROM device_categories WHERE id = ?",
            (category_id,),
        ).fetchone())
    return {"status": "ok", "category": row}


@router.delete("/{category_id}")
async def delete_category(category_id: int, reassign_to: str = "Sonstiges"):
    """Soft-delete a category. Devices using it are reassigned to ``reassign_to``
    (default: Sonstiges). Built-in categories cannot be deleted."""
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id, name, is_custom FROM device_categories "
            "WHERE id = ? AND deleted_at IS NULL",
            (category_id,),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Category not found")
        if not existing["is_custom"]:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete built-in category. Hide it in the UI instead.",
            )

        # Validate reassign target exists
        target = conn.execute(
            "SELECT name FROM device_categories WHERE name = ? AND deleted_at IS NULL",
            (reassign_to,),
        ).fetchone()
        if not target:
            raise HTTPException(status_code=400, detail=f"Reassign target '{reassign_to}' does not exist")

        # Count affected devices
        affected = conn.execute(
            "SELECT COUNT(*) FROM devices WHERE typ = ? AND deleted_at IS NULL",
            (existing["name"],),
        ).fetchone()[0]

        # Reassign
        if affected > 0:
            # Snapshot before the mass typ-rewrite — category deletes can
            # move dozens of devices at once.
            create_snapshot(f"category_delete_{existing['name']}")
            conn.execute(
                "UPDATE devices SET typ = ?, sync_version = sync_version + 1, "
                "updated_at = datetime('now') WHERE typ = ? AND deleted_at IS NULL",
                (reassign_to, existing["name"]),
            )

        # Soft delete
        conn.execute(
            "UPDATE device_categories SET deleted_at = datetime('now') WHERE id = ?",
            (category_id,),
        )

    return {
        "status": "ok",
        "deleted_name": existing["name"],
        "reassigned_devices": affected,
        "reassigned_to": reassign_to,
    }
