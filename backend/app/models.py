from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Device
# ---------------------------------------------------------------------------

class DeviceBase(BaseModel):
    typ: str
    bezeichnung: str
    modell: str | None = None
    hersteller: str | None = None
    standort_area_id: str | None = None
    standort_name: str | None = None
    standort_floor_id: str | None = None
    seriennummer: str | None = None
    mac_adresse: str | None = None
    ip_adresse: str | None = None
    firmware: str | None = None
    integration: str | None = None
    stromversorgung: str | None = None
    netzwerk: str | None = None
    anschaffungsdatum: str | None = None
    garantie_bis: str | None = None
    funktion: str | None = None
    anmerkungen: str | None = None
    ha_entity_id: str | None = None
    ha_device_id: str | None = None
    ain_artikelnr: str | None = None


class DeviceCreate(DeviceBase):
    uuid: str | None = None
    nr: int | None = None


class DeviceUpdate(BaseModel):
    typ: str | None = None
    bezeichnung: str | None = None
    modell: str | None = None
    hersteller: str | None = None
    standort_area_id: str | None = None
    standort_name: str | None = None
    standort_floor_id: str | None = None
    seriennummer: str | None = None
    mac_adresse: str | None = None
    ip_adresse: str | None = None
    firmware: str | None = None
    integration: str | None = None
    stromversorgung: str | None = None
    netzwerk: str | None = None
    anschaffungsdatum: str | None = None
    garantie_bis: str | None = None
    funktion: str | None = None
    anmerkungen: str | None = None
    ha_entity_id: str | None = None
    ha_device_id: str | None = None
    ain_artikelnr: str | None = None


class Device(DeviceBase):
    id: int
    uuid: str
    nr: int | None = None
    created_at: str
    updated_at: str
    deleted_at: str | None = None
    sync_version: int = 1
    photos: list[Photo] = []


class DeviceListResponse(BaseModel):
    items: list[Device]
    total: int
    page: int
    per_page: int
    pages: int


# ---------------------------------------------------------------------------
# Photo
# ---------------------------------------------------------------------------

class PhotoBase(BaseModel):
    caption: str | None = None
    is_primary: bool = False


class Photo(PhotoBase):
    id: int
    uuid: str
    device_id: int
    filename: str
    mime_type: str
    created_at: str
    deleted_at: str | None = None


# ---------------------------------------------------------------------------
# HA Area / Floor
# ---------------------------------------------------------------------------

class HaArea(BaseModel):
    area_id: str
    name: str
    floor_id: str | None = None
    floor_name: str | None = None
    icon: str | None = None
    last_synced: str | None = None


class HaFloor(BaseModel):
    floor_id: str
    name: str
    level: int | None = None
    icon: str | None = None


class HaDeviceSummary(BaseModel):
    device_id: str
    name: str | None = None
    name_by_user: str | None = None
    manufacturer: str | None = None
    model: str | None = None
    area_id: str | None = None
    integration: str | None = None


class HaDeviceDetail(HaDeviceSummary):
    entities: list[dict[str, Any]] = []
    hw_version: str | None = None
    sw_version: str | None = None
    serial_number: str | None = None
    connections: list[list[str]] = []
    identifiers: list[list[str]] = []


# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------

class SyncLogEntry(BaseModel):
    entity_type: str
    entity_uuid: str
    action: str  # create | update | delete
    payload: dict[str, Any] | None = None


class SyncPush(BaseModel):
    client_id: str
    changes: list[SyncLogEntry]


class SyncPullResponse(BaseModel):
    devices: list[Device]
    photos: list[Photo]
    areas: list[HaArea]
    current_version: int


class SyncStatus(BaseModel):
    current_version: int
    total_devices: int
    total_photos: int
    total_areas: int
    last_ha_sync: str | None = None
