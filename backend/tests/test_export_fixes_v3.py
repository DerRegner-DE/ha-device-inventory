"""Regressionstests zur Testrunde v3.0.0-preview.1 (05.09.2026).

* T8 -- der Excel-Export hat Geraete dupliziert: 478 Zeilen fuer 314 Geraete.
  Ursache war ein beidseitiger Substring-Vergleich in ``_categorize_devices``,
  durch den ``"fritz"`` auch auf die Kategorie ``"fritz (device_tracker)"``
  passte und jedes FRITZ!Box-Geraet in zwei Kategorien landete.
* T5 -- ``external_url`` gehoert in die Vorlagen "Rueckbau" und "Nachlass",
  die Ohne-HA-Felder zusaetzlich in "Nachlass".
* T9 -- der PDF-Export muss sich ohne Detailseiten erzeugen lassen.
"""

from app.routers.export import EXPORT_FIELD_PRESETS
from app.services.excel_export import _categorize_devices, _integration_matches
from app.services.pdf_export import export_devices_to_pdf


def _dev(device_id: int, integration: str) -> dict:
    return {"id": device_id, "integration": integration, "bezeichnung": f"Geraet {device_id}"}


def test_each_device_lands_in_exactly_one_category():
    devices = [
        _dev(1, "fritz"),
        _dev(2, "fritz"),
        _dev(3, "zigbee2mqtt"),
        _dev(4, "alexa_devices"),
        _dev(5, "voellig_unbekannt"),
    ]
    grouped = _categorize_devices(devices)

    exported_ids = [d["id"] for _, cat_devices in grouped for d in cat_devices]
    assert sorted(exported_ids) == [1, 2, 3, 4, 5]
    assert len(exported_ids) == len(set(exported_ids)), "Geraet mehrfach exportiert"


def test_short_integration_does_not_match_longer_category_pattern():
    # Der alte Fehler: "fritz" ist Substring von "fritz (device_tracker)".
    assert _integration_matches("fritz", ["fritz"]) is True
    assert _integration_matches("fritz", ["fritz (device_tracker)"]) is False
    assert _integration_matches("fritz (device_tracker)", ["fritz"]) is False


def test_comma_separated_integration_still_matches():
    assert _integration_matches("fritz, fritzbox", ["fritz"]) is True
    assert _integration_matches("fritz, fritzbox", ["fritzbox"]) is True


def test_unknown_integration_goes_to_sonstige():
    grouped = dict(_categorize_devices([_dev(1, "gibtsnicht")]))
    assert "Sonstige Geraete" in grouped


def test_rueckbau_preset_carries_external_link_but_no_purchase_data():
    fields = EXPORT_FIELD_PRESETS["rueckbau"]
    assert "external_url" in fields
    assert "ohne_ha" in fields and "ohne_ha_hinweis" in fields
    assert "seriennummer" not in fields
    assert "anschaffungsdatum" not in fields


def test_nachlass_preset_carries_handover_fields():
    fields = EXPORT_FIELD_PRESETS["nachlass"]
    assert "external_url" in fields
    assert "ohne_ha" in fields and "ohne_ha_hinweis" in fields
    assert "seriennummer" in fields


def test_pdf_without_detail_pages_is_smaller():
    devices = [
        {"id": i, "nr": i, "bezeichnung": f"Geraet {i}", "typ": "Sensor",
         "hersteller": "ACME", "modell": "X", "integration": "fritz"}
        for i in range(1, 40)
    ]
    fields = EXPORT_FIELD_PRESETS["rueckbau"]
    with_details = export_devices_to_pdf(devices, fields=fields, detail_pages=True)
    without_details = export_devices_to_pdf(devices, fields=fields, detail_pages=False)
    assert len(without_details) < len(with_details)
