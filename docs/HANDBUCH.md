# Geräteverwaltung — Benutzerhandbuch

Stand: v2.6.0 · 2026-04-27

Dieses Handbuch ist die Antwort auf die immer wieder gleichen Forum-Fragen. Wenn du noch keine vorherige Version kennst, fang oben beim Schnellstart an. Wer schon eine ältere Version genutzt hat, springt direkt zum Kapitel mit dem Feature, das gerade Fragen aufwirft.

---

## Inhalt

1. [Schnellstart in 5 Schritten](#schnellstart-in-5-schritten)
2. [Home Assistant Integration (MQTT-Discovery)](#home-assistant-integration-mqtt-discovery)
3. [Multi-Channel-Geräte (Parent-Child)](#multi-channel-geräte-parent-child)
4. [Versicherungs-Doku & Nachlass — die typischen Workflows](#versicherungs-doku--nachlass--die-typischen-workflows)
5. [Filter, Suche und Sortierung](#filter-suche-und-sortierung)
6. [Papierkorb & Datenbank-Schnappschüsse](#papierkorb--datenbank-schnappschüsse)
7. [Häufige Fragen (FAQ)](#häufige-fragen-faq)
8. [Probleme beheben](#probleme-beheben)

---

## Schnellstart in 5 Schritten

1. **Add-on installieren** über die Home-Assistant-Add-on-Store-URL (siehe README im GitHub-Repo). Nach der Installation erscheint die Geräteverwaltung als Eintrag in der HA-Sidebar.
2. **Pro-Lizenz aktivieren** unter *Einstellungen → Lizenz*. Ohne Lizenz kannst du bis zu 50 Geräte verwalten und nur Englisch nutzen — alles andere (mehrsprachig, Excel, MQTT, Kamera, Barcode, Dokumente) ist Pro.
3. **HA-Geräte importieren** unter *Einstellungen → Home Assistant Import → HA-Geräte importieren*. Der Import kann bei großen Setups (300+) eine Minute dauern; er läuft im Hintergrund mit einer Fortschrittsanzeige.
4. **Optional: MQTT-Discovery aktivieren** unter *Einstellungen → Home Assistant Integration → Geräte in HA veröffentlichen* — siehe das nächste Kapitel, ob das für dich sinnvoll ist.
5. **Erste Geräte ergänzen**: Tippe auf ein Gerät in der Liste, dann *Bearbeiten*, und füll mindestens Anschaffungsdatum, Garantie-Ende und Kaufpreis aus. Foto und Einbauort-Bilder ergänzen, Belege als Dokumente hochladen — fertig für Versicherungs-Doku.

---

## Home Assistant Integration (MQTT-Discovery)

Die mit Abstand häufigste Forum-Frage. Wir erklären, **was** der Toggle macht, **wann** er sinnvoll ist und **wie** man ihn wieder sauber loswird.

### Was passiert beim Aktivieren?

Wenn du *Geräte in HA veröffentlichen* einschaltest, publiziert das Add-on **pro Inventar-Gerät bis zu 6 MQTT-Discovery-Einträge** auf dem in den Add-on-Optionen konfigurierten Broker (default: `core-mosquitto`):

| Entity-Typ | Inhalt | Beispiel |
|------------|--------|----------|
| Sensor `*_warranty` | ISO-Datum bis wann Garantie läuft | `2027-03-15` |
| Sensor `*_warranty_days` | verbleibende Tage als Zahl | `123` |
| Sensor `*_purchase` | Kaufdatum | `2024-09-12` |
| Sensor `*_type` | Gerätetyp | `Router` |
| Sensor `*_location` | Standort | `Büro OG` |
| Binary-Sensor `*_warranty_active` | `on` solange Garantie läuft | `on` / `off` |

Diese Entities tauchen in HA unter *Einstellungen → Geräte & Dienste → MQTT* auf, eine eigene Geräte-Karte pro Inventar-Eintrag.

### Wann ist das sinnvoll?

- **Garantie-Erinnerungen**: Eine HA-Automation auf den Binary-Sensor `*_warranty_active`, die dich 30 Tage vor Ablauf benachrichtigt.
- **Dashboard-Karten**: "Alle Geräte unter Garantie", "Geräte deren Garantie demnächst abläuft", sortiert nach `*_warranty_days`.
- **Inventar-Statistiken** im HA-Dashboard, ohne die Geräteverwaltung selbst öffnen zu müssen.

**Nicht** sinnvoll, wenn du das Add-on rein als Doku-Tool nutzt — dann legt es nur HA-Karten an, die du nie anschaust.

### Aufräumen, wenn man's nicht mehr will

Eine häufig gestellte Frage: *"Wie lösche ich die ganzen MQTT-Topics wieder, wenn ich das Add-on ausschalte?"*

Standardmäßig **bleiben** die retained MQTT-Topics auf dem Broker liegen, auch wenn du den Toggle deaktivierst. Das ist eine MQTT-Discovery-Eigenheit (HA löscht keine retained Messages, die ein anderer Producer geschrieben hat). Drei Wege zum sauberen Aufräumen:

1. **(Empfohlen) Verwaiste Einträge aufräumen**: Im Settings-Block *Home Assistant Integration* gibt es seit v2.6.0 den Button **„Verwaiste Einträge aufräumen"**. Der Button entfernt alle retained Topics für Inventar-Geräte, die du in der Geräteverwaltung schon gelöscht hast. Aktive Geräte bleiben unberührt. Sicher als Routine-Aktion.

2. **Alle MQTT-Einträge entfernen**: Daneben der Button **„Alle MQTT-Einträge entfernen"** (rot). Mit Bestätigung. Räumt **jede** vom Add-on publizierte Discovery-Message weg, auch für Geräte die noch im Inventar sind. Sinnvoller letzter Schritt vor dem dauerhaften Deaktivieren von MQTT-Discovery.

3. **Manuell mit MQTT Explorer**: Topic `geraeteverwaltung/#` und `homeassistant/+/geraeteverwaltung/+/config` — pro Topic Rechtsklick → „Delete topic". Einzige Methode für Bestandsinstallationen ohne v2.6.0.

### Geräte bleiben in HA, nachdem ich sie im Add-on gelöscht habe

Bis v2.5.3 gab es einen Bug, der das MQTT-Cleanup beim Löschen einzelner Geräte überspringt — die Discovery-Topics blieben dann zurück, auch wenn der Add-on selbst ein „Lösche dieses Gerät"-Signal hätte schicken sollen. Ab v2.5.3 funktioniert der Single-Device-Cleanup wieder zuverlässig. Bestand: ein einmaliger Klick auf *Verwaiste Einträge aufräumen* räumt die Reste auf.

---

## Multi-Channel-Geräte (Parent-Child)

Beispiele: Shelly 2PM (zwei Steckdosen-Kanäle in einem Gehäuse), Tuya-Hubs, USB-Hubs, Bosch SHC mit angeschlossenen Thermostaten. HA legt für solche Setups oft mehrere Geräte an (Hauptgerät + ein Untergerät pro Kanal/Sensor) und verknüpft sie über `via_device_id`.

### Was die Geräteverwaltung daraus macht

- Beim HA-Import wird das `via_device_id` ausgewertet und als `parent_uuid` im Inventar gespeichert.
- In der Detail-Ansicht eines Untergeräts steht oben der Kasten **„Teil von: …"** mit klickbarem Sprung zum Hauptgerät.
- In der Detail-Ansicht eines Hauptgeräts steht der Kasten **„Untergeräte (N)"** mit der Liste aller Kinder.
- Drückt man im Untergerät auf **Zurück**, landet man wieder beim Hauptgerät — nicht in der globalen Liste.

### Sub-Geräte ausblenden

Bei Multi-Channel-Setups bläht die Liste schnell auf — drei Zeilen für ein physisches Gerät. In der Liste rechts neben der Sortierung gibt es den Button **„Nur Hauptgeräte"**. Aktiv: Untergeräte sind versteckt, das Button-Label zeigt die Anzahl der versteckten Children. Filter ist Session-persistent.

### Bearbeitung auf alle Kinder anwenden

Beim Bearbeiten eines Hauptgeräts mit Untergeräten erscheint am Ende der Form eine Checkbox **„Auch auf N Untergeräte anwenden"**. Aktiviert wird beim Speichern *zusätzlich* zu dem Hauptgerät ein Bulk-Update mit folgenden Feldern auf alle Children gespiegelt:

- Hersteller
- Anschaffungsdatum
- Garantie-bis
- Stromversorgung
- AIN-Artikelnummer

**Nicht** vererbt werden Felder, die kanal-spezifisch sind: Bezeichnung, Seriennummer, MAC, IP, Standort, Home-Assistant-IDs.

---

## Versicherungs-Doku & Nachlass — die typischen Workflows

### Versicherung

Das Preset *Versicherung* im PDF/Excel-Export wählt automatisch die Felder, die ein Versicherer typischerweise will:

- Nr, Typ, Bezeichnung, Modell, Hersteller
- Seriennummer, AIN-Artikelnr
- Anschaffungsdatum, Garantie-bis, Standort, Anmerkungen

Workflow:

1. Bei jedem wertigen Gerät: Foto aufnehmen, Kaufbeleg als Dokument hochladen, Anmerkungen mit Kaufpreis und ggf. Versicherungs-Notiz pflegen.
2. Einmal jährlich: *Einstellungen → PDF / Excel exportieren → Preset Versicherung*. Das PDF enthält die Tabelle und (sehr lange Notes werden bei 1000 Zeichen gekappt mit Hinweis auf den Excel-Export) eine Detail-Sektion pro Gerät.
3. Excel zusätzlich, wenn der Versicherer die Daten weiterverarbeitet — Excel führt die volle Anmerkungen-Länge in einer Zelle.

### Nachlass

Das Preset *Nachlass* legt den Fokus auf Standort und Identifikatoren:

- Nr, Typ, Bezeichnung, Modell, Hersteller, Seriennummer, AIN-Artikelnr
- Anschaffungsdatum, Garantie-bis
- Standort, Stockwerk, MAC, IP
- Integration, Netzwerk, Firmware, Funktion, Anmerkungen

Idee dahinter: Erben können das Gerät anhand von Bezeichnung + Seriennummer im Haus finden, an Hand der MAC im Router-Log identifizieren, und über die Integration nachvollziehen, woher die Daten ursprünglich kamen.

---

## Filter, Suche und Sortierung

- **Suche** oben durchsucht Bezeichnung, Modell, Hersteller, Standort, MAC, IP, Seriennummer, Integration, Funktion und Typ.
- **Kategorie-Chips** unter der Suche: nur Kategorien, in denen mind. 1 Gerät existiert. Klick wechselt zwischen *aktiv* und *aus*. Aktiver Filter bleibt sichtbar, auch wenn der letzte Gerät aus dieser Kategorie verschwindet — damit man ihn wieder entfernen kann.
- **Donut-Charts** und **Top-10-Listen** im Dashboard sind klickbar — der Klick auf einen Hersteller-Balken setzt einen Hersteller-Filter und springt in die Geräteliste.
- **Filter-Chips** über der Liste (z.B. „Nach Hersteller: BOSCH ×") zeigen den aktiven Filter, das X entfernt ihn.
- **Sortierung**: Dropdown rechts. Optionen: Zuletzt geändert (Default), Name A-Z/Z-A, Typ, Hersteller, Standort, Garantie (am dichtesten Ablauf zuerst). Auswahl ist Session-persistent.
- **„Nur Hauptgeräte"-Toggle**: blendet Children aus (siehe Kapitel Multi-Channel).

---

## Papierkorb & Datenbank-Schnappschüsse

### Papierkorb

- Geräte werden beim Löschen *soft-deleted*: 30 Tage wiederherstellbar im *Einstellungen → Papierkorb*.
- Zwei Wiederherstell-Modi: pro Eintrag (per-Zeile-Button) oder Bulk („N wiederherstellen" oben rechts nach Auswahl).
- *Endgültig löschen* entfernt das Gerät inkl. zugehöriger Fotos.
- Der Knopf *Alle Geräte in Papierkorb* (Settings, ganz unten) ist als Letzter-Reset-Knopf gedacht — schiebt das gesamte Inventar in den Papierkorb mit Snapshot.

### Datenbank-Schnappschüsse

- Vor jeder Bulk-Aktion (bulk-delete-all, recategorize, bulk-update) wird automatisch ein Snapshot der SQLite-Datenbank erstellt.
- Liste unter *Einstellungen → Datenbank-Schnappschüsse*. Pro Eintrag: Filename, Operation, Datum, Größe.
- *Wiederherstellen* überschreibt die aktuelle DB mit dem Snapshot — ein „Undo für die letzte Aktion".

---

## Häufige Fragen (FAQ)

### „Mein Add-on zeigt 1500 Geräte, ich habe aber nur 200."

Du hast vor v2.5.2 mehrfach den HA-Import laufen lassen, während MQTT-Discovery aktiv war. Der Import hat damals die vom Add-on selbst publizierten Geräte zurückgezogen — Inventar-Anzahl verdoppelte sich pro Import. Fix:

1. Updaten auf mindestens v2.5.2.
2. *Einstellungen → Datenbereinigung → Self-Imports aufräumen* (POST `/api/ha/cleanup-self-imports`) räumt die Doppelten in den Papierkorb.
3. Nach 30 Tagen sind sie weg. Wer's eilig hat: Papierkorb leeren.

### „Ich klicke ‚Dokument hochladen' und lande auf der Detailseite, ohne dass etwas hochgeladen wurde."

Bug bis v2.5.3. Ab v2.6.0 fixiert (`type="button"` an den Buttons, sonst submitten sie das umschließende Form). Update.

### „Beim Klick auf ‚In HA anzeigen' öffnet sich der Browser, und ich muss mich neu in HA einloggen."

Du nutzt die HA Companion App auf dem Handy. Bis v2.5.3 war das so. Ab v2.6.0 erkennt das Add-on den Companion am User-Agent und navigiert innerhalb der App-Webview — Rückkehr per System-Back/Geste.

### „PDF-Export bricht das Layout bei einem Gerät mit langen Notizen."

Bug bis v2.5.3 (fpdf2 + Custom Header + multi_cell-Seitenwechsel). Ab v2.6.0 werden Notizen in der Detail-Sektion bei 1000 Zeichen gekappt mit dem Hinweis „... — full text in Excel export". Excel führt den vollen Text in einer Zelle ohne Layout-Probleme.

### „Wo ist der Lizenzschlüssel hinterlegt? Was passiert beim Add-on-Update?"

Lizenz wird im Add-on-Daten-Ordner als `license.json` gespeichert (von HA gemanaged). Add-on-Updates erhalten ihn. Reinstallation = neue Eingabe nötig.

### „Welche Sprachen?"

DE, EN, ES, FR, RU. Umstellung im Settings-View. Free-Tier ist auf EN beschränkt — Pro schaltet alle Sprachen frei.

---

## Probleme beheben

### MQTT-Verbindung schlägt fehl

In *Einstellungen → Home Assistant Integration* gibt es **„MQTT-Verbindung testen"**. Der Button gibt eine konkrete Fehlermeldung zurück, mit Hinweis je nach Fehlercode:

- **Code 4 / 5 (Anmeldung abgelehnt)**: User/Passwort in den Add-on-Optionen prüfen. Mosquitto-Broker erwartet einen Eintrag im HA-Personen-User oder in der Mosquitto-ACL.
- **Verbindung verweigert**: Läuft der Mosquitto-Broker? Port korrekt (1883 unverschlüsselt, 8883 TLS)?
- **Nicht erreichbar / Timeout**: Hostname/IP korrekt? Bei externem Broker: HA-Netzwerk muss den Broker erreichen können.
- **DNS-Fehler**: `mqtt_host` Feld in den Add-on-Optionen prüfen.

### HA-Import gibt 502 Bad Gateway

Bug bis v2.5.2 — der Import lief länger als das HA-Ingress-HTTP-Timeout. Ab v2.5.3 läuft der Import im Hintergrund mit Progress-Polling, kein Timeout mehr.

### Diagnose-Bericht für GitHub-Issue

*Einstellungen → Support & Diagnose* baut einen Bericht mit Add-on-Version, Architektur, Python-Version, MQTT-Status (ohne Zugangsdaten), Geräte-Anzahl und letzten 200 Log-Zeilen. Passwörter, Tokens, IP-Adressen und E-Mails werden automatisch entfernt. Per Klick übertragen oder in die Zwischenablage kopieren.

---

*Stand v2.6.0 · 2026-04-27. Bei Forum-Fragen, die hier nicht beantwortet sind, mach einen Issue auf [github.com/DerRegner-DE/ha-device-inventory](https://github.com/DerRegner-DE/ha-device-inventory) auf — der nächste Releasezyklus pflegt das Handbuch nach.*
