# Changelog

## 2.4.2

Sicherheitsnetz-Release. Destruktive Aktionen sind jetzt rückrollbar. Ausgelöst durch die Erkenntnis aus Osorkons Feedback, dass „Kategorien neu zuordnen" bei 500 Geräten 300 richtig und 200 falsch machen kann — und es vorher keinen Weg zurück gab.

### Automatische Datenbank-Schnappschüsse

- Vor jeder der folgenden Aktionen wird automatisch eine Kopie der SQLite-Datenbank erstellt: „Kategorien neu zuordnen", Bulk-Bearbeiten, Bulk-Löschen, Excel-Import mit „Ersetzen", Löschen einer Kategorie (sofern Geräte betroffen sind).
- Schnappschüsse liegen in `/data/db/snapshots/<ISO-Zeitstempel>_<op>.db`. Technisch wird `VACUUM INTO` verwendet — saubere Kopie ohne WAL-Residuen. Fallback auf `shutil.copy2` bei älteren SQLite-Versionen.
- Neuer Bereich „Datenbank-Schnappschüsse" in den Einstellungen: zeigt die letzten Schnappschüsse mit Aktions-Typ, Alter, Größe und Notiz. Wiederherstellen-Button pro Eintrag mit Zwei-Tap-Bestätigung. Einzelne Schnappschüsse können manuell gelöscht werden.
- Beim Wiederherstellen wird zuerst der aktuelle Stand selbst als Schnappschuss gesichert (`pre_restore`-Tag), sodass auch der Restore rückrollbar ist.
- Aufbewahrung: die letzten 10 Schnappschüsse oder 30 Tage, je nachdem was zuerst greift. Ältere werden automatisch gelöscht.
- Sicherheit: Pfad-Traversal in Dateinamen wird abgewiesen (`/`, `\`, `..`).
- Snapshot-Erstellung ist ausnahmesicher — wenn das Schreiben aus irgendeinem Grund fehlschlägt (voller Datenträger, Read-only-Filesystem), wird die eigentliche destruktive Aktion trotzdem ausgeführt, nur ohne Rückroll-Netz. Warnung landet im Add-on-Log.

### Backend

- Neuer Service `backend/app/services/snapshots.py`: `create_snapshot(op)`, `list_snapshots()`, `restore_snapshot(filename)`, `delete_snapshot(filename)`, intern `_prune()`.
- Neuer Router `backend/app/routers/snapshots.py` mit `GET /api/snapshots`, `POST /api/snapshots/{filename}/restore`, `DELETE /api/snapshots/{filename}`.
- Aufruf von `create_snapshot()` in `ha_proxy.recategorize`, `devices.bulk_update`, `devices.bulk_delete`, `import_data.import_xlsx` (replace-Pfad), `categories.delete_category` (wenn Reassign stattfindet).

### Frontend

- Neue Komponente `SnapshotManager.tsx`, eingebunden in die Einstellungen direkt unter „Kategorien verwalten".
- Zeit-Anzeige relativ („vor 5 Min", „vor 2 Std", „vor 3 Tagen") mit i18n-Pluralisierung.
- Aktions-Typ wird übersetzt angezeigt („Vor Kategorie-Neuzuordnung" statt `recategorize`).
- Neue i18n-Keys in DE/EN/ES/FR/RU: `settings.snapshots`, `settings.snapshotsDesc`, komplette `snapshots.*`-Sektion (19 Keys pro Sprache).

## 2.4.1

Hotfix-Release mit Fokus auf MQTT-Diagnose (Forum-Feedback Osorkon zu v2.4.0).

### MQTT

- Neue Add-on-Option `mqtt_client_id` — optionale explizite MQTT Client-ID. Leer lassen für automatische ID (bisheriges Verhalten). Brokern mit ACLs nach Client-ID kann damit eine feste ID mitgegeben werden.
- Startup-Log zeigt jetzt die verwendete Client-ID (`auto` oder gesetzter Wert).
- „MQTT-Verbindung testen" gibt die effektive Client-ID zurück und liefert bei Fehlern einen lokalisierten Troubleshooting-Hinweis (Auth/Refused/Timeout/DNS/ACL/Generic) statt nur des rohen Exception-Strings.

## 2.4.0

Großes Release, ausgelöst durch Community-Feedback aus dem HA-Forum zu v2.3.0. Bündelt MQTT-Test-Fix, HA-Import-Meldungen, Kategorie-Rewrite, Bulk-Re-Kategorisierung, Custom Categories, Auto-Match-Toggle und i18n-Audit in einer Release.

### Kategorie-Klassifikation komplett überarbeitet (device_class-first)

- Die bisherige Logik hat Gerätenamen per Substring-Match gegen Patterns wie `" tv"` oder `"steckdose"` geprüft und reihenweise falsch klassifiziert — Rauchmelder mit „TV" im Namen wurden zum Smart TV, Tuya-Regensensoren zur Steckdose, Fingerbots zur Steckdose, Samsung-Backöfen zum Smartphone.
- Der Rewrite arbeitet jetzt in dieser Priorität:
  1. HA `device_class` auf Entities (smoke→Sensor, outlet→Steckdose, tv→Smart TV, shutter→Rollladen, …)
  2. Entity-Domain (light, climate, lock, camera, vacuum, lawn_mower, …)
  3. Hersteller+Modell-Pattern mit Wort-Grenzen
  4. Name nur mit Wort-Grenzen (`\btv\b` matcht „Smart TV", nicht „Rauchmelder TV")
- Tuya-Default „Steckdose" entfernt — Tuya umfasst Plugs, Sensoren, Fingerbots, Vorhänge, Licht.
- Samsung-/Xiaomi-Default „Smartphone" entfernt — beide bauen auch Haushaltsgeräte, Sensoren, Kameras.
- 16 Unit-Tests in `backend/tests/test_device_type_classification.py` decken die gemeldeten Fehlklassifikationen als Regressionstests ab.

### „Kategorien neu zuordnen"-Button

Neuer `POST /api/ha/recategorize` + Settings-Button wendet die aktuelle Klassifikations-Logik auf alle bereits importierten HA-Geräte an. Essenziell nach dem Update — Bestandsinstallationen müssen Fehl-Zuordnungen nicht manuell korrigieren.

### Custom Categories

- Neue DB-Tabelle `device_categories` mit 32 eingebauten Kategorien plus beliebig vielen eigenen.
- CRUD-Endpoint `/api/categories`: GET/POST/PUT/DELETE.
- Neuer Abschnitt „Kategorien verwalten" in den Einstellungen zum Anlegen/Umbenennen/Löschen eigener Kategorien. Eingebaute Kategorien sind sichtbar aber nicht änderbar, damit die i18n-Keys erhalten bleiben.
- Löschen einer eigenen Kategorie mit betroffenen Geräten: alle Geräte werden automatisch auf „Sonstiges" verschoben (oder auf eine explizit angegebene Ziel-Kategorie). Zwei-Tap-Bestätigung, Meldung zeigt wie viele Geräte umgezogen wurden.
- DeviceForm und Filter nutzen die dynamische Kategorien-Liste; Fallback auf statische Liste falls Backend noch nicht geseeded ist.

### Auto-Match-Toggle

- Neuer Toggle „Auto-Kategorisierung beim Import" in den Einstellungen.
- Wenn deaktiviert, bekommen alle neuen Geräte beim HA-Import die Kategorie „Sonstiges" und werden manuell zugeordnet — für User die ihre Kategorisierung komplett selbst steuern wollen.
- Persistiert in `app_settings` (neue generische Key/Value-Tabelle für künftige Feature-Flags).
- Kriterien der Auto-Klassifizierung sind inline in den Einstellungen dokumentiert (aufklappbare Liste mit der Priorisierungs-Reihenfolge) — beantwortet die wiederholte Community-Frage „nach welchen Kriterien wird zugeordnet?".

### MQTT-Test prüft jetzt Publish-Berechtigung

- Der Test-Button hat bisher nur TCP-Connect + Auth getestet — grünes „OK" obwohl der eigentliche Publish-Sync nichts veröffentlichen konnte (typischer Fall: Broker-ACL erlaubt Connect aber kein Publish auf `homeassistant/#`).
- Test sendet jetzt zusätzlich eine leere retained-Nachricht mit QoS 1 auf `homeassistant/sensor/geraeteverwaltung/_probe/config`. QoS 1 ist essenziell — QoS 0 bekommt kein PUBACK und würde stille ACL-Verweigerung maskieren.
- Drei Ergebnis-Varianten: „Verbindung und Publish-Berechtigung", „Teilweise OK: Verbindung OK, aber Publish fehlgeschlagen (ACL?)", oder Fehler mit Typ und Meldung.

### HA-Import-Feedback bei 0 Geräten

- Bisher zeigte das UI stumm „0 importiert, 0 Duplikate übersprungen" ohne Erklärung.
- Drei neue spezifische Meldungen: „Keine HA-Geräte gefunden — Verbindung/Token prüfen", „Alle {total} HA-Geräte sind bereits importiert", „Alle {total} HA-Einträge waren nicht-physisch".
- Strukturierte Backend-Fehler (`status: "error"`) werden mit `message` angehängt; Per-Device-Fehler aus der Import-Schleife als „(N errors — see logs)"-Suffix.

### i18n-Audit

- `settings.mqttTestButton` und `settings.mqttToggleFailed` fehlten in allen 5 Sprachen (erschienen im UI als roher Key).
- Komplette Support- & Diagnose-Sektion aus v2.2.6 war nur in DE+EN, ~25 Keys als Rohtext in ES/FR/RU.
- Plus 6 Keys für Re-Kategorisierung, 14 Keys für Custom Categories, 6 Keys für Auto-Match-Toggle mit Kriterien-Erklärung.
- Alle 5 Sprachdateien jetzt auf 330 Keys synchronisiert in identischer Reihenfolge.

## 2.3.0

- **Donut-Filter auf der Geräteliste (Variante B)**: Die vier Übersichts-Donuts (Nach Typ, Nach Netzwerk, Nach Stromversorgung, Garantie-Status) erscheinen jetzt auch oben auf der Geräteliste als kompakte, horizontal scrollbare Mini-Charts. Segment-Klick wechselt den Filter direkt — kein Zurückspringen zum Dashboard mehr. Filter-Chip mit X-Button zum Entfernen bleibt, der „Filter zurücksetzen"-Button räumt alle neuen Filter.
- **Panel-Pfad Warnung**: Wenn die App über die HA-Sidebar (Panel-Pfad `/app/<slug>` oder `/<slug>`) geöffnet wird, erscheint oben ein gelber Warnbanner — Schreibzugriffe scheitern dort mit HTTP 405, weil HA-Panels nur GET erlauben. Der Banner verlinkt direkt auf die funktionierende Ingress-URL (`/hassio/addon/geraeteverwaltung/ingress`).
- **Inline-Bestätigung statt confirm()**: Bulk-Löschen nutzt jetzt eine Zwei-Tap-Bestätigung (Button wird rot, Text „Nochmal tippen zum Löschen"). `window.confirm()` wurde im HA-Ingress-iFrame blockiert — jetzt funktioniert Löschen auch dort.
- **Health-Endpoint Version dynamisch**: `APP_VERSION` wird aus der `ADDON_VERSION` Build-Arg (CI) bzw. aus `addon/config.yaml` gelesen, statt hartkodiert. Health-Endpoint meldet jetzt immer die tatsächliche Add-on-Version.
- **Bulk-Action-Buttons vertikal zentriert**: Die Buttons in der Bulk-Bar richten sich jetzt mit `items-center` am Container aus — keine gekippte Ausrichtung mehr.
- **CI-Build mit piwheels**: `pip install` nutzt `https://www.piwheels.org/simple` als zusätzlichen Index. armv7/aarch64 bekommen damit vorgebaute Wheels für `aiohttp`/`Pillow`, der QEMU-Compile-Schritt entfällt (erwartete Build-Zeit-Reduktion ~40-50%). Fallback auf Source-Compile bleibt erhalten, falls ein Wheel fehlt.

## 2.2.8

- **Dashboard-Donuts klickbar**: Segmente in „Nach Typ", „Nach Netzwerk", „Nach Stromversorgung" und „Garantie-Status" sind jetzt anklickbar. Ein Klick filtert die Geräteliste direkt auf den gewählten Wert (z. B. „Garantie-Status: Abgelaufen" oder „Netzwerk: WLAN"). In der Geräteliste erscheint ein Filter-Chip mit X-Button zum Entfernen; der „Filter zurücksetzen"-Button räumt auch die neuen Filter. Cursor wird beim Hover über ein Segment zum Zeigefinger.

## 2.2.7

- **Fix: Lemon-Squeezy-Aktivierung meldete fälschlich „invalid license key"**: Der Backend-Proxy hat `store_id` und `product_id` im falschen Objekt der LS-API-Antwort gesucht (`license_key` statt `meta`). Die Felder waren dort nicht vorhanden (→ 0), der anschließende Store-/Product-Check schlug daher immer fehl und das Add-on zeigte „invalid license key". Auf LS-Seite war die Aktivierung aber bereits erfolgt und hat einen Slot belegt — Nutzer liefen nach wenigen Versuchen ins Activation-Limit. Fix: korrekt aus `meta` lesen.

## 2.2.6

- **Support & Diagnose-Sektion in den Einstellungen**: Neuer Abschnitt am Ende der Einstellungen erzeugt auf Knopfdruck einen Diagnose-Bericht (Version, Architektur, MQTT-Status, DB-Zählung, die letzten ~200 Log-Zeilen eines In-Memory-Ringbuffers). Passwörter, Tokens, Bearer/JWT-Strings, IP-Adressen (letzte zwei Oktette maskiert), E-Mail-Adressen und Lizenzschlüssel werden automatisch redigiert. Optional lassen sich Gerätenamen in Logs durch „Gerät-001" usw. ersetzen. Zwei Abgabewege: „Problem auf GitHub melden" (öffnet Issue mit vorausgefülltem Body) und „In Zwischenablage kopieren" (für Forum/Mail). Vorschau vor dem Absenden. Bei fehlgeschlagenem HA-Import erscheint zusätzlich ein „Problem melden →"-Link, der direkt zur Diagnose-Sektion scrollt.

## 2.2.5

- **HA-Import robuster bei großen Setups**: Frontend-Timeout für „Home Assistant importieren" von 120 s auf 300 s erhöht (Installationen mit 500+ Geräten stiegen vorher kurz vor dem Ende aus). Backend-Import-Loop fängt pro Gerät Fehler ab — ein einzelnes defektes Device killt nicht mehr den gesamten Import-Lauf. Zusätzliche Progress-Logs (alle 50 Geräte) und eine Fehlerliste in der Import-Antwort helfen bei der Diagnose.

## 2.2.4

- **Lemon Squeezy Live-Store**: Pro-Lizenz wird jetzt über den Live-Store ausgeliefert (vorher Test-Modus). Neue Produkt-ID und neuer Checkout-Link. Lizenzschlüssel werden automatisch per E-Mail verschickt.

## 2.2.3

- **Fix armv7-Build (Teil 2)**: Für armv7 fehlen Prebuilt-Wheels einiger C-Extension-Pakete (`aiohttp`, `Pillow`). Dockerfile installiert daher Build-Tools (`build-essential`, `libffi-dev`, `libjpeg-dev`, `zlib1g-dev`), führt den pip-Install durch und purged die Build-Tools danach wieder — Runtime-Libs (`libjpeg62-turbo`, `zlib1g`) bleiben. `uvicorn[standard]` → `uvicorn` (entfernt `uvloop`/`httptools` komplett, die sich auf armv7 ebenfalls nicht bauen ließen und für unseren Use-Case nicht benötigt werden).

## 2.2.2

- **Fix armv7-Build**: Base-Image von `python:3.12-alpine` auf `python:3.12-slim` (Debian) umgestellt. Alpine/musllinux hat keine vorgebauten Wheels für Rust-basierte Abhängigkeiten (z. B. `pydantic-core`), was den armv7-Release-Build unter QEMU brechen ließ. Mit Debian-Base existieren manylinux-Wheels für alle drei Architekturen.

## 2.2.1

- **Build-Pipeline**: Frontend wird in CI jetzt einmalig nativ gebaut und als Artifact zwischen den Architektur-Jobs geteilt. Der bisherige doppelte (und unter QEMU emulierte) Frontend-Build im Dockerfile entfällt — Release-Builds sind damit deutlich schneller. Lokaler Build benötigt jetzt `cd frontend && npm ci && npm run build` vor `docker build` (bisher implizit).

## 2.2.0

- **Multi-Architektur**: Add-on unterstützt jetzt `amd64`, `aarch64` und `armv7` (vorher nur `amd64`). Damit wird der Install-Button in Home Assistant auch auf Raspberry Pi 3/4/5 und ARM-basierten NAS aktiv.
- **MQTT Discovery Toggle persistiert zuverlässig**: Das „HA Assistant Integration"-Flag wurde bisher nach einem View-Wechsel wieder auf AUS gesetzt, wenn das Speichern serverseitig fehlschlug. Jetzt ist der Backend-Zustand Source-of-Truth; Fehler beim Speichern werden als Hinweis in der UI angezeigt.
- **Externer MQTT-Broker**: Verbindungsaufbau zu externen Brokern (nicht nur `core-mosquitto`) funktioniert zuverlässig. Einstellungen `mqtt_host`, `mqtt_port`, `mqtt_user`, `mqtt_password` aus den Add-on-Optionen werden sauber übernommen.
- **Diagnose-Logs beim Start**: Add-on-Log enthält jetzt TCP-Reachability-Check und – bei aktiver Discovery – einen expliziten `MQTT connect OK/FAILED`-Eintrag mit Fehlertyp (z. B. `AuthenticationError`, `ConnectionRefusedError`, `TimeoutError`). Ersetzt die bisher stumme Fehlerbehandlung.
- **„Test MQTT connection"-Button** in den Einstellungen: Prüft Broker-Verbindung auf Knopfdruck und zeigt Ergebnis direkt in der UI.
- **Aufgeräumtes Error-Logging**: MQTT-Fehler (publish/remove) enthalten jetzt Broker-Host und Exception-Typ, nicht nur eine Kurzmeldung.

## 2.0.0

- **Lemon Squeezy Store**: Pro-Lizenz jetzt über derregner.lemonsqueezy.com erhältlich (9,99 € Einmalkauf, sofortige Schlüssel-Lieferung per E-Mail)
- **Kaufen-Button**: Direktlink zum Checkout in der Lizenz-Sektion (Einstellungen)
- **Passwort-Toggle**: Lizenzschlüssel wird standardmäßig verborgen angezeigt, per Klick einblendbar
- **Inline-Bestätigung**: Kritische Aktionen (Daten löschen, HA-Import, MQTT aktivieren) erfordern jetzt einen zweiten Klick statt browser-nativer Dialoge (blockierten HA Ingress)
- **Add-on Optionen**: Lemon Squeezy Keys in `license_key` werden korrekt erkannt (kein Punkt → LS-Typ)
- **Dashboard Charts**: Donut-Diagramme für Gerätetyp, Netzwerk, Stromversorgung, Garantiestatus
- **Dark Mode**: Umschalter in den Einstellungen, vollständiges Dark Theme
- **PDF Export**: Versicherungsdokumentation mit Gerätetabelle und Detailseiten
- **Bulk-Bearbeitung**: Mehrere Geräte auswählen, Typ/Integration ändern, Bulk-Löschen
- **MQTT Discovery**: Inventar-Geräte als HA-Entities veröffentlichen (Garantie-Sensoren, Standort usw.)
- **Onboarding**: „In Home Assistant einrichten"-Button mit Deep-Links zu Integrationen

## 1.5.0

- Lemon Squeezy integration for Pro license purchases (automatic key delivery)
- License activation now supports both legacy keys and Lemon Squeezy keys
- Deactivation frees up activation slot for device transfers
- Offline fallback: cached license works without internet after initial activation
- Backend proxy for secure license validation (store/product ID verification)

## 1.3.11
n## 1.3.12

- Fix: Areas-API gibt jetzt korrekt floor_id zurück (area_floor() existiert nicht, nutzt jetzt floor_areas() Lookup)

- Bereiche werden jetzt nach HA-Etagen gruppiert (OG, UG, Garten, 19a OG etc.)
- Backend liefert floor_id pro Bereich mit (war vorher nicht enthalten)

## 1.3.10

- Fix: Bereiche werden jetzt korrekt über HA Ingress-API geladen (nutzt bestehenden API-Client)

## 1.3.9

- Bereiche/Standorte werden jetzt live aus Home Assistant geladen (echte HA-Areas statt hardcodierter Liste)
- Gruppierung nach HA-Etagen (Floors) im Standort-Dropdown
- Fallback auf Standard-Bereiche wenn HA nicht erreichbar (Offline-Modus)

## 1.3.8

- "Foto aufnehmen" öffnet jetzt direkt die Kamera (primärer Button)
- "Bild auswählen" für bestehende Bilder aus der Galerie (sekundärer Button)
- "Erneut aufnehmen" geht direkt zurück zur Kamera statt zur Auswahl
- Foto im Formular wird nicht mehr abgeschnitten (object-contain statt object-cover)
- capture="environment" entfernt (funktioniert nicht in HA Ingress-iframe)

## 1.3.7

- Fix: Webcam-Livebild spielt jetzt korrekt ab auf Mobilgeräten (muted + explizites play())
- Fix: Auslöser-Button erst aktiv wenn Kamera-Feed bereit ist (kein schwarzes Bild mehr)
- Ladeindikator "Kamera wird gestartet..." während Webcam-Initialisierung
- Neuer i18n-Key camera.starting in allen 5 Sprachen

## 1.3.6

- Kamera-UI: Alle Texte vollständig in 5 Sprachen übersetzt (DE, EN, ES, FR, RU)
- Versionen über alle Komponenten synchronisiert (Frontend, Backend, Add-on)
- Changelog wird jetzt im Home Assistant Add-on angezeigt

## 1.3.5

- Kamera: „Take Photo" und „Use Webcam" Buttons werden jetzt immer angezeigt (Mobile)
- Kamera: Verbesserte Darstellung des Foto-Overlays auf dem Handy
- Kamera: Fallback auf Dateiauswahl, wenn getUserMedia nicht verfügbar ist

## 1.3.4

- Webcam-Zugriff auf dem Handy aktiviert
- Formular-Abschnitte klappen sich nach QR-Scan automatisch auf

## 1.3.3

- Kamera: Direkter Datei-Picker auf Mobilgeräten
- QR-Scanner: Erkannte Daten werden automatisch in die richtigen Felder eingetragen (Seriennummer, MAC-Adresse, etc.)

## 1.3.2

- Ingress-Stream für Kamera-/Mikrofon-Zugriff im iframe aktiviert

## 1.3.1

- Fix: Lizenz-Validierung (HMAC-Vergleich) funktioniert jetzt sowohl über HTTPS als auch HTTP

## 1.3.0

- Lizenz-System: Free (50 Geräte, Englisch) und Pro (unbegrenzt, 5 Sprachen, Kamera, Scanner, Export)
- Lizenzschlüssel wird serverseitig gespeichert
- QR-Code / Barcode-Scanner mit automatischer Feld-Befüllung
- Foto-Aufnahme mit Vorschau (Bestätigen/Erneut aufnehmen)
- 5 Sprachen: Deutsch, Englisch, Spanisch, Französisch, Russisch
- Excel-Export für alle Gerätedaten

## 1.2.0

- Kompatibilität mit HA Supervisor verbessert

## 1.1.2

- Add-on Version angepasst

## 1.1.1

- Fix: Nabu Casa Ingress API-Pfad-Erkennung korrigiert

## 1.1.0

- Kompatibilität mit HA-Updates verbessert
- Sidebar-Integration (Ingress)

## 1.0.0

- Erste Veröffentlichung als Home Assistant Add-on
- Geräte erfassen, bearbeiten, löschen (CRUD)
- Offline-Modus mit automatischer Synchronisation (IndexedDB)
- Dashboard mit Statistiken nach Typ und Standort
- Suche und Filter nach Gerätetyp
- Responsive Design für Handy und Desktop
