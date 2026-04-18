/**
 * Navigation utility for HA Ingress compatibility.
 *
 * HA Ingress serves add-ons behind a path prefix like:
 *   /api/hassio_ingress/<token>/    (local HA access)
 *   /hassio/ingress/<slug>/         (Nabu Casa cloud access)
 *   /app/<addon_slug>/              (alternate Nabu Casa path)
 *   /<addon_slug>/                  (direct addon slug path)
 *
 * This module detects the prefix once at startup so that
 * all navigate() calls and API URLs include it automatically.
 */

let basePath = "";
let apiBasePath = "";
let onPanelPath = false;

/** Call once before first render to detect the Ingress base path. */
export function initBasePath(): void {
  const path = window.location.pathname;
  const m =
    path.match(/^(\/api\/hassio_ingress\/[^/]+)/) ||
    path.match(/^(\/hassio\/ingress\/[^/]+)/) ||
    path.match(/^(\/app\/[0-9a-f]{8}_[^/]+)/) ||
    path.match(/^(\/[0-9a-f]{8}_[^/]+)/);
  if (m) basePath = m[1];

  // For API calls we MUST use the Ingress path, not the panel path.
  // Panel paths (/app/<slug> and /<slug>) only support GET, not POST/PUT/DELETE.
  // The Ingress path is embedded in the page by HA as a data attribute.
  const ingressMatch = path.match(/^(\/api\/hassio_ingress\/[^/]+)/) ||
                       path.match(/^(\/hassio\/ingress\/[^/]+)/);
  if (ingressMatch) {
    apiBasePath = ingressMatch[1];
  } else {
    // We're on a panel path - POST/PUT/DELETE return 405 here, so we
    // surface a banner that tells the user how to reach the Ingress path.
    apiBasePath = basePath;
    onPanelPath = basePath !== "" && !ingressMatch;
  }
}

/**
 * True when the page is being served via a HA Panel path (not Ingress).
 * Panel paths only allow GET, so writes (devices, photos, settings) will fail
 * with 405. Callers use this to render a banner pointing users at the
 * Ingress URL (usually "Settings → Add-ons → Geräteverwaltung → Open Web UI").
 */
export function isOnPanelPath(): boolean {
  return onPanelPath;
}

/** Return the detected Ingress base path (empty string when running standalone). */
export function getBasePath(): string {
  return basePath;
}

/** Navigate to an app-relative path (e.g. "/devices"). Prepends the base path. */
export function navigate(appPath: string): void {
  history.pushState(null, "", basePath + appPath);
}

/** Strip the Ingress base path from a full URL to get the app-relative path. */
export function stripBasePath(url: string): string {
  if (basePath && url.startsWith(basePath)) {
    return url.slice(basePath.length) || "/";
  }
  return url;
}

/** Build the API base URL for fetch calls. */
export function getApiBase(): string {
  return basePath ? basePath + "/api" : "/api";
}
