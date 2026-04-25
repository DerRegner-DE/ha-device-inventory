"""Regression tests for the BackgroundTasks await bug (v2.5.3 hotfix).

Forum-report: ``DELETE /api/devices/{uuid}`` returned 204, then logged
``RuntimeWarning: coroutine 'remove_device' was never awaited``. The MQTT
discovery removal silently never ran, leaving phantom devices in HA's
MQTT registry every time the user deleted something via the UI.

Root cause: the router used the anti-pattern

    background_tasks.add_task(asyncio.create_task, mqtt_remove_device(uuid))

This calls ``mqtt_remove_device(uuid)`` *immediately* (because Python
evaluates arguments before passing them), producing a coroutine object
that is then handed to ``asyncio.create_task`` as a *positional* arg of
``add_task``. FastAPI's BackgroundTasks then invokes
``asyncio.create_task(<coro>)`` synchronously after the response goes
out, but at that point the event loop has typically already moved on,
and even if it hasn't, ``asyncio.create_task`` returns a Task that nobody
keeps a reference to. The coroutine inside is GC'd before being awaited.

The fix: FastAPI BackgroundTasks accepts async functions directly. Just
pass the function reference and the args separately:

    background_tasks.add_task(mqtt_remove_device, uuid)

These tests pin the call signature so the bug can't sneak back in via a
"helpful" refactor.
"""

from __future__ import annotations

import inspect
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def _source_of(func) -> str:
    """Return the source code of `func` as a single string."""
    return inspect.getsource(func)


def test_create_device_uses_correct_background_task_pattern():
    from app.routers.devices import create_device

    src = _source_of(create_device)
    # Old (broken) pattern: ``add_task(asyncio.create_task, publish_device(result))``
    assert "asyncio.create_task, publish_device" not in src, (
        "create_device must NOT wrap publish_device via asyncio.create_task — "
        "that calls the coroutine without awaiting it. Use "
        "`background_tasks.add_task(publish_device, result)` instead."
    )
    # New (correct) pattern.
    assert "add_task(publish_device, result)" in src, (
        "create_device should call `background_tasks.add_task(publish_device, result)` "
        "so FastAPI awaits the async function correctly."
    )


def test_update_device_uses_correct_background_task_pattern():
    from app.routers.devices import update_device

    src = _source_of(update_device)
    assert "asyncio.create_task, publish_device" not in src
    assert "add_task(publish_device, result)" in src


def test_delete_device_uses_correct_background_task_pattern():
    from app.routers.devices import delete_device

    src = _source_of(delete_device)
    # Old (broken) pattern.
    assert "asyncio.create_task, mqtt_remove_device" not in src, (
        "delete_device must NOT wrap mqtt_remove_device via asyncio.create_task. "
        "The original Forum-report (RuntimeWarning: coroutine 'remove_device' "
        "was never awaited) was caused by exactly this pattern."
    )
    # New (correct) pattern.
    assert "add_task(mqtt_remove_device, uuid)" in src


def test_no_stray_asyncio_imports_for_create_task_in_devices_router():
    """If we ever bring `asyncio.create_task` back into devices.py, that's
    almost certainly the bug pattern returning. Block it with this test.
    """
    devices_path = Path(__file__).resolve().parent.parent / "app" / "routers" / "devices.py"
    src = devices_path.read_text(encoding="utf-8")
    assert "asyncio.create_task" not in src, (
        "devices.py should not need asyncio.create_task — FastAPI's "
        "BackgroundTasks handles async functions on its own. If you really "
        "need raw create_task, document why and remove this assertion."
    )
