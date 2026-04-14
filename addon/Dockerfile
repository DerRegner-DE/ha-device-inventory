# ==============================================================================
# Runtime image
# ==============================================================================
# NOTE: Frontend is expected to be pre-built into frontend/dist/ before
# `docker build` is invoked (CI does this once on a native amd64 runner and
# shares the artifact across all architectures — avoids slow emulated builds
# under QEMU). Locally: run `cd frontend && npm ci && npm run build` first.
FROM python:3.12-alpine

# Install nginx and runtime dependencies
RUN apk add --no-cache \
    nginx \
    bash \
    jq \
    curl \
    && rm -rf /var/cache/apk/*

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

# Copy nginx config
COPY addon/nginx.conf /etc/nginx/http.d/default.conf

# Remove default nginx config that may conflict
RUN rm -f /etc/nginx/http.d/default.conf.bak \
    && rm -f /etc/nginx/conf.d/default.conf

# Copy run script
COPY addon/run.sh /app/run.sh
RUN chmod +x /app/run.sh

WORKDIR /app

# Expose ingress port
EXPOSE 3001

CMD ["/app/run.sh"]
