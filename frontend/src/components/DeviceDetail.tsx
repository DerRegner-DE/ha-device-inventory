import { useState, useEffect, useRef } from "preact/hooks";
import { route } from "preact-router";
import { useDevice } from "../hooks/useDevices";
import { db, type Photo } from "../db/schema";
import { getAreaName, getFloorForArea, getDeviceTypeLabel } from "../utils/constants";
import { t } from "../i18n";
import { useLanguage } from "../i18n";
import { apiDelete, getPhotoUrl } from "../api/client";

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
    <div class="flex justify-between items-start py-2.5 border-b border-gray-50 last:border-b-0">
      <span class="text-xs text-gray-400 shrink-0 w-28">{label}</span>
      <span class="text-sm text-gray-800 text-right break-all">{value}</span>
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
          onClick={() => route("/devices")}
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
    route("/devices");
  };

  return (
    <div class="p-4 pt-2 space-y-4 pb-24">
      <div class="flex items-center justify-between">
        <button
          onClick={() => route("/devices")}
          class="flex items-center gap-1 text-sm text-gray-500"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {t("common.back")}
        </button>
        <div class="flex gap-2">
          <button
            onClick={() => route(`/devices/${device.uuid}/edit`)}
            class="px-3 py-1.5 rounded-lg bg-[#1F4E79] text-white text-xs font-medium"
          >
            {t("common.edit")}
          </button>
          <button
            onClick={handleDelete}
            class="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>

      {photoUrl && (
        <img
          src={photoUrl}
          alt={device.bezeichnung}
          class="w-full max-h-64 object-contain rounded-xl bg-gray-100"
        />
      )}

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div class="flex items-start gap-3 mb-4">
          <div class="w-12 h-12 rounded-lg bg-[#1F4E79]/10 flex items-center justify-center shrink-0">
            <span class="text-[#1F4E79] text-xl font-bold">
              {device.bezeichnung.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{device.bezeichnung}</h2>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1F4E79]/10 text-[#1F4E79]">
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
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          {device.funktion && (
            <div>
              <h3 class="text-xs font-medium text-gray-400 mb-1">{t("detail.function")}</h3>
              <p class="text-sm text-gray-700 whitespace-pre-wrap">{device.funktion}</p>
            </div>
          )}
          {device.anmerkungen && (
            <div>
              <h3 class="text-xs font-medium text-gray-400 mb-1">{t("detail.notes")}</h3>
              <p class="text-sm text-gray-700 whitespace-pre-wrap">{device.anmerkungen}</p>
            </div>
          )}
        </div>
      )}

      {/* Onboarding: Link to HA integration setup */}
      {getHaSetupUrl(device) && (
        <button
          onClick={() => {
            const url = getHaSetupUrl(device);
            if (url) {
              // Navigate in parent frame (HA) or new tab
              try {
                window.top?.location.assign(url);
              } catch {
                window.open(url, "_blank");
              }
            }
          }}
          class="w-full py-3 rounded-xl bg-[#4CAF50] text-white text-sm font-medium hover:bg-[#43A047] flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {t("detail.setupInHA")}
        </button>
      )}

      <div class="text-center text-[10px] text-gray-300 py-2">
        {t("detail.created")}: {new Date(device.created_at).toLocaleString("de-DE")}
        {" | "}
        {t("detail.updated")}: {new Date(device.updated_at).toLocaleString("de-DE")}
      </div>

      <div class="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 z-30">
        <button
          onClick={() => route("/devices")}
          class="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600"
        >
          {t("common.back")}
        </button>
        <button
          onClick={() => route(`/devices/${device.uuid}/edit`)}
          class="flex-1 py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-medium"
        >
          {t("common.edit")}
        </button>
        <button
          onClick={handleDelete}
          class="py-2.5 px-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium"
        >
          {t("common.delete")}
        </button>
      </div>
    </div>
  );
}
