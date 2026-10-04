"""v3.1.0 (Roadmap Nr. 12 + 15): doppelte Geraete.

Seit HA 2026.8 bekommt ein physisches Geraet je Integration oft einen eigenen
Registry-Eintrag -- der Shelly ueber ``shelly`` und noch einmal ueber die
FRITZ!Box, die Ring-Klingel als "Tor" und als "ring-doorbell01". Gemessen an
Matthias' Anlage: 91 Geraete mit MAC, 8 Paare.

* Automatisch (Import): Eintraege mit gleicher MAC/IEEE aus *verschiedenen*
  Integrationen werden zu einem Inventar-Geraet; der Eintrag der steuernden
  Integration bleibt, der andere wird Alias (``device_aliases``).
* Manuell (Zusammenfuehren): fuer alles, was keine gemeinsame Kennung hat,
  und fuer Paare, die vor v3.1 schon doppelt importiert wurden.
"""

from __future__ import annotations

import re

# Felder, die beim Zusammenfuehren aus der Quelle uebernommen werden, wenn
# sie im Ziel leer sind. Kennungen (uuid, nr, ha_device_id) bleiben beim Ziel.
FILLABLE_FIELDS = (
    "modell", "hersteller", "standort_area_id", "standort_name", "standort_floor_id",
    "seriennummer", "mac_adresse", "ip_adresse", "firmware", "integration",
    "stromversorgung", "netzwerk", "anschaffungsdatum", "garantie_bis",
    "funktion", "ha_entity_id", "ain_artikelnr", "parent_uuid",
    "external_url", "ohne_ha", "ohne_ha_hinweis",
    "schalter_gebrueckt", "schalter_gebrueckt_hinweis",
)

_HEX = re.compile(r"[^0-9a-f]")


def normalize_mac(value: str | None) -> str | None:
    if not value:
        return None
    hexed = _HEX.sub("", str(value).lower())
    return hexed if len(hexed) == 12 else None


def connection_keys(ha_device: dict) -> set[str]:
    """Kennungen, die ein physisches Geraet integrationsuebergreifend
    identifizieren: MAC (connections "mac") und Zigbee-IEEE."""
    keys: set[str] = set()
    for conn in ha_device.get("connections") or []:
        if not isinstance(conn, (list, tuple)) or len(conn) < 2:
            continue
        kind = str(conn[0]).lower()
        if kind == "mac":
            mac = normalize_mac(conn[1])
            if mac:
                keys.add(f"mac:{mac}")
        elif kind in ("zigbee", "ieee"):
            ieee = _HEX.sub("", str(conn[1]).lower().removeprefix("0x"))
            if len(ieee) == 16:
                keys.add(f"ieee:{ieee}")
    return keys


def merge_devices(conn, source_uuid: str, target_uuid: str) -> dict:
    """Quelle in Ziel zusammenfuehren. Ziel behaelt seine Werte, leere Felder
    kommen aus der Quelle; Anmerkungen werden angehaengt. Fotos, Einbauort-
    Bilder, Dokumente, Verlauf und Untergeraete wandern zum Ziel, die
    HA-Geraete-ID der Quelle wird Alias des Ziels, die Quelle landet im
    Papierkorb. Rueckgabe: geaenderte Felder."""
    from app.services.history import log_changes

    if source_uuid == target_uuid:
        raise ValueError("Ein Geraet kann nicht mit sich selbst zusammengefuehrt werden")
    src = conn.execute("SELECT * FROM devices WHERE uuid = ? AND deleted_at IS NULL", (source_uuid,)).fetchone()
    tgt = conn.execute("SELECT * FROM devices WHERE uuid = ? AND deleted_at IS NULL", (target_uuid,)).fetchone()
    if src is None or tgt is None:
        raise LookupError("Geraet nicht gefunden")
    src, tgt = dict(src), dict(tgt)

    felder: dict[str, str] = {}
    for f in FILLABLE_FIELDS:
        if f == "parent_uuid" and src.get(f) == target_uuid:
            continue  # nicht zum eigenen Kind machen
        if not tgt.get(f) and src.get(f):
            felder[f] = src[f]
    if src.get("anmerkungen") and src["anmerkungen"] != tgt.get("anmerkungen"):
        merged = (tgt.get("anmerkungen") or "").rstrip()
        block = f"[{src['bezeichnung']}] {src['anmerkungen']}"
        felder["anmerkungen"] = f"{merged}\n\n{block}" if merged else block

    if felder:
        sets = ", ".join(f"{k} = ?" for k in felder)
        conn.execute(
            f"UPDATE devices SET {sets}, sync_version = sync_version + 1, "
            "updated_at = datetime('now') WHERE uuid = ?",
            [*felder.values(), target_uuid],
        )
        log_changes(conn, target_uuid, {k: tgt.get(k) for k in felder}, felder, source="merge")

    # Nur ein Hauptfoto: hat das Ziel schon eins, verlieren die der Quelle die Markierung.
    if conn.execute(
        "SELECT 1 FROM photos WHERE device_id = ? AND is_primary = 1 AND deleted_at IS NULL",
        (tgt["id"],),
    ).fetchone():
        conn.execute("UPDATE photos SET is_primary = 0 WHERE device_id = ?", (src["id"],))
    for table in ("photos", "attachments", "documents"):
        conn.execute(
            f"UPDATE {table} SET device_id = ? WHERE device_id = ? AND deleted_at IS NULL",
            (tgt["id"], src["id"]),
        )

    conn.execute("UPDATE device_history SET device_uuid = ? WHERE device_uuid = ?", (target_uuid, source_uuid))
    conn.execute(
        "UPDATE devices SET parent_uuid = ?, sync_version = sync_version + 1, updated_at = datetime('now') "
        "WHERE parent_uuid = ? AND uuid != ?",
        (target_uuid, source_uuid, target_uuid),
    )
    conn.execute("UPDATE device_aliases SET device_uuid = ? WHERE device_uuid = ?", (target_uuid, source_uuid))
    if src.get("ha_device_id") and src["ha_device_id"] != tgt.get("ha_device_id"):
        conn.execute(
            "INSERT OR IGNORE INTO device_aliases (device_uuid, ha_device_id, integration) VALUES (?, ?, ?)",
            (target_uuid, src["ha_device_id"], src.get("integration")),
        )
    conn.execute(
        "UPDATE devices SET deleted_at = datetime('now'), sync_version = sync_version + 1, "
        "ha_device_id = NULL WHERE uuid = ?",
        (source_uuid,),
    )
    return {"merged_into": target_uuid, "filled": sorted(felder)}


def find_duplicates(conn) -> list[dict]:
    """Aktive Geraete mit gleicher MAC -- Kandidaten fuers Zusammenfuehren."""
    rows = conn.execute(
        "SELECT uuid, bezeichnung, integration, mac_adresse, ha_device_id, typ, standort_name "
        "FROM devices WHERE deleted_at IS NULL AND mac_adresse IS NOT NULL AND mac_adresse != ''"
    ).fetchall()
    groups: dict[str, list[dict]] = {}
    for r in rows:
        mac = normalize_mac(r["mac_adresse"])
        if mac:
            groups.setdefault(mac, []).append(dict(r))
    from app.services.ha_import import TRACKER_INTEGRATIONS

    out = []
    for mac, devs in groups.items():
        if len(devs) < 2:
            continue
        # Vorschlag: das Geraet der steuernden Integration bleibt.
        devs.sort(key=lambda d: (
            (d.get("integration") or "").split(",")[0].strip() in TRACKER_INTEGRATIONS,
            d.get("bezeichnung") or "",
        ))
        out.append({"mac": ":".join(mac[i:i + 2] for i in range(0, 12, 2)).upper(), "devices": devs})
    out.sort(key=lambda g: g["devices"][0].get("bezeichnung") or "")
    return out
