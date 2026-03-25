# Changelog

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
