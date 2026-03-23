# Geraeteverwaltung - Smart Home Device Inventory

<!-- Logo placeholder: place your logo at docs/logo.png -->

A modern, offline-first Progressive Web App (PWA) for managing your smart home device inventory. Built as a Home Assistant Add-on with a FastAPI backend and Preact frontend.

Track every device in your home -- routers, sensors, smart plugs, cameras, thermostats and more -- with detailed specs, location mapping, photos, and direct Home Assistant integration.

<!-- Screenshots placeholder: place screenshots in docs/screenshots/ -->

---

## Features

| Feature | Free | Pro |
|---------|:----:|:---:|
| Device inventory management | Yes | Yes |
| Offline-first (works without internet) | Yes | Yes |
| Max devices | 50 | Unlimited |
| Languages | English only | DE, EN, ES, FR, RU |
| Excel export / import | - | Yes |
| Home Assistant sync | - | Yes |
| Camera capture (photos) | - | Yes |
| Barcode / QR scanner | - | Yes |
| HA Add-on with Ingress | Yes | Yes |
| JSON export | Yes | Yes |
| Area & floor mapping | Yes | Yes |

**Pro License:** 9.99 EUR one-time -- contact support@derregner.de

---

## Installation (Home Assistant Add-on)

### 1. Add the repository

1. Open Home Assistant
2. Go to **Settings** > **Add-ons** > **Add-on Store**
3. Click the three dots (top right) > **Repositories**
4. Add: `https://github.com/DerRegner-DE/ha-device-inventory`
5. Click **Add**

### 2. Install the add-on

1. Find **Geraeteverwaltung** in the add-on store
2. Click **Install**
3. Start the add-on
4. Click **Open Web UI** (or find it in the sidebar)

### 3. Activate Pro (optional)

1. Go to **Settings** in the app
2. Enter your license key
3. Click **Activate**

---

## Quick Start

1. **Add your first device** -- tap the "+" button
2. **Fill in the basics** -- type, name, model, manufacturer
3. **Set the location** -- pick an area from your HA setup
4. **Add network info** -- IP, MAC, integration, network type
5. **Take a photo** (Pro) -- use the camera button
6. **Scan a barcode** (Pro) -- capture serial numbers instantly

Devices are stored locally in your browser (IndexedDB) and synced to the backend when online.

---

## Architecture

```
geraeteverwaltung/
  frontend/          Preact + Tailwind CSS PWA
  backend/           FastAPI + SQLite
  addon/             HA Add-on (Docker: nginx + uvicorn)
  .github/workflows/ CI/CD (build, test, release)
```

- **Frontend:** Preact, Dexie (IndexedDB), Tailwind CSS 4, html5-qrcode
- **Backend:** FastAPI, SQLite, openpyxl, aiohttp
- **Add-on:** Docker multi-stage (Node build + Python runtime + nginx)
- **Supported architectures:** amd64, aarch64, armv7

---

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev        # Vite dev server on :5173
npm run build      # Production build to dist/
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 3002
```

### License Key Generation

```bash
cd backend
python -m app.license_gen generate --email user@example.com --days 365
python -m app.license_gen decode <key>
```

### Docker (full stack)

```bash
docker build -f addon/Dockerfile -t geraeteverwaltung .
docker run -p 3001:3001 geraeteverwaltung
```

---

## License

- **Core application:** MIT License (see [LICENSE](LICENSE))
- **Pro features:** Commercial license required (license key)

---

## Links

- [Home Assistant](https://www.home-assistant.io/)
- [Report Issues](https://github.com/DerRegner-DE/ha-device-inventory/issues)
- [Buy Pro License](mailto:support@derregner.de?subject=Geraeteverwaltung%20Pro%20License)
