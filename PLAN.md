# Plan: Geräteverwaltung v1.3.6 - Sauberer Release

## Gefundene Probleme (durch Code-Analyse)

### KRITISCH
1. **7 fehlende Kamera-Übersetzungen** - CameraCapture.tsx nutzt `t("camera.title")`, `t("camera.takePhoto")` etc., aber diese Keys fehlen in ALLEN 5 Sprachdateien. Die Kamera-UI zeigt aktuell nur die Key-Namen statt Text.
2. **`.dockerignore` schließt `*.md` aus** - CHANGELOG.md wird nicht ins Docker-Image kopiert (relevant falls HA es aus dem Image liest)

### HOCH
3. **Versionen nicht synchron** - addon/config.yaml: 1.3.5, aber frontend/package.json und backend/app/main.py: 1.3.1. Health-Endpoint meldet falsche Version.

### MITTEL
4. **CHANGELOG.md** - Existiert bereits (wurde vorhin erstellt), muss aber korrekt sein und mit ins Image

---

## Umsetzungsschritte

### Schritt 1: Fehlende i18n-Keys in alle 5 Sprachen einfügen

Folgende 7 Keys in jede Sprachdatei:

| Key | DE | EN | ES | FR | RU |
|-----|----|----|----|----|-----|
| camera.title | Kamera | Camera | Cámara | Caméra | Камера |
| camera.takePhoto | Foto aufnehmen | Take Photo | Tomar foto | Prendre une photo | Сделать фото |
| camera.useWebcam | Webcam verwenden | Use Webcam | Usar webcam | Utiliser la webcam | Использовать веб-камеру |
| camera.fileInputHint | Öffnet die Kamera-App auf dem Handy oder die Dateiauswahl auf dem PC | Opens your camera app on mobile, or file picker on desktop | Abre la cámara en el móvil o el selector de archivos en el PC | Ouvre l'appareil photo sur mobile ou le sélecteur de fichiers sur PC | Открывает камеру на телефоне или выбор файлов на ПК |
| camera.preview | Vorschau | Preview | Vista previa | Aperçu | Предпросмотр |
| camera.retake | Erneut aufnehmen | Retake | Repetir | Reprendre | Переснять |
| camera.confirm | Foto verwenden | Use Photo | Usar foto | Utiliser la photo | Использовать фото |

**Dateien:** `frontend/src/i18n/de.json`, `en.json`, `es.json`, `fr.json`, `ru.json`

### Schritt 2: `.dockerignore` korrigieren

`*.md` durch spezifische Ausschlüsse ersetzen:
```
README.md
PLAN.md
```
So bleibt `CHANGELOG.md` im Build-Kontext.

### Schritt 3: Versionen synchronisieren auf 1.3.6

| Datei | Feld | Alt | Neu |
|-------|------|-----|-----|
| addon/config.yaml | version | "1.3.5" | "1.3.6" |
| frontend/package.json | version | "1.3.1" | "1.3.6" |
| backend/app/main.py | version (FastAPI) | "1.3.1" | "1.3.6" |
| backend/app/main.py | health version | "1.3.1" | "1.3.6" |

### Schritt 4: CHANGELOG.md aktualisieren

Neuen Eintrag für v1.3.6 ergänzen:
```markdown
## 1.3.6
- Kamera-UI: Alle Texte in 5 Sprachen übersetzt (DE, EN, ES, FR, RU)
- Versionen über alle Komponenten synchronisiert
- Changelog wird jetzt im Add-on angezeigt
```

### Schritt 5: Lokal prüfen (KEIN Push ohne Prüfung)

1. `cd frontend && npm run build` - TypeScript + Vite Build muss fehlerfrei durchlaufen
2. Prüfen ob i18n-Keys korrekt geladen werden (JSON-Syntax)
3. Docker Build testen falls Docker lokal verfügbar

### Schritt 6: Commit, Tag, Push

Erst wenn Schritt 5 fehlerfrei:
```bash
git add -A
git commit -m "v1.3.6: Kamera-Übersetzungen, Versionen synchronisiert, Changelog"
git tag v1.3.6
git push origin main v1.3.6
```

---

## Was NICHT in diesem Release ist

- Keine Code-Änderungen an CameraCapture.tsx (funktioniert bereits)
- Keine neuen Features
- Rein: Übersetzungen, Versionssync, Changelog-Fix

## Risikobewertung

- **Gering**: Alle Änderungen sind Konfiguration/Text, kein Logik-Code
- **Testbar**: Frontend-Build zeigt TypeScript-Fehler sofort
- **Rückrollbar**: Nur Textänderungen, kein Breaking Change
