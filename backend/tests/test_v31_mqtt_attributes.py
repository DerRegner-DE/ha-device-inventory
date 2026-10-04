"""Roadmap Nr. 1: gepflegte Angaben kommen als Attribute der
"Device type"-Entity in HA an (Notizen, Uebergabe-Felder, Zaehler)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def test_details_in_state_and_attribute_template():
    from app.services import mqtt_discovery as md

    dev = {
        "uuid": "u1", "typ": "Aktor/Relais", "bezeichnung": "Licht Flur",
        "anmerkungen": "x" * 600, "schalter_gebrueckt": "yes", "funktion": "",
        "photos": [{"uuid": "p"}], "attachments_count": 2,
    }
    state = md._build_state_payload(dev)
    assert state["details"]["anmerkungen"] == "x" * 600
    assert state["details"]["schalter_gebrueckt"] == "yes"
    assert state["details"]["fotos"] == 1 and state["details"]["einbauort_bilder"] == 2
    assert "funktion" not in state["details"], "leere Werte fallen weg"

    msgs = dict(md._build_discovery_messages(dev))
    type_cfg = next(v for k, v in msgs.items() if k.endswith("_type/config"))
    assert type_cfg["json_attributes_topic"] == type_cfg["state_topic"]
    assert "details" in type_cfg["json_attributes_template"]
