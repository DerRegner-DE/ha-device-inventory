## Titel:
Geräteverwaltung – Smart Home Inventar als HA Add-on (Open Source + 10 Pro-Keys für Tester)

## Kategorie:
Home Assistant Add-ons

## Tags:
add-on, geräte, inventar, mqtt, pwa

## Beitrag:

Hallo zusammen!

Ich habe ein Add-on entwickelt, das mir selbst gefehlt hat: eine **Geräteverwaltung direkt in Home Assistant**. Wer kennt es nicht – man hat 50, 100, 200+ Smart-Home-Geräte und irgendwann verliert man den Überblick über Seriennummern, Garantiedaten, IP-Adressen, Firmware-Versionen und wo was verbaut ist.

### Was macht das Add-on?

**Geräteverwaltung** ist ein Offline-First PWA Add-on, das direkt in der HA-Sidebar läuft. Ihr könnt damit:

- Alle Geräte erfassen (Name, Typ, Hersteller, Modell, Seriennummer, MAC, IP, Firmware, …)
- Standorte aus euren HA-Bereichen/Etagen übernehmen
- Garantiestatus im Blick behalten (Dashboard mit Donut-Charts)
- Geräte aus Home Assistant importieren (ein Klick)
- Per MQTT Discovery als HA-Entities veröffentlichen (Garantie-Sensoren, Standort, …)
- PDF-Export für die Versicherungsdokumentation erstellen
- Mehrere Geräte gleichzeitig bearbeiten (Bulk Edit)
- Dark Mode nutzen

Das Ganze läuft komplett lokal, Offline-Modus inklusive – die Daten verlassen euer Netzwerk nicht.

### Free vs. Pro

Die **Free-Version** ist voll funktionsfähig:
- Bis zu 50 Geräte
- Englische Oberfläche
- Dashboard, Suche, Filter, CRUD

**Pro** (einmalig 9,99 €) schaltet frei:
- Unbegrenzte Geräte
- 5 Sprachen (DE, EN, ES, FR, RU)
- Kamera/Barcode-Scanner
- Excel-Export/-Import
- HA-Sync (MQTT Discovery)
- PDF-Export

### Installation

1. Repository in HA hinzufügen: `https://github.com/DerRegner-DE/ha-device-inventory`
2. Add-on "Geräteverwaltung" installieren
3. Starten → erscheint in der Sidebar

GitHub: https://github.com/DerRegner-DE/ha-device-inventory

### 10 kostenlose Pro-Keys für Tester!

Ich würde gerne **10 Testusern aus dieser Community** jeweils einen Pro-Key (6 Monate gültig) schenken. Dafür hätte ich nur eine Bitte: probiert das Add-on aus und gebt mir Feedback – was fehlt, was nervt, was gut läuft. Bugs gerne als GitHub Issue, alles andere hier im Thread.

**Wer einen Key möchte: einfach hier im Thread melden!** Ich vergebe die Keys per DM in der Reihenfolge der Meldungen (first come, first served). Wenn die 10 weg sind, sind sie weg.

### Screenshots

*(Hier die Screenshots von GitHub einfügen – am besten direkt hochladen:)*
- Dashboard mit Charts
- Geräteliste
- Formular (ausgefüllt)
- Einstellungen / Dark Mode

### Tech-Stack (für die Neugierigen)

- Frontend: Preact + TypeScript + Tailwind CSS
- Backend: FastAPI + SQLite
- Docker Multi-Stage Build
- Ingress-Integration (läuft im HA-iframe)

Freue mich auf euer Feedback!

---

## Weitere Promotion-Möglichkeiten

### 1. Home Assistant Community Forum (community.home-assistant.io)
- Kategorie: **Share your Projects**
- Englischer Post (internationales Publikum)
- Größte HA-Community weltweit
- Link: https://community.home-assistant.io/c/share-your-projects/35

### 2. Reddit r/homeassistant
- ~500k Mitglieder
- Post-Typ: [Share] mit Screenshot
- Kurz und knackig, Link zu GitHub
- Link: https://www.reddit.com/r/homeassistant/

### 3. GitHub
- README mit Badges ist schon vorhanden
- Topics/Tags setzen: `home-assistant`, `add-on`, `device-inventory`, `smart-home`
- Discussions aktivieren für Feature Requests

### 4. Simon42 YouTube (optional)
- Simon42 stellt regelmäßig Community-Projekte vor
- Wenn Tester positives Feedback geben, könnte man ihn anschreiben
