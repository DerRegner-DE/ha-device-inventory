/**
 * Navigation utility for HA Ingress compatibility.
 *
 * HA Ingress serves add-ons behind a path prefix like:
 *   /api/hassio_ingress/<token>/    (local HA access)
 *   /hassio/ingress/<slug>/         (Nabu Casa cloud access)
 *   /app/<addon_slug>/              (alternate Nabu Casa path)
 *   /<addon_slug>/                  (direct addon slug path)
 *
 * preact-router matches against window.location.pathname, which includes
 * the prefix.  This module detects the prefix once at startup so that
 * the Router paths and all navigate() calls include it automatically.
 */

import { route as preactRoute } from "preact-router";

let basePath = "";

/** Call once before first render to detect the Ingress base path. */
export function initBasePath(): void {
  const path = window.location.pathname;
  const m =
    path.match(/^(\/api\/hassio_ingress\/[^/]+)/) ||
    path.match(/^(\/hassio\/ingress\/[^/]+)/) ||
    path.match(/^(\/app\/[0-9a-f]{8}_[^/]+)/) ||
    path.match(/^(\/[0-9a-f]{8}_[^/]+)/);
  if (m) basePath = m[1];
  // Debug: expose basePath for troubleshooting
  (window as any).__gvBasePath = basePath;
  (window as any).__gvPathname = path;
  console.log("[GV] initBasePath:", { path, basePath, matched: !!m });
}

/** Return the detected Ingress base path (empty string when running standalone). */
export function getBasePath(): string {
  return basePath;
}

/** Navigate to an app-relative path (e.g. "/devices"). Prepends the base path. */
export function navigate(appPath: string): void {
  preactRoute(basePath + appPath);
}

/** Strip the Ingress base path from a full URL to get the app-relative path. */
export function stripBasePath(url: string): string {
  if (basePath && url.startsWith(basePath)) {
    return url.slice(basePath.length) || "/";
  }
  return url;
}

/** Build a full router path by prepending the base path. */
export function routePath(appPath: string): string {
  return basePath + appPath;
}

/** Build the API base URL for fetch calls. */
export function getApiBase(): string {
  return basePath ? basePath + "/api" : "/api";
}
