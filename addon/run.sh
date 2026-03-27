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
    MQTT_HOST_OPT=$(jq -r '.mqtt_host // "core-mosquitto"' "$OPTIONS_FILE")
    MQTT_PORT_OPT=$(jq -r '.mqtt_port // 1883' "$OPTIONS_FILE")
    MQTT_USER_OPT=$(jq -r '.mqtt_user // ""' "$OPTIONS_FILE")
    MQTT_PASS_OPT=$(jq -r '.mqtt_password // ""' "$OPTIONS_FILE")
    echo "Language from options: $LANGUAGE"
else
    LANGUAGE="de"
    LICENSE_KEY=""
    MQTT_HOST_OPT="core-mosquitto"
    MQTT_PORT_OPT="1883"
    MQTT_USER_OPT=""
    MQTT_PASS_OPT=""
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
export GV_MQTT_HOST="${MQTT_HOST_OPT:-core-mosquitto}"
export GV_MQTT_PORT="${MQTT_PORT_OPT:-1883}"
export GV_MQTT_USER="${MQTT_USER_OPT:-}"
export GV_MQTT_PASSWORD="${MQTT_PASS_OPT:-}"
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
