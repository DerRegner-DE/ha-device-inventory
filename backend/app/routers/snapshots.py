"""Database snapshot endpoints (v2.4.2).

Lists, restores, and deletes pre-action DB snapshots. Snapshots are taken
automatically by destructive operations via
``app.services.snapshots.create_snapshot``; since v3.1.0 they can also be
created by hand (POST /snapshots).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services import snapshots as snap_svc

router = APIRouter(prefix="/snapshots", tags=["snapshots"])


@router.get("")
def list_snapshots():
    """List all snapshots, newest first, with metadata."""
    return {"snapshots": snap_svc.list_snapshots()}


@router.post("", status_code=201)
def create_manual_snapshot():
    """v3.1.0: Schnappschuss von Hand, z. B. vor eigenen Aufraeumarbeiten."""
    path = snap_svc.create_snapshot("manual")
    if path is None:
        raise HTTPException(status_code=500, detail="Snapshot could not be created")
    return {"filename": path.name}


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
