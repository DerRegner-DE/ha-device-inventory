"""Database snapshot endpoints (v2.4.2).

Lists, restores, and deletes pre-action DB snapshots. Snapshot *creation*
is not exposed here — snapshots are taken automatically by destructive
operations (recategorize, bulk edit/delete, XLSX replace-import, category
delete) via ``app.services.snapshots.create_snapshot``.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services import snapshots as snap_svc

router = APIRouter(prefix="/snapshots", tags=["snapshots"])


@router.get("")
def list_snapshots():
    """List all snapshots, newest first, with metadata."""
    return {"snapshots": snap_svc.list_snapshots()}


@router.post("/{filename}/restore")
def restore_snapshot(filename: str):
    """Restore a named snapshot. Auto-creates a pre-restore snapshot first."""
    try:
        return snap_svc.restore_snapshot(filename)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Snapshot not found: {filename}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{filename}", status_code=204)
def delete_snapshot(filename: str):
    """Permanently delete a snapshot."""
    try:
        snap_svc.delete_snapshot(filename)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Snapshot not found: {filename}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
