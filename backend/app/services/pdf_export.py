"""PDF export service for insurance documentation.

Generates a formatted PDF with device inventory including:
- Summary statistics
- Device table with selected fields
- Per-device detail pages (for insurance claims)

v2.5.3: accepts an optional ``fields`` list. When given, the summary table
and the detail pages render only those fields; column widths are derived
from a fixed-weight map. Prior versions ignored ``fields=`` entirely — the
frontend's ExportPicker looked broken because every export came out with
the same 8 table columns regardless of checkbox state.
"""

from __future__ import annotations

from datetime import datetime
from io import BytesIO

from fpdf import FPDF

from app.config import settings

# Testrunde 05.09.2026: Das PDF war durchgaengig englisch beschriftet, waehrend
# die Excel-Datei deutsch ist. Beide Dateien entstehen im selben Dialog aus
# denselben Daten -- das muss zusammenpassen. Die Beschriftung folgt jetzt der
# eingestellten Add-on-Sprache, Deutsch fuer "de", sonst Englisch.
FIELD_LABELS_EN: dict[str, str] = {
    "nr": "#",
    "typ": "Type",
    "bezeichnung": "Name",
    "modell": "Model",
    "hersteller": "Manufacturer",
    "standort_name": "Location",
    "standort_floor_id": "Floor",
    "standort_area_id": "Area ID",
    "seriennummer": "Serial No.",
    "ain_artikelnr": "Article No.",
    "firmware": "Firmware",
    "integration": "Integration",
    "netzwerk": "Network",
    "stromversorgung": "Power",
    "ip_adresse": "IP Address",
    "mac_adresse": "MAC Address",
    "anschaffungsdatum": "Purchased",
    "garantie_bis": "Warranty",
    "ha_device_id": "HA Device ID",
    "ha_entity_id": "HA Entity ID",
    "funktion": "Function",
    "anmerkungen": "Notes",
    # v3.0.0: handover documentation
    "external_url": "External Link",
    "ohne_ha": "Works without HA",
    "ohne_ha_hinweis": "Without-HA Note",
}

FIELD_LABELS_DE: dict[str, str] = {
    "nr": "Nr",
    "typ": "Typ",
    "bezeichnung": "Bezeichnung",
    "modell": "Modell",
    "hersteller": "Hersteller",
    "standort_name": "Standort",
    "standort_floor_id": "Etage",
    "standort_area_id": "Bereich-ID",
    "seriennummer": "Seriennr.",
    "ain_artikelnr": "AIN/Art.-Nr.",
    "firmware": "Firmware",
    "integration": "Integration",
    "netzwerk": "Netzwerk",
    "stromversorgung": "Strom",
    "ip_adresse": "IP-Adresse",
    "mac_adresse": "MAC-Adresse",
    "anschaffungsdatum": "Gekauft am",
    "garantie_bis": "Garantie bis",
    "ha_device_id": "HA Device ID",
    "ha_entity_id": "HA Entity ID",
    "funktion": "Funktion",
    "anmerkungen": "Anmerkungen",
    "external_url": "Externer Link",
    "ohne_ha": "Ohne HA nutzbar",
    "ohne_ha_hinweis": "Hinweis ohne HA",
}

# v3.0.0: stored language-neutrally as yes/no.
OHNE_HA_LABELS_EN: dict[str, str] = {"yes": "Yes", "no": "No"}
OHNE_HA_LABELS_DE: dict[str, str] = {"yes": "Ja", "no": "Nein"}


def _labels_for(language: str) -> tuple[dict[str, str], dict[str, str], str]:
    """(Feldbeschriftung, Ohne-HA-Werte, Dokumenttitel) fuer eine Sprache."""
    if (language or "").lower().startswith("de"):
        return FIELD_LABELS_DE, OHNE_HA_LABELS_DE, "Geraeteuebersicht"
    return FIELD_LABELS_EN, OHNE_HA_LABELS_EN, "Device Inventory"

# Column weight for the summary table (relative, normalised to usable width).
FIELD_WEIGHTS: dict[str, float] = {
    "nr": 0.6,
    "typ": 2.0,
    "bezeichnung": 3.5,
    "modell": 2.5,
    "hersteller": 2.0,
    "standort_name": 2.2,
    "standort_floor_id": 1.4,
    "standort_area_id": 2.0,
    "seriennummer": 2.0,
    "ain_artikelnr": 2.0,
    "firmware": 1.2,
    "integration": 2.0,
    "netzwerk": 1.4,
    "stromversorgung": 1.6,
    "ip_adresse": 1.6,
    "mac_adresse": 2.0,
    "anschaffungsdatum": 1.6,
    "garantie_bis": 1.6,
    "ha_device_id": 3.5,
    "ha_entity_id": 2.8,
    "funktion": 3.5,
    "anmerkungen": 3.5,
    "external_url": 3.5,
    "ohne_ha": 1.4,
    "ohne_ha_hinweis": 3.0,
}

DEFAULT_FIELDS: list[str] = [
    "nr", "bezeichnung", "typ", "hersteller",
    "seriennummer", "standort_name",
    "anschaffungsdatum", "garantie_bis",
]

USABLE_WIDTH_MM = 190.0


class DevicePDF(FPDF):
    """Custom PDF with header/footer for device inventory."""

    def __init__(self, title: str = "Device Inventory", orientation: str = "P"):
        super().__init__(orientation=orientation)
        self._doc_title = title
        self._timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    def header(self):
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 8, self._doc_title, align="L")
        self.set_font("Helvetica", "", 8)
        self.cell(0, 8, self._timestamp, align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(31, 78, 121)  # #1F4E79
        self.set_line_width(0.5)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


def _compute_col_widths(fields: list[str], usable_width_mm: float = USABLE_WIDTH_MM) -> list[float]:
    weights = [FIELD_WEIGHTS.get(f, 2.0) for f in fields]
    total = sum(weights) or 1.0
    return [usable_width_mm * w / total for w in weights]


def export_devices_to_pdf(
    devices: list[dict],
    fields: list[str] | None = None,
    detail_pages: bool = True,
    language: str | None = None,
) -> bytes:
    """Generate a PDF document from device list.

    When ``fields`` is provided, the summary table renders exactly those
    columns (auto-widthed) and the detail pages show the same fields as
    label/value pairs. When None, the classic 8-column summary + 14-field
    detail layout is preserved.

    ``detail_pages=False`` gives the summary table only. Die Vorlage
    "Rueckbau/Elektriker" nutzt das: Eine Liste fuer den Handwerker soll auf
    ein paar Blatt passen, nicht auf 61 Seiten (Testrunde 05.09.2026).
    """
    field_labels, ohne_ha_labels, doc_title = _labels_for(
        language if language is not None else settings.LANGUAGE
    )

    selected = [f for f in (fields or DEFAULT_FIELDS) if f in field_labels]
    if not selected:
        selected = DEFAULT_FIELDS

    # Testrunde 05.09.2026: Mit 15 Spalten blieben auf A4 hochkant rund 12 mm
    # je Spalte -- Koepfe ueberlappten, Werte waren auf sechs Zeichen gekuerzt
    # ("PC-10-F6.", "FRITZ."). Ab neun Spalten deshalb Querformat.
    landscape = len(selected) > 8

    pdf = DevicePDF(title=doc_title, orientation="L" if landscape else "P")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # --- Summary ---
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(31, 78, 121)
    pdf.cell(0, 8, "Summary", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0)
    pdf.set_font("Helvetica", "", 10)

    total = len(devices)
    types = len(set(d.get("typ", "") for d in devices))
    locations = len(set(d.get("standort_name", "") for d in devices if d.get("standort_name")))
    manufacturers = len(set(d.get("hersteller", "") for d in devices if d.get("hersteller")))

    pdf.cell(50, 6, f"Total devices: {total}")
    pdf.cell(50, 6, f"Types: {types}")
    pdf.cell(50, 6, f"Locations: {locations}")
    pdf.cell(0, 6, f"Manufacturers: {manufacturers}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # --- Device Table ---
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(31, 78, 121)
    pdf.cell(0, 8, "Device List", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0)

    usable = pdf.w - pdf.l_margin - pdf.r_margin
    col_widths = _compute_col_widths(selected, usable)
    headers = [field_labels[f] for f in selected]
    # Per-column truncation proportional to column width (~2mm per char).
    max_chars = [max(4, int(w / 2.0)) for w in col_widths]
    # Auch die Kopfzeile kuerzen, sonst laeuft sie in die Nachbarspalte.
    headers = [_truncate(h, max(4, int(w / 1.7))) for h, w in zip(headers, col_widths)]

    def _draw_header() -> None:
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_fill_color(31, 78, 121)
        pdf.set_text_color(255)
        for i, h in enumerate(headers):
            pdf.cell(col_widths[i], 6, h, border=1, fill=True, align="C")
        pdf.ln()

    _draw_header()

    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(0)
    fill = False

    for idx, device in enumerate(devices, 1):
        if pdf.get_y() > 265:
            pdf.add_page()
            _draw_header()
            pdf.set_font("Helvetica", "", 7)
            pdf.set_text_color(0)
            fill = False

        pdf.set_fill_color(240, 245, 250) if fill else pdf.set_fill_color(255)

        for i, f in enumerate(selected):
            if f == "nr":
                val = str(idx)
            elif f == "ohne_ha":
                val = ohne_ha_labels.get(str(device.get(f) or ""), "")
            else:
                val = str(device.get(f, "") or "")
            align = "C" if f == "nr" else "L"
            pdf.cell(col_widths[i], 5, _truncate(val, max_chars[i]), border=1, fill=True, align=align)
        pdf.ln()
        fill = not fill

    # --- Detail pages ---
    if devices and detail_pages:
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(31, 78, 121)
        pdf.cell(0, 8, "Device Details", new_x="LMARGIN", new_y="NEXT")

        # Detail pages show the selected fields as label/value rows. "nr"
        # and "bezeichnung" are surfaced in the heading, so skip them below.
        detail_fields = [f for f in selected if f not in ("nr", "bezeichnung", "anmerkungen")]

        for idx, device in enumerate(devices, 1):
            if pdf.get_y() > 240:
                pdf.add_page()

            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(31, 78, 121)
            pdf.cell(
                0, 7,
                f"{idx}. {_safe_text(device.get('bezeichnung', 'Unknown'))}",
                new_x="LMARGIN", new_y="NEXT",
            )

            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(0)

            for f in detail_fields:
                value = device.get(f, "")
                if f == "ohne_ha":
                    value = ohne_ha_labels.get(str(value or ""), "")
                if not value:
                    continue
                pdf.set_font("Helvetica", "B", 8)
                pdf.cell(30, 5, f"{field_labels.get(f, f)}:")
                pdf.set_font("Helvetica", "", 8)
                pdf.cell(0, 5, _safe_text(str(value)), new_x="LMARGIN", new_y="NEXT")

            # Notes get a multi_cell if they were selected.
            #
            # v2.6.0: Forum report — at ~3000 characters the layout
            # broke because fpdf2's auto_page_break interacts badly with the
            # custom header() when a multi_cell straddles a page boundary,
            # producing a header that overlaps the continuing notes block.
            # We cap the PDF rendering at NOTES_PDF_MAX_LEN and point users
            # to the Excel export for the full text. Excel handles arbitrary
            # cell length without layout damage.
            if "anmerkungen" in selected and device.get("anmerkungen"):
                NOTES_PDF_MAX_LEN = 1000
                full_notes = _safe_text(str(device["anmerkungen"]))
                truncated = len(full_notes) > NOTES_PDF_MAX_LEN
                shown = (
                    full_notes[:NOTES_PDF_MAX_LEN].rsplit(" ", 1)[0] + "..."
                    if truncated else full_notes
                )

                # If we're already deep on the page, force a fresh one before
                # rendering the notes block — keeps the "Notes:" label and
                # at least the first lines together.
                if pdf.get_y() > 240:
                    pdf.add_page()

                pdf.set_font("Helvetica", "B", 8)
                pdf.cell(30, 5, "Notes:")
                pdf.set_font("Helvetica", "", 8)
                pdf.multi_cell(0, 5, shown)

                if truncated:
                    pdf.set_font("Helvetica", "I", 7)
                    pdf.set_text_color(120)
                    pdf.cell(
                        0, 4,
                        f"... ({len(full_notes)} chars total — full text in Excel export)",
                        new_x="LMARGIN", new_y="NEXT",
                    )
                    pdf.set_text_color(0)

            pdf.ln(3)
            pdf.set_draw_color(200)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(2)

    buf = BytesIO()
    pdf.output(buf)
    return buf.getvalue()


def _safe_text(text: str) -> str:
    """Remove characters not supported by Latin-1 (e.g. emojis)."""
    return "".join(c for c in text if ord(c) < 256)


def _truncate(text: str, max_len: int) -> str:
    if not text:
        return ""
    text = _safe_text(text)
    if len(text) <= max_len:
        return text
    return text[:max_len - 1] + "."
