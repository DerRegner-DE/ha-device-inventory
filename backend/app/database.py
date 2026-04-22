import sqlite3
from contextlib import contextmanager
from pathlib import Path

from app.config import settings

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    nr INTEGER,
    typ TEXT NOT NULL,
    bezeichnung TEXT NOT NULL,
    modell TEXT,
    hersteller TEXT,
    standort_area_id TEXT,
    standort_name TEXT,
    standort_floor_id TEXT,
    seriennummer TEXT,
    mac_adresse TEXT,
    ip_adresse TEXT,
    firmware TEXT,
    integration TEXT,
    stromversorgung TEXT,
    netzwerk TEXT,
    anschaffungsdatum TEXT,
    garantie_bis TEXT,
    funktion TEXT,
    anmerkungen TEXT,
    ha_entity_id TEXT,
    ha_device_id TEXT,
    ain_artikelnr TEXT,
    reviewed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    sync_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    device_id INTEGER NOT NULL REFERENCES devices(id),
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    caption TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS ha_areas (
    area_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    floor_id TEXT,
    floor_name TEXT,
    icon TEXT,
    last_synced TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    device_id INTEGER NOT NULL REFERENCES devices(id),
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER,
    caption TEXT,
    url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_uuid TEXT NOT NULL,
    action TEXT NOT NULL,
    payload TEXT,
    synced_at TEXT,
    client_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS device_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    label_key TEXT,
    icon TEXT,
    is_custom INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 999,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


BUILTIN_CATEGORIES: list[tuple[str, str, str | None]] = [
    # (name, label_key, icon)
    ("Router", "types.router", "mdi:router-wireless"),
    ("Repeater", "types.repeater", "mdi:wifi-strength-2"),
    ("Powerline", "types.powerline", "mdi:power-plug"),
    ("DECT Repeater", "types.dect_repeater", "mdi:phone"),
    ("Steckdose", "types.outlet", "mdi:power-socket-de"),
    ("Lichtschalter", "types.light_switch", "mdi:light-switch"),
    ("Leuchtmittel", "types.light_bulb", "mdi:lightbulb"),
    ("Aktor/Relais", "types.relay", "mdi:electric-switch"),
    ("Schalter/Taster", "types.switch_button", "mdi:gesture-tap-button"),
    ("Rollladen", "types.shutter", "mdi:window-shutter"),
    ("Thermostat", "types.thermostat", "mdi:thermostat"),
    ("Controller/Gateway", "types.controller", "mdi:router-network"),
    ("Kamera", "types.camera", "mdi:cctv"),
    ("Türklingel", "types.doorbell", "mdi:doorbell"),
    ("Gong", "types.chime", "mdi:bell-ring"),
    ("Schloss", "types.lock", "mdi:lock"),
    ("Alarmanlage", "types.alarm", "mdi:shield-home"),
    ("Sprachassistent", "types.voice_assistant", "mdi:microphone"),
    ("Smart TV", "types.smart_tv", "mdi:television"),
    ("Streaming", "types.streaming", "mdi:cast"),
    ("Display", "types.display", "mdi:monitor"),
    ("Tablet", "types.tablet", "mdi:tablet"),
    ("Lautsprecher", "types.speaker", "mdi:speaker"),
    ("Haushaltsgerät", "types.appliance", "mdi:washing-machine"),
    ("Mähroboter", "types.mower", "mdi:robot-mower"),
    ("Bewässerung", "types.irrigation", "mdi:sprinkler"),
    ("Ventilator", "types.fan", "mdi:fan"),
    ("Fernbedienung", "types.remote", "mdi:remote"),
    ("Drucker", "types.printer", "mdi:printer"),
    ("Sensor", "types.sensor", "mdi:motion-sensor"),
    ("Smartphone", "types.smartphone", "mdi:cellphone"),
    ("Sonstiges", "types.other", "mdi:devices"),
]


def _ensure_dirs() -> None:
    settings.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    settings.PHOTOS_DIR.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _migrate_db(conn: sqlite3.Connection) -> None:
    """Run schema migrations for existing databases."""
    # Check existing columns in devices table
    cols = {row[1] for row in conn.execute("PRAGMA table_info(devices)").fetchall()}

    # v2.1.0: Add reviewed column
    if "reviewed" not in cols:
        conn.execute("ALTER TABLE devices ADD COLUMN reviewed INTEGER NOT NULL DEFAULT 0")

    # v2.1.0: Create documents table if missing
    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "documents" not in tables:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT UNIQUE NOT NULL,
                device_id INTEGER NOT NULL REFERENCES devices(id),
                filename TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                file_size INTEGER,
                caption TEXT,
                url TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                deleted_at TEXT
            )
        """)

    # v2.4.0: Seed device_categories with builtin types on first run.
    tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "device_categories" in tables:
        cat_count = conn.execute("SELECT COUNT(*) FROM device_categories").fetchone()[0]
        if cat_count == 0:
            for i, (name, label_key, icon) in enumerate(BUILTIN_CATEGORIES):
                conn.execute(
                    "INSERT INTO device_categories (name, label_key, icon, is_custom, sort_order) "
                    "VALUES (?, ?, ?, 0, ?)",
                    (name, label_key, icon, i),
                )


def init_db() -> None:
    _ensure_dirs()
    with get_db() as conn:
        conn.executescript(SCHEMA_SQL)
        _migrate_db(conn)


def dict_from_row(row: sqlite3.Row | None) -> dict | None:
    if row is None:
        return None
    return dict(row)


def dicts_from_rows(rows: list[sqlite3.Row]) -> list[dict]:
    return [dict(r) for r in rows]
