"""FastAPI application for Geraeteverwaltung backend."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

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
    version="1.0.0",
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
        "version": "1.0.0",
        "ha_url": settings.HA_URL,
        "ha_token_configured": bool(settings.HA_TOKEN),
    }
