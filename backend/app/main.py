"""FastAPI application for Geraeteverwaltung backend."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import settings
from app.database import init_db
from app.routers import devices, photos, sync, export, import_data, ha_proxy
from app.services.device_sync import sync_ha_areas

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
    logger.info("Photos directory: %s", settings.PHOTOS_DIR)

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
    version="1.3.1",
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
app.include_router(sync.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(import_data.router, prefix="/api")
app.include_router(ha_proxy.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "version": "1.3.1",
        "ha_url": settings.HA_URL,
        "ha_token_configured": bool(settings.HA_TOKEN),
    }


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


@app.get("/api/license")
def get_license():
    data = _read_license_file()
    return {"key": data.get("key", "")}


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
    """Validate a license key server-side (for HTTP contexts without crypto.subtle)."""
    try:
        key = body.key.strip()
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
