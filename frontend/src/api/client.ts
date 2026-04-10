import { db, type SyncQueueItem } from "../db/schema";
import { getApiBase } from "../utils/navigate";

// NOTE: Do NOT cache getApiBase() at module level!
// Module-level code runs BEFORE initBasePath() in index.tsx,
// so basePath would still be empty → wrong API URL → 404.
function getBaseUrl(): string {
  return getApiBase();
}

async function isOnline(): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    const res = await fetch(`${getBaseUrl()}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function queueRequest(
  entityType: string,
  entityUuid: string,
  action: SyncQueueItem["action"],
  payload: unknown
): Promise<void> {
  await db.syncQueue.add({
    entity_type: entityType,
    entity_uuid: entityUuid,
    action,
    payload: JSON.stringify(payload),
    created_at: new Date().toISOString(),
  });
}

export async function apiGet<T>(path: string, timeoutMs = 30000): Promise<T | null> {
  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn("API GET failed:", path, err);
    return null;
  }
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  entityType?: string,
  entityUuid?: string,
  timeoutMs = 30000
): Promise<T | null> {
  const online = await isOnline();
  if (!online && entityType && entityUuid) {
    await queueRequest(entityType, entityUuid, "create", body);
    return null;
  }
  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn("API POST failed:", path, err);
    if (entityType && entityUuid) {
      await queueRequest(entityType, entityUuid, "create", body);
    }
    return null;
  }
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  entityType?: string,
  entityUuid?: string,
  timeoutMs = 30000
): Promise<T | null> {
  const online = await isOnline();
  if (!online && entityType && entityUuid) {
    await queueRequest(entityType, entityUuid, "update", body);
    return null;
  }
  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn("API PUT failed:", path, err);
    if (entityType && entityUuid) {
      await queueRequest(entityType, entityUuid, "update", body);
    }
    return null;
  }
}

export async function apiDelete(
  path: string,
  entityType?: string,
  entityUuid?: string
): Promise<boolean> {
  const online = await isOnline();
  if (!online && entityType && entityUuid) {
    await queueRequest(entityType, entityUuid, "delete", {});
    return false;
  }
  try {
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch (err) {
    console.warn("API DELETE failed:", path, err);
    if (entityType && entityUuid) {
      await queueRequest(entityType, entityUuid, "delete", {});
    }
    return false;
  }
}

export async function syncPendingQueue(): Promise<number> {
  const items = await db.syncQueue.toArray();
  if (items.length === 0) return 0;

  let synced = 0;
  for (const item of items) {
    try {
      const payload = JSON.parse(item.payload);
      const path = `/${item.entity_type}s/${item.entity_uuid}`;
      let ok = false;

      if (item.action === "create") {
        const res = await fetch(`${getBaseUrl()}/${item.entity_type}s/${item.entity_uuid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        ok = res.ok;
      } else if (item.action === "update") {
        const res = await fetch(`${getBaseUrl()}${path}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        ok = res.ok;
      } else if (item.action === "delete") {
        const res = await fetch(`${getBaseUrl()}${path}`, { method: "DELETE" });
        ok = res.ok;
      }

      if (ok && item.id !== undefined) {
        await db.syncQueue.delete(item.id);
        synced++;
      }
    } catch {
      break;
    }
  }
  return synced;
}

export async function getPendingCount(): Promise<number> {
  return db.syncQueue.count();
}

/**
 * Upload a photo blob to the server for a device.
 * Returns the server photo record (with uuid, filename etc.) or null on failure.
 */
export async function uploadPhoto(
  deviceUuid: string,
  blob: Blob,
  isPrimary: boolean = true
): Promise<any | null> {
  try {
    const formData = new FormData();
    const ext = blob.type === "image/png" ? ".png" : ".jpg";
    formData.append("file", blob, `photo${ext}`);
    formData.append("is_primary", isPrimary ? "true" : "false");

    const res = await fetch(`${getBaseUrl()}/devices/${deviceUuid}/photos`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Photo upload failed:", err);
    return null;
  }
}

/** Build the full URL to fetch a photo from the server */
export function getPhotoUrl(photoUuid: string): string {
  return `${getBaseUrl()}/photos/${photoUuid}`;
}

// ----- Document API (manuals, datasheets) ------------------------------------

export interface DocumentItem {
  uuid: string;
  filename: string;
  mime_type: string;
  file_size: number;
  caption: string | null;
  url: string | null;
  created_at: string;
}

export async function getDocuments(deviceUuid: string): Promise<DocumentItem[]> {
  const data = await apiGet<DocumentItem[]>(`/devices/${deviceUuid}/documents`);
  return data || [];
}

export async function uploadDocument(
  deviceUuid: string,
  file: File,
  caption?: string,
): Promise<DocumentItem | null> {
  try {
    const formData = new FormData();
    formData.append("file", file, file.name);
    if (caption) formData.append("caption", caption);

    const res = await fetch(`${getBaseUrl()}/devices/${deviceUuid}/documents`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Document upload failed:", err);
    return null;
  }
}

export async function addDocumentLink(
  deviceUuid: string,
  url: string,
  caption?: string,
): Promise<DocumentItem | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/devices/${deviceUuid}/documents/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, caption }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Document link failed:", err);
    return null;
  }
}

export function getDocumentUrl(docUuid: string): string {
  return `${getBaseUrl()}/documents/${docUuid}`;
}

export async function deleteDocument(docUuid: string): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/documents/${docUuid}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(10000),
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

/**
 * Pull devices from server and merge into local IndexedDB.
 * Server wins if sync_version is higher. Local wins if local is higher (pending upload).
 * Devices deleted on server (not in response) are removed locally.
 */
export async function syncFromServer(): Promise<number> {
  try {
    const data = await apiGet<{ items: any[] }>("/devices?per_page=10000", 60000);
    if (!data || !data.items) return 0;

    const serverDevices = data.items;
    const localDevices = await db.devices.toArray();
    const localMap = new Map(localDevices.map(d => [d.uuid, d]));
    const serverUuids = new Set(serverDevices.map((d: any) => d.uuid));
    const pendingItems = await db.syncQueue.toArray();
    const pendingUuids = new Set(pendingItems.map(i => i.entity_uuid));

    let changes = 0;

    // Merge server → local
    for (const serverDev of serverDevices) {
      const local = localMap.get(serverDev.uuid);
      if (!local) {
        // New device from server - add locally
        await db.devices.put(serverDev);
        changes++;
      } else if (
        (serverDev.sync_version ?? 0) > (local.sync_version ?? 0) &&
        !pendingUuids.has(serverDev.uuid)
      ) {
        // Server has newer version and no pending local changes
        await db.devices.put(serverDev);
        changes++;
      }
    }

    // Remove locally deleted devices (on server but not pending delete)
    for (const local of localDevices) {
      if (!serverUuids.has(local.uuid) && !pendingUuids.has(local.uuid)) {
        await db.devices.delete(local.uuid);
        await db.photos.where("device_uuid").equals(local.uuid).delete();
        changes++;
      }
    }

    return changes;
  } catch (err) {
    console.warn("syncFromServer failed:", err);
    return 0;
  }
}
