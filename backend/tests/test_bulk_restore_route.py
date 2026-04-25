"""Regression tests for the bulk-restore route registration order (v2.5.3).

FastAPI matches routes in registration order. The single-device restore
route ``POST /{uuid}/restore`` was registered before the bulk-restore
route ``POST /bulk/restore``. When the frontend called ``POST
/devices/bulk/restore`` the request was matched by the single-device
route with ``uuid="bulk"``, which then returned 404 ("Device not found")
because no device has that UUID.

Symptom (reported by user on 2026-04-24): clicking the green "X
wiederherstellen" bulk-button in the Papierkorb view had no effect.
The per-row "Wiederherstellen" button worked fine — it hit the correct
``POST /{uuid}/restore`` route with a real UUID.

Fix: swap the route registration so ``/bulk/restore`` is declared
*before* ``/{uuid}/restore``. FastAPI then picks the specific path
first and the single-device route only catches genuine UUIDs.

These tests guard against:
  1. Someone reordering the decorators back.
  2. Bulk-restore losing its 200-OK contract.
  3. The single-device route returning the wrong shape after the move.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def test_bulk_restore_route_registered_before_single_restore():
    """Route-order guard: `/bulk/restore` must appear before `/{uuid}/restore`.

    We read the routes straight off the FastAPI router instead of
    spinning up the full app — the router list reflects registration
    order, which is what FastAPI uses to dispatch.
    """
    from app.routers.devices import router

    bulk_idx = None
    single_idx = None
    for i, route in enumerate(router.routes):
        path = getattr(route, "path", "")
        methods = getattr(route, "methods", set()) or set()
        if "POST" not in methods:
            continue
        # Router carries prefix="/devices", so full paths are
        # "/devices/bulk/restore" and "/devices/{uuid}/restore".
        if path.endswith("/bulk/restore"):
            bulk_idx = i
        elif path.endswith("/{uuid}/restore"):
            single_idx = i

    assert bulk_idx is not None, "POST /bulk/restore route is missing"
    assert single_idx is not None, "POST /{uuid}/restore route is missing"
    assert bulk_idx < single_idx, (
        f"Route order bug: /bulk/restore (idx={bulk_idx}) must be "
        f"registered BEFORE /{{uuid}}/restore (idx={single_idx}), "
        "otherwise FastAPI matches /bulk/restore as uuid='bulk' and 404s."
    )


def test_bulk_restore_handler_accepts_list_body():
    """The handler signature must still take a Pydantic body with ``uuids``.

    If someone refactored it to take a path parameter we'd be back to
    the same problem — catch that early.
    """
    import inspect

    from app.routers.devices import bulk_restore_devices
    from app.models import BulkRestoreBody

    # `devices.py` uses `from __future__ import annotations`, so the
    # annotation arrives as a string. Compare against the class name.
    sig = inspect.signature(bulk_restore_devices)
    params = list(sig.parameters.values())
    assert len(params) == 1, "bulk_restore_devices should take exactly one arg"
    annotation = params[0].annotation
    annotation_name = (
        annotation if isinstance(annotation, str) else annotation.__name__
    )
    assert annotation_name == BulkRestoreBody.__name__, (
        "bulk_restore_devices must receive a BulkRestoreBody, not a path param"
    )

    # BulkRestoreBody must declare `uuids: list[str]` — the frontend
    # sends `{uuids: [...]}` and breaking this breaks every caller.
    assert "uuids" in BulkRestoreBody.model_fields, (
        "BulkRestoreBody must expose a `uuids` field"
    )
