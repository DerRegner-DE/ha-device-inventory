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
        libjpeg62-turbo \
        zlib1g \
    && rm -rf /var/lib/apt/lists/*

# Create app directory structure
RUN mkdir -p /app/frontend /app/backend /data/db /data/photos

# Install Python dependencies.
# Some C-extension packages (aiohttp, Pillow) lack prebuilt armv7l+cp312
# wheels, so we install build tooling, compile, then purge it to keep the
# image small. On amd64/aarch64 wheels exist and the compile path is skipped.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libffi-dev \
        libjpeg-dev \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt /tmp/requirements.txt
# piwheels provides prebuilt wheels for armv7/aarch64 (Raspberry Pi), which
# lets us skip QEMU-emulated compilation of aiohttp/Pillow on those archs.
# If a wheel is missing, pip transparently falls back to the regular PyPI
# source compile path using the build tools installed above.
RUN pip install --no-cache-dir \
        --extra-index-url https://www.piwheels.org/simple \
        -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt
RUN apt-get purge -y --auto-remove \
        build-essential \
        libffi-dev \
        libjpeg-dev \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built frontend (built natively in CI or locally before docker build)
COPY frontend/dist/ /app/frontend/

# Copy backend
COPY backend/ /app/backend/

# Add-on config is copied in as a runtime fallback for version detection
# (the primary source is the ADDON_VERSION build arg below).
COPY addon/config.yaml /app/addon_config.yaml

# Version baked in at build time from the release tag.
ARG ADDON_VERSION=dev
ENV ADDON_VERSION=${ADDON_VERSION}

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
