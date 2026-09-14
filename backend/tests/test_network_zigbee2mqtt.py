"""Regressionstests fuer die Netzwerk-Erkennung bei MQTT-Geraeten.

Hintergrund: GitHub #24 (Sebastian-Voigt, 03.09.2026). Alle ueber
Zigbee2MQTT eingebundenen Geraete wurden pauschal als "WLAN" gefuehrt, weil
``_guess_network()`` bei ``integration_domain == "mqtt"`` nur nach den
Woertern zigbee/zwave/bluetooth in Name, Modell und Hersteller gesucht hat.
Z2M benennt seine Geraete aber nach dem Hersteller ("BSEED", "Tuya") — nur
die Bridge selbst traegt das Wort "Zigbee". Die Faelle unten stammen aus
einer echten Installation.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.ha_import import (  # noqa: E402
    _guess_network,
    build_mqtt_bridge_networks,
)

BRIDGE_ID = "8ca6277ff6087a9a6b59f262ad9ca59d"

Z2M_BRIDGE = {
    "id": BRIDGE_ID,
    "name": "Zigbee2MQTT Bridge",
    "manufacturer": "Zigbee2MQTT",
    "model": "Bridge",
    "identifiers": [["mqtt", "zigbee2mqtt_bridge_0x00124b0032d42360"]],
}


def _z2m_device(name, hersteller, modell, ieee):
    return {
        "id": f"dev_{ieee}",
        "name": name,
        "manufacturer": hersteller,
        "model": modell,
        "identifiers": [["mqtt", f"zigbee2mqtt_{ieee}"]],
        "via_device_id": BRIDGE_ID,
    }


ECHTE_Z2M_GERAETE = [
    _z2m_device("Rollladen Gast 2", "BSEED", "Curtain/blind switch", "0xa4c138f38e048aa8"),
    _z2m_device("Licht Gast 2", "Tuya", "Smart light switch - 1 gang", "0xa4c1381a2ac16ead"),
    _z2m_device("Steckdose Gast 2 Fenster", "BSEED", "Wall-mounted socket", "0xa4c138c18edb4cef"),
]


def test_bridge_map_erkennt_zigbee2mqtt():
    bridges = build_mqtt_bridge_networks([Z2M_BRIDGE])
    assert bridges == {BRIDGE_ID: "Zigbee"}


def test_bridge_map_erkennt_zwave_js_ui():
    bridge = {
        "id": "zw1",
        "name": "Z-Wave JS UI",
        "manufacturer": "zwave-js-ui",
        "model": "Gateway",
        "identifiers": [["mqtt", "zwavejs2mqtt_0x1"]],
    }
    assert build_mqtt_bridge_networks([bridge]) == {"zw1": "Z-Wave"}


def test_bridge_map_ignoriert_normale_geraete():
    dev = {"id": "x", "name": "Tasmota Steckdose", "manufacturer": "Tasmota",
           "model": "Sonoff", "identifiers": [["mqtt", "tasmota_ABC"]]}
    assert build_mqtt_bridge_networks([dev]) == {}


def test_z2m_geraete_sind_zigbee_nicht_wlan():
    """Der eigentliche Fehler aus GitHub #24."""
    bridges = build_mqtt_bridge_networks([Z2M_BRIDGE] + ECHTE_Z2M_GERAETE)
    for dev in ECHTE_Z2M_GERAETE:
        assert _guess_network("mqtt", dev, bridges) == "Zigbee", dev["name"]


def test_identifier_reicht_auch_ohne_bridge_map():
    """Wenn die Bridge nicht mitgelesen wurde, traegt der Identifier-Praefix."""
    dev = ECHTE_Z2M_GERAETE[0]
    assert _guess_network("mqtt", dev) == "Zigbee"


def test_via_device_traegt_ohne_identifier():
    """Fallback fuer Bridges, die den Praefix nicht setzen."""
    dev = {
        "id": "d1",
        "name": "Irgendein Schalter",
        "manufacturer": "BSEED",
        "model": "Switch",
        "identifiers": [["mqtt", "0xa4c138aa"]],
        "via_device_id": BRIDGE_ID,
    }
    bridges = build_mqtt_bridge_networks([Z2M_BRIDGE])
    assert _guess_network("mqtt", dev, bridges) == "Zigbee"


def test_zwave_ueber_mqtt():
    dev = {
        "id": "d2",
        "name": "Dimmer Flur",
        "manufacturer": "Fibaro",
        "model": "FGD-212",
        "identifiers": [["mqtt", "zwavejs2mqtt_0x0102"]],
    }
    assert _guess_network("mqtt", dev) == "Z-Wave"


def test_echte_wlan_mqtt_geraete_bleiben_wlan():
    """Regression: Tasmota und ESPHome haengen wirklich im WLAN."""
    for name, hersteller, ident in [
        ("Tasmota Steckdose", "Tasmota", "tasmota_ABC123"),
        ("ESP Sensor", "espressif", "esphome_wohnzimmer"),
        ("Namenloses MQTT-Geraet", "", "irgendwas"),
    ]:
        dev = {"id": "x", "name": name, "manufacturer": hersteller, "model": "",
               "identifiers": [["mqtt", ident]]}
        assert _guess_network("mqtt", dev) == "WLAN", name


def test_nicht_mqtt_integrationen_unveraendert():
    """Die Sonderbehandlung darf nur fuer mqtt greifen."""
    dev = {"id": "x", "name": "Shelly", "manufacturer": "Allterco", "model": "1PM",
           "identifiers": [["shelly", "zigbee2mqtt_irrefuehrend"]]}
    assert _guess_network("shelly", dev) == "WLAN"
    assert _guess_network("zha", dev) == "Zigbee"
    assert _guess_network(None, dev) is None


def test_identifiers_in_ungewoehnlichen_formen():
    """Die Registry liefert Identifier mal als Liste, mal als Tupel."""
    als_tupel = {"id": "a", "name": "X", "manufacturer": "", "model": "",
                 "identifiers": [("mqtt", "zigbee2mqtt_0x1")]}
    assert _guess_network("mqtt", als_tupel) == "Zigbee"

    kaputt = {"id": "b", "name": "X", "manufacturer": "", "model": "",
              "identifiers": [None, 42, ["nur_eins"]]}
    assert _guess_network("mqtt", kaputt) == "WLAN"


def test_namensbasierte_erkennung_bleibt_als_letzte_stufe():
    """Alte Heuristik darf weiter greifen, wenn nichts Besseres da ist."""
    dev = {"id": "c", "name": "Zigbee Sensor Keller", "manufacturer": "", "model": "",
           "identifiers": [["mqtt", "abc"]]}
    assert _guess_network("mqtt", dev) == "Zigbee"
