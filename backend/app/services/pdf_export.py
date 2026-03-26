"""PDF export service for insurance documentation.

Generates a formatted PDF with device inventory including:
- Summary statistics
- Device table with key fields
- Per-device detail pages (optional, for insurance claims)
"""

from __future__ import annotations

from datetime import datetime
from io import BytesIO

from fpdf import FPDF


class DevicePDF(FPDF):
    """Custom PDF with header/footer for device inventory."""

    def __init__(self, title: str = "Device Inventory"):
        super().__init__()
        self._doc_title = title
        self._timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    def header(self):
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 8, self._doc_title, align="L")
        self.set_font("Helvetica", "", 8)
        self.cell(0, 8, self._timestamp, align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(31, 78, 121)  # #1F4E79
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


def export_devices_to_pdf(devices: list[dict]) -> bytes:
    """Generate a PDF document from device list.

    Returns PDF as bytes.
    """
    pdf = DevicePDF(title="Device Inventory - Insurance Documentation")
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

    # Table header
    col_widths = [8, 40, 25, 25, 22, 25, 22, 23]
    headers = ["#", "Name", "Type", "Manufacturer", "Serial No.", "Location", "Purchased", "Warranty"]

    pdf.set_font("Helvetica", "B", 7)
    pdf.set_fill_color(31, 78, 121)
    pdf.set_text_color(255)
    for i, header in enumerate(headers):
        pdf.cell(col_widths[i], 6, header, border=1, fill=True, align="C")
    pdf.ln()

    # Table rows
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(0)
    fill = False

    for idx, device in enumerate(devices, 1):
        if pdf.get_y() > 265:
            pdf.add_page()
            # Re-draw header
            pdf.set_font("Helvetica", "B", 7)
            pdf.set_fill_color(31, 78, 121)
            pdf.set_text_color(255)
            for i, header in enumerate(headers):
                pdf.cell(col_widths[i], 6, header, border=1, fill=True, align="C")
            pdf.ln()
            pdf.set_font("Helvetica", "", 7)
            pdf.set_text_color(0)
            fill = False

        if fill:
            pdf.set_fill_color(240, 245, 250)
        else:
            pdf.set_fill_color(255)

        row = [
            str(idx),
            _truncate(device.get("bezeichnung", ""), 28),
            _truncate(device.get("typ", ""), 16),
            _truncate(device.get("hersteller", ""), 16),
            _truncate(device.get("seriennummer", ""), 14),
            _truncate(device.get("standort_name", ""), 16),
            device.get("anschaffungsdatum", "") or "",
            device.get("garantie_bis", "") or "",
        ]

        for i, val in enumerate(row):
            pdf.cell(col_widths[i], 5, val, border=1, fill=True, align="L" if i > 0 else "C")
        pdf.ln()
        fill = not fill

    # --- Detail pages ---
    if devices:
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(31, 78, 121)
        pdf.cell(0, 8, "Device Details", new_x="LMARGIN", new_y="NEXT")

        for idx, device in enumerate(devices, 1):
            if pdf.get_y() > 240:
                pdf.add_page()

            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(31, 78, 121)
            pdf.cell(0, 7, f"{idx}. {device.get('bezeichnung', 'Unknown')}", new_x="LMARGIN", new_y="NEXT")

            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(0)

            fields = [
                ("Type", device.get("typ", "")),
                ("Model", device.get("modell", "")),
                ("Manufacturer", device.get("hersteller", "")),
                ("Serial Number", device.get("seriennummer", "")),
                ("Location", device.get("standort_name", "")),
                ("IP Address", device.get("ip_adresse", "")),
                ("MAC Address", device.get("mac_adresse", "")),
                ("Network", device.get("netzwerk", "")),
                ("Power", device.get("stromversorgung", "")),
                ("Firmware", device.get("firmware", "")),
                ("Integration", device.get("integration", "")),
                ("Purchased", device.get("anschaffungsdatum", "")),
                ("Warranty until", device.get("garantie_bis", "")),
                ("Article No.", device.get("ain_artikelnr", "")),
            ]

            for label, value in fields:
                if value:
                    pdf.set_font("Helvetica", "B", 8)
                    pdf.cell(30, 5, f"{label}:")
                    pdf.set_font("Helvetica", "", 8)
                    pdf.cell(0, 5, str(value), new_x="LMARGIN", new_y="NEXT")

            if device.get("anmerkungen"):
                pdf.set_font("Helvetica", "B", 8)
                pdf.cell(30, 5, "Notes:")
                pdf.set_font("Helvetica", "", 8)
                pdf.multi_cell(0, 5, device["anmerkungen"])

            pdf.ln(3)
            pdf.set_draw_color(200)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(2)

    # Output
    buf = BytesIO()
    pdf.output(buf)
    return buf.getvalue()


def _truncate(text: str, max_len: int) -> str:
    if not text:
        return ""
    if len(text) <= max_len:
        return text
    return text[:max_len - 1] + "."
