/**
 * License validation for Geraeteverwaltung (Free vs Pro).
 *
 * License key format:  BASE64URL(payload_json) "." BASE64URL(hmac_hex)
 *
 * Payload: { email: string, tier: "pro", exp: number (unix seconds), features: string[] }
 *
 * Validation uses HMAC-SHA256 with a hardcoded verification key.
 * This is intentionally not cryptographically bulletproof - it prevents
 * casual key sharing / copying for a 9.99 EUR product.
 */

// ----- constants ----------------------------------------------------------------

const STORAGE_KEY = "gv_license_key";
const FREE_DEVICE_LIMIT = 50;

/** All possible Pro features */
export const PRO_FEATURES = [
  "unlimited_devices",
  "multilingual",
  "excel",
  "ha_sync",
  "camera",
  "barcode",
] as const;

export type ProFeature = (typeof PRO_FEATURES)[number];

// Verification secret - derived from product name (not a real secret,
// just enough to prevent trivial key forging).  The generation script
// uses the same value.
const VERIFY_KEY = "gv-pro-2024-DerRegner";

// ----- types -------------------------------------------------------------------

export interface LicensePayload {
  email: string;
  tier: "pro";
  exp: number; // unix timestamp (seconds)
  features: string[];
}

export interface LicenseInfo {
  valid: boolean;
  tier: "free" | "pro";
  email?: string;
  expiresAt?: Date;
  features: string[];
}

const FREE_LICENSE: LicenseInfo = {
  valid: false,
  tier: "free",
  features: [],
};

// ----- API base URL helper -----------------------------------------------------

function getApiBase(): string {
  const path = window.location.pathname;
  // HA Ingress local: /api/hassio_ingress/<token>/
  const ingressMatch = path.match(/^(\/api\/hassio_ingress\/[^/]+)/);
  if (ingressMatch) return ingressMatch[1] + "/api";
  // HA Ingress via Nabu Casa: /app/<addon_slug>/
  const appMatch = path.match(/^(\/app\/[0-9a-f]{8}_[^/]+)/);
  if (appMatch) return appMatch[1] + "/api";
  // HA Ingress via Nabu Casa alternative: /<addon_slug>/
  const slugMatch = path.match(/^(\/[0-9a-f]{8}_[^/]+)/);
  if (slugMatch) return slugMatch[1] + "/api";
  return "/api";
}

// ----- base64url helpers -------------------------------------------------------

function base64urlDecode(str: string): string {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  return atob(b64);
}

// ----- HMAC-SHA256 (Web Crypto API with backend fallback) ----------------------

async function hmacSha256(message: string, secret: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // No crypto.subtle available (HTTP context) - return empty to trigger backend fallback
  return "";
}

// ----- server-side license storage helpers ------------------------------------

async function fetchLicenseFromServer(): Promise<string> {
  try {
    const res = await fetch(`${getApiBase()}/license`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.key || "";
  } catch {
    return "";
  }
}

async function saveLicenseToServer(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/license`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    // Server save failed, localStorage still works as fallback
    return false;
  }
}

async function validateKeyViaBackend(key: string): Promise<LicenseInfo> {
  try {
    const res = await fetch(`${getApiBase()}/license/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return FREE_LICENSE;
    const data = await res.json();
    if (!data.valid) {
      return {
        valid: false,
        tier: "free",
        email: data.email,
        expiresAt: data.exp ? new Date(data.exp * 1000) : undefined,
        features: [],
      };
    }
    return {
      valid: true,
      tier: "pro",
      email: data.email,
      expiresAt: data.exp ? new Date(data.exp * 1000) : undefined,
      features: data.features ?? [...PRO_FEATURES],
    };
  } catch {
    return FREE_LICENSE;
  }
}

// ----- validation --------------------------------------------------------------

async function validateKey(key: string): Promise<LicenseInfo> {
  try {
    const dotIdx = key.indexOf(".");
    if (dotIdx === -1) return FREE_LICENSE;

    const payloadB64 = key.slice(0, dotIdx);
    const sigB64 = key.slice(dotIdx + 1);

    const payloadJson = base64urlDecode(payloadB64);
    const expectedSig = await hmacSha256(payloadJson, VERIFY_KEY);

    // If crypto.subtle is not available (HTTP), fall back to backend validation
    if (!expectedSig) {
      return validateKeyViaBackend(key);
    }

    const providedSig = base64urlDecode(sigB64);

    if (providedSig !== expectedSig) return FREE_LICENSE;

    const payload: LicensePayload = JSON.parse(payloadJson);

    if (payload.tier !== "pro") return FREE_LICENSE;
    if (typeof payload.exp !== "number") return FREE_LICENSE;

    const expiresAt = new Date(payload.exp * 1000);
    if (expiresAt.getTime() < Date.now()) {
      return {
        valid: false,
        tier: "free",
        email: payload.email,
        expiresAt,
        features: [],
      };
    }

    return {
      valid: true,
      tier: "pro",
      email: payload.email,
      expiresAt,
      features: payload.features ?? [...PRO_FEATURES],
    };
  } catch {
    return FREE_LICENSE;
  }
}

// ----- cached state ------------------------------------------------------------

let cachedLicense: LicenseInfo = FREE_LICENSE;
let cacheReady = false;

/** Initialise the cache from server (then localStorage fallback). Call once at app startup. */
export async function initLicense(): Promise<LicenseInfo> {
  let serverKey = await fetchLicenseFromServer();
  const localKey = localStorage.getItem(STORAGE_KEY) ?? "";

  if (!serverKey && localKey) {
    // localStorage has key but server doesn't - sync to server
    const saved = await saveLicenseToServer(localKey);
    if (saved) serverKey = localKey;
  } else if (serverKey && serverKey !== localKey) {
    // Server has key - sync to localStorage for offline use
    localStorage.setItem(STORAGE_KEY, serverKey);
  }

  const keyToUse = serverKey || localKey;
  if (keyToUse) {
    cachedLicense = await validateKey(keyToUse);
  } else {
    cachedLicense = FREE_LICENSE;
  }
  cacheReady = true;
  window.dispatchEvent(new CustomEvent("licensechange"));
  return cachedLicense;
}

// ----- public API --------------------------------------------------------------

/** Get current license info (synchronous, uses cache). */
export function getLicense(): LicenseInfo {
  if (!cacheReady) {
    // Fallback: try synchronous parse (no signature check) so UI doesn't flash.
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const dotIdx = stored.indexOf(".");
        if (dotIdx !== -1) {
          const payload: LicensePayload = JSON.parse(
            base64urlDecode(stored.slice(0, dotIdx)),
          );
          if (payload.tier === "pro" && payload.exp * 1000 > Date.now()) {
            return {
              valid: true,
              tier: "pro",
              email: payload.email,
              expiresAt: new Date(payload.exp * 1000),
              features: payload.features ?? [...PRO_FEATURES],
            };
          }
        }
      } catch {
        // ignore
      }
    }
    return FREE_LICENSE;
  }
  return cachedLicense;
}

/** Store a license key, validate it, and return the result. */
export async function setLicenseKey(key: string): Promise<LicenseInfo> {
  const trimmed = key.trim();
  if (!trimmed) {
    removeLicense();
    return FREE_LICENSE;
  }
  localStorage.setItem(STORAGE_KEY, trimmed);
  // Also save to server for cross-browser/cross-device persistence
  await saveLicenseToServer(trimmed);
  cachedLicense = await validateKey(trimmed);
  cacheReady = true;
  window.dispatchEvent(new CustomEvent("licensechange"));
  return cachedLicense;
}

/** Remove stored license and revert to Free tier. */
export function removeLicense(): void {
  localStorage.removeItem(STORAGE_KEY);
  // Also clear on server
  saveLicenseToServer("").catch(() => {});
  cachedLicense = FREE_LICENSE;
  cacheReady = true;
  window.dispatchEvent(new CustomEvent("licensechange"));
}

/** Check whether a specific Pro feature is unlocked. */
export function hasFeature(feature: string): boolean {
  const lic = getLicense();
  return lic.valid && lic.tier === "pro" && lic.features.includes(feature);
}

/** Check whether the user can add another device given their tier. */
export function canAddDevice(currentCount: number): boolean {
  const lic = getLicense();
  if (lic.valid && lic.tier === "pro" && lic.features.includes("unlimited_devices")) {
    return true;
  }
  return currentCount < FREE_DEVICE_LIMIT;
}

/** The device limit for the current tier (Infinity for Pro). */
export function getDeviceLimit(): number {
  const lic = getLicense();
  if (lic.valid && lic.tier === "pro" && lic.features.includes("unlimited_devices")) {
    return Infinity;
  }
  return FREE_DEVICE_LIMIT;
}

/** Get the raw stored key (for display in settings). */
export function getStoredKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}
