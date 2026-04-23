"""Export endpoints (Excel + PDF)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Query
from fastapi.responses import Response

from app.database import get_db, dicts_from_rows
from app.services.excel_export import export_devices_to_xlsx
from app.services.pdf_export import export_devices_to_pdf

router = APIRouter(prefix="/export", tags=["export"])


# v2.5.0: field presets for the export-picker (Bacardi feature request).
# "all" is the default; "versicherung" and "nachlass" are insurance- and
# estate-planning-oriented subsets. The frontend shows them as radio-buttons
# that seed the checkbox list; individual tweaks are free-form.
EXPORT_FIELD_PRESETS: dict[str, list[str]] = {
    "versicherung": [
        "nr", "typ", "bezeichnung", "modell", "hersteller",
        "seriennummer", "ain_artikelnr",
        "anschaffungsdatum", "garantie_bis",
        "standort_name", "anmerkungen",
    ],
    "nachlass": [
        "nr", "typ", "bezeichnung", "modell", "hersteller",
        "seriennummer", "ain_artikelnr",
        "anschaffungsdatum", "garantie_bis",
        "standort_name", "standort_floor_id",
        "mac_adresse", "ip_adresse",
        "integration", "netzwerk", "firmware",
        "funktion", "anmerkungen",
    ],
}


def _filter_fields(rows: list[dict], fields: list[str] | None) -> list[dict]:
    """Restrict each row to the named fields (keeping id + uuid for internal
    continuity). If ``fields`` is None or empty, return rows unchanged."""
    if not fields:
        return rows
    keep = set(fields) | {"id", "uuid"}
    return [{k: v for k, v in r.items() if k in keep} for r in rows]


@router.get("/presets")
def get_export_presets():
    """List the available export presets and their field sets. The frontend
    renders these as quick-select radio buttons above the checkbox list."""
    return {"presets": EXPORT_FIELD_PRESETS}


@router.get("/xlsx")
def export_xlsx(fields: str | None = Query(None, description="Comma-separated field allowlist")):
    """Export all devices as formatted Excel. If ``fields`` is given,
    only those columns are included."""
    with get_db() as conn:
        rows = dicts_from_rows(
            conn.execute(
                "SELECT * FROM devices WHERE deleted_at IS NULL ORDER BY nr ASC, typ ASC, bezeichnung ASC"
            ).fetchall()
        )

    field_list = [f.strip() for f in fields.split(",")] if fields else None
    rows = _filter_fields(rows, field_list)
    xlsx_bytes = export_devices_to_xlsx(rows)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Geraeteuebersicht_{timestamp}.xlsx"

    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/pdf")
def export_pdf(fields: str | None = Query(None, description="Comma-separated field allowlist")):
    """Export all devices as PDF. Optional ``fields`` restricts which
    fields are rendered."""
    with get_db() as conn:
        rows = dicts_from_rows(
            conn.execute(
                "SELECT * FROM devices WHERE deleted_at IS NULL ORDER BY nr ASC, typ ASC, bezeichnung ASC"
            ).fetchall()
        )

    field_list = [f.strip() for f in fields.split(",")] if fields else None
    rows = _filter_fields(rows, field_list)
    pdf_bytes = export_devices_to_pdf(rows)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Device_Inventory_{timestamp}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
