"""Roadmap Nr. 8 — Restfehler der Auto-Kategorisierung (Forum 83177 #47,
Osorkon): IKEA-Schalter als Leuchte, Zigbee-Zwischenstecker mit "Fernseher"
im Namen als Smart TV, Herd nicht als Haushaltsgeraet, Bluetooth-USB-Adapter
als Steckdose.

Grundursache: die Integrations-Tabelle gewann immer vor den Entities, und
Messwert-device_classes (battery, power ...) gewannen vor der Domain.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.ha_import import classify_device


def _dev(**kw) -> dict:
    return {"id": "d1", **kw}


def _ent(entity_id: str, dc: str | None = None) -> dict:
    return {"entity_id": entity_id, "original_device_class": dc}


def test_ikea_on_off_switch_is_a_button_not_a_light():
    dev = _dev(manufacturer="IKEA of Sweden", model="TRADFRI on/off switch", name="Schalter Flur")
    ents = [_ent("sensor.schalter_flur_battery", "battery"), _ent("event.schalter_flur", "button")]
    for integration in ("zha", "tradfri", "zigbee2mqtt"):
        assert classify_device(dev, ents, integration)[0] == "Schalter/Taster", integration


def test_ikea_rodret_without_event_entity_is_still_a_button():
    dev = _dev(manufacturer="IKEA of Sweden", model="RODRET Dimmer", name="Rodret Bad")
    ents = [_ent("sensor.rodret_bad_battery", "battery")]
    assert classify_device(dev, ents, "zha")[0] == "Schalter/Taster"


def test_ikea_bulb_stays_a_light():
    dev = _dev(manufacturer="IKEA of Sweden", model="TRADFRI bulb E27 WW 806lm", name="Lampe")
    assert classify_device(dev, [_ent("light.lampe")], "zha")[0] == "Leuchtmittel"


def test_zigbee_plug_named_after_the_tv_is_an_outlet():
    dev = _dev(manufacturer="_TZ3000_okaz9tjs", model="TS011F", name="Fernseher")
    ents = [_ent("switch.fernseher"), _ent("sensor.fernseher_power", "power")]
    assert classify_device(dev, ents, "zigbee2mqtt")[0] == "Steckdose"
    assert classify_device(dev, ents, "mqtt")[0] == "Steckdose"


def test_stove_by_name_is_an_appliance():
    dev = _dev(manufacturer="Neff", model="T36FB41X0", name="Herd")
    ents = [_ent("sensor.herd_temperature", "temperature"), _ent("binary_sensor.herd_door", "door")]
    # door ist ein starkes Sensor-Signal; der Name entscheidet nur ohne es.
    assert classify_device(dev, ents[:1], "some_cloud")[0] == "Haushaltsgerät"


def test_home_connect_stays_an_appliance():
    dev = _dev(manufacturer="Siemens", model="HB676G0S1", name="Backofen")
    ents = [_ent("sensor.backofen_temperature", "temperature"), _ent("switch.backofen_power")]
    assert classify_device(dev, ents, "home_connect")[0] == "Haushaltsgerät"


def test_bluetooth_adapter_is_not_an_outlet():
    dev = _dev(manufacturer="TP-Link", model="UB500", name="hci0")
    assert classify_device(dev, [], "bluetooth")[0] == "Controller/Gateway"
    assert classify_device(dev, [], None)[0] == "Controller/Gateway"


def test_zha_devices_are_no_longer_all_gateways():
    lamp = _dev(manufacturer="Philips", model="LCT015", name="Lampe")
    assert classify_device(lamp, [_ent("light.lampe")], "zha")[0] == "Leuchtmittel"
    smoke = _dev(manufacturer="Heiman", model="SmokeSensor-N", name="Rauchmelder")
    ents = [_ent("binary_sensor.rauchmelder", "smoke"), _ent("sensor.rauchmelder_battery", "battery")]
    assert classify_device(smoke, ents, "zha")[0] == "Sensor"
    # Der Koordinator selbst hat keine Entities -> Rueckfall auf die Integration.
    coord = _dev(manufacturer="ITead", model="Sonoff Zigbee 3.0 USB Dongle Plus", name="Coordinator")
    assert classify_device(coord, [], "zha")[0] == "Controller/Gateway"


def test_battery_does_not_beat_the_domain():
    mower = _dev(manufacturer="Positec", model="Landroid", name="Rasenmaeher")
    ents = [_ent("sensor.rasen_battery", "battery"), _ent("lawn_mower.rasen")]
    assert classify_device(mower, ents, "some_custom")[0] == "Mähroboter"
    thermo = _dev(manufacturer="Eurotronic", model="Spirit", name="Heizung Bad")
    ents = [_ent("climate.heizung_bad"), _ent("sensor.heizung_bad_battery", "battery")]
    assert classify_device(thermo, ents, "zigbee2mqtt")[0] == "Thermostat"


def test_plain_thermometer_is_still_a_sensor():
    dev = _dev(manufacturer="Aqara", model="WSDCGQ11LM", name="Klima Bad")
    ents = [_ent("sensor.klima_bad_temperature", "temperature"),
            _ent("sensor.klima_bad_battery", "battery")]
    assert classify_device(dev, ents, "zha")[0] == "Sensor"


def test_dedicated_integrations_still_decide_directly():
    box = _dev(manufacturer="AVM", model="FRITZ!Box 7590", name="fritz.box")
    assert classify_device(box, [_ent("switch.wlan")], "fritz")[0] == "Router"


def test_measuring_plug_and_named_shutter_from_box_test():
    """Box-Test 04.10.2026: "WP Garage" (Tuya smart plug, nur Messwerte) wurde
    Sensor, "Rollladen" (TS0601 ohne cover-Entity) wurde Sensor."""
    plug = _dev(manufacturer="Tuya", model="Tuya smart plug (bfc87ac5)", name="WP Garage")
    ents = [_ent("sensor.wp_garage_power", "power"), _ent("sensor.wp_garage_energy", "energy")]
    assert classify_device(plug, ents, "tuya")[0] == "Steckdose"
    shutter = _dev(manufacturer="_TZE284_uqfph8ah", model="TS0601", name="Rollladen")
    assert classify_device(shutter, [_ent("sensor.rollladen_x")], "zigbee2mqtt")[0] == "Rollladen"


def test_water_alarm_with_moisture_class_is_sensor():
    dev = _dev(manufacturer="BOSCH", model="WATERALARM", name="Wasseralarm")
    ents = [_ent("binary_sensor.wasseralarm", "moisture"), _ent("sensor.wasseralarm_battery", "battery")]
    assert classify_device(dev, ents, "bosch_shc")[0] == "Sensor"


def test_entity_registry_gets_device_class_from_states(monkeypatch):
    """HA 2026.9: config/entity_registry/list liefert keine device_class."""
    import asyncio
    from app.services import ha_client

    async def ws(cmd):
        if cmd["type"] == "config/entity_registry/list":
            return [{"entity_id": "sensor.a_battery"}, {"entity_id": "switch.b", "device_class": "outlet"},
                    {"entity_id": "sensor.c"}]
        return [{"entity_id": "sensor.a_battery", "attributes": {"device_class": "battery"}},
                {"entity_id": "switch.b", "attributes": {"device_class": "switch"}},
                {"entity_id": "sensor.c", "attributes": {}}]

    monkeypatch.setattr(ha_client, "_ws_command", ws)
    ents = {e["entity_id"]: e for e in asyncio.run(ha_client.get_ha_entity_registry())}
    assert ents["sensor.a_battery"]["original_device_class"] == "battery"
    assert "original_device_class" not in ents["switch.b"], "Nutzer-Override bleibt fuehrend"
    assert "original_device_class" not in ents["sensor.c"]

def test_box_test_thermostat_child_lock_and_water_alarm():
    """Box-Test 04.10.2026 (preview.2): BOSCH TRV_GEN2 wurde wegen des
    Kindersicherungs-Schalters "Aktor/Relais", der Wasseralarm (nur ein
    Stummschalt-Button) fiel auf "Thermostat" zurueck."""
    trv = _dev(manufacturer="BOSCH", model="TRV_GEN2", name="Thermostat Bad EG")
    ents = [_ent("climate.bad"), _ent("switch.bad_child_lock", "switch"), _ent("sensor.bad_battery", "battery")]
    assert classify_device(trv, ents, "bosch_shc")[0] == "Thermostat"
    wa = _dev(manufacturer="BOSCH", model="WATERALARM", name="Wasseralarm")
    assert classify_device(wa, [_ent("button.wasseralarm_stummschalten")], "bosch_shc")[0] == "Sensor"