# Geräteverwaltung — Benutzerhandbuch

Stand: v3.1.0 · 2026-10-05

Dieses Handbuch ist die Antwort auf die immer wieder gleichen Forum-Fragen. Wenn du noch keine vorherige Version kennst, fang oben beim Schnellstart an. Wer schon eine ältere Version genutzt hat, springt direkt zum Kapitel mit dem Feature, das gerade Fragen aufwirft.

---

## Inhalt

1. [Schnellstart in 5 Schritten](#schnellstart-in-5-schritten)
2. [Home Assistant Integration (MQTT-Discovery)](#home-assistant-integration-mqtt-discovery)
3. [Multi-Channel-Geräte (Parent-Child)](#multi-channel-geräte-parent-child)
4. [Doppelte Geräte zusammenführen](#doppelte-geräte-zusammenführen)
5. [Versicherungs-Doku & Nachlass — die typischen Workflows](#versicherungs-doku--nachlass--die-typischen-workflows)
6. [Filter, Suche und Sortierung](#filter-suche-und-sortierung)
7. [Papierkorb & Datenbank-Schnappschüsse](#papierkorb--datenbank-schnappschüsse)
8. [Häufige Fragen (FAQ)](#häufige-fragen-faq)
9. [Probleme beheben](#probleme-beheben)

---

## Schnellstart in 5 Schritten

1. **Add-on installieren** über die Home-Assistant-Add-on-Store-URL (siehe README im GitHub-Repo). Nach der Installation erscheint die Geräteverwaltung als Eintrag in der HA-Sidebar.
2. **Pro-Lizenz aktivieren** unter *Einstellungen → Lizenz*. Ohne Lizenz kannst du bis zu 50 Geräte verwalten und nur Englisch nutzen — alles andere (mehrsprachig, Excel, MQTT, Kamera, Barcode, Dokumente) ist Pro.
3. **HA-Geräte importieren** unter *Einstellungen → Home Assistant Import → HA-Geräte importieren*. Der Import kann bei großen Setups (300+) eine Minute dauern; er läuft im Hintergrund mit einer Fortschrittsanzeige. Übernommen werden Name, Hersteller, Modell, Firmware, Raum und Etage, Integration, Netzwerk und — seit 3.1.0 — Seriennummer, MAC-Adresse und Stromversorgung (Batterie/Akku), soweit Home Assistant sie kennt. Ein erneuter Import legt keine Geräte doppelt an und trägt bei vorhandenen Geräten Seriennummer und MAC nur in leere Felder nach.
4. **Optional: MQTT-Discovery aktivieren** unter *Einstellungen → Home Assistant Integration → Geräte in HA veröffentlichen* — siehe das nächste Kapitel, ob das für dich sinnvoll ist.
5. **Erste Geräte ergänzen**: Tippe auf ein Gerät in der Liste, dann *Bearbeiten*, und füll mindestens Anschaffungsdatum, Garantie-Ende und Kaufpreis aus. Foto und Einbauort-Bilder ergänzen, Belege als Dokumente hochladen — fertig für Versicherungs-Doku.

### Nach dem Update auf 3.1.0

Einmal in dieser Reihenfolge:

1. *Einstellungen → Aus Home Assistant importieren* — ergänzt Seriennummer und MAC bei vorhandenen Geräten und löst falsche Router-Zuordnungen (siehe [Multi-Channel-Geräte](#multi-channel-geräte-parent-child)).
2. *Einstellungen → Mögliche Dubletten* — doppelte Geräte prüfen und zusammenführen (siehe [Doppelte Geräte](#doppelte-geräte-zusammenführen)).
3. *Einstellungen → Kategorien neu zuordnen* — die Vorschau zeigt nach 3.1.0 deutlich mehr Vorschläge als früher, weil die Erkennung erstmals die Geräteklassen aus Home Assistant sieht. Außerdem wird die Stromversorgung nachgetragen. Erst die Vorschau ansehen, einzelne Zeilen abwählen, dann übernehmen. Alles ist über Schnappschuss und Geräte-Historie zurücknehmbar.

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

**Seit 3.1.0** trägt der Sensor `*_type` zusätzlich die gepflegten Angaben als Attribute: Standort, Seriennummer, Stromversorgung, Funktion, Anmerkungen, „Funktioniert ohne HA" und „Wandschalter überbrückt" samt Hinweisen, externer Link sowie die Zahl der Fotos und Einbauort-Bilder. Leere Werte fehlen. In Automationen erreichbar z. B. über `state_attr('sensor.landroid_s300_device_type', 'seriennummer')`.

**Zurück in die App:** Auf der HA-Geräteseite jedes so veröffentlichten Geräts steht der Link **Besuchen**. Er öffnet direkt dieses Gerät in der Geräteverwaltung. Für Geräte anderer Integrationen (z. B. die Original-Geräteseite eines Shelly) kann ein Add-on keinen Link setzen — dort geht es nur über die MQTT-Karte des Inventar-Eintrags.

### Zugangsdaten für den MQTT-Broker

**Wofür:** Zum Veröffentlichen muss sich die Geräteverwaltung am MQTT-Broker anmelden; das Mosquitto-Add-on lässt nur angemeldete Teilnehmer zu. Ohne MQTT funktioniert die App ansonsten voll — betroffen sind nur die Sensoren in HA und der *Besuchen*-Link.

Das Add-on fragt die Zugangsdaten zuerst beim Supervisor an. Stellt das Mosquitto-Add-on sie dort bereit, ist nichts einzutragen. Meldet der Test unter *Einstellungen → Home Assistant Integration → MQTT-Verbindung testen* dagegen **„Not authorized"** (Code 135), braucht das Add-on einen Benutzer. Am einfachsten ein eigener Home-Assistant-Benutzer — das Mosquitto-Add-on akzeptiert jeden HA-Benutzer:

1. In Home Assistant links unten **Einstellungen** → **Personen** → oben den Reiter **Benutzer** öffnen. Fehlt der Reiter: unten links auf den eigenen Namen klicken und **Erweiterter Modus** einschalten.
2. Rechts unten **Benutzer hinzufügen**. Anzeigename und Benutzername z. B. `geraeteverwaltung`, ein Passwort festlegen.
3. **„Kann sich nur aus dem lokalen Netzwerk anmelden"** einschalten, **„Administrator"** aus lassen. **Erstellen**.
4. **Einstellungen** → **Add-ons** (in neueren Versionen **Apps**) → **Geräteverwaltung** → Reiter **Konfiguration**.
5. Bei **mqtt_user** den Benutzernamen, bei **mqtt_password** das Passwort eintragen. **Speichern**, das Add-on neu starten.
6. In der Geräteverwaltung *MQTT-Verbindung testen* — jetzt sollte „OK" kommen.

Warum ein eigener Benutzer statt des eigenen Kontos: Er hat keine Administratorrechte, meldet sich nur im Heimnetz an, und in der Add-on-Konfiguration steht sein Passwort statt Ihres eigenen. Wird er nicht mehr gebraucht, lässt er sich löschen, ohne etwas anderes zu berühren.

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

**Router sind kein Hauptgerät (seit 3.1.0):** FRITZ!Box und UPnP melden in Home Assistant *jedes* Gerät im Netz als an sich hängend. Früher machte der Import daraus „Teil von FRITZ!Box" — Klingel, Mähroboter und Handys verschwanden dann im Filter *Nur Hauptgeräte*. Solche Router-Zuordnungen übernimmt der Import nicht mehr, vorhandene löst er beim nächsten Lauf. Echte Zentralen wie Zigbee-Koordinator, Bosch Smart Home Controller oder HomematicIP Access Point bleiben Hauptgerät ihrer Geräte. Zeigt ein bereits geöffneter Browser danach noch die alte Zuordnung: *Einstellungen → Cache leeren*.

**Routing-Hubs werden nicht versteckt:** HA setzt `via_device_id` auch für Geräte, die über eine Bridge angebunden sind (Zigbee2MQTT-Bridge → Hue/IKEA/Aqara, ZHA-Coordinator → Endgeräte, Z-Wave-JS-Stick → Endgeräte, Matter-Server → Endgeräte). Diese „Children" sind eigene Hardware, nur die Bridge ist Software. Der Filter behandelt Geräte mit Integration `mqtt`, `zha`, `zwave_js` oder `matter` deshalb wie Hauptgeräte — sonst würde der Hauptgeräte-Filter die echten Lampen verstecken und nur die Bridge übrig lassen.

### Bearbeitung auf alle Kinder anwenden

Beim Bearbeiten eines Hauptgeräts mit Untergeräten erscheint am Ende der Form eine Checkbox **„Auch auf N Untergeräte anwenden"**. Aktiviert wird beim Speichern *zusätzlich* zu dem Hauptgerät ein Bulk-Update mit folgenden Feldern auf alle Children gespiegelt:

- Hersteller
- Anschaffungsdatum
- Garantie-bis
- Stromversorgung
- AIN-Artikelnummer

**Nicht** vererbt werden Felder, die kanal-spezifisch sind: Bezeichnung, Seriennummer, MAC, IP, Standort, Home-Assistant-IDs.

---

## Doppelte Geräte zusammenführen

*Neu in 3.1.0.* Seit HA 2026.8 legt Home Assistant für ein physisches Gerät oft mehrere Einträge an: den Shelly über seine eigene Integration und noch einmal über die FRITZ!Box; bei mehreren FRITZ!Boxen im Mesh sogar einmal pro Box. Im Inventar stand das Gerät dann mehrfach.

**Beim Import** fasst die App Einträge mit gleicher MAC- oder Zigbee-Adresse aus verschiedenen Integrationen bzw. Konfigurationen automatisch zu einem Gerät zusammen. Es bleibt der Eintrag der Integration, die das Gerät steuert (Shelly, Ring, Bosch …), nicht der des Routers. Der Zwilling wird gemerkt und beim nächsten Import nicht wieder angelegt.

**Bereits doppelt importierte Geräte** (aus Versionen vor 3.1.0):

1. *Einstellungen → Mögliche Dubletten* aufklappen, **Dubletten suchen**.
2. Die Liste zeigt Gruppen mit gleicher MAC-Adresse. Das oberste Gerät jeder Gruppe ist der Vorschlag, der bleibt.
3. Pro Zeile **→ in „…"** führt dieses eine Gerät zusammen — oder **Alle Vorschläge übernehmen** (zweimal klicken zur Bestätigung) für alle Gruppen auf einmal.

**Von Hand**, für Geräte ohne gemeinsame Kennung: auf der Detailseite **Mit anderem Gerät zusammenführen …**, Zielgerät suchen und auswählen, **Zusammenführen**.

Was beim Zusammenführen passiert:

- Das Zielgerät behält alle seine Angaben. Leere Felder füllt die App aus dem anderen Gerät, Anmerkungen werden angehängt.
- Fotos, Einbauort-Bilder, Dokumente, Änderungshistorie und Untergeräte wandern zum Zielgerät.
- Das andere Gerät landet im Papierkorb. Vorher legt die App einen Datenbank-Schnappschuss an — über *Einstellungen → Datenbank-Schnappschüsse* lässt sich alles zurückholen.

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

Das Preset *Nachlass* richtet sich an Angehörige — was ist es, wo steht es, gibt es noch Garantie, wo liegen die Unterlagen, läuft es ohne HA weiter:

- Nr, Typ, Bezeichnung, Hersteller, Modell, Seriennummer, AIN-Artikelnr
- Anschaffungsdatum, Garantie-bis
- Standort, Etage
- Funktioniert ohne HA + Hinweis
- Externer Link
- Funktion, Anmerkungen

Netzwerkdetails (MAC, IP, Firmware, Integration) sind seit 3.0.0 bewusst nicht mehr dabei — sie interessieren Erben nicht und kosten nur Spaltenbreite.

---

### Übergabe an jemand anderen (Rückbau/Elektriker)

*Neu in 3.0.0.* Der Fall dahinter: Irgendwann steht jemand anderes vor der Anlage — Angehörige, ein Elektriker, ein Käufer. Diese Person kennt weder Home Assistant noch die Historie des Hauses.

Dafür gibt es zwei Felder pro Gerät, ganz unten im Bearbeiten-Formular unter *Anmerkungen*:

**„Funktioniert ohne Home Assistant?"** — drei Möglichkeiten: *Unbekannt* (Voreinstellung, nichts wird ausgegeben), *Ja, läuft auch ohne HA*, *Nein, braucht HA*. Bei *Ja* oder *Nein* erscheint darunter ein Hinweisfeld für den Klartext: „Schalter direkt an der Wand", „Thermostat lässt sich am Gerät stellen", „ohne HA gar nicht bedienbar".

**„Wandschalter überbrückt?"** (*neu in 3.1.0*) — für den Rückbau der wichtigste Punkt: Wurde für dieses Gerät ein Lichtschalter überbrückt, geht die Lampe nach dem Ausbau sonst nicht mehr. Drei Möglichkeiten (*Unbekannt*, *Ja, Schalter überbrückt bzw. entkoppelt*, *Nein*) und ein Hinweisfeld: welcher Schalter, welche Dose — oder welche Einstellung, denn oft ist gar nichts geklemmt, sondern der Aktor umgestellt (z. B. Shelly im Modus „detached"). Erscheint auf der Detailseite in derselben Karte wie „Funktioniert ohne HA".

**„Externer Link"** — ein Verweis in ein anderes System: das Dokument in Paperless-ngx, die Handbuchseite des Herstellers, ein Eintrag im eigenen Wiki. Der Link steht auf der Detailseite und öffnet sich in einem neuen Fenster. Ein bloßer Name wie `paperless.local/x` reicht, `https://` wird automatisch ergänzt.

Das Export-Preset **„Rückbau/Elektriker"** (Export → Preset auswählen) macht daraus das Blatt, das man in den Hausanschlussraum legt:

- Nr, Typ, Bezeichnung, Hersteller, Modell
- Standort, Etage
- Netzwerk, Stromversorgung
- Ohne HA nutzbar + Hinweis
- Wandschalter überbrückt + Hinweis
- Externer Link
- Funktion, Anmerkungen

Bewusst **ohne** Seriennummern, Kaufdaten und Garantie: Das ist die Liste, die offen im Flur liegen kann, während die Versicherungs- und Nachlass-Vorlagen die vollständigen Daten enthalten.

Die Spalte *Integration* ist seit 3.0.0 nicht mehr dabei — `fritz` oder `bosch_shc` sind Home-Assistant-Interna und sagen einem Handwerker nichts.

Das Preset **„Notfallmappe"** (*neu in 3.1.0*) ist die Mappe für den Zählerschrank — für den Elektriker, Nachbarn oder Makler, den Angehörige im Notfall holen: Gerät, Etage und Standort, Hersteller, Modell, Seriennummer, Stromversorgung, läuft-ohne-HA, überbrückte Schalter, Kaufdatum, Garantie, Link zur Anleitung, Funktion und Anmerkungen. Ohne Netzwerkdetails. Kennwörter gehören nicht hinein — die App speichert grundsätzlich keine; ein Hinweis im Anmerkungsfeld, wo die Zugangsdaten liegen (Passwortmanager, Ordner), genügt.

**Alle Vorlagen im Vergleich:**

| Vorlage | Für wen | Enthält |
|---|---|---|
| Versicherung | Sachbearbeiter im Schadensfall | Gerät, Seriennummer, Kaufdatum, Garantie, Standort, Link zur Rechnung |
| Rückbau/Elektriker | Handwerker vor Ort | Gerät, Standort, Netz, Strom, läuft-ohne-HA, überbrückte Schalter, Link — keine Kaufdaten |
| Nachlass | Angehörige | Gerät, Seriennummer, Kaufdatum, Garantie, Standort, läuft-ohne-HA, Link |
| Notfallmappe | Helfer, den Angehörige holen | Gerät, Standort, Seriennummer, Strom, läuft-ohne-HA, überbrückte Schalter, Kaufdatum, Garantie, Link |

Als PDF kommt bei allen Vorlagen eine kompakte Tabelle im Querformat heraus, rund zehn Seiten bei 300 Geräten. Detailseiten je Gerät gibt es nur, wenn Sie die Felder von Hand zusammenstellen statt eine Vorlage zu wählen. Die eigene Feldauswahl merkt sich die App seit 3.1.0 auf dem Server — sie gilt also auch auf dem Handy oder nach dem Löschen der Browserdaten.

**Reihenfolge** (*neu in 3.1.0*): Im Export-Dialog lässt sich zwischen *Nach Kategorie gruppiert* (bisheriges Verhalten) und **Etage › Standort › Name** wählen. Für den Zettel im Sicherungskasten ist die zweite Variante die richtige: Wer davorsteht, sucht nach Raum, nicht nach Gerätenamen. In Excel kommt sie als durchgehende Tabelle ohne Kategorie-Zwischenzeilen, die sich frei sortieren und filtern lässt.

**Bilder im PDF** (*neu in 3.1.0*): Unter *Bilder im PDF* lassen sich **Einbauort-Bilder** und **Gerätefotos und Bild-Dokumente** zuwählen. Die Bilder stehen als Bildanhang am Ende des PDFs; in der Liste zeigt die Spalte *Bilder* bei jedem Gerät den Verweis (B1, B2 …). Ein Bild, das bei mehreren Geräten hängt, erscheint nur einmal, mit allen zugehörigen Geräten. Excel enthält keine Bilder.

---

## Filter, Suche und Sortierung

- **Suche** oben durchsucht Bezeichnung, Modell, Hersteller, Standort, MAC, IP, Seriennummer, Integration, Funktion und Typ.
- **Kategorie-Chips** unter der Suche: eingebaute Kategorien nur, wenn mind. 1 Gerät darin ist; eigene Kategorien (aus *Kategorien verwalten*) seit 3.1.0 immer, ebenso frei eingetippte Typen. Klick wechselt zwischen *aktiv* und *aus*. Aktiver Filter bleibt sichtbar, auch wenn das letzte Gerät aus dieser Kategorie verschwindet — damit man ihn wieder entfernen kann.
- **Foto-Vorschau**: Hat ein Gerät ein Foto, zeigt die Liste es als kleine Vorschau (seit 3.1.0).
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

### Der Browser blockiert den Export („Unsicherer Download blockiert")

Das passiert, wenn Sie Home Assistant über eine unverschlüsselte Adresse aufrufen, also `http://<IP>:8123`. Browser lassen aus solchen Seiten keine Dateien mehr herunterladen, ohne nachzufragen. Mit der App hat das nichts zu tun — der Export wird erzeugt und korrekt ausgeliefert.

**So kommen Sie an die Datei:** Im Download-Bereich des Browsers auf **Behalten** klicken. Die Datei ist vollständig und unverändert.

**So verschwindet die Nachfrage dauerhaft:** Rufen Sie Home Assistant über eine verschlüsselte Verbindung auf — über Home Assistant Cloud (Nabu Casa), über ein eigenes Zertifikat per Duck DNS und Let's Encrypt, oder über einen vorgeschalteten Reverse Proxy. Danach tritt das Problem nicht mehr auf.

### Wo liegen meine Daten, und wie sichere ich sie?

Alles, was die App speichert, liegt im Datenverzeichnis des Add-ons:

| Was | Wo |
|---|---|
| Datenbank mit allen Geräten | `/data/db/geraeteverwaltung.db` |
| Fotos und Einbauort-Bilder | `/data/photos/` |
| Lizenzschlüssel | `/data/db/license.json` |

**Sichern** brauchen Sie nichts von Hand: Ein Home-Assistant-Backup nimmt das Add-on-Datenverzeichnis vollständig mit. Wer die Geräteliste zusätzlich außerhalb von HA halten will, nutzt *Einstellungen → Daten exportieren → JSON Export* oder legt einen Schnappschuss an.

**Nicht** in die Datenbank hineinschreiben, während das Add-on läuft. Wer sie über Samba oder SSH öffnet und bearbeitet, riskiert eine beschädigte Datei — die App hält sie geöffnet. Zum Ansehen erst das Add-on stoppen.

### MQTT-Verbindung schlägt fehl

In *Einstellungen → Home Assistant Integration* gibt es **„MQTT-Verbindung testen"**. Der Button gibt eine konkrete Fehlermeldung zurück, mit Hinweis je nach Fehlercode:

- **Code 4 / 5 / 135 (Anmeldung abgelehnt, „Not authorized")**: Es fehlen Zugangsdaten oder sie stimmen nicht. Schritt für Schritt unter [Zugangsdaten für den MQTT-Broker](#zugangsdaten-für-den-mqtt-broker).
- **Verbindung verweigert**: Läuft der Mosquitto-Broker? Port korrekt (1883 unverschlüsselt, 8883 TLS)?
- **Nicht erreichbar / Timeout**: Hostname/IP korrekt? Bei externem Broker: HA-Netzwerk muss den Broker erreichen können.
- **DNS-Fehler**: `mqtt_host` Feld in den Add-on-Optionen prüfen.

### HA-Import gibt 502 Bad Gateway

Bug bis v2.5.2 — der Import lief länger als das HA-Ingress-HTTP-Timeout. Ab v2.5.3 läuft der Import im Hintergrund mit Progress-Polling, kein Timeout mehr.

### Diagnose-Bericht für GitHub-Issue

*Einstellungen → Support & Diagnose* baut einen Bericht mit Add-on-Version, Architektur, Python-Version, MQTT-Status (ohne Zugangsdaten), Geräte-Anzahl und letzten 200 Log-Zeilen. Passwörter, Tokens, IP-Adressen und E-Mails werden automatisch entfernt. Per Klick übertragen oder in die Zwischenablage kopieren.

---

*Stand v3.1.0 · 2026-10-05. Bei Forum-Fragen, die hier nicht beantwortet sind, mach einen Issue auf [github.com/DerRegner-DE/ha-device-inventory](https://github.com/DerRegner-DE/ha-device-inventory) auf — der nächste Releasezyklus pflegt das Handbuch nach.*
