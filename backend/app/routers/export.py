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
    # Testrunde 05.09.2026: Jede Vorlage enthaelt nur noch, was die Person
    # braucht, die das Blatt in der Hand haelt. Alles andere ist Ballast und
    # kostet Spaltenbreite.
    #
    # Versicherung -- Leser ist ein Sachbearbeiter im Schadensfall: Was ist es,
    # was hat es gekostet, wo stand es, wo liegt der Beleg.
    "versicherung": [
        "nr", "typ", "bezeichnung", "hersteller", "modell",
        "seriennummer", "ain_artikelnr",
        "anschaffungsdatum", "garantie_bis",
        "standort_name",
        "external_url",
        "anmerkungen",
    ],
    # Rueckbau -- Leser ist der Handwerker vor Ort: Wo haengt es, woran haengt
    # es, laeuft es ohne Home Assistant weiter. Bewusst ohne Seriennummern und
    # Kaufdaten, und ohne "Integration": das ist ein HA-Interna und sagt einem
    # Elektriker nichts.
    "rueckbau": [
        "nr", "typ", "bezeichnung", "hersteller", "modell",
        "standort_name", "standort_floor_id",
        "netzwerk", "stromversorgung",
        "ohne_ha", "ohne_ha_hinweis",
        "external_url",
        "funktion", "anmerkungen",
    ],
    # Nachlass -- Leser sind Angehoerige: Was ist es wert, wo steht es, gibt es
    # noch Garantie, wo liegen die Unterlagen, laeuft es ohne HA weiter.
    # Netzwerkdetails (MAC, IP, Firmware, Integration) interessieren dort nicht.
    "nachlass": [
        "nr", "typ", "bezeichnung", "hersteller", "modell",
        "seriennummer", "ain_artikelnr",
        "anschaffungsdatum", "garantie_bis",
        "standort_name", "standort_floor_id",
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
        # Alle drei Vorlagen sind Listen zum Mitnehmen und sollen auf ein paar
        # Blatt passen. Detailseiten je Geraet gibt es nur bei einer freien
        # Feldauswahl -- oder wenn sie ausdruecklich angefordert werden.
        details = not (
            selected is not None
            and any(set(selected) == set(p) for p in EXPORT_FIELD_PRESETS.values())
        )

    pdf_bytes = export_devices_to_pdf(rows, fields=selected, detail_pages=details)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Device_Inventory_{timestamp}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
