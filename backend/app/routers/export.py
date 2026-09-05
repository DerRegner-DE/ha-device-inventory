"""Export endpoints (Excel + PDF)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Query
from fastapi.responses import Response

from app.database import get_db, dicts_from_rows
from app.services.excel_export import export_devices_to_xlsx
from app.services.pdf_export import export_devices_to_pdf

router = APIRouter(prefix="/export", tags=["export"])


# v2.5.0: field presets for the export-picker (forum feature request).
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
    # v3.0.0: "Rueckbau" — die Liste, die man einem Elektriker in die Hand
    # drueckt. Aus dem Forum-Thread 92060: Was steckt wo, wie haengt es am
    # Netz, und laeuft die Grundfunktion auch ohne Home Assistant? Bewusst
    # ohne Seriennummern/Kaufdaten — die interessieren beim Rueckbau nicht.
    "rueckbau": [
        "nr", "typ", "bezeichnung", "hersteller", "modell",
        "standort_name", "standort_floor_id",
        "netzwerk", "stromversorgung", "integration",
        "ohne_ha", "ohne_ha_hinweis",
        "external_url",
        "funktion", "anmerkungen",
    ],
    # v3.0.0: Ein Nachlass ist ebenfalls eine Uebergabe. Wer erbt, will wissen,
    # was ohne Home Assistant weiterlaeuft, und wo Rechnung/Handbuch liegen.
    "nachlass": [
        "nr", "typ", "bezeichnung", "modell", "hersteller",
        "seriennummer", "ain_artikelnr",
        "anschaffungsdatum", "garantie_bis",
        "standort_name", "standort_floor_id",
        "mac_adresse", "ip_adresse",
        "integration", "netzwerk", "firmware",
        "ohne_ha", "ohne_ha_hinweis",
        "external_url",
        "funktion", "anmerkungen",
    ],
}


def _parse_fields(fields: str | None) -> list[str] | None:
    """Parse the ``fields`` query string into a clean list, or None for the
    classic default layout."""
    if not fields:
        return None
    out = [f.strip() for f in fields.split(",") if f.strip()]
    return out or None


@router.get("/presets")
def get_export_presets():
    """List the available export presets and their field sets. The frontend
    renders these as quick-select radio buttons above the checkbox list."""
    return {"presets": EXPORT_FIELD_PRESETS}


@router.get("/xlsx")
def export_xlsx(fields: str | None = Query(None, description="Comma-separated field allowlist")):
    """Export all devices as formatted Excel. If ``fields`` is given, only
    those columns are rendered (in that order).

    v2.5.3: Prior to this, ``fields=`` was accepted but silently ignored
    because the xlsx builder had a hardcoded 16-column header and pulled
    values via ``.get()`` with empty-string defaults — unselected fields
    came out as empty cells instead of being dropped.
    """
    with get_db() as conn:
        rows = dicts_from_rows(
            conn.execute(
                "SELECT * FROM devices WHERE deleted_at IS NULL ORDER BY nr ASC, typ ASC, bezeichnung ASC"
            ).fetchall()
        )

    xlsx_bytes = export_devices_to_xlsx(rows, fields=_parse_fields(fields))

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Device_Inventory_{timestamp}.xlsx"

    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/pdf")
def export_pdf(
    fields: str | None = Query(None, description="Comma-separated field allowlist"),
    details: bool | None = Query(
        None,
        description=(
            "Render per-device detail pages. Default: yes, except when the "
            "requested fields are exactly the 'rueckbau' preset."
        ),
    ),
):
    """Export all devices as PDF. ``fields`` shapes both the summary table
    and the per-device detail pages. Same v2.5.3 fix as ``/xlsx``."""
    with get_db() as conn:
        rows = dicts_from_rows(
            conn.execute(
                "SELECT * FROM devices WHERE deleted_at IS NULL ORDER BY nr ASC, typ ASC, bezeichnung ASC"
            ).fetchall()
        )

    selected = _parse_fields(fields)
    if details is None:
        # Zweiter Riegel: Auch wenn die Oberflaeche die Vorlage nicht
        # mitschickt, soll die Rueckbau-Liste kompakt bleiben. Sie geht an
        # einen Handwerker -- 61 Seiten liest niemand.
        details = not (
            selected is not None
            and set(selected) == set(EXPORT_FIELD_PRESETS["rueckbau"])
        )

    pdf_bytes = export_devices_to_pdf(rows, fields=selected, detail_pages=details)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Device_Inventory_{timestamp}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
