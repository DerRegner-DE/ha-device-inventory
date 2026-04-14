# ==============================================================================
# Runtime image
# ==============================================================================
# NOTE: Frontend is expected to be pre-built into frontend/dist/ before
# `docker build` is invoked (CI does this once on a native amd64 runner and
# shares the artifact across all architectures — avoids slow emulated builds
# under QEMU). Locally: run `cd frontend && npm ci && npm run build` first.
FROM python:3.12-slim

# Install nginx and runtime dependencies
# Using Debian slim (not Alpine) because musllinux_armv7 lacks prebuilt
# wheels for Rust-based packages like pydantic-core, which would otherwise
# force slow source compilation under QEMU.
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx \
        jq \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create app directory structure
RUN mkdir -p /app/frontend /app/backend /data/db /data/photos

# Install Python dependencies
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt

# Copy pre-built frontend (built natively in CI or locally before docker build)
COPY frontend/dist/ /app/frontend/

# Copy backend
COPY backend/ /app/backend/

# Copy nginx config (Debian path). Remove Debian's default site to avoid
# conflict with our server block listening on 3001.
COPY addon/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default \
    && rm -f /etc/nginx/sites-available/default

# Copy run script
COPY addon/run.sh /app/run.sh
RUN chmod +x /app/run.sh

WORKDIR /app

# Expose ingress port
EXPOSE 3001

CMD ["/app/run.sh"]
