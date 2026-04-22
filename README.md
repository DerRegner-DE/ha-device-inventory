<h1 align="center">
  <br>
  Geraeteverwaltung
  <br>
</h1>

<h3 align="center">Smart Home Device Inventory for Home Assistant</h3>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-2.4.0-blue.svg" />
  <img alt="Home Assistant" src="https://img.shields.io/badge/Home%20Assistant-2024.1%2B-41BDF5?logo=homeassistant&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/license-Source%20Available-orange.svg" />
  <img alt="GitHub Stars" src="https://img.shields.io/github/stars/DerRegner-DE/ha-device-inventory?style=social" />
  <img alt="Architectures" src="https://img.shields.io/badge/arch-amd64%20%7C%20aarch64%20%7C%20armv7-lightgrey" />
</p>

<p align="center">
  <a href="#english">🇬🇧 English</a> &bull;
  <a href="#deutsch">🇩🇪 Deutsch</a> &bull;
  <a href="#français">🇫🇷 Français</a> &bull;
  <a href="#español">🇪🇸 Español</a> &bull;
  <a href="#русский">🇷🇺 Русский</a>
</p>

---

![Geräteverwaltung Dashboard](docs/screenshots/de_dashboard.png)

---

## Table of Contents

| Language | Sections |
|----------|----------|
| [🇬🇧 English](#english) | [Why](#why-geraeteverwaltung) · [Features](#features) · [Installation](#installation) · [Quick Start](#quick-start) · [Pro License](#pro-license) · [Device Types](#supported-device-types) · [Technical Requirements](#technical-requirements) |
| [🇩🇪 Deutsch](#deutsch) | [Warum](#warum-geräteverwaltung) · [Funktionen](#funktionen) · [Installation](#installation-1) · [Schnellstart](#schnellstart) · [Pro-Lizenz](#pro-lizenz) · [Gerätetypen](#unterstützte-gerätetypen) · [Voraussetzungen](#technische-voraussetzungen) |
| [🇫🇷 Français](#français) | [Pourquoi](#pourquoi-geräteverwaltung) · [Fonctionnalités](#fonctionnalités) · [Installation](#installation-2) · [Démarrage](#démarrage-rapide) · [Licence Pro](#licence-pro) · [Appareils](#types-dappareils-pris-en-charge) · [Prérequis](#prérequis-techniques) |
| [🇪🇸 Español](#español) | [Por qué](#por-qué-geräteverwaltung) · [Características](#características) · [Instalación](#instalación) · [Inicio rápido](#inicio-rápido) · [Licencia Pro](#licencia-pro) · [Tipos](#tipos-de-dispositivos) · [Requisitos](#requisitos-técnicos) |
| [🇷🇺 Русский](#русский) | [Зачем](#зачем-нужен-geräteverwaltung) · [Возможности](#возможности) · [Установка](#установка) · [Быстрый старт](#быстрый-старт) · [Лицензия Pro](#лицензия-pro) · [Типы устройств](#поддерживаемые-типы-устройств) · [Требования](#технические-требования) |

**Technical (EN only):** [Architecture](#architecture) · [Development](#development) · [Contributing](#contributing) · [License & Legal](#license--legal)

---

<a name="english"></a>

## 🇬🇧 English

### Why Geraeteverwaltung?

Most smart home users have dozens or even hundreds of devices spread across their home. Routers, sensors, smart plugs, cameras, thermostats, gateways -- and the list keeps growing. But where do you track serial numbers? Warranty dates? Which IP address belongs to which device? What firmware is running on that Zigbee sensor in the basement?

**Geraeteverwaltung solves this.** It gives you a single, searchable inventory of every device in your home -- directly inside Home Assistant.

#### Use Cases

- **Insurance documentation** -- Maintain a complete inventory with serial numbers, purchase dates, and photos. If the worst happens, you have everything documented.
- **Warranty tracking** -- Record purchase dates and warranty expiration for every device. Never miss a warranty claim again.
- **Maintenance overview** -- Firmware versions, IP addresses, MAC addresses, network types, and integrations at a glance. No more hunting through router admin pages.
- **Rental property management** -- Document equipment in rental units separately from your own home. Know exactly what belongs where when tenants move in or out.
- **Tax documentation** -- Track business equipment with purchase dates and costs for tax reporting.
- **Quick setup with HA import** -- Instead of manually entering 200+ devices, import your entire Home Assistant device registry with one click. Device types, manufacturers, and models are detected automatically.
- **Multi-device access** -- View and edit your inventory from your phone, tablet, or desktop. Changes sync automatically within 30 seconds.
- **Offline capable** -- Works without internet. Add devices in the basement with no Wi-Fi signal, and everything syncs when you are back online.

### Features

| Feature | Free | Pro |
|---------|:----:|:---:|
| Device inventory (CRUD) | 50 devices | **Unlimited** |
| Offline-first PWA | Yes | Yes |
| HA Add-on with sidebar integration | Yes | Yes |
| Area & floor mapping | Yes | Yes |
| Dashboard with charts | Yes | Yes |
| Dark mode | Yes | Yes |
| JSON export | Yes | Yes |
| 32 built-in device categories + custom categories | Yes | Yes |
| Network & power source tracking | Yes | Yes |
| Languages | English | **DE, EN, ES, FR, RU** |
| One-click HA device import | -- | **Yes** |
| Smart type detection from HA data | -- | **Yes** |
| Duplicate detection on import | -- | **Yes** |
| Excel export | -- | **Yes** |
| PDF export (insurance documentation) | -- | **Yes** |
| Camera capture with live preview | -- | **Yes** |
| QR / Barcode scanner with auto-fill | -- | **Yes** |
| Photo gallery per device | -- | **Yes** |
| Bulk edit (type, integration, delete) | -- | **Yes** |
| MQTT Discovery (publish as HA entities) | -- | **Yes** |

### Installation

#### 1. Add the repository

1. Open Home Assistant
2. Go to **Settings** > **Add-ons** > **Add-on Store**
3. Click the three-dot menu (top right) > **Repositories**
4. Add this URL:
   ```
   https://github.com/DerRegner-DE/ha-device-inventory
   ```
5. Click **Add** and close the dialog

#### 2. Install the add-on

1. Search for **Geraeteverwaltung** in the add-on store (refresh if needed)
2. Click **Install**
3. Start the add-on
4. Enable **Show in sidebar** (recommended)
5. Click **Open Web UI**

#### 3. Activate Pro (optional)

1. Open the app and go to **Settings**
2. Enter your license key
3. Click **Activate** -- all Pro features unlock immediately

### Quick Start

1. **Add your first device** -- Tap the **+** button
2. **Choose a type** -- Select from 22 categories (Router, Camera, Thermostat, etc.)
3. **Fill in the basics** -- Name, model, manufacturer, serial number
4. **Set the location** -- Pick a floor and area from your Home Assistant setup
5. **Add network details** -- IP address, MAC address, integration, network type
6. **Record warranty info** -- Purchase date and warranty expiration
7. **Take a photo** (Pro) -- Use the camera button for a live preview capture
8. **Scan a barcode** (Pro) -- Capture serial numbers or product codes instantly

#### Import from Home Assistant (Pro)

Instead of entering devices manually, use the **HA Import** feature:

1. Go to **Settings** > **Import from Home Assistant**
2. Click **Start Import**
3. The app imports your entire HA device registry -- manufacturers, models, and integrations are mapped automatically
4. Review and enrich the imported devices with serial numbers, photos, and warranty dates

The import is safe to run repeatedly -- existing devices are detected and skipped automatically.

### Pro License

**EUR 9.99** -- one-time purchase, no subscription.

| | Free | Pro |
|--|:----:|:---:|
| Price | Free | EUR 9.99 (one-time) |
| Device limit | 50 | Unlimited |
| Languages | EN | DE, EN, ES, FR, RU |
| HA Import | -- | Yes |
| Excel & PDF Export | -- | Yes |
| Camera & QR Scanner | -- | Yes |
| Photo Gallery | -- | Yes |
| Bulk Edit | -- | Yes |
| MQTT Discovery | -- | Yes |

**[Buy Pro License](https://derregner.lemonsqueezy.com/checkout/buy/43a72d0b-6948-4ade-909b-6ec216678904)** -- Instant delivery. Your license key will be included in the purchase confirmation email. You can activate it on up to 3 installations.

### Supported Device Types

The app includes 22 predefined device categories with dedicated icons:

| | | | |
|--|--|--|--|
| Router | Repeater | Powerline Adapter | DECT Repeater |
| Smart Plug / Outlet | Light Switch | Light Bulb | Shutter / Blind |
| Thermostat | Controller / Gateway | Camera | Doorbell |
| Chime | Voice Assistant | Streaming Device | Tablet |
| Speaker | Robot Mower | Printer | Sensor |
| Smartphone | Other | | |

Each device can also track:
- **Network type:** Wi-Fi, LAN, Zigbee, Bluetooth, DECT, Powerline, HomeMatic RF, USB
- **Power source:** Adapter, Mains (230V), Battery, Rechargeable, USB, PoE, Solar, High Voltage
- **Integration:** Fritz, Zigbee2MQTT, Tuya, LocalTuya, Bosch SHC, HomeMatic IP, Ring, Blink, Alexa, TP-Link, Tasmota, MQTT, and more

### Technical Requirements

- **Home Assistant** 2024.1 or newer
- **Architecture:** amd64
- **Browser:** Any modern browser (Chrome, Firefox, Safari, Edge)
- **Storage:** ~50 MB for the add-on + your device photos
- **HTTPS required** for Camera and QR Scanner (works automatically with Nabu Casa; for local access, SSL certificate or `localhost` required)

---

<a name="deutsch"></a>

## 🇩🇪 Deutsch

### Warum Geräteverwaltung?

Die meisten Smart-Home-Nutzer haben Dutzende oder sogar Hunderte von Geräten im Haus verteilt. Router, Sensoren, Steckdosen, Kameras, Thermostate, Gateways -- und die Liste wächst stetig. Aber wo hält man Seriennummern fest? Garantiedaten? Welche IP-Adresse gehört zu welchem Gerät? Welche Firmware läuft auf dem Zigbee-Sensor im Keller?

**Geräteverwaltung löst genau das.** Eine einzige, durchsuchbare Inventarliste aller Geräte im Haus -- direkt in Home Assistant.

#### Anwendungsfälle

- **Versicherungsdokumentation** -- Vollständige Inventarliste mit Seriennummern, Kaufdaten und Fotos. Im Schadensfall ist alles dokumentiert.
- **Garantieverfolgung** -- Kaufdaten und Garantieablauf für jedes Gerät erfassen. Nie wieder eine Garantie verpassen.
- **Wartungsübersicht** -- Firmware-Versionen, IP-Adressen, MAC-Adressen, Netzwerktypen und Integrationen auf einen Blick. Kein Suchen mehr in Router-Administrationsseiten.
- **Mietobjektverwaltung** -- Geräte in Mietwohnungen getrennt vom eigenen Zuhause dokumentieren. Immer wissen, was wo gehört.
- **Steuerliche Erfassung** -- Betriebliche Geräte mit Kaufdatum und Kosten für die Steuererklärung erfassen.
- **Schnell-Setup per HA-Import** -- Statt 200+ Geräte manuell einzutragen, das gesamte Home-Assistant-Geräteregister per Klick importieren. Typen, Hersteller und Modelle werden automatisch erkannt.
- **Mehrgerätezugriff** -- Inventar vom Handy, Tablet oder Desktop abrufen und bearbeiten. Änderungen werden innerhalb von 30 Sekunden synchronisiert.
- **Offline-fähig** -- Funktioniert ohne Internet. Geräte im Keller ohne WLAN-Signal erfassen, Sync erfolgt automatisch wenn die Verbindung wiederhergestellt ist.

### Funktionen

| Funktion | Free | Pro |
|---------|:----:|:---:|
| Geräteverwaltung (CRUD) | 50 Geräte | **Unbegrenzt** |
| Offline-first PWA | Ja | Ja |
| HA Add-on mit Seitenleiste | Ja | Ja |
| Bereichs- und Etagenzuordnung | Ja | Ja |
| Dashboard mit Diagrammen | Ja | Ja |
| Dark Mode | Ja | Ja |
| JSON-Export | Ja | Ja |
| 22 Gerätekategorien | Ja | Ja |
| Netzwerk- und Stromquellenerfassung | Ja | Ja |
| Sprachen | Englisch | **DE, EN, ES, FR, RU** |
| HA-Import per Klick | -- | **Ja** |
| Automatische Typerkennung | -- | **Ja** |
| Duplikaterkennung beim Import | -- | **Ja** |
| Excel-Export | -- | **Ja** |
| PDF-Export (Versicherungsdokumentation) | -- | **Ja** |
| Kameraaufnahme mit Live-Vorschau | -- | **Ja** |
| QR- / Barcode-Scanner mit Auto-Ausfüllen | -- | **Ja** |
| Fotogalerie pro Gerät | -- | **Ja** |
| Massenbearbeitung (Typ, Integration, Löschen) | -- | **Ja** |
| MQTT Discovery (als HA-Entities publizieren) | -- | **Ja** |

### Installation

#### 1. Repository hinzufügen

1. Home Assistant öffnen
2. **Einstellungen** > **Add-ons** > **Add-on Store**
3. Drei-Punkte-Menü (oben rechts) > **Repositories**
4. Diese URL einfügen:
   ```
   https://github.com/DerRegner-DE/ha-device-inventory
   ```
5. **Hinzufügen** klicken und den Dialog schließen

#### 2. Add-on installieren

1. Im Add-on Store nach **Geraeteverwaltung** suchen (ggf. Seite neu laden)
2. **Installieren** klicken
3. Add-on starten
4. **In Seitenleiste anzeigen** aktivieren (empfohlen)
5. **Web-Oberfläche öffnen** klicken

#### 3. Pro aktivieren (optional)

1. App öffnen und zu **Einstellungen** navigieren
2. Lizenzschlüssel eingeben
3. **Aktivieren** klicken -- alle Pro-Funktionen sind sofort freigeschaltet

### Schnellstart

1. **Erstes Gerät hinzufügen** -- Auf **+** tippen
2. **Typ wählen** -- Aus 22 Kategorien auswählen (Router, Kamera, Thermostat, ...)
3. **Basisdaten eingeben** -- Name, Modell, Hersteller, Seriennummer
4. **Standort festlegen** -- Etage und Bereich aus der Home-Assistant-Konfiguration wählen
5. **Netzwerkdaten erfassen** -- IP-Adresse, MAC-Adresse, Integration, Netzwerktyp
6. **Garantieinfo eintragen** -- Kaufdatum und Garantieablauf
7. **Foto aufnehmen** (Pro) -- Kamera-Button für Live-Vorschau verwenden
8. **Barcode scannen** (Pro) -- Seriennummern oder Produktcodes sofort erfassen

#### Import aus Home Assistant (Pro)

Statt Geräte manuell einzugeben, die **HA-Import**-Funktion nutzen:

1. **Einstellungen** > **Import aus Home Assistant**
2. **Import starten** klicken
3. Die App importiert das gesamte HA-Geräteregister -- Hersteller, Modelle und Integrationen werden automatisch zugeordnet
4. Importierte Geräte mit Seriennummern, Fotos und Garantiedaten anreichern

Der Import kann mehrfach ausgeführt werden -- vorhandene Geräte werden automatisch erkannt und übersprungen.

### Pro-Lizenz

**9,99 EUR** -- Einmalzahlung, kein Abo.

| | Free | Pro |
|--|:----:|:---:|
| Preis | Kostenlos | 9,99 EUR (einmalig) |
| Gerätelimit | 50 | Unbegrenzt |
| Sprachen | EN | DE, EN, ES, FR, RU |
| HA-Import | -- | Ja |
| Excel- & PDF-Export | -- | Ja |
| Kamera & QR-Scanner | -- | Ja |
| Fotogalerie | -- | Ja |
| Massenbearbeitung | -- | Ja |
| MQTT Discovery | -- | Ja |

**[Pro-Lizenz kaufen](https://derregner.lemonsqueezy.com/checkout/buy/43a72d0b-6948-4ade-909b-6ec216678904)** -- Sofortige Auslieferung. Der Lizenzschlüssel ist in der Kaufbestätigungs-E-Mail enthalten. Auf bis zu 3 Installationen aktivierbar.

### Unterstützte Gerätetypen

Die App enthält 22 vordefinierte Gerätekategorien mit eigenen Icons:

| | | | |
|--|--|--|--|
| Router | Repeater | Powerline-Adapter | DECT-Repeater |
| Smarte Steckdose | Lichtschalter | Leuchtmittel | Rollladen / Jalousie |
| Thermostat | Controller / Gateway | Kamera | Türklingel |
| Türklingelton | Sprachassistent | Streaming-Gerät | Tablet |
| Lautsprecher | Mähroboter | Drucker | Sensor |
| Smartphone | Sonstiges | | |

Jedes Gerät kann zusätzlich erfassen:
- **Netzwerktyp:** WLAN, LAN, Zigbee, Bluetooth, DECT, Powerline, HomeMatic RF, USB
- **Stromquelle:** Netzteil, Festnetz (230V), Batterie, Akku, USB, PoE, Solar, Hochspannung
- **Integration:** Fritz, Zigbee2MQTT, Tuya, LocalTuya, Bosch SHC, HomeMatic IP, Ring, Blink, Alexa, TP-Link, Tasmota, MQTT und weitere

### Technische Voraussetzungen

- **Home Assistant** 2024.1 oder neuer
- **Architektur:** amd64
- **Browser:** Jeder moderne Browser (Chrome, Firefox, Safari, Edge)
- **Speicher:** ~50 MB für das Add-on + Gerätefotos
- **HTTPS erforderlich** für Kamera und QR-Scanner (funktioniert automatisch mit Nabu Casa; für lokalen Zugriff: SSL-Zertifikat oder `localhost`)

---

<a name="français"></a>

## 🇫🇷 Français

### Pourquoi Geräteverwaltung ?

La plupart des utilisateurs de maison connectée possèdent des dizaines, voire des centaines d'appareils répartis dans leur domicile. Routeurs, capteurs, prises intelligentes, caméras, thermostats, passerelles -- et la liste ne cesse de s'allonger. Mais où consigner les numéros de série ? Les dates de garantie ? Quelle adresse IP correspond à quel appareil ? Quelle version de firmware tourne sur le capteur Zigbee dans la cave ?

**Geräteverwaltung résout tout cela.** Un inventaire unique et consultable de tous vos appareils -- directement dans Home Assistant.

#### Cas d'utilisation

- **Documentation pour l'assurance** -- Inventaire complet avec numéros de série, dates d'achat et photos. En cas de sinistre, tout est documenté.
- **Suivi des garanties** -- Enregistrez les dates d'achat et d'expiration de garantie. Ne manquez plus jamais une réclamation.
- **Vue de maintenance** -- Versions firmware, adresses IP, adresses MAC, types réseau et intégrations en un coup d'œil. Fini les recherches dans les pages d'administration du routeur.
- **Gestion locative** -- Documentez les équipements des locations séparément de votre domicile. Sachez exactement ce qui appartient à quoi lors des entrées et sorties de locataires.
- **Documentation fiscale** -- Suivez les équipements professionnels avec dates d'achat et coûts pour la déclaration d'impôts.
- **Configuration rapide via import HA** -- Importez tout votre registre d'appareils Home Assistant en un clic. Types, fabricants et modèles sont détectés automatiquement.
- **Accès multi-appareils** -- Consultez et modifiez votre inventaire depuis votre téléphone, tablette ou bureau. Les modifications se synchronisent en 30 secondes.
- **Hors ligne** -- Fonctionne sans internet. Ajoutez des appareils dans la cave sans signal Wi-Fi, tout se synchronise automatiquement à la reconnexion.

### Fonctionnalités

| Fonctionnalité | Gratuit | Pro |
|---------|:----:|:---:|
| Inventaire (CRUD) | 50 appareils | **Illimité** |
| PWA hors ligne | Oui | Oui |
| Add-on HA avec barre latérale | Oui | Oui |
| Zones et étages | Oui | Oui |
| Tableau de bord avec graphiques | Oui | Oui |
| Mode sombre | Oui | Oui |
| Export JSON | Oui | Oui |
| 22 catégories d'appareils | Oui | Oui |
| Suivi réseau et alimentation | Oui | Oui |
| Langues | Anglais | **DE, EN, ES, FR, RU** |
| Import HA en un clic | -- | **Oui** |
| Détection automatique du type | -- | **Oui** |
| Détection des doublons | -- | **Oui** |
| Export Excel | -- | **Oui** |
| Export PDF (assurance) | -- | **Oui** |
| Capture photo avec aperçu en direct | -- | **Oui** |
| Scanner QR / code-barres | -- | **Oui** |
| Galerie photo par appareil | -- | **Oui** |
| Édition en masse (type, intégration, suppression) | -- | **Oui** |
| MQTT Discovery (publier comme entités HA) | -- | **Oui** |

### Installation

#### 1. Ajouter le dépôt

1. Ouvrir Home Assistant
2. Aller dans **Paramètres** > **Modules complémentaires** > **Boutique de modules**
3. Menu trois points (en haut à droite) > **Dépôts**
4. Ajouter cette URL :
   ```
   https://github.com/DerRegner-DE/ha-device-inventory
   ```
5. Cliquer sur **Ajouter** et fermer

#### 2. Installer le module

1. Rechercher **Geraeteverwaltung** dans la boutique (actualiser si nécessaire)
2. Cliquer sur **Installer**
3. Démarrer le module
4. Activer **Afficher dans la barre latérale** (recommandé)
5. Cliquer sur **Ouvrir l'interface web**

#### 3. Activer Pro (optionnel)

1. Ouvrir l'application et aller dans **Paramètres**
2. Saisir votre clé de licence
3. Cliquer sur **Activer** -- toutes les fonctions Pro sont immédiatement disponibles

### Démarrage rapide

1. **Ajouter le premier appareil** -- Appuyer sur **+**
2. **Choisir un type** -- Parmi 22 catégories (Routeur, Caméra, Thermostat, etc.)
3. **Remplir les informations** -- Nom, modèle, fabricant, numéro de série
4. **Définir l'emplacement** -- Choisir un étage et une zone depuis Home Assistant
5. **Ajouter les détails réseau** -- Adresse IP, adresse MAC, intégration, type réseau
6. **Enregistrer la garantie** -- Date d'achat et date d'expiration
7. **Prendre une photo** (Pro) -- Utiliser le bouton caméra avec aperçu en direct
8. **Scanner un code-barres** (Pro) -- Capturer les numéros de série instantanément

#### Import depuis Home Assistant (Pro)

Au lieu de saisir les appareils manuellement, utiliser la fonction **Import HA** :

1. Aller dans **Paramètres** > **Import depuis Home Assistant**
2. Cliquer sur **Démarrer l'import**
3. L'application importe tout votre registre d'appareils HA -- fabricants, modèles et intégrations sont mappés automatiquement
4. Enrichir les appareils importés avec numéros de série, photos et dates de garantie

L'import peut être exécuté plusieurs fois -- les doublons sont détectés et ignorés automatiquement.

### Licence Pro

**9,99 EUR** -- achat unique, sans abonnement.

| | Gratuit | Pro |
|--|:----:|:---:|
| Prix | Gratuit | 9,99 EUR (unique) |
| Limite d'appareils | 50 | Illimité |
| Langues | EN | DE, EN, ES, FR, RU |
| Import HA | -- | Oui |
| Export Excel & PDF | -- | Oui |
| Caméra & Scanner QR | -- | Oui |
| Galerie photo | -- | Oui |
| Édition en masse | -- | Oui |
| MQTT Discovery | -- | Oui |

**[Acheter la licence Pro](https://derregner.lemonsqueezy.com/checkout/buy/43a72d0b-6948-4ade-909b-6ec216678904)** -- Livraison instantanée par e-mail. Activable sur 3 installations maximum.

### Types d'appareils pris en charge

L'application comprend 22 catégories prédéfinies avec des icônes dédiées :

| | | | |
|--|--|--|--|
| Routeur | Répéteur | Adaptateur CPL | Répéteur DECT |
| Prise intelligente | Interrupteur | Ampoule | Volet / Store |
| Thermostat | Contrôleur / Passerelle | Caméra | Sonnette |
| Carillon | Assistant vocal | Lecteur multimédia | Tablette |
| Enceinte | Robot tondeuse | Imprimante | Capteur |
| Smartphone | Autre | | |

Chaque appareil peut également suivre :
- **Type réseau :** Wi-Fi, LAN, Zigbee, Bluetooth, DECT, CPL, HomeMatic RF, USB
- **Alimentation :** Adaptateur, Secteur (230V), Pile, Batterie, USB, PoE, Solaire, Haute tension
- **Intégration :** Fritz, Zigbee2MQTT, Tuya, LocalTuya, Bosch SHC, HomeMatic IP, Ring, Blink, Alexa, TP-Link, Tasmota, MQTT et plus

### Prérequis techniques

- **Home Assistant** 2024.1 ou version ultérieure
- **Architecture :** amd64
- **Navigateur :** Tout navigateur moderne (Chrome, Firefox, Safari, Edge)
- **Stockage :** ~50 Mo pour le module + photos des appareils
- **HTTPS requis** pour la caméra et le scanner QR (automatique avec Nabu Casa ; en local : certificat SSL ou `localhost`)

---

<a name="español"></a>

## 🇪🇸 Español

### ¿Por qué Geräteverwaltung?

La mayoría de los usuarios de hogares inteligentes tienen docenas o incluso cientos de dispositivos repartidos por su casa. Routers, sensores, enchufes inteligentes, cámaras, termostatos, pasarelas -- y la lista sigue creciendo. ¿Pero dónde anotas los números de serie? ¿Las fechas de garantía? ¿Qué dirección IP pertenece a qué dispositivo? ¿Qué firmware tiene el sensor Zigbee del sótano?

**Geräteverwaltung lo soluciona.** Un inventario único y buscable de todos tus dispositivos -- directamente dentro de Home Assistant.

#### Casos de uso

- **Documentación para seguros** -- Inventario completo con números de serie, fechas de compra y fotos. Si ocurre lo peor, todo está documentado.
- **Seguimiento de garantías** -- Registra fechas de compra y vencimiento de garantía. Nunca pierdas una reclamación.
- **Vista de mantenimiento** -- Versiones de firmware, direcciones IP, MAC, tipos de red e integraciones de un vistazo. Sin más búsquedas en páginas de administración del router.
- **Gestión de alquileres** -- Documenta los equipos de propiedades de alquiler por separado. Sabe exactamente qué pertenece a dónde en entradas y salidas de inquilinos.
- **Documentación fiscal** -- Registra equipos de negocio con fechas de compra y costes para la declaración de impuestos.
- **Configuración rápida con importación HA** -- Importa todo tu registro de dispositivos de Home Assistant con un clic. Tipos, fabricantes y modelos se detectan automáticamente.
- **Acceso multidispositivo** -- Consulta y edita tu inventario desde el móvil, tableta o escritorio. Los cambios se sincronizan en 30 segundos.
- **Sin conexión** -- Funciona sin internet. Añade dispositivos en cualquier lugar y se sincronizan automáticamente al reconectarse.

### Características

| Característica | Gratis | Pro |
|---------|:----:|:---:|
| Inventario (CRUD) | 50 dispositivos | **Ilimitado** |
| PWA sin conexión | Sí | Sí |
| Add-on HA con barra lateral | Sí | Sí |
| Zonas y plantas | Sí | Sí |
| Panel con gráficos | Sí | Sí |
| Modo oscuro | Sí | Sí |
| Exportación JSON | Sí | Sí |
| 22 categorías de dispositivos | Sí | Sí |
| Seguimiento de red y fuente de alimentación | Sí | Sí |
| Idiomas | Inglés | **DE, EN, ES, FR, RU** |
| Importación HA con un clic | -- | **Sí** |
| Detección automática de tipo | -- | **Sí** |
| Detección de duplicados | -- | **Sí** |
| Exportación Excel | -- | **Sí** |
| Exportación PDF (seguros) | -- | **Sí** |
| Captura de foto con vista previa en vivo | -- | **Sí** |
| Escáner QR / código de barras | -- | **Sí** |
| Galería de fotos por dispositivo | -- | **Sí** |
| Edición masiva (tipo, integración, eliminar) | -- | **Sí** |
| MQTT Discovery (publicar como entidades HA) | -- | **Sí** |

### Instalación

#### 1. Añadir el repositorio

1. Abrir Home Assistant
2. Ir a **Ajustes** > **Complementos** > **Tienda de complementos**
3. Menú de tres puntos (arriba a la derecha) > **Repositorios**
4. Añadir esta URL:
   ```
   https://github.com/DerRegner-DE/ha-device-inventory
   ```
5. Clicar **Añadir** y cerrar

#### 2. Instalar el complemento

1. Buscar **Geraeteverwaltung** en la tienda (actualizar si es necesario)
2. Clicar **Instalar**
3. Iniciar el complemento
4. Activar **Mostrar en la barra lateral** (recomendado)
5. Clicar **Abrir interfaz web**

#### 3. Activar Pro (opcional)

1. Abrir la app e ir a **Ajustes**
2. Introducir tu clave de licencia
3. Clicar **Activar** -- todas las funciones Pro se desbloquean inmediatamente

### Inicio rápido

1. **Añadir el primer dispositivo** -- Pulsar **+**
2. **Elegir tipo** -- Entre 22 categorías (Router, Cámara, Termostato, etc.)
3. **Rellenar datos básicos** -- Nombre, modelo, fabricante, número de serie
4. **Establecer ubicación** -- Seleccionar planta y zona desde Home Assistant
5. **Añadir datos de red** -- Dirección IP, MAC, integración, tipo de red
6. **Registrar garantía** -- Fecha de compra y vencimiento
7. **Tomar foto** (Pro) -- Usar el botón de cámara con vista previa en vivo
8. **Escanear código de barras** (Pro) -- Capturar números de serie al instante

#### Importar desde Home Assistant (Pro)

En lugar de introducir dispositivos manualmente, usar la función **Importar de HA**:

1. Ir a **Ajustes** > **Importar desde Home Assistant**
2. Clicar **Iniciar importación**
3. La app importa todo tu registro de dispositivos HA -- fabricantes, modelos e integraciones se mapean automáticamente
4. Enriquecer los dispositivos importados con números de serie, fotos y fechas de garantía

La importación se puede ejecutar varias veces -- los duplicados se detectan y omiten automáticamente.

### Licencia Pro

**9,99 EUR** -- pago único, sin suscripción.

| | Gratis | Pro |
|--|:----:|:---:|
| Precio | Gratis | 9,99 EUR (único) |
| Límite de dispositivos | 50 | Ilimitado |
| Idiomas | EN | DE, EN, ES, FR, RU |
| Importación HA | -- | Sí |
| Exportación Excel & PDF | -- | Sí |
| Cámara & Escáner QR | -- | Sí |
| Galería de fotos | -- | Sí |
| Edición masiva | -- | Sí |
| MQTT Discovery | -- | Sí |

**[Comprar licencia Pro](https://derregner.lemonsqueezy.com/checkout/buy/43a72d0b-6948-4ade-909b-6ec216678904)** -- Entrega instantánea por correo electrónico. Activable en hasta 3 instalaciones.

### Tipos de dispositivos

La app incluye 22 categorías predefinidas con iconos dedicados:

| | | | |
|--|--|--|--|
| Router | Repetidor | Adaptador PLC | Repetidor DECT |
| Enchufe inteligente | Interruptor | Bombilla | Persiana / Toldo |
| Termostato | Controlador / Pasarela | Cámara | Timbre |
| Campanilla | Asistente de voz | Dispositivo de streaming | Tableta |
| Altavoz | Robot cortacésped | Impresora | Sensor |
| Smartphone | Otro | | |

Cada dispositivo también puede registrar:
- **Tipo de red:** Wi-Fi, LAN, Zigbee, Bluetooth, DECT, PLC, HomeMatic RF, USB
- **Fuente de alimentación:** Adaptador, Red (230V), Pila, Batería, USB, PoE, Solar, Alta tensión
- **Integración:** Fritz, Zigbee2MQTT, Tuya, LocalTuya, Bosch SHC, HomeMatic IP, Ring, Blink, Alexa, TP-Link, Tasmota, MQTT y más

### Requisitos técnicos

- **Home Assistant** 2024.1 o posterior
- **Arquitectura:** amd64
- **Navegador:** Cualquier navegador moderno (Chrome, Firefox, Safari, Edge)
- **Almacenamiento:** ~50 MB para el complemento + fotos de dispositivos
- **HTTPS requerido** para cámara y escáner QR (automático con Nabu Casa; en local: certificado SSL o `localhost`)

---

<a name="русский"></a>

## 🇷🇺 Русский

### Зачем нужен Geräteverwaltung?

У большинства пользователей умного дома десятки или сотни устройств по всему дому. Роутеры, датчики, умные розетки, камеры, термостаты, шлюзы -- и список постоянно растёт. Но где хранить серийные номера? Даты гарантии? Какой IP-адрес у какого устройства? Какая прошивка стоит на Zigbee-датчике в подвале?

**Geräteverwaltung решает эту задачу.** Единый, удобный для поиска инвентарный список всех устройств -- прямо внутри Home Assistant.

#### Варианты использования

- **Документация для страховки** -- Полный инвентарь с серийными номерами, датами покупки и фотографиями. При страховом случае всё задокументировано.
- **Отслеживание гарантии** -- Записывайте даты покупки и истечения гарантии. Больше никаких пропущенных гарантийных обращений.
- **Обзор обслуживания** -- Версии прошивок, IP-адреса, MAC-адреса, типы сетей и интеграции -- всё с первого взгляда. Больше не нужно искать в настройках роутера.
- **Управление арендой** -- Документируйте оборудование арендуемого жилья отдельно от своего дома. Всегда знайте, что где находится при заселении и выселении жильцов.
- **Налоговая документация** -- Учёт рабочего оборудования с датами покупки и стоимостью для налоговой декларации.
- **Быстрая настройка через импорт HA** -- Импортируйте весь реестр устройств Home Assistant одним нажатием. Типы, производители и модели определяются автоматически.
- **Доступ с нескольких устройств** -- Просматривайте и редактируйте инвентарь с телефона, планшета или ПК. Изменения синхронизируются в течение 30 секунд.
- **Работа офлайн** -- Работает без интернета. Добавляйте устройства где угодно, синхронизация произойдёт автоматически при восстановлении соединения.

### Возможности

| Функция | Бесплатно | Pro |
|---------|:----:|:---:|
| Инвентаризация (CRUD) | 50 устройств | **Без ограничений** |
| PWA офлайн | Да | Да |
| Add-on HA с боковой панелью | Да | Да |
| Зоны и этажи | Да | Да |
| Панель управления с графиками | Да | Да |
| Тёмная тема | Да | Да |
| Экспорт JSON | Да | Да |
| 22 категории устройств | Да | Да |
| Отслеживание сети и питания | Да | Да |
| Языки | Английский | **DE, EN, ES, FR, RU** |
| Импорт HA одним кликом | -- | **Да** |
| Автоопределение типа | -- | **Да** |
| Определение дублей | -- | **Да** |
| Экспорт Excel | -- | **Да** |
| Экспорт PDF (страхование) | -- | **Да** |
| Съёмка фото с предпросмотром | -- | **Да** |
| Сканер QR / штрихкода | -- | **Да** |
| Фотогалерея на устройство | -- | **Да** |
| Массовое редактирование (тип, интеграция, удаление) | -- | **Да** |
| MQTT Discovery (публикация как сущности HA) | -- | **Да** |

### Установка

#### 1. Добавить репозиторий

1. Открыть Home Assistant
2. Перейти в **Настройки** > **Дополнения** > **Магазин дополнений**
3. Меню с тремя точками (вверху справа) > **Репозитории**
4. Добавить этот URL:
   ```
   https://github.com/DerRegner-DE/ha-device-inventory
   ```
5. Нажать **Добавить** и закрыть

#### 2. Установить дополнение

1. Найти **Geraeteverwaltung** в магазине (обновите страницу при необходимости)
2. Нажать **Установить**
3. Запустить дополнение
4. Включить **Показывать в боковой панели** (рекомендуется)
5. Нажать **Открыть веб-интерфейс**

#### 3. Активировать Pro (по желанию)

1. Открыть приложение и перейти в **Настройки**
2. Ввести лицензионный ключ
3. Нажать **Активировать** -- все Pro-функции разблокируются мгновенно

### Быстрый старт

1. **Добавить первое устройство** -- Нажать **+**
2. **Выбрать тип** -- Из 22 категорий (Роутер, Камера, Термостат и др.)
3. **Заполнить основные данные** -- Название, модель, производитель, серийный номер
4. **Указать расположение** -- Выбрать этаж и зону из Home Assistant
5. **Добавить сетевые данные** -- IP-адрес, MAC-адрес, интеграция, тип сети
6. **Записать гарантию** -- Дата покупки и истечения гарантии
7. **Сделать фото** (Pro) -- Использовать кнопку камеры с предпросмотром
8. **Сканировать штрихкод** (Pro) -- Мгновенный захват серийных номеров

#### Импорт из Home Assistant (Pro)

Вместо ручного ввода устройств использовать функцию **Импорт из HA**:

1. Перейти в **Настройки** > **Импорт из Home Assistant**
2. Нажать **Начать импорт**
3. Приложение импортирует весь реестр устройств HA -- производители, модели и интеграции сопоставляются автоматически
4. Дополнить импортированные устройства серийными номерами, фотографиями и датами гарантии

Импорт можно запускать несколько раз -- дубли определяются и пропускаются автоматически.

### Лицензия Pro

**9,99 EUR** -- единоразовая оплата, без подписки.

| | Бесплатно | Pro |
|--|:----:|:---:|
| Цена | Бесплатно | 9,99 EUR (единоразово) |
| Лимит устройств | 50 | Без ограничений |
| Языки | EN | DE, EN, ES, FR, RU |
| Импорт HA | -- | Да |
| Экспорт Excel и PDF | -- | Да |
| Камера и сканер QR | -- | Да |
| Фотогалерея | -- | Да |
| Массовое редактирование | -- | Да |
| MQTT Discovery | -- | Да |

**[Купить лицензию Pro](https://derregner.lemonsqueezy.com/checkout/buy/43a72d0b-6948-4ade-909b-6ec216678904)** -- Мгновенная доставка на e-mail. Активация на 3 установки.

### Поддерживаемые типы устройств

Приложение включает 22 предустановленные категории с собственными иконками:

| | | | |
|--|--|--|--|
| Роутер | Репитер | Адаптер Powerline | Репитер DECT |
| Умная розетка | Выключатель | Лампочка | Рольставни / Жалюзи |
| Термостат | Контроллер / Шлюз | Камера | Дверной звонок |
| Звонок | Голосовой ассистент | Стриминговое устройство | Планшет |
| Колонка | Робот-газонокосилка | Принтер | Датчик |
| Смартфон | Прочее | | |

Каждое устройство может дополнительно отслеживать:
- **Тип сети:** Wi-Fi, LAN, Zigbee, Bluetooth, DECT, Powerline, HomeMatic RF, USB
- **Источник питания:** Адаптер, Сеть (230В), Батарея, Аккумулятор, USB, PoE, Солнечная энергия, Высокое напряжение
- **Интеграция:** Fritz, Zigbee2MQTT, Tuya, LocalTuya, Bosch SHC, HomeMatic IP, Ring, Blink, Alexa, TP-Link, Tasmota, MQTT и другие

### Технические требования

- **Home Assistant** 2024.1 или новее
- **Архитектура:** amd64
- **Браузер:** Любой современный браузер (Chrome, Firefox, Safari, Edge)
- **Хранилище:** ~50 МБ для дополнения + фотографии устройств
- **Требуется HTTPS** для камеры и сканера QR (автоматически с Nabu Casa; локально: SSL-сертификат или `localhost`)

---

## Screenshots

| Dashboard | Geräteliste | Einstellungen |
|:---------:|:------------:|:--------------:|
| ![Dashboard](docs/screenshots/de_dashboard.png) | ![Geräte](docs/screenshots/de_geraete.png) | ![Settings](docs/screenshots/de_einstellungen.png) |

| Neues Gerät | Formular ausgefüllt | Kamera |
|:---------:|:----------:|:------------:|
| ![Form](docs/screenshots/de_formular.png) | ![Filled](docs/screenshots/de_formular_ausgefuellt.png) | ![Camera](docs/screenshots/de_kamera.png) |

---

## Architecture

```
geraeteverwaltung/
  frontend/           Preact + TypeScript + Tailwind CSS 4 (PWA)
  backend/            FastAPI + SQLite + openpyxl + fpdf2
  addon/              Home Assistant Add-on (Docker: nginx + uvicorn)
```

- **Frontend:** Preact, Dexie.js (IndexedDB), Tailwind CSS 4, html5-qrcode
- **Backend:** FastAPI, SQLite, openpyxl (Excel), fpdf2 (PDF), aiohttp, aiomqtt
- **Add-on:** Docker multi-stage build (Node.js build + Python runtime + nginx)
- **Sync:** Offline-first with queue-based sync to backend

---

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server on :5173
npm run build        # Production build to dist/
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 3002
```

### Docker (full stack)

```bash
docker build -f addon/Dockerfile -t geraeteverwaltung .
docker run -p 3001:3001 geraeteverwaltung
```

---

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and test locally with the Docker build
4. Submit a pull request

Please open an issue first for larger changes to discuss the approach.

---

## License & Legal

- **Source code:** Source-available. See [LICENSE](LICENSE) for details.
- **Pro features:** Require a commercial license key (EUR 9.99 one-time).
- **Free tier:** Fully functional for up to 50 devices in English.

**Geraeteverwaltung** is not affiliated with or endorsed by Home Assistant or Nabu Casa.

---

## Links

- [Home Assistant](https://www.home-assistant.io/)
- [Report Issues](https://github.com/DerRegner-DE/ha-device-inventory/issues)
- [Buy Pro License](https://derregner.lemonsqueezy.com/checkout/buy/43a72d0b-6948-4ade-909b-6ec216678904)

---

<p align="center">
  Made with care by <a href="https://github.com/DerRegner-DE">DerRegner-DE</a>
</p>
