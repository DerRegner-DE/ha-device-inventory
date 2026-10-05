"""Excel import: reads the add-on's own Excel export (and the older
Geraeteuebersicht.xlsx layout) back into SQLite.

v3.1.0: Spalten werden ueber die Ueberschrift zugeordnet, nicht mehr ueber
die Position. Der Excel-Export schreibt nur die gewaehlten Felder (und seit
3.1.0 wahlweise ohne Kategorie-Zwischenzeilen); mit fester Spaltenposition
landeten Werte einer eigenen Exportdatei im falschen Feld.
"""

from __future__ import annotations

import datetime as _dt
import io
import logging
from typing import Any
from uuid import uuid4

from openpyxl import load_workbook

from app.services.excel_export import FIELD_LABELS, YES_NO_FIELDS

logger = logging.getLogger(__name__)

# Ueberschrift (klein geschrieben) -> DB-Feld. "Etage" schreibt der Export als
# Etagenname, nicht als ID -- die ergibt sich beim Import nicht, also weglassen.
HEADER_TO_FIELD: dict[str, str] = {
    label.strip().lower(): field
    for field, label in FIELD_LABELS.items()
    if field != "standort_floor_id"
}
HEADER_TO_FIELD.update({"nr.": "nr", "integration": "integration", "anschaffungsdatum": "anschaffungsdatum"})

YES_NO_IN = {"ja": "yes", "yes": "yes", "nein": "no", "no": "no"}

IMPORT_FIELDS = [
    "uuid", "nr", "typ", "bezeichnung", "modell", "hersteller",
    "standort_name", "standort_area_id", "seriennummer", "mac_adresse", "ip_adresse",
    "firmware", "integration", "netzwerk", "stromversorgung",
    "ain_artikelnr", "anschaffungsdatum", "garantie_bis",
    "ha_device_id", "ha_entity_id", "funktion", "anmerkungen",
    "external_url", "ohne_ha", "ohne_ha_hinweis",
    "schalter_gebrueckt", "schalter_gebrueckt_hinweis",
]


def _clean_value(val: Any) -> str | None:
    """Clean a cell value to string or None (dates as ISO date)."""
    if val is None:
        return None
    if isinstance(val, (_dt.datetime, _dt.date)):
        return val.strftime("%Y-%m-%d")
    s = str(val).strip()
    return s if s else None


def _header_map(row_values: list[Any]) -> dict[int, str] | None:
    """Spaltenindex -> Feld, wenn die Zeile eine Kopfzeile ist (Typ und Bezeichnung)."""
    mapping: dict[int, str] = {}
    for idx, v in enumerate(row_values):
        key = (_clean_value(v) or "").lower()
        if key in HEADER_TO_FIELD:
            mapping[idx] = HEADER_TO_FIELD[key]
    fields = set(mapping.values())
    if "bezeichnung" in fields and ("typ" in fields or "nr" in fields):
        return mapping
    return None


def parse_xlsx(file_bytes: bytes) -> list[dict[str, Any]]:
    """Parse an exported Excel file and return device dicts (with fresh uuid)."""
    wb = load_workbook(io.BytesIO(file_bytes), data_only=True)

    ws = None
    for name in ["Geraeteuebersicht", "Sheet1", "Tabelle1"]:
        if name in wb.sheetnames:
            ws = wb[name]
            break
    if ws is None:
        ws = wb.active

    devices: list[dict[str, Any]] = []
    mapping: dict[int, str] | None = None

    for row_idx, row in enumerate(ws.iter_rows(min_row=1, values_only=True), start=1):
        row_values = list(row)
        if mapping is None:
            mapping = _header_map(row_values)
            if mapping:
                logger.info("Header found at row %d: %s", row_idx, sorted(mapping.values()))
            continue

        cleaned = {idx: _clean_value(row_values[idx]) if idx < len(row_values) else None for idx in mapping}
        filled = [idx for idx, v in cleaned.items() if v is not None]
        if not filled:
            continue
        # Kategorie-Zwischenzeile des gruppierten Exports: nur Spalte 2 belegt.
        if all(v is None for v in (_clean_value(x) for i, x in enumerate(row_values) if i != 1)):
            continue

        device: dict[str, Any] = {}
        for idx, field in mapping.items():
            val = cleaned[idx]
            if field == "nr":
                try:
                    device["nr"] = int(float(val)) if val is not None else None
                except (ValueError, TypeError):
                    device["nr"] = None
            elif field in YES_NO_FIELDS:
                device[field] = YES_NO_IN.get((val or "").lower())
            else:
                device[field] = val

        if not device.get("typ") and not device.get("bezeichnung"):
            continue
        device["typ"] = device.get("typ") or "Sonstiges"
        device["bezeichnung"] = device.get("bezeichnung") or "Unbenannt"
        device["uuid"] = uuid4().hex
        devices.append(device)

    if mapping is None:
        raise ValueError("No header row with 'Typ'/'Bezeichnung' found")
    logger.info("Parsed %d devices from Excel", len(devices))
    return devices


def import_devices_to_db(conn, devices: list[dict[str, Any]]) -> int:
    """Insert parsed devices into the database. Returns count of inserted rows."""
    placeholders = ", ".join(["?"] * len(IMPORT_FIELDS))
    columns = ", ".join(IMPORT_FIELDS)
    sql = f"INSERT INTO devices ({columns}) VALUES ({placeholders})"

    count = 0
    for device in devices:
        values = [device.get(f) for f in IMPORT_FIELDS]
        try:
            conn.execute(sql, values)
            count += 1
        except Exception as e:
            logger.warning("Failed to insert device %s: %s", device.get("bezeichnung"), e)

    return count
