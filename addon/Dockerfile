# ==============================================================================
# Stage 1: Build frontend
# ==============================================================================
FROM node:20-alpine AS frontend-build

WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Runtime image
# ==============================================================================
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

# Copy frontend from build stage (always fresh, never cached stale)
COPY --from=frontend-build /build/dist/ /app/frontend/

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
