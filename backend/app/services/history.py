"""Per-device change history (v2.5.0).

Writes to the ``device_history`` table whenever a tracked field on a
device changes. Kept slim: only fields that carry user intent, not
internal bookkeeping like ``updated_at``, ``sync_version``, ``deleted_at``.

Source strings:
  'user'        — manual edit in the form
  'ha_import'   — HA sync / re-import
  'recategorize'— classifier run (preview-apply or legacy)
  'bulk'        — bulk_update endpoint
  'restore'     — trash restore or snapshot restore
"""

from __future__ import annotations

import logging
import sqlite3
from typing import Iterable

logger = logging.getLogger(__name__)

# Fields we actually want audit trail for — not the internal ones.
TRACKED_FIELDS = {
    "typ", "bezeichnung", "modell", "hersteller", "standort_area_id",
    "standort_name", "standort_floor_id", "seriennummer", "mac_adresse",
    "ip_adresse", "firmware", "integration", "stromversorgung", "netzwerk",
    "anschaffungsdatum", "garantie_bis", "funktion", "anmerkungen",
    "ha_entity_id", "ha_device_id", "ain_artikelnr", "parent_uuid",
}


def log_changes(
    conn: sqlite3.Connection,
    device_uuid: str,
    old: dict | None,
    new: dict,
    source: str,
) -> int:
    """Write a history row for each tracked field whose value changed.

    ``old`` is the DB row before the update (as dict). When creating a new
    device, pass ``None`` — we only log fields present in ``new``.
    Returns how many history rows were inserted.
    """
    inserted = 0
    for field, new_val in new.items():
        if field not in TRACKED_FIELDS:
            continue
        old_val = (old or {}).get(field)
        if old_val == new_val:
            continue
        try:
            conn.execute(
                "INSERT INTO device_history (device_uuid, field, old_value, new_value, source) "
                "VALUES (?, ?, ?, ?, ?)",
                (
                    device_uuid,
                    field,
                    None if old_val is None else str(old_val),
                    None if new_val is None else str(new_val),
                    source,
                ),
            )
            inserted += 1
        except Exception as e:
            # Never let history bookkeeping block the actual update.
            logger.warning("device_history write failed for %s.%s: %s",
                           device_uuid, field, e)
    return inserted


def fetch_history(conn: sqlite3.Connection, device_uuid: str, limit: int = 100) -> list[dict]:
    """Newest-first history rows for a device."""
    rows = conn.execute(
        "SELECT id, field, old_value, new_value, source, changed_at "
        "FROM device_history WHERE device_uuid = ? "
        "ORDER BY changed_at DESC, id DESC LIMIT ?",
        (device_uuid, limit),
    ).fetchall()
    return [dict(r) for r in rows]


def revert_entry(conn: sqlite3.Connection, device_uuid: str, entry_id: int) -> dict | None:
    """Revert a single history entry — sets the field back to its old_value.

    Writes a new history row tagged ``source='revert'`` so the revert is
    itself visible. Returns the reverted entry dict or None if not found.
    """
    row = conn.execute(
        "SELECT id, field, old_value, new_value FROM device_history "
        "WHERE id = ? AND device_uuid = ?",
        (entry_id, device_uuid),
    ).fetchone()
    if not row:
        return None
    field = row["field"]
    if field not in TRACKED_FIELDS:
        return None
    # Field name was validated against TRACKED_FIELDS (fixed set), safe to inline.
    conn.execute(
        f"UPDATE devices SET {field} = ?, updated_at = datetime('now'), "
        f"sync_version = sync_version + 1 WHERE uuid = ?",
        (row["old_value"], device_uuid),
    )
    conn.execute(
        "INSERT INTO device_history (device_uuid, field, old_value, new_value, source) "
        "VALUES (?, ?, ?, ?, 'revert')",
        (device_uuid, field, row["new_value"], row["old_value"]),
    )
    return dict(row)
