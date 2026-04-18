# Changelog

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
