# Changelog

## 2.5.3

Breites Bugfix- und UX-Release. Sammelt Community-Reports aus v2.5.1/2.5.2 plus drei während der Beta-Runde gefundene Regressions.

### Geräte löschen — MQTT-Discovery wurde nie aufgeräumt

- ``DELETE /api/devices/{uuid}`` lieferte 204, aber im Backend-Log erschien parallel ``RuntimeWarning: coroutine 'remove_device' was never awaited``. Die zugehörige MQTT-Discovery-Bereinigung lief nie, sodass HA bei aktivem MQTT-Toggle Phantom-Geräte zurückbehielt.
- Ursache: ``background_tasks.add_task(asyncio.create_task, mqtt_remove_device(uuid))`` ruft die Async-Funktion sofort auf, übergibt die Coroutine an ``asyncio.create_task`` als Argument, und niemand awaited sie. Dasselbe Anti-Pattern stand auch bei Create und Update.
- Fix: FastAPI's ``BackgroundTasks`` akzeptiert async Funktionen direkt — jetzt wird die Funktion samt Argumenten korrekt übergeben (``add_task(mqtt_remove_device, uuid)``). 4 neue Regressionstests (``test_background_tasks_await.py``).

### HA-Import auf grossen Setups (>300 Geraete)

- ``POST /api/ha/import-devices`` blockierte bei 388+ Geraeten laenger als das HA-Ingress-HTTP-Timeout. Der Client sah ``502 Bad Gateway``, obwohl der Import serverseitig weiterlief.
- Der Import laeuft jetzt als Background-Task, der Endpoint kehrt sofort mit ``{"status": "started"}`` zurueck. Der neue Endpoint ``GET /api/ha/import-devices/status`` liefert Live-Progress (``stage``, ``progress``, ``total``, Endergebnis oder Fehlertext). Das Frontend pollt alle 2 s und zeigt einen Fortschrittsbalken.
- Nebenfund beim Debugging: Der Parent-Child-Pass hatte einen ``NameError`` (``for dev in devices:`` statt ``for dev in ha_devices:``) und hat damit seit v2.5.0 still keine ``parent_uuid``-Links geschrieben. Nach dem Fix werden Parent-Child-Beziehungen beim Re-Import korrekt gesetzt.

### Papierkorb — Bulk-Restore gab 404

- Der gruene "X wiederherstellen"-Button in der Papierkorb-Ansicht blieb wirkungslos (404 im Backend-Log), der Per-Zeilen-Button ging. Ursache: Route-Registrierungsreihenfolge — ``POST /{uuid}/restore`` war vor ``POST /bulk/restore`` registriert, FastAPI hat ``/bulk/restore`` als ``uuid="bulk"`` gematcht und 404 zurueckgegeben.
- Fix: Bulk-Route vor der UUID-Route registriert. Neue Regressionstests (``test_bulk_restore_route.py``): Route-Order-Guard und Handler-Signatur-Guard.

### Settings — Cache leeren vs. Alle Geraete loeschen getrennt

- Frueher war "Cache leeren" unklar — es hat lokale IndexedDB geleert *und* vom Server neu synchronisiert, was bei grossen Inventaren wie "alles weg" aussah. Die Aktion ist jetzt zwei klar getrennte Buttons:
  - **Cache leeren**: nur lokal (Browser-IndexedDB), Server bleibt unberuehrt. Sofort anschliessend synchronisiert der Client neu.
  - **Alle Geraete in Papierkorb**: neuer Server-Endpoint ``POST /api/devices/bulk/delete-all``, verschiebt alle aktiven Geraete in den Papierkorb (30 Tage wiederherstellbar). Snapshot wird vorab angelegt. Intended als letzter Reset-Knopf nach einem misslungenen Import.

### Donut-Charts + Count-Cards als Filter nutzbar

- Im Dashboard waren Donut- und Zaehl-Kacheln rein informativ. Jetzt wird der jeweilige Wert beim Klick als Filter uebernommen — z. B. "Klick auf den Hersteller-Donut-Slice *Intel* filtert die Geraeteliste auf alle Intel-Geraete". Per Tastatur erreichbar (``role="button"``, ``tabIndex``, Enter/Space), inkl. Cursor- und Hover-Zustand.

### DeviceList — weitere Filter-Chips

- Chip-Filter bestanden bisher nur fuer Kategorie. Neu: Chips fuer *Integration*, *Hersteller* und *Bereich*. Sichtbar ueber der Liste, klickbar mit X zum Entfernen, durch Kombination mit der Suche drillbar.

### DeviceForm — Dropdown-Listen alphabetisch

- Die Listen fuer Geraetetyp, Integration, Netzwerk und Stromquelle waren bisher in Codierungsreihenfolge. Jetzt alphabetisch per ``localeCompare`` (Locale-bewusst, damit Umlaute richtig einsortieren), wobei "Sonstiges" und "Nicht angebunden" stabil am Ende bleiben.

### Export — Feld-Picker mit Presets

- PDF- und Excel-Export haben jetzt einen Feld-Picker. Default-Preset: 10 Kernfelder. Zwei mitgelieferte Presets: **Versicherung** (Seriennummer, Kaufdatum, Preis, Garantie) und **Nachlass** (Kaufdatum, Preis, Standort, Notizen, Funktion). Auswahl wird in ``localStorage`` gespeichert.

### Device-Detail — Aufraeumarbeiten

- **Dokumente/Einbauort-Bilder in der Detail-Ansicht read-only**: Im reinen Anzeigen-Modus sind Upload-Buttons, Loeschen-Kreuze und Caption-Felder ausgeblendet. Upload/Loeschen/Umbenennen bleibt im Bearbeiten-Modus moeglich.
- **Back-Pfeil oben entfernt**: Der Zurueck-Pfeil am Titel war doppelt mit dem dedizierten Zurueck-Button unten. Jetzt nur noch der untere Button.
- **"In HA anzeigen" als eigener Button**: vorher nur als Link im Geraetenamen, oft uebersehen. Jetzt prominent in der Button-Reihe (gruen, oeffnet die HA-Geraeteseite in neuem Tab).
- **Button-Reihenfolge neu**: ``[Zurueck] [In HA anzeigen] [Bearbeiten] [Loeschen]`` — Konsens-Reihenfolge (von rechts nach links destruktiver), mit dem gruenen "In HA"-Button visuell abgehoben.
- **Foto-Dokumente mit Thumbnail**: Ist ein hochgeladenes Dokument ein Bild (``mime_type`` beginnt mit ``image/`` oder Dateiendung passt), rendert die Dokumenten-Liste ein 40×40-Vorschaubild (``w-10 h-10``, gerundet, ``object-cover``). Klick auf das Bild oeffnet die Vollansicht. Nicht-Bilder behalten das Standard-Datei-Icon.

### i18n

- Alle 5 Sprachen synchron auf den neuen Umfang (DE, EN, ES, FR, RU).

## 2.5.2

Kritischer Bugfix-Release. Zwei Community-Reports aus v2.5.1.

### HA-Import pull Self-Imports zurueck (Geraete-Verdopplung)

Vor v2.5.2 hat der HA-Importer Geraete, die das Add-on selbst via MQTT Discovery an HA publiziert, beim naechsten Re-Import wieder mit aufgenommen. Jede Import-Runde hat die Geraete-Anzahl verdoppelt (Forum-Report: 860 → 1269 → 1678 → 2087 Geraete, dieselben 20 Standorte und 1 Integration).

- Der Import filtert jetzt HA-Geraete, deren ``identifiers[*][1]`` mit ``geraeteverwaltung`` beginnt (Hub + pro Geraet). Damit werden selbst-publizierte Devices nicht mehr re-importiert, unabhaengig davon ob das MQTT-Discovery-Toggle an oder aus ist.
- Neuer einmaliger Cleanup-Endpoint ``POST /api/ha/cleanup-self-imports`` fuer Bestandsinstallationen: verschiebt alle Inventar-Zeilen, deren ``ha_device_id`` auf ein Self-Publish-Device zeigt, in den Papierkorb (30 Tage wiederherstellbar). Sinnvoll einmalig ausfuehren nach dem Update auf v2.5.2 — danach bleibt's sauber.
- 6 neue Regressionstests (``test_self_import_filter.py``).

### PUT /api/devices/{uuid} mit leerem Body: 400 → idempotent

Die Sync-Queue konnte PUT-Requests mit leerem Body aufbauen (z. B. wenn der User „Speichern" ohne Aenderung drueckt oder wenn die gleiche Aenderung schon via anderem Pfad angekommen ist). Server antwortete mit ``400 No fields to update``, der Sync-Client hat den Queue-Eintrag nie geloescht und bei jedem Sync-Tick erneut geschickt — im Forum-Log sichtbar als minuten­lange 400-Spam-Wellen.

- Server: leerer PUT-Body liefert jetzt die aktuelle Zeile zurueck (200 OK), keine Aenderung, kein ``sync_version``-Bump.
- Client: Sync-Queue ueberspringt Update-Eintraege mit leerem Payload und loescht sie lokal, damit die Wellen auch ohne Server-Roundtrip verschwinden.

### Parent-Child fuer Bestandsinstallationen

Der Zweit-Pass in ``import_ha_devices`` (``parent_uuid`` via HA ``via_device_id``) laeuft ueber *alle* HA-Registry-Devices, nicht nur die neu importierten — Bestandsinstallationen bekommen ihre Parent-Child-Links nach einem erneuten HA-Import automatisch, ohne Loeschen der bestehenden Inventar-Daten. Kein Code-Aenderung, nur Klarstellung.

## 2.5.1

Bugfix-Release. Netzwerk-Klassifikation für Geräte mit mehreren Config Entries.

### Netzwerk-Typ bei Multi-Integration-Geräten

- Geräte, die von zwei HA-Integrationen gleichzeitig erfasst werden (z. B. eine WiFi-Shelly, die von der ``shelly``-Integration gesteuert und von der ``fritz``-Integration auf dem LAN getrackt wird), wurden bisher je nach Reihenfolge der Config Entries mal als „WLAN" und mal als „LAN" klassifiziert. In Setups mit FritzBox + Shelly war das Ergebnis typischerweise „LAN" für alle WiFi-Geräte.
- Neue Logik: HA's ``primary_config_entry`` wird bevorzugt (seit HA 2024.10). Fällt das Feld weg, bevorzugen wir beim Scan aktive Steuerungs-Integrationen und demoten passive Tracker (``fritz``, ``fritzbox``, ``unifi``, ``nmap_tracker``, ``ping``, ``dhcp``, ``snmp``, ``asuswrt``, ``mikrotik``, ``keenetic_ndms2``, ``tplink_omada``, ``device_tracker``, ``bluetooth_le_tracker``, ``bluetooth_tracker``, ``ibeacon``, ``private_ble_device``, ``huawei_lte``, ``mqtt_room``).
- Greift sowohl beim Erst-Import als auch bei „Kategorien neu zuordnen". Bestandsinstallationen bekommen die korrekten Netzwerk-Typen nach einem erneuten Import (bei bereits importierten Geräten bleibt der bisherige Wert stehen — die Neuzuordnung im aktuellen v2.5.0-UI klassifiziert nur den Typ, nicht das Netzwerk).
- Neuer Regressionstest-Satz ``test_primary_integration.py`` mit 9 Tests deckt die typischen Szenarien ab.

## 2.5.0

Großes Feature-Release. Bündelt mehrere offene Community-Wünsche aus dem HA-Forum in einer einzigen Release.

### Parent-Child-Gruppierung für Multi-Kanal-Geräte

- Neue Spalte `devices.parent_uuid` plus Index. Soft-Beziehung, keine Foreign Key.
- HA-Import setzt `parent_uuid` automatisch, wenn HA ein `via_device_id` auf dem Sub-Gerät hat. Das ist genau das Shelly-2PM-Szenario: Hauptgerät plus zwei Kanal-Geräte, die HA aus Integrationssicht trennt, physisch aber eine Einheit sind.
- Neuer Endpoint `GET /api/devices/{uuid}/children` liefert alle Kinder. Device-Detail zeigt jetzt eine kompakte „Teil von …"-Zeile (wenn das Gerät ein Kind ist) plus eine „Untergeräte (N)"-Sektion (wenn es Eltern ist), beide mit klickbaren Links.
- Der Listen-Endpoint akzeptiert optional `parents_only=true`, um Kinder aus Hauptlisten rauszufiltern (vorbereitet, aber per Default noch off).

### Einbauort-Bilder pro Gerät

- Neue Tabelle `attachments` mit bis zu 20 Bildern pro Gerät à max. 10 MB.
- Separat von der bestehenden `photos`-Tabelle — das ist die „primäre Geräte-Aufnahme", Attachments sind viele, mit Beschriftung, für Einbauort-Doku („Schalter hinter Abdeckung, unter Bett"). Dateinamen-Präfix `att_` im Shared-Photos-Dir.
- CRUD-Endpoints: `POST /devices/{uuid}/attachments`, `GET /devices/{uuid}/attachments`, `GET /attachments/{uuid}`, `PATCH /attachments/{uuid}` (Caption), `DELETE /attachments/{uuid}`.
- Neue `AttachmentsSection` im DeviceDetail als Grid mit Captions und Delete-Hover-Button.

### Notizfeld prominenter

- Die Notizen-Sektion im Formular ist jetzt per Default aufgeklappt statt zugeklappt. Feld hat 5 Zeilen statt 3 und ist manuell resizebar (`resize-y`).
- Neuer Placeholder-Text gibt klare Hinweise auf typische Use-Cases (Nachlass, Versicherung, Einbauort, Kaufbeleg-Nummer).

### Pro-Gerät-Änderungshistorie mit Revert

- Neue Tabelle `device_history` mit Indexen auf `device_uuid` und `changed_at`. Protokolliert pro Feld-Änderung: alt, neu, Quelle (`user` / `ha_import` / `recategorize` / `bulk` / `restore` / `revert`), Zeitstempel.
- Recording-Hook in: Single-Update (`PUT /devices/{uuid}`), Bulk-Update (`PUT /devices/bulk/update`), Recategorize (beide Endpoints). 22 Felder werden protokolliert; interne Bookkeeping-Felder wie `updated_at` oder `sync_version` nicht.
- Neue Endpoints: `GET /api/devices/{uuid}/history` (newest-first, max. 500), `POST /api/devices/{uuid}/history/{id}/revert` (setzt die einzelne Änderung zurück, protokolliert den Revert selbst als `source='revert'`).
- Neue `HistorySection` im DeviceDetail als einklappbares `<details>`, lazy-loaded beim ersten Öffnen. Pro Zeile: Feldname, Quelle-Badge, alt→neu, Zeitstempel, „Zurück"-Button.

### Wählbare Exportfelder mit Presets

- `GET /api/export/xlsx` und `GET /api/export/pdf` akzeptieren jetzt `fields=...` als Komma-Liste — nur diese Felder landen im Export.
- Neuer Endpoint `GET /api/export/presets` listet vordefinierte Field-Sets. v2.5.0 startet mit zwei Presets: **Versicherung** (Basisdaten für Schadensfall) und **Nachlass** (erweitert um Standort, Netzwerk, Einbaudetails).
- Neue `ExportPicker`-Komponente als Modal mit Preset-Buttons plus 22 Einzel-Checkboxes. Die letzte Auswahl wird in `localStorage` gemerkt.
- In den Einstellungen ersetzt ein „PDF / Excel exportieren..."-Button den bisherigen direkten PDF-Export. Der JSON-Export-Button bleibt unverändert.

### Sort-Dropdown in der Geräteliste

- Neues Sort-Select oben auf der Liste (neben dem Geräte-Zähler) mit 7 Sortierungen: zuletzt geändert (Default), Name A→Z / Z→A, Typ, Hersteller, Standort, Garantie bald ablaufend.
- Auswahl wird in `sessionStorage` persistiert.
- Client-seitig sortiert via `useDevices({ sort })` — keine Server-Roundtrips.

### i18n

- 36 neue Keys pro Sprache in allen 5 Sprachdateien (DE/EN/ES/FR/RU), synchron.

### DB-Migration

- Drei Ergänzungen in `_migrate_db`:
  - `devices.parent_uuid` + Index
  - Neue `device_history`-Tabelle mit zwei Indexen
  - Neue `attachments`-Tabelle mit Geräte-Index
- Migration ist idempotent (Existenz-Checks), kein Schema-Reset erforderlich.

## 2.4.4

Kleine UX-Nachbesserungen aus dem HA-Forum. Keine neuen Features, nur Schliffarbeiten.

- **Dark-Mode-Fix „Neue Kategorie"-Eingabefeld**: das Input in Einstellungen → Kategorien verwalten hatte im Dark-Mode keine Text-Color-Klasse. Folge: schwarzer Text auf dunkelgrauem Hintergrund, praktisch unleserlich. Jetzt `text-gray-900 dark:text-gray-100` plus passende Placeholder-Farbe. Gleiche Lücke beim Rename-Inline-Input mit behoben.
- **Papierkorb + Datenbank-Schnappschüsse default eingeklappt**: beide Sektionen in den Einstellungen sind jetzt `<details>`-Collapsibles mit rotierendem Chevron. Spart Scrollen zur nächsten Sektion, wenn man sie gerade nicht braucht — die meisten Sessions öffnen sie nicht. Titel-Text bleibt sichtbar, Inhalt klappt auf erstem Klick auf.

## 2.4.3

Vorschau-Release für „Kategorien neu zuordnen". Statt dass der Classifier blind 500 Geräte umschreibt und dabei 200 falsch macht, kann der User jetzt sehen **was** geändert würde, **warum**, und nur die bestätigten Vorschläge anwenden.

### Preview-Endpoint + Cherry-Pick

- Neuer Endpoint `POST /api/ha/recategorize/preview` berechnet für jedes HA-importierte Gerät den Vorschlag, ohne die Datenbank anzufassen. Liefert Liste mit `{uuid, bezeichnung, hersteller, modell, old_type, new_type, evidence}`.
- Neuer Endpoint `POST /api/ha/recategorize/apply` nimmt eine bestätigte Teilmenge `{uuid, expected_new_type}` und wendet nur diese an. TOCTOU-Schutz: wenn der Classifier zwischen Preview und Apply einen anderen Vorschlag hat (z.B. weil der User in HA inzwischen etwas geändert hat), wird das Gerät übersprungen.
- Beide Endpoints akzeptieren optional `{uuids: [...]}` als Filter — bereitet die Bulk-Aktion aus der Geräteliste vor.

### Evidenz-Spalte (Klassifikator wird transparent)

Jeder Vorschlag kommt mit einer kurzen Begründung, woher der vorgeschlagene Typ stammt:

- `device_class=smoke on binary_sensor` — klarer Treffer aus der HA-device_class
- `domain=light` / `domain=climate` / etc. — HA-Entity-Domain als Signal
- `manufacturer=ikea + name pattern (word-boundary)` — Hersteller-Match mit Wortgrenze
- `name match: tv/fernseher (no device_class/domain hint)` — Last-Resort Name-Match, typischer Fall für Fehltreffer (z. B. ein „Fernseher"-Zigbee-Plug, der eigentlich eine Steckdose ist)
- `integration=hue` — Integration-basierter Kurzschluss
- `no matching signal — default` — fällt auf „Sonstiges" zurück

Macht den bisher Black-Box-Classifier inspizierbar und gibt dem User die Chance, systematische Fehltreffer zu erkennen, bevor sie angewendet werden.

### UI: Vorschau-Dialog

- Neue Komponente `RecategorizePreview.tsx` als Full-Screen-Modal mit Tabelle. Jede Zeile zeigt Gerätename, Hersteller/Modell, alte Kategorie → vorgeschlagene Kategorie und die Evidenz (monospace, gut scanbar).
- Alle Vorschläge sind standardmäßig angehakt. User kann einzeln abhaken oder per Filter-Textfeld nach Name, Hersteller, Typ oder Begründung filtern und dann gezielt alle gefilterten ab-/anhaken.
- Summary-Zeile zeigt live wie viele Vorschläge anstehen und wie viele aktuell ausgewählt sind.
- „Anwenden"-Button ist deaktiviert wenn null Vorschläge ausgewählt sind, ansonsten zeigt er die Anzahl (`Apply {count}`).
- „Kategorien neu zuordnen" in den Einstellungen startet jetzt standardmäßig die Vorschau. Der Legacy-„Alles direkt anwenden"-Pfad ist hinter ein `<details>`-Disclosure weggeklappt, sollte aber noch funktionieren (jetzt auch mit optionalem UUID-Filter und Snapshot).

### Backend-Refaktor

- `_guess_device_type` gibt jetzt zusätzlich einen Evidenz-String zurück. Der bisherige String-Rückgabewert ist als dünner Wrapper `_guess_device_type(...)` erhalten, sodass bestehende Aufrufer unverändert weiterlaufen.
- Neue Helper `_load_recategorize_context` + `_classify_row` teilen sich Preview, Apply und den Legacy-Recategorize-Endpoint — keine Duplikation der HA-Registry-Plumbing.

### i18n

- 13 neue Keys pro Sprache (`recategorize.*`) in DE/EN/ES/FR/RU, synchron.

## 2.4.2

Sicherheitsnetz-Release. Destruktive Aktionen sind jetzt rückrollbar. „Kategorien neu zuordnen" kann bei 500 Geräten 300 richtig und 200 falsch machen — vorher gab es keinen Weg zurück.

### Rückgängig-Toast nach Löschen

- Nach Einzel-Löschen und Bulk-Löschen erscheint am unteren Bildschirmrand 6 Sekunden lang ein „Rückgängig"-Toast im Gmail-Stil. Ein Klick darauf stellt das Gerät (oder alle markierten Geräte) komplett wieder her: Server-seitig über `restore`, lokal durch Wieder-Einfügen in IndexedDB aus einem In-Memory-Cache.
- Toast wird zentral über `UndoToastHost` am App-Root gerendert; Aufrufer-Seite nutzt die Funktion `showUndoToast(message, onUndo)` ohne Prop-Drilling.
- Übersetzt in DE/EN/ES/FR/RU (3 Keys).

### Papierkorb für gelöschte Geräte

- Neuer Bereich „Papierkorb" in den Einstellungen zeigt alle soft-gelöschten Geräte mit Lösch-Datum, Typ, Hersteller und Standort.
- „Wiederherstellen"-Button pro Gerät, plus Mehrfachauswahl für Bulk-Wiederherstellen. Fotos, die beim Löschen mit entfernt wurden, werden beim Restore automatisch mit zurückgeholt.
- „Endgültig löschen"-Button (mit Zwei-Tap-Bestätigung) entfernt Gerät inklusive Fotos-Rows aus der DB — nur auf bereits soft-gelöschten Einträgen möglich.
- Neue Backend-Endpoints: `GET /api/devices/trash/list`, `POST /api/devices/{uuid}/restore`, `POST /api/devices/bulk/restore`, `DELETE /api/devices/trash/{uuid}`.

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

Hotfix-Release mit Fokus auf MQTT-Diagnose.

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
