import { useState, useEffect, useRef } from "preact/hooks";
import { navigate } from "../utils/navigate";
import { useDevice } from "../hooks/useDevices";
import { db, type Photo } from "../db/schema";
import { getAreaName, getFloorForArea, getDeviceTypeLabel } from "../utils/constants";
import { t } from "../i18n";
import { useLanguage } from "../i18n";
import { apiDelete, getPhotoUrl, getDocuments, getDocumentUrl, deleteDocument, uploadDocument, addDocumentLink, type DocumentItem } from "../api/client";
import { hasFeature } from "../license";

/** Map device integration/type to HA setup URL */
function getHaSetupUrl(device: { integration?: string; typ?: string; hersteller?: string }): string | null {
  const i = device.integration?.toLowerCase() ?? "";
  const h = device.hersteller?.toLowerCase() ?? "";
  const t = device.typ?.toLowerCase() ?? "";

  // Integration-based mapping
  const integrationMap: Record<string, string> = {
    fritz: "/config/integrations/integration/fritz",
    fritzbox: "/config/integrations/integration/fritz",
    tuya: "/config/integrations/integration/tuya",
    localtuya: "/config/integrations/integration/tuya",
    tplink: "/config/integrations/integration/tplink",
    boschshc: "/config/integrations/integration/bosch_shc",
    homematicip_cloud: "/config/integrations/integration/homematicip_cloud",
    ring: "/config/integrations/integration/ring",
    blink: "/config/integrations/integration/blink",
    alexa_devices: "/config/integrations/integration/alexa_devices",
    tasmota: "/config/integrations/integration/tasmota",
    mqtt: "/config/integrations/integration/mqtt",
    zigbee2mqtt: "/hassio/addon/45df7312_zigbee2mqtt",
    landroid_cloud: "/config/integrations/integration/landroid_cloud",
    mobile_app: "/config/integrations/integration/mobile_app",
    playstation_network: "/config/integrations/integration/playstation_network",
  };

  if (i && integrationMap[i]) return integrationMap[i];

  // Manufacturer-based fallback
  if (h.includes("amazon") || h.includes("alexa")) return "/config/integrations/integration/alexa_devices";
  if (h.includes("ring")) return "/config/integrations/integration/ring";
  if (h.includes("blink")) return "/config/integrations/integration/blink";
  if (h.includes("bosch")) return "/config/integrations/integration/bosch_shc";
  if (h.includes("homematic")) return "/config/integrations/integration/homematicip_cloud";
  if (h.includes("tp-link") || h.includes("tapo")) return "/config/integrations/integration/tplink";
  if (h.includes("avm") || h.includes("fritz")) return "/config/integrations/integration/fritz";

  // Generic: link to integrations page
  if (i || t) return "/config/integrations";

  return null;
}

interface DeviceDetailProps {
  uuid?: string;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div class="flex justify-between items-start py-2.5 border-b border-gray-50 dark:border-gray-700 last:border-b-0">
      <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0 w-28">{label}</span>
      <span class="text-sm text-gray-800 dark:text-gray-200 text-right break-all">{value}</span>
    </div>
  );
}

export function DeviceDetail({ uuid }: DeviceDetailProps) {
  useLanguage();
  const { device, loading } = useDevice(uuid);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!uuid) return;

    // Try local IndexedDB first (has blob for same-device access)
    db.photos
      .where("device_uuid")
      .equals(uuid)
      .and((p) => p.is_primary)
      .first()
      .then((p) => {
        if (p) {
          setPhoto(p);
          if (p.blob) {
            const url = URL.createObjectURL(p.blob);
            blobUrlRef.current = url;
            setPhotoUrl(url);
          } else if (p.url) {
            setPhotoUrl(p.url);
          }
        } else if (device?.photos && device.photos.length > 0) {
          // No local photo - use server photo URL
          const primary = device.photos.find((ph: any) => ph.is_primary) || device.photos[0];
          setPhotoUrl(getPhotoUrl(primary.uuid));
        }
      });

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [uuid, device]);

  if (loading) {
    return (
      <div class="flex items-center justify-center py-20">
        <div class="animate-spin w-8 h-8 border-2 border-[#1F4E79] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!device) {
    return (
      <div class="text-center py-20 px-4">
        <p class="text-gray-400 mb-4">{t("detail.notFound")}</p>
        <button
          onClick={() => navigate("/devices")}
          class="text-[#1F4E79] text-sm font-medium"
        >
          {t("detail.backToList")}
        </button>
      </div>
    );
  }

  const floor = device.standort_area_id
    ? getFloorForArea(device.standort_area_id)
    : undefined;

  const handleDelete = async () => {
    const mqttEnabled = localStorage.getItem("gv_mqtt_enabled") === "true";
    const msg = mqttEnabled
      ? t("detail.confirmDeleteMqtt")
      : t("detail.confirmDelete");
    if (!confirm(msg)) return;
    await db.devices.delete(device.uuid);
    await db.photos.where("device_uuid").equals(device.uuid).delete();
    await apiDelete(`/devices/${device.uuid}`, "device", device.uuid);
    navigate("/devices");
  };

  return (
    <div class="p-4 pt-2 space-y-4 pb-24">
      <button
        onClick={() => navigate("/devices")}
        class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {t("common.back")}
      </button>

      {photoUrl && (
        <img
          src={photoUrl}
          alt={device.bezeichnung}
          class="w-full max-h-64 object-contain rounded-xl bg-gray-100 dark:bg-gray-800"
        />
      )}

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div class="flex items-start gap-3 mb-4">
          <div class="w-12 h-12 rounded-lg bg-[#1F4E79]/10 dark:bg-[#1F4E79]/20 flex items-center justify-center shrink-0">
            <span class="text-[#1F4E79] dark:text-[#7ab5d6] text-xl font-bold">
              {device.bezeichnung.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{device.bezeichnung}</h2>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1F4E79]/10 dark:bg-[#1F4E79]/20 text-[#1F4E79] dark:text-[#7ab5d6]">
              {t(getDeviceTypeLabel(device.typ))}
            </span>
          </div>
        </div>

        <InfoRow label={t("detail.model")} value={device.modell} />
        <InfoRow label={t("detail.manufacturer")} value={device.hersteller} />
        <InfoRow
          label={t("detail.location")}
          value={
            device.standort_area_id
              ? `${device.standort_name || getAreaName(device.standort_area_id)}${floor ? ` (${floor.name})` : ""}`
              : undefined
          }
        />
        <InfoRow label={t("detail.integration")} value={device.integration} />
        <InfoRow label={t("detail.network")} value={device.netzwerk} />
        <InfoRow label={t("detail.power")} value={device.stromversorgung} />
        <InfoRow label={t("detail.ip")} value={device.ip_adresse} />
        <InfoRow label={t("detail.mac")} value={device.mac_adresse} />
        <InfoRow label={t("detail.firmware")} value={device.firmware} />
        <InfoRow label={t("detail.serial")} value={device.seriennummer} />
        <InfoRow label={t("detail.purchaseDate")} value={device.anschaffungsdatum} />
        <InfoRow label={t("detail.warrantyUntil")} value={device.garantie_bis} />
        <InfoRow label={t("detail.entityId")} value={device.ha_entity_id} />
        <InfoRow label={t("detail.deviceId")} value={device.ha_device_id} />
      </div>

      {(device.funktion || device.anmerkungen) && (
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
          {device.funktion && (
            <div>
              <h3 class="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">{t("detail.function")}</h3>
              <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{device.funktion}</p>
            </div>
          )}
          {device.anmerkungen && (
            <div>
              <h3 class="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">{t("detail.notes")}</h3>
              <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{device.anmerkungen}</p>
            </div>
          )}
        </div>
      )}

      {/* Documents / Manuals section */}
      {uuid && <DocumentsSection deviceUuid={uuid} />}

      {/* Onboarding: Link to HA integration setup - only show if device has HA link */}
      {device.ha_device_id && getHaSetupUrl(device) && (
        <div>
          <button
            onClick={() => {
              const url = getHaSetupUrl(device);
              if (url) {
                try {
                  window.top?.location.assign(url);
                } catch {
                  window.open(url, "_blank");
                }
              }
            }}
            class="w-full py-3 rounded-xl bg-[#4CAF50] text-white text-sm font-medium hover:bg-[#43A047] cursor-pointer flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {t("detail.setupInHA")}
          </button>
          <p class="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1">{t("detail.setupInHADesc")}</p>
        </div>
      )}

      <div class="text-center text-[10px] text-gray-300 py-2">
        {t("detail.created")}: {new Date(device.created_at).toLocaleString("de-DE")}
        {" | "}
        {t("detail.updated")}: {new Date(device.updated_at).toLocaleString("de-DE")}
      </div>

      <div class="fixed bottom-16 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex gap-3 z-30">
        <button
          onClick={() => navigate("/devices")}
          class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
        >
          {t("common.back")}
        </button>
        <button
          onClick={() => navigate(`/devices/${device.uuid}/edit`)}
          class="flex-1 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-medium hover:bg-[#1a4268] cursor-pointer"
        >
          {t("common.edit")}
        </button>
        <button
          onClick={handleDelete}
          class="py-2.5 px-4 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer"
        >
          {t("common.delete")}
        </button>
      </div>
    </div>
  );
}

// ----- Documents Section -----

function DocumentsSection({ deviceUuid }: { deviceUuid: string }) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkCaption, setLinkCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDocuments(deviceUuid).then(setDocs);
  }, [deviceUuid]);

  const handleFileUpload = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadDocument(deviceUuid, file);
    if (result) setDocs((prev) => [result, ...prev]);
    setUploading(false);
    setShowUpload(false);
  };

  const handleAddLink = async () => {
    if (!linkUrl) return;
    setUploading(true);
    const result = await addDocumentLink(deviceUuid, linkUrl, linkCaption || undefined);
    if (result) setDocs((prev) => [result, ...prev]);
    setLinkUrl("");
    setLinkCaption("");
    setUploading(false);
    setShowLink(false);
  };

  const handleDelete = async (docUuid: string) => {
    if (!confirm(t("common.confirm"))) return;
    const ok = await deleteDocument(docUuid);
    if (ok) setDocs((prev) => prev.filter((d) => d.uuid !== docUuid));
  };

  const isPro = hasFeature("ha_sync");

  return (
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t("detail.documents")}
        </h3>
        {isPro && (
          <div class="flex gap-2">
            <button
              onClick={() => { setShowUpload(true); setShowLink(false); }}
              class="text-xs text-[#1F4E79] dark:text-[#7ab5d6] font-medium cursor-pointer"
            >
              {t("form.uploadDocument")}
            </button>
            <button
              onClick={() => { setShowLink(true); setShowUpload(false); }}
              class="text-xs text-[#1F4E79] dark:text-[#7ab5d6] font-medium cursor-pointer"
            >
              {t("form.addLink")}
            </button>
          </div>
        )}
      </div>

      {showUpload && (
        <div class="mb-3">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,image/*"
            onChange={handleFileUpload}
            class="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-[#1F4E79] file:text-white file:cursor-pointer"
          />
          {uploading && <p class="text-xs text-gray-400 mt-1">{t("common.saving")}</p>}
        </div>
      )}

      {showLink && (
        <div class="mb-3 space-y-2">
          <input
            type="url"
            value={linkUrl}
            onInput={(e) => setLinkUrl((e.target as HTMLInputElement).value)}
            placeholder={t("form.linkPlaceholder")}
            class="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200"
          />
          <div class="flex gap-2">
            <button
              onClick={handleAddLink}
              disabled={!linkUrl || uploading}
              class="px-4 py-2 rounded-lg bg-[#1F4E79] text-white text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {t("common.save")}
            </button>
            <button
              onClick={() => setShowLink(false)}
              class="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {docs.length === 0 && !showUpload && !showLink && (
        <p class="text-xs text-gray-400 dark:text-gray-500">—</p>
      )}

      {docs.length > 0 && (
        <div class="space-y-2">
          {docs.map((doc) => (
            <div key={doc.uuid} class="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-b-0">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-gray-400 dark:text-gray-500 shrink-0">
                  {doc.url ? (
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg>
                  ) : (
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  )}
                </span>
                <a
                  href={doc.url || getDocumentUrl(doc.uuid)}
                  target="_blank"
                  rel="noopener"
                  class="text-sm text-[#1F4E79] dark:text-[#7ab5d6] truncate hover:underline"
                >
                  {doc.caption || doc.filename}
                </a>
                {doc.file_size > 0 && (
                  <span class="text-[10px] text-gray-400 shrink-0">
                    {(doc.file_size / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
              {isPro && (
                <button
                  onClick={() => handleDelete(doc.uuid)}
                  class="text-red-400 hover:text-red-600 cursor-pointer shrink-0 ml-2"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
