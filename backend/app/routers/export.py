"""Export endpoints (Excel + PDF)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import Response

from app.database import get_db, dicts_from_rows
from app.services.excel_export import export_devices_to_xlsx
from app.services.pdf_export import export_devices_to_pdf

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/xlsx")
def export_xlsx():
    """Export all devices as formatted Excel file matching Geraeteuebersicht format."""
    with get_db() as conn:
        rows = dicts_from_rows(
            conn.execute(
                "SELECT * FROM devices WHERE deleted_at IS NULL ORDER BY nr ASC, typ ASC, bezeichnung ASC"
            ).fetchall()
        )

    xlsx_bytes = export_devices_to_xlsx(rows)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Geraeteuebersicht_{timestamp}.xlsx"

    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/pdf")
def export_pdf():
    """Export all devices as PDF for insurance documentation."""
    with get_db() as conn:
        rows = dicts_from_rows(
            conn.execute(
                "SELECT * FROM devices WHERE deleted_at IS NULL ORDER BY nr ASC, typ ASC, bezeichnung ASC"
            ).fetchall()
        )

    pdf_bytes = export_devices_to_pdf(rows)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Device_Inventory_{timestamp}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
