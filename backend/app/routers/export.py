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
        # v3.1.0 (Roadmap Nr. 19, Forum 92177): Pflichtspalte. Wer zurueckbaut,
        # muss wissen, welcher Wandschalter ueberbrueckt ist.
        "schalter_gebrueckt", "schalter_gebrueckt_hinweis",
        "external_url",
        "funktion", "anmerkungen",
    ],
    # v3.1.0 (Roadmap Nr. 20, Forum 92177 #11/#14/#17/#18): Notfallmappe /
    # Hausunterlagen zum Ausdrucken. Leser ist der Helfer, den die Angehoerigen
    # holen -- Elektriker, Nachbar, Makler: Was ist es, wo haengt es, wer hat
    # es gebaut, wo liegt die Anleitung, laeuft es ohne HA. Bewusst OHNE
    # Kennwoerter (gibt es in der App nicht) und ohne Netzwerkdetails.
    "notfallmappe": [
        "nr", "typ", "bezeichnung", "hersteller", "modell",
        "seriennummer",
        "standort_floor_id", "standort_name",
        "stromversorgung",
        "ohne_ha", "ohne_ha_hinweis",
        "schalter_gebrueckt", "schalter_gebrueckt_hinweis",
        "anschaffungsdatum", "garantie_bis",
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


def _load_rows(sort: str) -> list[dict]:
    """Aktive Geraete fuer den Export.

    v3.1.0 (Roadmap Nr. 16, Forum #90): ``sort="standort"`` ordnet nach
    Etage > Standort > Bezeichnung -- der Ausdruck haengt im Sicherungskasten,
    und wer davor steht, sucht nach Raum, nicht nach Geraetename. Die Spalte
    "Etage" zeigt dabei den Namen aus HA statt der internen floor_id.
    """
    with get_db() as conn:
        rows = dicts_from_rows(
            conn.execute(
                "SELECT * FROM devices WHERE deleted_at IS NULL ORDER BY nr ASC, typ ASC, bezeichnung ASC"
            ).fetchall()
        )
        floor_names = {
            r["floor_id"]: r["floor_name"]
            for r in conn.execute(
                "SELECT DISTINCT floor_id, floor_name FROM ha_areas "
                "WHERE floor_id IS NOT NULL AND floor_name IS NOT NULL"
            ).fetchall()
        }
    for r in rows:
        fid = r.get("standort_floor_id")
        if fid and fid in floor_names:
            r["standort_floor_id"] = floor_names[fid]
    if sort == "standort":
        def key(r: dict):
            floor = (r.get("standort_floor_id") or "").casefold()
            place = (r.get("standort_name") or "").casefold()
            # Geraete ohne Etage/Standort ans Ende, nicht an den Anfang.
            return (floor == "", floor, place == "", place, (r.get("bezeichnung") or "").casefold())
        rows.sort(key=key)
    return rows


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
def export_xlsx(
    fields: str | None = Query(None, description="Comma-separated field allowlist"),
    sort: str = Query("nr", description="'nr' (grouped by category) or 'standort' (flat, floor > location > name)"),
):
    """Export all devices as formatted Excel. If ``fields`` is given, only
    those columns are rendered (in that order).

    v2.5.3: Prior to this, ``fields=`` was accepted but silently ignored
    because the xlsx builder had a hardcoded 16-column header and pulled
    values via ``.get()`` with empty-string defaults — unselected fields
    came out as empty cells instead of being dropped.

    v3.1.0: ``sort=standort`` liefert eine flache Tabelle ohne
    Kategorie-Zwischenzeilen, damit sie in Excel frei sortierbar bleibt.
    """
    rows = _load_rows(sort)
    xlsx_bytes = export_devices_to_xlsx(
        rows, fields=_parse_fields(fields), flat=(sort == "standort"),
    )

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
    sort: str = Query("nr", description="'nr' or 'standort' (floor > location > name)"),
):
    """Export all devices as PDF. ``fields`` shapes both the summary table
    and the per-device detail pages. Same v2.5.3 fix as ``/xlsx``."""
    rows = _load_rows(sort)

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
