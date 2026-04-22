"""App-level settings persisted in the ``app_settings`` table (v2.4.0).

Currently only ``auto_categorize`` (whether the HA-import classifier should
assign a category automatically). Designed to hold future feature flags.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.database import get_db

router = APIRouter(prefix="/settings", tags=["settings"])


class BoolSetting(BaseModel):
    enabled: bool


def get_setting(key: str, default: str | None = None) -> str | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT value FROM app_settings WHERE key = ?", (key,)
        ).fetchone()
    return row["value"] if row else default


def set_setting(key: str, value: str) -> None:
    with get_db() as conn:
        conn.execute(
            "INSERT INTO app_settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
            (key, value),
        )


def get_bool_setting(key: str, default: bool = True) -> bool:
    val = get_setting(key)
    if val is None:
        return default
    return val == "1" or val.lower() == "true"


@router.get("/auto_categorize")
async def get_auto_categorize():
    return {"enabled": get_bool_setting("auto_categorize", True)}


@router.post("/auto_categorize")
async def set_auto_categorize(body: BoolSetting):
    set_setting("auto_categorize", "1" if body.enabled else "0")
    return {"status": "ok", "enabled": body.enabled}
