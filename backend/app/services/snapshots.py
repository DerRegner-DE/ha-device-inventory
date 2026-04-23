"""Pre-action database snapshots.

Takes a full copy of the SQLite database before destructive bulk operations
(recategorize, bulk edit/delete, XLSX replace-import, category delete),
so users can roll back if the operation produces more regressions than wins.

Snapshots live in ``<DB_PATH parent>/snapshots/`` as
``<UTC-timestamp>_<op>.db``. We rely on SQLite's ``VACUUM INTO`` when
available (clean copy, no WAL residue), falling back to a file copy.

Retention: keep at most ``MAX_SNAPSHOTS`` most recent, and delete any older
than ``MAX_AGE_DAYS``. Pruning runs after every new snapshot, not on a timer,
so users who never trigger destructive ops never accumulate snapshots.
"""

from __future__ import annotations

import logging
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

MAX_SNAPSHOTS = 10
MAX_AGE_DAYS = 30
SNAPSHOT_SUFFIX = ".db"


def snapshots_dir() -> Path:
    """Directory where snapshots live. Lazily created."""
    d = settings.DB_PATH.parent / "snapshots"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _op_slug(op: str) -> str:
    """Sanitize operation name for filesystem safety."""
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in op)
    return safe.strip("_")[:40] or "op"


def create_snapshot(op: str, note: Optional[str] = None) -> Optional[Path]:
    """Copy the current DB to a timestamped snapshot file.

    Returns the snapshot path on success, None if the DB doesn't exist yet
    (first boot, nothing to snapshot). Never raises — snapshot failures must
    not block the destructive operation that called us; we log and continue.
    """
    src = settings.DB_PATH
    if not src.exists():
        logger.info("No DB to snapshot (first-run): %s", src)
        return None

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    name = f"{ts}_{_op_slug(op)}{SNAPSHOT_SUFFIX}"
    dest = snapshots_dir() / name

    try:
        # VACUUM INTO produces a clean snapshot without WAL/journal residue
        # and is atomic from SQLite's point of view. Requires SQLite >= 3.27
        # (Python 3.9+ ships with newer).
        with sqlite3.connect(str(src)) as conn:
            conn.execute(f"VACUUM INTO '{dest}'")
    except sqlite3.Error as e:
        logger.warning("VACUUM INTO failed (%s), falling back to file copy: %s", dest, e)
        try:
            shutil.copy2(src, dest)
        except OSError as e2:
            logger.error("Snapshot copy also failed: %s", e2)
            return None

    if note:
        # Sidecar note file — readable without opening the DB.
        try:
            (dest.with_suffix(".note")).write_text(note, encoding="utf-8")
        except OSError:
            pass

    logger.info("Snapshot created: %s (op=%s)", dest.name, op)
    _prune()
    return dest


def list_snapshots() -> list[dict]:
    """List snapshots newest-first with metadata."""
    d = snapshots_dir()
    entries: list[dict] = []
    for p in d.glob(f"*{SNAPSHOT_SUFFIX}"):
        try:
            st = p.stat()
        except OSError:
            continue
        # Parse filename: <ts>_<op>.db
        stem = p.stem
        ts_str, _, op = stem.partition("_")
        iso = _parse_ts(ts_str)
        note_path = p.with_suffix(".note")
        note = note_path.read_text(encoding="utf-8") if note_path.exists() else None
        entries.append({
            "filename": p.name,
            "op": op or "unknown",
            "created_at": iso,
            "size_bytes": st.st_size,
            "note": note,
        })
    entries.sort(key=lambda e: e["created_at"] or "", reverse=True)
    return entries


def _parse_ts(ts_str: str) -> Optional[str]:
    """Parse our compact timestamp back to ISO-8601 for the frontend."""
    try:
        dt = datetime.strptime(ts_str, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except ValueError:
        return None


def restore_snapshot(filename: str) -> dict:
    """Restore a snapshot over the current DB.

    Before overwriting, takes one last auto-snapshot tagged ``pre_restore``
    so the restore itself is undoable. Returns a dict with the paths touched.
    Raises FileNotFoundError if the named snapshot doesn't exist.
    """
    src = _validate_filename(filename)

    # Safety net: snapshot the current state before we overwrite it.
    pre = create_snapshot("pre_restore", note=f"Auto-snapshot before restoring {filename}")

    dest = settings.DB_PATH
    # Atomic-ish replace: copy to temp beside dest, then rename.
    tmp = dest.with_suffix(dest.suffix + ".restore-tmp")
    try:
        shutil.copy2(src, tmp)
        tmp.replace(dest)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass

    # SQLite WAL/SHM files belong to the *old* DB and are now inconsistent
    # with the restored main file. Remove them so SQLite rebuilds cleanly
    # on next open.
    for ext in (".db-wal", ".db-shm"):
        sidecar = dest.with_suffix(ext)
        if sidecar.exists():
            try:
                sidecar.unlink()
            except OSError as e:
                logger.warning("Could not remove %s: %s", sidecar, e)

    logger.info("Snapshot restored: %s (pre-restore backup: %s)",
                filename, pre.name if pre else "—")
    return {
        "restored": filename,
        "pre_restore_snapshot": pre.name if pre else None,
    }


def delete_snapshot(filename: str) -> None:
    """Permanently delete a snapshot (and its sidecar note)."""
    p = _validate_filename(filename)
    for side in (p, p.with_suffix(".note")):
        if side.exists():
            try:
                side.unlink()
            except OSError as e:
                logger.warning("Could not delete %s: %s", side, e)


def _validate_filename(filename: str) -> Path:
    """Ensure the filename is a real snapshot in our dir (no path traversal)."""
    if "/" in filename or "\\" in filename or ".." in filename:
        raise ValueError(f"Invalid snapshot filename: {filename}")
    if not filename.endswith(SNAPSHOT_SUFFIX):
        raise ValueError(f"Not a snapshot: {filename}")
    p = snapshots_dir() / filename
    if not p.exists() or not p.is_file():
        raise FileNotFoundError(filename)
    return p


def _prune() -> None:
    """Enforce MAX_SNAPSHOTS and MAX_AGE_DAYS. Best-effort, never raises."""
    try:
        entries = list_snapshots()
    except Exception:
        return

    now = datetime.now(timezone.utc)
    to_delete: list[str] = []

    # Age-based
    for e in entries:
        if not e["created_at"]:
            continue
        try:
            created = datetime.fromisoformat(e["created_at"])
        except ValueError:
            continue
        age_days = (now - created).total_seconds() / 86400
        if age_days > MAX_AGE_DAYS:
            to_delete.append(e["filename"])

    # Count-based (entries are newest-first; anything past MAX_SNAPSHOTS goes)
    for e in entries[MAX_SNAPSHOTS:]:
        if e["filename"] not in to_delete:
            to_delete.append(e["filename"])

    for fn in to_delete:
        try:
            delete_snapshot(fn)
            logger.info("Pruned old snapshot: %s", fn)
        except Exception as e:
            logger.warning("Prune failed for %s: %s", fn, e)
