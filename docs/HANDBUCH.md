# Geräteverwaltung — Benutzerhandbuch

Stand: v3.1.1 · 2026-10-06

Dieses Handbuch beschreibt Einrichtung und Bedienung der Geräteverwaltung und beantwortet die häufigsten Fragen aus dem Forum. Neu dabei? Dann am besten mit dem ersten Kapitel und dem Schnellstart beginnen. Wer eine ältere Version kennt, springt direkt zum Kapitel, das gerade Fragen aufwirft.

---

## Inhalt

1. [Wofür die Geräteverwaltung da ist](#wofür-die-geräteverwaltung-da-ist)
2. [Installation, Update, Deinstallation](#installation-update-deinstallation)
3. [Free und Pro](#free-und-pro)
4. [Schnellstart in 5 Schritten](#schnellstart-in-5-schritten)
5. [Geräte erfassen](#geräte-erfassen)
6. [Home Assistant Integration (MQTT-Discovery)](#home-assistant-integration-mqtt-discovery)
7. [Multi-Channel-Geräte (Parent-Child)](#multi-channel-geräte-parent-child)
8. [Doppelte Geräte zusammenführen](#doppelte-geräte-zusammenführen)
9. [Versicherungs-Doku & Nachlass — die typischen Workflows](#versicherungs-doku--nachlass--die-typischen-workflows)
10. [Excel importieren](#excel-importieren)
11. [Filter, Suche und Sortierung](#filter-suche-und-sortierung)
12. [Papierkorb & Datenbank-Schnappschüsse](#papierkorb--datenbank-schnappschüsse)
13. [Häufige Fragen (FAQ)](#häufige-fragen-faq)
14. [Probleme beheben](#probleme-beheben)
15. [Datenschutz und Rechtliches](#datenschutz-und-rechtliches)
16. [Support und Kontakt](#support-und-kontakt)

---

## Wofür die Geräteverwaltung da ist

Ein Smart Home wächst: Router, Sensoren, Steckdosen, Kameras, Thermostate, Gateways. Wo steht die Seriennummer des Repeaters, wann wurde der Thermostat gekauft, läuft die Garantie noch, welcher Lichtschalter ist überbrückt? Die Geräteverwaltung ist eine durchsuchbare Inventarliste aller Geräte im Haus — direkt in Home Assistant.

Typische Einsätze:

- **Versicherung** — Inventar mit Seriennummern, Kaufdaten, Fotos und Belegen; im Schadensfall alles griffbereit.
- **Garantie** — Kaufdatum und Garantieende je Gerät.
- **Wartung** — Firmware, IP- und MAC-Adresse, Netzwerk und Integration auf einen Blick.
- **Übergabe, Rückbau, Nachlass** — die Liste für Angehörige, Elektriker oder Käufer: was läuft ohne Home Assistant, welche Schalter sind überbrückt, wo liegen die Unterlagen.
- **Vermietung und Steuer** — Ausstattung von Mietwohnungen oder betrieblich genutzte Geräte dokumentieren.

Die App läuft als Home-Assistant-Add-on mit eigener Datenbank, ist auf Handy, Tablet und PC nutzbar und funktioniert auch ohne Verbindung; Änderungen werden abgeglichen, sobald die Verbindung wieder steht.

---

## Installation, Update, Deinstallation

**Voraussetzungen:** Home Assistant OS oder Supervised (der Menüpunkt *Apps*, früher *Add-ons*, muss vorhanden sein), Architektur amd64, aarch64 (z. B. Raspberry Pi 4/5) oder armv7, ein aktueller Browser. Kamera und Barcode-Scanner brauchen eine verschlüsselte Verbindung (HTTPS), siehe [Kamera und Scanner](#kamera-und-scanner).

**Installieren:**

1. In Home Assistant **Einstellungen → Apps** (in älteren Versionen **Add-ons**) → unten rechts **App installieren**. Es öffnet sich der **App-Store**.
2. Oben rechts das Drei-Punkte-Menü → **Repositories**.
3. `https://github.com/DerRegner-DE/ha-device-inventory` einfügen, **Hinzufügen**, Dialog schließen.
4. Im Store nach **Geraeteverwaltung** suchen (ggf. Seite neu laden) → **Installieren**.
5. **Starten**, **In Seitenleiste anzeigen** einschalten, **Benutzeroberfläche öffnen**.

**Aktualisieren:** Ein verfügbares Update zeigt Home Assistant unter *Einstellungen → Apps → Geräteverwaltung* (und bei den Benachrichtigungen) an. **Aktualisieren** klicken; *Vor dem Update ein Backup erstellen* eingeschaltet lassen ist empfehlenswert, weil Updates die Datenbank erweitern können. Alternativ *Automatische Updates* einschalten. Was neu ist, steht im Änderungsprotokoll (Changelog) des Add-ons. Nach einem Update lohnt ein Blick in den Abschnitt „Nach dem Update" des Schnellstarts.

**Deinstallieren:** *Einstellungen → Apps → Geräteverwaltung → Deinstallieren*. Dabei löscht Home Assistant das Datenverzeichnis des Add-ons mit Datenbank, Fotos und Lizenz. Vorher sichern: *Einstellungen → Daten exportieren* (JSON; Excel und PDF mit Pro) oder ein Home-Assistant-Backup, das das Add-on einschließt.

---

## Free und Pro

Die Grundfunktionen sind kostenlos; erweiterte Funktionen schaltet ein einmalig gekaufter Lizenzschlüssel frei (**9,99 €**, kein Abo).

| | Free | Pro |
|---|:---:|:---:|
| Geräte von Hand erfassen, alle Grundbereiche des Formulars | bis 50 | unbegrenzt |
| Sprachen | Englisch | Deutsch, Englisch, Spanisch, Französisch, Russisch |
| Dashboard, Suche, Filter, Sortierung, „Nur Hauptgeräte", Offline-Betrieb, Seitenleiste, Dunkelmodus | ✓ | ✓ |
| Eigene Kategorien, JSON-Export | ✓ | ✓ |
| Doppelte Geräte zusammenführen, Self-Imports aufräumen | ✓ | ✓ |
| Papierkorb, Datenbank-Schnappschüsse, Änderungshistorie | ✓ | ✓ |
| MQTT ausschalten, „Verwaiste Einträge aufräumen", „Alle MQTT-Einträge entfernen" | ✓ | ✓ |
| Vorhandene Fotos, Einbauort-Bilder, Dokumente und Übergabe-Angaben ansehen | ✓ | ✓ |
| HA-Import, Geräte neu kategorisieren | — | ✓ |
| PDF- und Excel-Export mit Vorlagen, Reihenfolge und Bildern im PDF; Excel importieren | — | ✓ |
| Kamera, QR-/Barcode-Scanner, Gerätefoto | — | ✓ |
| Dokumente hochladen, verlinken, löschen | — | ✓ |
| Einbauort-Bilder hinzufügen und löschen | — | ✓ |
| Übergabe-Felder bearbeiten („Funktioniert ohne Home Assistant?", „Wandschalter überbrückt?", „Externer Link") | — | ✓ |
| Sammelbearbeitung (*Auswählen*) | — | ✓ |
| MQTT einschalten, „MQTT-Verbindung testen", „Alle Geräte jetzt synchronisieren" (damit die Sensoren in HA und der *Besuchen*-Link) | — | ✓ |

Was schon erfasst ist, bleibt ohne Lizenz sichtbar, und MQTT lässt sich jederzeit ausschalten und aufräumen. So bleiben keine Reste zurück, wenn Pro einmal nicht mehr aktiv ist.

Ohne Lizenz sind Pro-Knöpfe ausgegraut, tragen den Zusatz „(Pro)" und reagieren weder auf Klick noch auf Überfahren. In den Einstellungen steht seit 3.1.1 darunter der Hinweis „Pro-Funktion – Lizenzschlüssel unter Einstellungen → Lizenz eintragen." mit dem Link **Pro kaufen – 9,99 €**.

**Kaufen:** über den Link im README des GitHub-Repositorys; der Schlüssel kommt mit der Kaufbestätigung per E-Mail. Ein Schlüssel gilt für bis zu drei Installationen und läuft nicht ab.

**Aktivieren:** *Einstellungen → Lizenz*, Schlüssel in das Feld *Lizenzschlüssel* eintragen, **Aktivieren**. Die Pro-Funktionen sind sofort frei. Beim Aktivieren und gelegentlich danach prüft das Add-on den Schlüssel beim Zahlungsanbieter Lemon Squeezy; ohne Internet gilt die zuletzt erfolgreiche Prüfung weiter.

Kommt nach dem Kauf keine E-Mail an: Spam-Ordner prüfen, sonst an support@derregner.info schreiben.

---

## Schnellstart in 5 Schritten

1. **Add-on installieren** wie unter [Installation, Update, Deinstallation](#installation-update-deinstallation) beschrieben. Nach der Installation erscheint die Geräteverwaltung als Eintrag in der HA-Seitenleiste.
2. **Pro-Lizenz aktivieren** unter *Einstellungen → Lizenz*. Ohne Lizenz lassen sich bis zu 50 Geräte von Hand verwalten, die Oberfläche ist dann englisch. Pro sind unter anderem HA-Import, weitere Sprachen, PDF-/Excel-Export, MQTT, Kamera, Scanner, Dokumente, Einbauort-Bilder, Übergabe-Felder und Sammelbearbeitung — die vollständige Liste steht unter [Free und Pro](#free-und-pro).
3. **HA-Geräte importieren** (Pro) unter *Einstellungen → Home Assistant Import → HA-Geräte importieren*. Der Import kann bei großen Setups (300+) eine Minute dauern; er läuft im Hintergrund mit einer Fortschrittsanzeige. Übernommen werden Name, Hersteller, Modell, Firmware, Raum und Etage, Integration, Netzwerk und — seit 3.1.0 — Seriennummer, MAC-Adresse und Stromversorgung (Batterie/Akku), soweit Home Assistant sie kennt. Ein erneuter Import legt keine Geräte doppelt an und trägt bei vorhandenen Geräten Seriennummer und MAC nur in leere Felder nach. Solange noch kein Gerät erfasst ist, bieten Startseite und Geräteliste dafür den Knopf **Aus Home Assistant importieren** neben **Erstes Gerät hinzufügen** an; er führt direkt zu diesem Abschnitt (seit 3.1.1).
4. **Optional: MQTT-Discovery aktivieren** (Pro) unter *Einstellungen → Home Assistant Integration → Geräte in HA veröffentlichen* — ob das sinnvoll ist, steht im Kapitel [Home Assistant Integration](#home-assistant-integration-mqtt-discovery).
5. **Erste Geräte ergänzen**: Ein Gerät in der Liste antippen, dann *Bearbeiten*, und mindestens *Anschaffungsdatum* und *Garantie bis* eintragen, den Kaufpreis unter *Anmerkungen*. Mit Pro Foto und Einbauort-Bilder ergänzen und Belege als Dokumente hochladen — fertig für Versicherungs-Doku.

### Nach dem Update auf 3.1.0

Einmal in dieser Reihenfolge:

1. *Einstellungen → Home Assistant Import → HA-Geräte importieren* (Pro) — ergänzt Seriennummer und MAC bei vorhandenen Geräten und löst falsche Router-Zuordnungen (siehe [Multi-Channel-Geräte](#multi-channel-geräte-parent-child)).
2. *Einstellungen → Mögliche Dubletten* — doppelte Geräte prüfen und zusammenführen (siehe [Doppelte Geräte](#doppelte-geräte-zusammenführen)).
3. *Einstellungen → Geräte neu kategorisieren → Vorschau & gezielt zuordnen* (Pro) — die Vorschau zeigt nach 3.1.0 deutlich mehr Vorschläge als früher, weil die Erkennung erstmals die Geräteklassen aus Home Assistant sieht. Außerdem wird die Stromversorgung nachgetragen. Erst die Vorschau ansehen, einzelne Zeilen abwählen, dann übernehmen. Alles ist über Schnappschuss und Geräte-Historie zurücknehmbar.

---

## Geräte erfassen

Neue Geräte über **Hinzufügen** in der unteren Leiste, vorhandene über die Detailseite → **Bearbeiten**. Pflicht sind nur *Gerätetyp* und *Bezeichnung*. Das Formular ist in Bereiche gegliedert, die sich auf- und zuklappen lassen:

| Bereich | Felder |
|---|---|
| Grunddaten | Gerätetyp, Bezeichnung, Modell, Hersteller, Firmware |
| Standort | Bereich aus Home Assistant (die Etage ergibt sich daraus) |
| Netzwerk & Strom | Netzwerk, Stromversorgung, IP-Adresse, MAC-Adresse |
| Details | Seriennummer, AIN/Artikelnummer, Anschaffungsdatum, Garantie bis |
| Home Assistant | Integration, Entity-ID, Device-ID |
| Notizen | Funktion, Anmerkungen, „Funktioniert ohne Home Assistant?", „Wandschalter überbrückt?", Externer Link (die letzten drei bearbeiten: Pro) |

Beim Bearbeiten kommen darunter **Einbauort-Bilder** (Pro; mit Beschriftung, z. B. „hinter der Abdeckung oben links") und **Dokumente** (Pro; Rechnung, Anleitung — als Datei oder Link) hinzu. Ein Gerätefoto (Pro) lässt sich oben im Formular über das Kamera-Symbol aufnehmen oder als Datei auswählen. Ohne Pro bleiben vorhandene Bilder, Dokumente und Übergabe-Angaben sichtbar; das Formular zeigt dann den Hinweis „Übergabe-Felder bearbeiten ist eine Pro-Funktion. Vorhandene Angaben bleiben sichtbar." bzw. „Einbauort-Bilder hinzufügen oder löschen ist eine Pro-Funktion." Jede Änderung landet in der *Änderungshistorie* auf der Detailseite und lässt sich dort einzeln zurücknehmen.

**Integration** ist ein freies Feld: Die Vorschlagsliste enthält die gängigen Integrationen und alle, die im eigenen Bestand vorkommen; jeder andere Wert lässt sich eintippen.

**Auswahlwerte:**

- *Netzwerk:* WLAN, LAN, Zigbee, Z-Wave, Bluetooth, Thread/Matter, DECT, Powerline, HomeMatic RF, KNX, Modbus, 1-Wire, RS-232, EnOcean, USB
- *Stromversorgung:* Netzteil, 230V, Batterie, Akku, USB, PoE, Solar, Starkstrom
- *Gerätetypen (32):* Router, Repeater, Powerline, DECT Repeater, Steckdose, Lichtschalter, Leuchtmittel, Aktor/Relais, Schalter/Taster, Rollladen, Thermostat, Controller/Gateway, Kamera, Türklingel, Gong, Schloss, Alarmanlage, Sprachassistent, Smart TV, Streaming, Display/Dashboard, Tablet, Lautsprecher, Haushaltsgerät, Mähroboter, Bewässerung, Ventilator, Fernbedienung, Drucker, Sensor, Smartphone, Sonstiges

Eigene Gerätetypen legt man unter *Einstellungen → Kategorien verwalten* an; sie stehen danach in allen Auswahllisten, in der Sammelbearbeitung (Pro) und als Filter-Reiter.

### Kamera und Scanner

Mit Pro lassen sich Fotos direkt aufnehmen und QR-/Barcodes scannen. Eine MAC-Adresse im Code wird erkannt und eingetragen, sonst landet der Inhalt als Seriennummer im Formular; strukturierte Codes (z. B. `SN:…|MAC:…|MODEL:…`) füllen mehrere Felder auf einmal. Browser geben die Kamera nur über eine verschlüsselte Verbindung frei: über Home Assistant Cloud (Nabu Casa), ein eigenes Zertifikat oder einen Reverse Proxy. Bei Zugriff über `http://<IP>:8123` bleibt die Auswahl eines vorhandenen Bildes möglich, die Kamera nicht.

---

## Home Assistant Integration (MQTT-Discovery)

Die mit Abstand häufigste Forum-Frage. Wir erklären, **was** der Toggle macht, **wann** er sinnvoll ist und **wie** man ihn wieder sauber loswird.

Einschalten, *MQTT-Verbindung testen* und *Alle Geräte jetzt synchronisieren* sind Pro. Ausschalten und die beiden Aufräum-Knöpfe gehen immer, auch ohne Lizenz.

### Was passiert beim Aktivieren?

Wenn Sie *Geräte in HA veröffentlichen* einschalten, publiziert das Add-on **pro Inventar-Gerät bis zu 6 MQTT-Discovery-Einträge** auf dem in den Add-on-Optionen konfigurierten Broker (default: `core-mosquitto`):

| Entity-Typ | Inhalt | Beispiel |
|------------|--------|----------|
| Sensor `*_warranty` | ISO-Datum bis wann Garantie läuft | `2027-03-15` |
| Sensor `*_warranty_days` | verbleibende Tage als Zahl | `123` |
| Sensor `*_purchase` | Kaufdatum | `2024-09-12` |
| Sensor `*_type` | Gerätetyp | `Router` |
| Sensor `*_location` | Standort | `Büro OG` |
| Binary-Sensor `*_warranty_active` | `on` solange Garantie läuft | `on` / `off` |

Diese Entities tauchen in HA unter *Einstellungen → Geräte & Dienste → MQTT* auf, eine eigene Geräte-Karte pro Inventar-Eintrag.

**Seit 3.1.0** trägt der Sensor `*_type` zusätzlich die gepflegten Angaben als Attribute: Standort, Seriennummer, Stromversorgung, Funktion, Anmerkungen, „Funktioniert ohne HA" und „Wandschalter überbrückt" samt Hinweisen, externer Link sowie die Zahl der Fotos und Einbauort-Bilder (Attribute `fotos` und `einbauort_bilder`). Leere Werte fehlen. Die beiden Zähler stimmen auch nach *Alle Geräte jetzt synchronisieren*; wer ein Foto oder Einbauort-Bild hinzufügt oder löscht, sieht die neue Zahl gleich danach in HA. In Automationen erreichbar z. B. über `state_attr('sensor.landroid_s300_device_type', 'seriennummer')`.

**Zurück in die App:** Auf der HA-Geräteseite jedes so veröffentlichten Geräts steht der Link **Besuchen**. Er öffnet direkt dieses Gerät in der Geräteverwaltung. Für Geräte anderer Integrationen (z. B. die Original-Geräteseite eines Shelly) kann ein Add-on keinen Link setzen — dort geht es nur über die MQTT-Karte des Inventar-Eintrags.

### Zugangsdaten für den MQTT-Broker

**Wofür:** Zum Veröffentlichen muss sich die Geräteverwaltung am MQTT-Broker anmelden; das Mosquitto-Add-on lässt nur angemeldete Teilnehmer zu. Ohne MQTT funktioniert die App ansonsten voll — betroffen sind nur die Sensoren in HA und der *Besuchen*-Link.

Das Add-on fragt die Zugangsdaten zuerst beim Supervisor an. Stellt das Mosquitto-Add-on sie dort bereit, ist nichts einzutragen. Meldet der Test unter *Einstellungen → Home Assistant Integration → MQTT-Verbindung testen* dagegen **„Not authorized"** (Code 135), braucht das Add-on einen Benutzer. Am einfachsten ein eigener Home-Assistant-Benutzer — das Mosquitto-Add-on akzeptiert jeden HA-Benutzer:

1. In Home Assistant links unten **Einstellungen** → **Personen** → oben den Reiter **Benutzer** öffnen (sichtbar für Administratoren; in älteren HA-Versionen erst nach Einschalten von **Erweiterter Modus** im eigenen Profil).
2. Rechts unten **Benutzer hinzufügen**. **Anzeigename** und **Benutzername** z. B. `geraeteverwaltung`, **Passwort** festlegen.
3. **Nur lokal** einschalten, **Administrator** aus lassen. **Erstellen**.
4. **Einstellungen** → **Apps** (in älteren Versionen **Add-ons**) → **Geräteverwaltung** → Reiter **Konfiguration**.
5. Bei **mqtt_user** den Benutzernamen, bei **mqtt_password** das Passwort eintragen. **Speichern**, dann oben auf dem Reiter **Info** **Neu starten**.
6. In der Geräteverwaltung *MQTT-Verbindung testen* — jetzt sollte „OK" kommen.

Warum ein eigener Benutzer statt des eigenen Kontos: Er hat keine Administratorrechte, meldet sich nur im Heimnetz an, und in der Add-on-Konfiguration steht sein Passwort statt Ihres eigenen. Wird er nicht mehr gebraucht, lässt er sich löschen, ohne etwas anderes zu berühren.

### Wann ist das sinnvoll?

- **Garantie-Erinnerungen**: Eine HA-Automation auf den Sensor `*_warranty_days`, die benachrichtigt, sobald der Wert auf 30 oder darunter fällt. Der Binary-Sensor `*_warranty_active` springt erst am Ablauftag auf `off` und taugt deshalb nicht für eine Vorwarnung.
- **Dashboard-Karten**: "Alle Geräte unter Garantie", "Geräte deren Garantie demnächst abläuft", sortiert nach `*_warranty_days`.
- **Inventar-Statistiken** im HA-Dashboard, ohne die Geräteverwaltung selbst öffnen zu müssen.

**Nicht** sinnvoll, wenn Sie das Add-on rein als Doku-Werkzeug nutzen — dann legt es nur HA-Karten an, die niemand anschaut.

### Aufräumen, wenn man's nicht mehr will

Eine häufig gestellte Frage: *"Wie lösche ich die ganzen MQTT-Topics wieder, wenn ich das Add-on ausschalte?"*

Standardmäßig **bleiben** die retained MQTT-Topics auf dem Broker liegen, auch wenn Sie den Schalter ausschalten. Das ist eine MQTT-Discovery-Eigenheit (HA löscht keine retained Messages, die ein anderer Producer geschrieben hat). Drei Wege zum sauberen Aufräumen:

1. **(Empfohlen) Verwaiste Einträge aufräumen**: Im Bereich *Home Assistant Integration* der Einstellungen gibt es seit v2.6.0 den Button **„Verwaiste Einträge aufräumen"**. Der Button entfernt alle retained Topics für Inventar-Geräte, die Sie in der Geräteverwaltung schon gelöscht haben. Aktive Geräte bleiben unberührt. Sicher als Routine-Aktion.

2. **Alle MQTT-Einträge entfernen**: Daneben der Button **„Alle MQTT-Einträge entfernen"** (rot). Mit Bestätigung. Räumt **jede** vom Add-on publizierte Discovery-Message weg, auch für Geräte die noch im Inventar sind. Sinnvoller letzter Schritt vor dem dauerhaften Deaktivieren von MQTT-Discovery.

3. **Manuell mit MQTT Explorer**: Topic `geraeteverwaltung/#` und `homeassistant/+/geraeteverwaltung/+/config` — pro Topic Rechtsklick → „Delete topic". Einzige Methode für Bestandsinstallationen ohne v2.6.0.

### Geräte bleiben in HA, nachdem ich sie im Add-on gelöscht habe

Bis v2.5.2 gab es einen Bug, der das MQTT-Cleanup beim Löschen einzelner Geräte überspringt — die Discovery-Topics blieben dann zurück, auch wenn der Add-on selbst ein „Lösche dieses Gerät"-Signal hätte schicken sollen. Ab v2.5.3 funktioniert der Single-Device-Cleanup wieder zuverlässig. Bestand: ein einmaliger Klick auf *Verwaiste Einträge aufräumen* räumt die Reste auf.

---

## Multi-Channel-Geräte (Parent-Child)

Beispiele: Shelly 2PM (zwei Steckdosen-Kanäle in einem Gehäuse), Tuya-Hubs, USB-Hubs, Bosch SHC mit angeschlossenen Thermostaten. HA legt für solche Setups oft mehrere Geräte an (Hauptgerät + ein Untergerät pro Kanal/Sensor) und verknüpft sie über `via_device_id`.

### Was die Geräteverwaltung daraus macht

- Beim HA-Import wird das `via_device_id` ausgewertet und als `parent_uuid` im Inventar gespeichert.
- In der Detail-Ansicht eines Untergeräts steht oben der Kasten **„Teil von: …"** mit klickbarem Sprung zum Hauptgerät.
- In der Detail-Ansicht eines Hauptgeräts steht der Kasten **„Untergeräte (N)"** mit der Liste aller Kinder.
- Drückt man im Untergerät auf **Zurück**, landet man wieder beim Hauptgerät — nicht in der globalen Liste.

### Sub-Geräte ausblenden

Bei Multi-Channel-Setups bläht die Liste schnell auf — drei Zeilen für ein physisches Gerät. In der Liste links neben der Sortierung gibt es den Button **„Nur Hauptgeräte"**; er erscheint nur, wenn mindestens ein Gerät als Untergerät einem Hauptgerät zugeordnet ist. Aktiv: Untergeräte sind versteckt, das Button-Label zeigt die Anzahl der versteckten Children. Filter ist Session-persistent.

**Router sind kein Hauptgerät (seit 3.1.0):** FRITZ!Box und UPnP melden in Home Assistant *jedes* Gerät im Netz als an sich hängend. Früher machte der Import daraus „Teil von FRITZ!Box" — Klingel, Mähroboter und Handys verschwanden dann im Filter *Nur Hauptgeräte*. Solche Router-Zuordnungen übernimmt der Import nicht mehr, vorhandene löst er beim nächsten Lauf. Echte Zentralen wie Zigbee-Koordinator, Bosch Smart Home Controller oder HomematicIP Access Point bleiben Hauptgerät ihrer Geräte. Zeigt ein bereits geöffneter Browser danach noch die alte Zuordnung: *Einstellungen → Lokalen Cache leeren → Cache leeren*.

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
3. Der Knopf **→ in „Name des Zielgeräts"** in einer Zeile führt dieses eine Gerät zusammen — oder **Alle Vorschläge übernehmen** (zweimal klicken zur Bestätigung) für alle Gruppen auf einmal.

**Von Hand**, für Geräte ohne gemeinsame Kennung: auf der Detailseite **Mit anderem Gerät zusammenführen …**, Zielgerät suchen und auswählen, **Zusammenführen**.

Was beim Zusammenführen passiert:

- Das Zielgerät behält alle seine Angaben. Leere Felder füllt die App aus dem anderen Gerät, Anmerkungen werden angehängt.
- Fotos, Einbauort-Bilder, Dokumente, Änderungshistorie und Untergeräte wandern zum Zielgerät.
- Das andere Gerät landet im Papierkorb. Vorher legt die App einen Datenbank-Schnappschuss an — über *Einstellungen → Datenbank-Schnappschüsse* lässt sich alles zurückholen.

---

## Versicherungs-Doku & Nachlass — die typischen Workflows

### Versicherung

Die Vorlage *Versicherung* im PDF-/Excel-Export wählt automatisch die Felder, die ein Versicherer typischerweise will:

- Nr, Typ, Bezeichnung, Modell, Hersteller
- Seriennummer, AIN-Artikelnr
- Anschaffungsdatum, Garantie-bis, Standort, Anmerkungen
- Externer Link

Der PDF- und Excel-Export samt Vorlagen ist Pro.

Workflow:

1. Bei jedem wertigen Gerät: Foto aufnehmen, Kaufbeleg als Dokument hochladen (beides Pro), Anmerkungen mit Kaufpreis und ggf. Versicherungs-Notiz pflegen.
2. Einmal jährlich: *Einstellungen → Daten exportieren → PDF / Excel exportieren... → Vorlagen → Versicherung*, dann **PDF**. Das PDF enthält die Geräte als kompakte Tabelle; wer zusätzlich eine Detailseite pro Gerät will, wählt unter *Vorlagen* **Alle Felder** oder stellt die Felder von Hand zusammen (sehr lange Anmerkungen werden dort bei 1000 Zeichen gekürzt, mit Hinweis auf den Excel-Export).
3. Excel zusätzlich, wenn der Versicherer die Daten weiterverarbeitet — Excel führt die volle Anmerkungen-Länge in einer Zelle.

### Nachlass

Die Vorlage *Nachlass* richtet sich an Angehörige — was ist es, wo steht es, gibt es noch Garantie, wo liegen die Unterlagen, läuft es ohne HA weiter:

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

Dafür gibt es drei Felder pro Gerät, ganz unten im Bearbeiten-Formular unter *Notizen*. Bearbeiten lassen sie sich mit Pro; vorhandene Angaben bleiben auch ohne Lizenz sichtbar.

**„Funktioniert ohne Home Assistant?"** — drei Möglichkeiten: *Unbekannt* (Voreinstellung, nichts wird ausgegeben), *Ja, läuft auch ohne HA*, *Nein, braucht HA*. Bei *Ja* oder *Nein* erscheint darunter ein Hinweisfeld für den Klartext: „Schalter direkt an der Wand", „Thermostat lässt sich am Gerät stellen", „ohne HA gar nicht bedienbar".

**„Wandschalter überbrückt?"** (*neu in 3.1.0*) — für den Rückbau der wichtigste Punkt: Wurde für dieses Gerät ein Lichtschalter überbrückt, geht die Lampe nach dem Ausbau sonst nicht mehr. Drei Möglichkeiten (*Unbekannt*, *Ja, Schalter überbrückt bzw. entkoppelt*, *Nein*) und ein Hinweisfeld: welcher Schalter, welche Dose — oder welche Einstellung, denn oft ist gar nichts geklemmt, sondern der Aktor umgestellt (z. B. Shelly im Modus „detached"). Erscheint auf der Detailseite unter der Überschrift „Wandschalter". Im selben Kasten stehen „Abhängigkeit von Home Assistant" (die Angabe aus „Funktioniert ohne Home Assistant?") und „Externer Link".

**„Externer Link"** — ein Verweis in ein anderes System: das Dokument in Paperless-ngx, die Handbuchseite des Herstellers, ein Eintrag im eigenen Wiki. Der Link steht auf der Detailseite und öffnet sich in einem neuen Fenster. Ein bloßer Name wie `paperless.local/x` reicht, `https://` wird automatisch ergänzt.

Die Export-Vorlage **„Rückbau/Elektriker"** (*PDF / Excel exportieren... → Vorlagen*, Pro) macht daraus das Blatt, das man in den Hausanschlussraum legt:

- Nr, Typ, Bezeichnung, Hersteller, Modell
- Standort, Etage
- Netzwerk, Stromversorgung
- Ohne HA nutzbar + Hinweis
- Wandschalter überbrückt + Hinweis
- Externer Link
- Funktion, Anmerkungen

Bewusst **ohne** Seriennummern, Kaufdaten und Garantie: Das ist die Liste, die offen im Flur liegen kann, während die Versicherungs- und Nachlass-Vorlagen die vollständigen Daten enthalten.

Die Spalte *Integration* ist seit 3.0.0 nicht mehr dabei — `fritz` oder `bosch_shc` sind Home-Assistant-Interna und sagen einem Handwerker nichts.

Die Vorlage **„Notfallmappe"** (*neu in 3.1.0*) ist die Mappe für den Zählerschrank — für den Elektriker, Nachbarn oder Makler, den Angehörige im Notfall holen: Gerät, Etage und Standort, Hersteller, Modell, Seriennummer, Stromversorgung, läuft-ohne-HA, überbrückte Schalter, Kaufdatum, Garantie, Link zur Anleitung, Funktion und Anmerkungen. Ohne Netzwerkdetails. Kennwörter gehören nicht hinein — die App speichert grundsätzlich keine; ein Hinweis im Anmerkungsfeld, wo die Zugangsdaten liegen (Passwortmanager, Ordner), genügt.

**Alle Vorlagen im Vergleich:**

| Vorlage | Für wen | Enthält |
|---|---|---|
| Versicherung | Sachbearbeiter im Schadensfall | Gerät, Seriennummer, Kaufdatum, Garantie, Standort, Link zur Rechnung |
| Rückbau/Elektriker | Handwerker vor Ort | Gerät, Standort, Netz, Strom, läuft-ohne-HA, überbrückte Schalter, Link — keine Kaufdaten |
| Nachlass | Angehörige | Gerät, Seriennummer, Kaufdatum, Garantie, Standort, läuft-ohne-HA, Link |
| Notfallmappe | Helfer, den Angehörige holen | Gerät, Standort, Seriennummer, Strom, läuft-ohne-HA, überbrückte Schalter, Kaufdatum, Garantie, Link |

Als PDF kommt bei diesen vier Vorlagen eine kompakte Tabelle im Querformat heraus, rund zehn Seiten bei 300 Geräten. Detailseiten je Gerät gibt es mit **Alle Felder** (ebenfalls unter *Vorlagen*) oder wenn Sie die Felder von Hand zusammenstellen. Die eigene Feldauswahl merkt sich die App seit 3.1.0 auf dem Server — sie gilt also auch auf dem Handy oder nach dem Löschen der Browserdaten.

**Reihenfolge** (*neu in 3.1.0*): Im Export-Dialog lässt sich zwischen *Nach Kategorie gruppiert* (bisheriges Verhalten) und **Etage › Standort › Name** wählen. Für den Zettel im Sicherungskasten ist die zweite Variante die richtige: Wer davorsteht, sucht nach Raum, nicht nach Gerätenamen. In Excel kommt sie als durchgehende Tabelle ohne Kategorie-Zwischenzeilen, die sich frei sortieren und filtern lässt.

**Bilder im PDF** (*neu in 3.1.0*): Unter *Bilder im PDF* lassen sich **Einbauort-Bilder** und **Gerätefotos und Bild-Dokumente** zuwählen. Die Bilder stehen als Bildanhang am Ende des PDFs; in der Liste zeigt die Spalte *Bilder* bei jedem Gerät den Verweis (B1, B2 …). Ein Bild, das bei mehreren Geräten hängt, erscheint nur einmal, mit allen zugehörigen Geräten. Excel enthält keine Bilder.

## Excel importieren

*Neu in 3.1.0, Pro.* Unter *Einstellungen → Daten exportieren*, unterhalb der Export-Knöpfe, liest **Excel importieren** eine Excel-Datei aus *PDF / Excel exportieren...* wieder ein.

- Die Spalten erkennt die App an ihrer Überschrift, nicht an ihrer Position. Jede Feldauswahl funktioniert, nach Kategorie gruppiert ebenso wie als durchgehende Tabelle. Die Spalte *Etage* wird nicht übernommen.
- Fotos, Einbauort-Bilder und Dokumente sind nicht Teil der Datei.
- Ohne weitere Auswahl kommen die Geräte **zusätzlich** zum Bestand hinzu. Wer den eigenen Export so wieder einliest, hat danach jedes Gerät doppelt.
- Mit dem Häkchen **„Vorhandene Geräte ersetzen (alle in den Papierkorb, vorher Schnappschuss)"** wandern alle bisherigen Geräte in den Papierkorb, bevor die Datei eingelesen wird. Nach der Dateiauswahl muss das mit **„Wirklich alle Geräte ersetzen?"** bestätigt werden.

---

## Filter, Suche und Sortierung

- **Suche** oben durchsucht Bezeichnung, Modell, Hersteller, Standort, MAC, IP, Seriennummer, Integration, Funktion und Typ.
- **Kategorie-Chips** unter der Suche: eingebaute Kategorien nur, wenn mind. 1 Gerät darin ist; eigene Kategorien (aus *Kategorien verwalten*) seit 3.1.0 immer, ebenso frei eingetippte Typen. Klick wechselt zwischen *aktiv* und *aus*. Aktiver Filter bleibt sichtbar, auch wenn das letzte Gerät aus dieser Kategorie verschwindet — damit man ihn wieder entfernen kann.
- **Foto-Vorschau**: Hat ein Gerät ein Foto, zeigt die Liste es als kleine Vorschau (seit 3.1.0).
- **Donut-Charts** und **Top-10-Listen** im Dashboard sind klickbar — der Klick auf einen Hersteller-Balken setzt einen Hersteller-Filter und springt in die Geräteliste.
- **Filter-Chips** über der Liste (z.B. „Nach Hersteller (Top 10): BOSCH ×") zeigen den aktiven Filter, das X entfernt ihn.
- **Sortierung**: Dropdown rechts. Optionen: Zuletzt geändert (Default), Name A-Z/Z-A, Typ, Hersteller, Standort, Garantie (am dichtesten Ablauf zuerst). Auswahl ist Session-persistent.
- **„Nur Hauptgeräte"-Toggle**: blendet Children aus (siehe Kapitel Multi-Channel).
- **Sammelbearbeitung** (Pro): Mit **Auswählen** über der Liste mehrere Geräte markieren und gemeinsam Typ oder Integration ändern oder sie löschen. Ohne Pro ist der Knopf ausgegraut und trägt den Zusatz „(Pro)".

---

## Papierkorb & Datenbank-Schnappschüsse

### Papierkorb

- Gelöschte Geräte kommen zuerst in den Papierkorb und lassen sich 30 Tage lang unter *Einstellungen → Papierkorb* wiederherstellen.
- Nach 30 Tagen löscht die App sie automatisch endgültig. Sie prüft das beim Start des Add-ons und danach einmal täglich. Vorher legt sie einen Schnappschuss an („Vor automatischem Leeren des Papierkorbs (30 Tage)"); darüber lässt sich auch das zurückholen.
- Zwei Wiederherstell-Modi: pro Eintrag (per-Zeile-Button) oder Bulk („N wiederherstellen" oben rechts nach Auswahl).
- *Endgültig löschen* entfernt das Gerät samt Fotos, Einbauort-Bildern und Dokumenten, auch die zugehörigen Dateien.
- **Papierkorb leeren** (oben im Papierkorb) löscht alle Einträge auf einmal endgültig. Der erste Klick fragt „Wirklich alle {N} endgültig löschen?", erst der zweite löscht. Vorher legt die App einen Schnappschuss an („Vor Leeren des Papierkorbs"); dasselbe gilt, wenn Sie mehrere ausgewählte Einträge endgültig löschen.
- Der Knopf *Alle Geräte in Papierkorb* (Einstellungen, ganz unten) ist als Letzter-Reset-Knopf gedacht — schiebt das gesamte Inventar in den Papierkorb mit Snapshot.

### Datenbank-Schnappschüsse

- Vor jeder Massenaktion legt die App automatisch einen Schnappschuss der Datenbank an: mehrere oder alle Geräte löschen, neu kategorisieren, Sammelbearbeitung, Zusammenführen, „Alle Vorschläge übernehmen", Kategorie löschen, Excel-Import mit Ersetzen, Self-Imports aufräumen, Papierkorb leeren oder mehrere Einträge endgültig löschen, automatisches Leeren des Papierkorbs und vor jedem Wiederherstellen.
- Von Hand: *Einstellungen → Datenbank-Schnappschüsse* → **Schnappschuss jetzt anlegen**, z. B. vor eigenen Aufräumarbeiten. Er erscheint in der Liste als „Von Hand angelegt".
- Liste unter *Einstellungen → Datenbank-Schnappschüsse*. Pro Eintrag: Anlass in Klartext (z. B. „Vor Zusammenführen", „Vor Löschen der Kategorie „…""), Alter und Größe.
- *Wiederherstellen* überschreibt die aktuelle DB mit dem Snapshot — ein „Undo für die letzte Aktion".

---

## Häufige Fragen (FAQ)

### „Mein Add-on zeigt 1500 Geräte, ich habe aber nur 200."

Vor v2.5.2 wurde der HA-Import mehrfach ausgeführt, während MQTT-Discovery aktiv war. Der Import hat damals die vom Add-on selbst publizierten Geräte zurückgezogen — Inventar-Anzahl verdoppelte sich pro Import. Fix:

1. Updaten auf mindestens v2.5.2.
2. *Einstellungen → Mögliche Dubletten* aufklappen, Abschnitt „Eigene MQTT-Geräte aus altem Import", **Self-Imports aufräumen**. Der Knopf verschiebt diese Einträge in den Papierkorb; vorher legt die App einen Schnappschuss an. Andere Geräte bleiben unberührt.
3. Nach 30 Tagen löscht die App sie automatisch endgültig. Wer's eilig hat: *Einstellungen → Papierkorb* → **Papierkorb leeren**.

### „Ich klicke ‚Dokument hochladen' und lande auf der Detailseite, ohne dass etwas hochgeladen wurde."

Bug bis v2.5.3. Ab v2.6.0 fixiert (`type="button"` an den Buttons, sonst submitten sie das umschließende Form). Update.

### „Beim Klick auf ‚In HA anzeigen' öffnet sich der Browser, und ich muss mich neu in HA einloggen."

Das betraf die HA Companion App auf dem Handy bis v2.5.3. Seit v2.6.3 erkennt das Add-on den Companion und öffnet das Gerät über den Deep-Link `homeassistant://navigate/…` direkt in der Companion App, ohne neue Anmeldung.

### „PDF-Export bricht das Layout bei einem Gerät mit langen Notizen."

Bug bis v2.5.3 (fpdf2 + Custom Header + multi_cell-Seitenwechsel). Ab v2.6.0 werden Notizen in der Detail-Sektion bei 1000 Zeichen gekappt mit dem Hinweis „... (N chars total — full text in Excel export)". Excel führt den vollen Text in einer Zelle ohne Layout-Probleme.

### „Wo ist der Lizenzschlüssel hinterlegt? Was passiert beim Add-on-Update?"

Lizenz wird im Add-on-Daten-Ordner als `license.json` gespeichert (von HA gemanaged). Add-on-Updates erhalten ihn. Reinstallation = neue Eingabe nötig.

### „Welche Sprachen?"

DE, EN, ES, FR, RU. Umstellung unter *Einstellungen → Sprache*. Free-Tier ist auf EN beschränkt und startet direkt auf Englisch — Pro schaltet alle Sprachen frei.

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
| Dokumente | `/data/documents/` |
| Datenbank-Schnappschüsse | `/data/db/snapshots/` |
| MQTT-Schalter | `/data/db/mqtt_settings.json` |
| Lizenzschlüssel | `/data/db/license.json` |

**Sichern** brauchen Sie nichts von Hand: Ein Home-Assistant-Backup nimmt das Add-on-Datenverzeichnis vollständig mit. Wer die Geräteliste zusätzlich außerhalb von HA halten will, nutzt *Einstellungen → Daten exportieren → JSON Export*. Vor eigenen Eingriffen hilft *Einstellungen → Datenbank-Schnappschüsse → Schnappschuss jetzt anlegen*; der Schnappschuss liegt allerdings ebenfalls im Add-on-Datenverzeichnis.

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

*Einstellungen → Support & Diagnose* baut einen Bericht mit Add-on-Version, Architektur, Python-Version, MQTT-Status (ohne Zugangsdaten), Geräte-Anzahl und letzten 200 Log-Zeilen. Passwörter, Tokens und E-Mail-Adressen werden automatisch entfernt, bei IP-Adressen werden die letzten zwei Oktette maskiert. Per Klick übertragen oder in die Zwischenablage kopieren.

---

## Datenschutz und Rechtliches

**Wo die Daten liegen:** Alle Gerätedaten, Fotos, Einbauort-Bilder und Dokumente bleiben in Ihrer Home-Assistant-Installation (Datenverzeichnis des Add-ons). Für den Offline-Betrieb speichert zusätzlich der Browser jedes Geräts, mit dem Sie die App öffnen, die Gerätedaten und das Gerätefoto. Einbauort-Bilder und Dokumente liegen nur auf dem Server, nicht im Browser. Die App enthält kein Tracking und keine Analyse-Werkzeuge.

**Was das Add-on nach außen schickt:** Nur den Lizenzschlüssel samt Installationskennung an den Zahlungsanbieter Lemon Squeezy — beim Aktivieren und zur gelegentlichen Prüfung. Gerätedaten verlassen Ihre Installation nur, wenn Sie selbst exportieren, einen Diagnose-Bericht absenden oder Geräte per MQTT an Ihren eigenen Broker veröffentlichen.

**Gewährleistung:** Die Software wird ohne Gewähr bereitgestellt; maßgeblich sind die Lizenzbedingungen im GitHub-Repository.

---

## Support und Kontakt

- **Fehler melden oder Funktion wünschen:** [github.com/DerRegner-DE/ha-device-inventory](https://github.com/DerRegner-DE/ha-device-inventory) → *Issues*. Am schnellsten mit dem Diagnose-Bericht aus *Einstellungen → Support & Diagnose*.
- **Ohne GitHub-Konto:** E-Mail an support@derregner.info.
- **Austausch mit anderen Nutzern:** Forum der simon42-Community, Thread „Geräteverwaltung".

---

Stand v3.1.0 · 2026-10-05. Fragen, die hier nicht beantwortet sind, gern als Issue auf GitHub oder per E-Mail an support@derregner.info — das Handbuch wird mit jeder Version nachgezogen.
