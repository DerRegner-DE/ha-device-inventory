"""FastAPI application for Geraeteverwaltung backend."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import aiohttp
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import settings
from app.database import init_db
from app.routers import devices, photos, documents, sync, export, import_data, ha_proxy
from app.services.device_sync import sync_ha_areas

APP_VERSION = "2.2.3"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def _initial_ha_sync() -> None:
    """Run initial HA area sync in the background."""
    try:
        await asyncio.sleep(2)  # Give HA a moment
        result = await sync_ha_areas()
        logger.info("Initial HA area sync: %s", result)
    except Exception as e:
        logger.warning("Initial HA sync failed (will retry on demand): %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database at %s", settings.DB_PATH)
    init_db()
    logger.info("Database initialized")

    # Load MQTT settings from persistent file
    mqtt_settings_file = Path(settings.DB_PATH).parent / "mqtt_settings.json"
    if mqtt_settings_file.exists():
        try:
            mqtt_data = json.loads(mqtt_settings_file.read_text(encoding="utf-8"))
            settings.MQTT_DISCOVERY_ENABLED = mqtt_data.get("enabled", False)
            logger.info("MQTT Discovery: %s", "enabled" if settings.MQTT_DISCOVERY_ENABLED else "disabled")
        except Exception:
            pass
    logger.info("Photos directory: %s", settings.PHOTOS_DIR)

    # Run MQTT connectivity test at startup (diagnostic only; does not block startup)
    if settings.MQTT_DISCOVERY_ENABLED:
        try:
            from app.services.mqtt_discovery import test_connection as mqtt_test
            asyncio.create_task(mqtt_test())
        except Exception as e:
            logger.warning("MQTT startup test could not be scheduled: %s", e)

    # Start HA sync in background (non-blocking)
    if settings.HA_TOKEN:
        asyncio.create_task(_initial_ha_sync())
        logger.info("HA sync task started (token configured)")
    else:
        logger.warning("HA_TOKEN not set - HA proxy endpoints will fail")

    yield

    # Shutdown
    logger.info("Shutting down Geraeteverwaltung backend")


app = FastAPI(
    title="Geraeteverwaltung API",
    description="Device inventory management for Home Assistant",
    version=APP_VERSION,
    lifespan=lifespan,
)

# Middleware to handle HA Ingress X-Ingress-Path header
@app.middleware("http")
async def ingress_middleware(request: Request, call_next):
    ingress_path = request.headers.get("X-Ingress-Path", "")
    request.state.ingress_path = ingress_path
    response = await call_next(request)
    return response


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers under /api prefix
app.include_router(devices.router, prefix="/api")
app.include_router(photos.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(import_data.router, prefix="/api")
app.include_router(ha_proxy.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "version": APP_VERSION,
        "ha_url": settings.HA_URL,
        "ha_token_configured": bool(settings.HA_TOKEN),
    }


# ----- MQTT Discovery endpoints ------------------------------------------------

from app.services.mqtt_discovery import (
    sync_all_devices as mqtt_sync_all,
    publish_device as mqtt_publish,
    test_connection as mqtt_test_connection,
)


class MqttSettingsBody(BaseModel):
    enabled: bool


@app.get("/api/mqtt/status")
def mqtt_status():
    return {
        "enabled": settings.MQTT_DISCOVERY_ENABLED,
        "host": settings.MQTT_HOST,
        "port": settings.MQTT_PORT,
    }


@app.post("/api/mqtt/settings")
def mqtt_settings(body: MqttSettingsBody):
    # Toggle is stored as environment variable override in a settings file
    settings_file = Path(settings.DB_PATH).parent / "mqtt_settings.json"
    data = {}
    if settings_file.exists():
        try:
            data = json.loads(settings_file.read_text(encoding="utf-8"))
        except Exception:
            pass
    data["enabled"] = body.enabled
    settings_file.parent.mkdir(parents=True, exist_ok=True)
    settings_file.write_text(json.dumps(data), encoding="utf-8")
    # Update runtime setting
    settings.MQTT_DISCOVERY_ENABLED = body.enabled
    return {"ok": True, "enabled": body.enabled}


@app.post("/api/mqtt/test")
async def mqtt_test():
    """Try to connect to the configured MQTT broker and return diagnostic info.

    Useful when the add-on log does not show a clear connection error
    (e.g. external broker with auth or network issue).
    """
    return await mqtt_test_connection()


@app.post("/api/mqtt/sync")
async def mqtt_sync():
    """Publish all inventory devices to HA via MQTT discovery."""
    from app.database import get_db, dicts_from_rows

    with get_db() as conn:
        rows = dicts_from_rows(
            conn.execute("SELECT * FROM devices WHERE deleted_at IS NULL").fetchall()
        )
    result = await mqtt_sync_all(rows)
    return result


# ----- License storage & validation endpoints --------------------------------

LICENSE_FILE = Path(settings.DB_PATH).parent / "license.json"
VERIFY_KEY = "gv-pro-2024-DerRegner"


class LicenseKeyBody(BaseModel):
    key: str


class LicenseValidateBody(BaseModel):
    key: str


def _read_license_file() -> dict:
    try:
        if LICENSE_FILE.exists():
            return json.loads(LICENSE_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _write_license_file(data: dict) -> None:
    LICENSE_FILE.parent.mkdir(parents=True, exist_ok=True)
    LICENSE_FILE.write_text(json.dumps(data), encoding="utf-8")


TRIAL_DURATION_DAYS = 180  # 6 months
TRIAL_ENABLED = False  # Disabled during beta testing phase - enable later


def _get_trial_info() -> dict:
    """Get trial status. Auto-initializes trial_start on first call."""
    if not TRIAL_ENABLED:
        return {"trial_active": False, "trial_remaining_days": 0, "trial_start": 0}

    data = _read_license_file()
    import time

    # If no trial_start yet, set it now (first install)
    if "trial_start" not in data:
        data["trial_start"] = time.time()
        _write_license_file(data)

    trial_start = data["trial_start"]
    elapsed_days = (time.time() - trial_start) / 86400
    remaining_days = max(0, TRIAL_DURATION_DAYS - elapsed_days)
    trial_active = remaining_days > 0

    return {
        "trial_active": trial_active,
        "trial_remaining_days": int(remaining_days),
        "trial_start": trial_start,
    }


@app.get("/api/license")
def get_license():
    data = _read_license_file()
    trial = _get_trial_info()
    return {
        "key": data.get("key", ""),
        "trial_active": trial["trial_active"],
        "trial_remaining_days": trial["trial_remaining_days"],
    }


@app.post("/api/license")
def set_license(body: LicenseKeyBody):
    data = _read_license_file()
    data["key"] = body.key
    _write_license_file(data)
    return {"ok": True}


def _hmac_sha256(message: str, secret: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _base64url_decode(s: str) -> str:
    import base64

    # Restore base64url → standard base64 alphabet first, then pad.
    s = s.replace("-", "+").replace("_", "/")
    remainder = len(s) % 4
    if remainder:
        s += "=" * (4 - remainder)
    return base64.b64decode(s).decode("utf-8")


@app.post("/api/license/validate")
def validate_license(body: LicenseValidateBody):
    """Validate a license key server-side (for HTTP contexts without crypto.subtle).
    Also supports trial mode: if key is empty but trial is active, return Pro."""
    try:
        key = body.key.strip()

        # Trial mode: no key but trial is active
        if not key:
            trial = _get_trial_info()
            if trial["trial_active"]:
                return {
                    "valid": True,
                    "tier": "pro",
                    "email": "trial",
                    "exp": trial["trial_start"] + TRIAL_DURATION_DAYS * 86400,
                    "features": [
                        "unlimited_devices", "multilingual", "excel",
                        "ha_sync", "camera", "barcode",
                    ],
                    "trial": True,
                    "trial_remaining_days": trial["trial_remaining_days"],
                }
            return {"valid": False, "tier": "free", "features": []}
        dot_idx = key.index(".")
        payload_b64 = key[:dot_idx]
        sig_b64 = key[dot_idx + 1:]

        payload_json = _base64url_decode(payload_b64)
        expected_sig = _hmac_sha256(payload_json, VERIFY_KEY)
        # sig_b64 is base64url-encoded hex string from frontend
        provided_sig_raw = _base64url_decode(sig_b64)
        # Compare: frontend sends hex-encoded HMAC as base64url, so decode gives hex string
        if provided_sig_raw != expected_sig:
            return {"valid": False, "tier": "free", "features": []}

        payload = json.loads(payload_json)

        if payload.get("tier") != "pro":
            return {"valid": False, "tier": "free", "features": []}

        import time
        exp = payload.get("exp", 0)
        if not isinstance(exp, (int, float)) or exp < time.time():
            return {
                "valid": False,
                "tier": "free",
                "email": payload.get("email"),
                "exp": exp,
                "features": [],
            }

        features = payload.get("features") or [
            "unlimited_devices", "multilingual", "excel",
            "ha_sync", "camera", "barcode",
        ]
        return {
            "valid": True,
            "tier": "pro",
            "email": payload.get("email"),
            "exp": exp,
            "features": features,
        }
    except Exception:
        return {"valid": False, "tier": "free", "features": []}


# ----- Lemon Squeezy License API proxy ----------------------------------------

LS_API_BASE = "https://api.lemonsqueezy.com/v1/licenses"
ALL_PRO_FEATURES = [
    "unlimited_devices", "multilingual", "excel",
    "ha_sync", "camera", "barcode",
]


def _ls_response_to_license_info(data: dict, instance_id: str | None = None) -> dict:
    """Convert a Lemon Squeezy API response to our LicenseInfo format."""
    license_key = data.get("license_key", {})
    meta = data.get("meta", {})
    status = license_key.get("status", "")
    valid = status in ("active", "inactive")

    # Verify this key belongs to our store/product
    # Compare as int to handle API returning str or int
    if valid:
        if int(license_key.get("store_id", 0)) != settings.LS_STORE_ID:
            valid = False
        if int(license_key.get("product_id", 0)) != settings.LS_PRODUCT_ID:
            valid = False

    result = {
        "valid": valid,
        "tier": "pro" if valid else "free",
        "email": meta.get("customer_email", ""),
        "features": ALL_PRO_FEATURES if valid else [],
        "key_status": status,
        "activation_usage": license_key.get("activation_usage", 0),
        "activation_limit": license_key.get("activation_limit", 0),
    }
    if instance_id:
        result["instance_id"] = instance_id
    return result


@app.post("/api/license/ls-activate")
async def ls_activate(body: LicenseKeyBody):
    """Activate a Lemon Squeezy license key."""
    key = body.key.strip()
    if not key:
        return {"valid": False, "tier": "free", "features": [], "error": "Empty key"}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{LS_API_BASE}/activate",
                json={
                    "license_key": key,
                    "instance_name": "Home Assistant",
                },
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                data = await resp.json()

                if resp.status != 200:
                    error_msg = data.get("error", "Activation failed")
                    return {
                        "valid": False,
                        "tier": "free",
                        "features": [],
                        "error": error_msg,
                    }

                instance = data.get("instance", {})
                instance_id = instance.get("id", "")

                result = _ls_response_to_license_info(data, instance_id)

                if result["valid"]:
                    # Store key + instance_id + cached validation in license.json
                    license_data = _read_license_file()
                    license_data["key"] = key
                    license_data["type"] = "ls"
                    license_data["instance_id"] = instance_id
                    license_data["cached_validation"] = result
                    _write_license_file(license_data)

                return result

    except asyncio.TimeoutError:
        return {"valid": False, "tier": "free", "features": [], "error": "Timeout"}
    except Exception as e:
        logger.error("LS activate error: %s", e)
        return {"valid": False, "tier": "free", "features": [], "error": str(e)}


@app.post("/api/license/ls-validate")
async def ls_validate(body: LicenseKeyBody):
    """Validate a Lemon Squeezy license key (check current status)."""
    key = body.key.strip()
    if not key:
        return {"valid": False, "tier": "free", "features": []}

    # First try cached validation (for offline use)
    license_data = _read_license_file()
    cached = license_data.get("cached_validation")

    try:
        async with aiohttp.ClientSession() as session:
            payload = {"license_key": key}
            instance_id = license_data.get("instance_id", "")
            if instance_id:
                payload["instance_id"] = instance_id

            async with session.post(
                f"{LS_API_BASE}/validate",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                data = await resp.json()

                if resp.status != 200:
                    # API error - fall back to cached result
                    if cached:
                        return cached
                    return {"valid": False, "tier": "free", "features": []}

                result = _ls_response_to_license_info(data, instance_id)

                # Update cache
                if result["valid"]:
                    license_data["cached_validation"] = result
                    _write_license_file(license_data)

                return result

    except Exception:
        # Network error - return cached result for offline use
        if cached:
            return cached
        return {"valid": False, "tier": "free", "features": []}


@app.post("/api/license/ls-deactivate")
async def ls_deactivate(body: LicenseKeyBody):
    """Deactivate a Lemon Squeezy license key instance."""
    key = body.key.strip()
    license_data = _read_license_file()
    instance_id = license_data.get("instance_id", "")

    if not key or not instance_id:
        return {"deactivated": False, "error": "No active instance"}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{LS_API_BASE}/deactivate",
                json={
                    "license_key": key,
                    "instance_id": instance_id,
                },
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                data = await resp.json()
                deactivated = data.get("deactivated", False)

                if deactivated:
                    # Clear local license data
                    _write_license_file({})

                return {"deactivated": deactivated}

    except Exception as e:
        logger.error("LS deactivate error: %s", e)
        return {"deactivated": False, "error": str(e)}
