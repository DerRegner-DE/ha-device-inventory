# ==============================================================================
# Stage 1: Build frontend with Node.js
# ==============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Copy package files first for better layer caching
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Python runtime with nginx
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

# Copy built frontend from stage 1
COPY --from=frontend-builder /build/frontend/dist/ /app/frontend/

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
