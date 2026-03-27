#!/usr/bin/env bash
set -e

echo "=== Geraeteverwaltung Add-on starting ==="

# ---------------------------------------------------------------------------
# 1. Read add-on options from /data/options.json
# ---------------------------------------------------------------------------
OPTIONS_FILE="/data/options.json"
if [ -f "$OPTIONS_FILE" ]; then
    LANGUAGE=$(jq -r '.language // "de"' "$OPTIONS_FILE")
    LICENSE_KEY=$(jq -r '.license_key // ""' "$OPTIONS_FILE")
    echo "Language from options: $LANGUAGE"
else
    LANGUAGE="de"
    LICENSE_KEY=""
    echo "No options.json found, using defaults"
fi

# Write license key to license.json if provided in options
if [ -n "$LICENSE_KEY" ]; then
    mkdir -p /data/db
    echo "{\"key\":\"$LICENSE_KEY\"}" > /data/db/license.json
    echo "License key loaded from add-on configuration"
fi

# ---------------------------------------------------------------------------
# 2. Set environment variables for the backend
# ---------------------------------------------------------------------------
# HA Supervisor provides SUPERVISOR_TOKEN automatically
export GV_HA_TOKEN="${SUPERVISOR_TOKEN:-}"
export GV_HA_URL="http://supervisor/core"
export GV_DB_PATH="/data/db/geraeteverwaltung.db"
export GV_PHOTOS_DIR="/data/photos"
export GV_LANGUAGE="$LANGUAGE"
# MQTT credentials from Supervisor (set via services: mqtt:need_credentials in config.yaml)
# Supervisor provides: MQTT_HOST, MQTT_PORT, MQTT_USERNAME, MQTT_PASSWORD, MQTT_SSL
export GV_MQTT_HOST="${MQTT_HOST:-${GV_MQTT_HOST:-core-mosquitto}}"
export GV_MQTT_PORT="${MQTT_PORT:-${GV_MQTT_PORT:-1883}}"
export GV_MQTT_USER="${MQTT_USERNAME:-${GV_MQTT_USER:-}}"
export GV_MQTT_PASSWORD="${MQTT_PASSWORD:-${GV_MQTT_PASSWORD:-}}"
echo "MQTT Host: $GV_MQTT_HOST:$GV_MQTT_PORT (user: ${GV_MQTT_USER:-anonymous})"

echo "HA URL: $GV_HA_URL"
echo "HA Token configured: $([ -n "$GV_HA_TOKEN" ] && echo 'yes' || echo 'no')"
echo "DB Path: $GV_DB_PATH"
echo "Photos Dir: $GV_PHOTOS_DIR"

# ---------------------------------------------------------------------------
# 3. Create data directories
# ---------------------------------------------------------------------------
mkdir -p /data/db /data/photos

# ---------------------------------------------------------------------------
# 4. Start uvicorn (FastAPI backend) in background
# ---------------------------------------------------------------------------
echo "Starting uvicorn on port 3002..."
cd /app/backend
python -m uvicorn app.main:app \
    --host 127.0.0.1 \
    --port 3002 \
    --log-level info &
UVICORN_PID=$!
echo "Uvicorn PID: $UVICORN_PID"

# Wait briefly for uvicorn to start
sleep 2

# Check if uvicorn is still running
if ! kill -0 $UVICORN_PID 2>/dev/null; then
    echo "ERROR: Uvicorn failed to start!"
    exit 1
fi

# ---------------------------------------------------------------------------
# 5. Start nginx in foreground
# ---------------------------------------------------------------------------
echo "Starting nginx on port 3001..."
exec nginx -g "daemon off;"
