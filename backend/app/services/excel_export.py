"""Excel export matching Geraeteuebersicht.xlsx format.

16 columns, dark blue header #1F4E79, alternating light blue #D6E4F0 / white rows,
category grouping, Arial 11, thin borders with light blue color.
"""

from __future__ import annotations

import io
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

# --- Style constants (matching create_device_list.py exactly) ---

HEADER_FONT = Font(name="Arial", bold=True, color="FFFFFF", size=11)
HEADER_FILL = PatternFill("solid", fgColor="1F4E79")
HEADER_ALIGN = Alignment(horizontal="center", vertical="center", wrap_text=True)

DATA_FONT = Font(name="Arial", size=10)
DATA_ALIGN = Alignment(vertical="center", wrap_text=True)

ROW_FILL_ALT = PatternFill("solid", fgColor="D6E4F0")
ROW_FILL_WHITE = PatternFill("solid", fgColor="FFFFFF")

CATEGORY_FONT = Font(name="Arial", bold=True, size=11, color="1F4E79")
CATEGORY_FILL = PatternFill("solid", fgColor="B4C6E7")

THIN_BORDER = Border(
    left=Side(style="thin", color="B4C6E7"),
    right=Side(style="thin", color="B4C6E7"),
    top=Side(style="thin", color="B4C6E7"),
    bottom=Side(style="thin", color="B4C6E7"),
)

HEADERS = [
    "Nr", "Typ", "Bezeichnung", "Modell", "Hersteller", "Standort",
    "Seriennummer", "MAC-Adresse", "IP-Adresse", "Firmware",
    "Integration (HA)", "Netzwerk", "Stromversorgung", "AIN/Artikelnr.",
    "Funktion", "Anmerkungen",
]

COL_WIDTHS = [5, 14, 32, 28, 20, 24, 22, 20, 14, 10, 22, 14, 16, 24, 38, 36]

# Mapping from integration DB field to category label for grouping
INTEGRATION_CATEGORIES: list[tuple[str, list[str]]] = [
    ("FRITZ!Box Netzwerk", ["fritz", "fritzbox", "fritz, fritzbox"]),
    ("Zigbee (Zigbee2MQTT)", ["zigbee2mqtt", "zigbee2mqtt (MQTT)", "zha"]),
    ("Tuya (LocalTuya)", ["localtuya"]),
    ("Bosch Smart Home (SHC)", ["boschshc"]),
    ("HomeMatic IP", ["homematicip_cloud"]),
    ("Ring", ["ring"]),
    ("Blink", ["blink"]),
    ("Amazon Alexa Devices", ["alexa_devices", "alexa_media", "alexa_devices + alexa_media", "alexa_media (BT)"]),
    ("TP-Link", ["tplink"]),
    ("AVM Powerline", ["fritz (device_tracker)"]),
]


def _device_to_row(device: dict[str, Any], nr: int) -> list[Any]:
    """Convert a device dict to a 16-column row."""
    return [
        nr,
        device.get("typ", ""),
        device.get("bezeichnung", ""),
        device.get("modell", ""),
        device.get("hersteller", ""),
        device.get("standort_name", ""),
        device.get("seriennummer", ""),
        device.get("mac_adresse", ""),
        device.get("ip_adresse", ""),
        device.get("firmware", ""),
        device.get("integration", ""),
        device.get("netzwerk", ""),
        device.get("stromversorgung", ""),
        device.get("ain_artikelnr", ""),
        device.get("funktion", ""),
        device.get("anmerkungen", ""),
    ]


def _categorize_devices(devices: list[dict[str, Any]]) -> list[tuple[str, list[dict[str, Any]]]]:
    """Group devices by integration category. Unmatched go to 'Sonstige Geraete'."""
    categorized: dict[str, list[dict[str, Any]]] = {}
    used_ids: set[int] = set()

    for cat_name, integrations in INTEGRATION_CATEGORIES:
        cat_devices = []
        for d in devices:
            integration = (d.get("integration") or "").strip().lower()
            if any(intg.lower() in integration or integration in intg.lower() for intg in integrations):
                cat_devices.append(d)
                used_ids.add(d["id"])
        if cat_devices:
            categorized[cat_name] = cat_devices

    # Remaining devices go to "Sonstige Geraete"
    remaining = [d for d in devices if d["id"] not in used_ids]
    if remaining:
        categorized["Sonstige Geraete"] = remaining

    # Return in defined order, then extras
    result = []
    for cat_name, _ in INTEGRATION_CATEGORIES:
        if cat_name in categorized:
            result.append((cat_name, categorized.pop(cat_name)))
    for cat_name, cat_devices in categorized.items():
        result.append((cat_name, cat_devices))

    return result


def export_devices_to_xlsx(devices: list[dict[str, Any]]) -> bytes:
    """Export devices to Excel bytes matching the Geraeteuebersicht format."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Geraeteuebersicht"

    # --- Header row ---
    for col, h in enumerate(HEADERS, 1):
        c = ws.cell(row=1, column=col, value=h)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = HEADER_ALIGN
        c.border = THIN_BORDER

    ws.row_dimensions[1].height = 30

    # --- Group by category ---
    categories = _categorize_devices(devices)

    row = 2
    nr = 0

    for cat_name, cat_devices in categories:
        # Category header row
        for col in range(1, len(HEADERS) + 1):
            c = ws.cell(row=row, column=col)
            c.fill = CATEGORY_FILL
            c.font = CATEGORY_FONT
            c.border = THIN_BORDER

        ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=len(HEADERS))
        cell = ws.cell(row=row, column=2, value=cat_name)
        cell.font = CATEGORY_FONT
        cell.fill = CATEGORY_FILL
        row += 1

        # Data rows
        data_row_idx = 0
        for device in cat_devices:
            nr += 1
            values = _device_to_row(device, nr)
            fill = ROW_FILL_ALT if data_row_idx % 2 == 0 else ROW_FILL_WHITE

            for col, val in enumerate(values, 1):
                c = ws.cell(row=row, column=col, value=val)
                c.font = DATA_FONT
                c.alignment = DATA_ALIGN
                c.fill = fill
                c.border = THIN_BORDER

            row += 1
            data_row_idx += 1

    # --- Column widths ---
    for i, w in enumerate(COL_WIDTHS, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # --- Filters & freeze ---
    ws.auto_filter.ref = f"A1:{get_column_letter(len(HEADERS))}{row - 1}"
    ws.freeze_panes = "A2"
    ws.sheet_properties.tabColor = "1F4E79"

    # Write to bytes
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()
