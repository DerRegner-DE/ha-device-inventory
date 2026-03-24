import { useState } from "preact/hooks";
import { route } from "preact-router";
import { db, type Device, type Photo } from "../db/schema";
import { apiPost, apiPut } from "../api/client";
import {
  DEVICE_TYPES,
  INTEGRATIONS,
  NETWORKS,
  POWER_SOURCES,
  getFloorForArea,
} from "../utils/constants";
import { AreaPicker } from "./AreaPicker";
import { CameraCapture } from "./CameraCapture";
import { BarcodeScanner } from "./BarcodeScanner";
import { t } from "../i18n";
import { useLanguage } from "../i18n";
import { hasFeature, canAddDevice } from "../license";
import { LicenseGate } from "./LicenseGate";

interface DeviceFormProps {
  device?: Device;
}

function generateUUID(): string {
  if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, "");
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

interface SectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: preact.ComponentChildren;
}

function Section({ title, open, onToggle, children }: SectionProps) {
  return (
    <div class="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700"
      >
        {title}
        <svg
          class={`w-5 h-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div class="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: preact.ComponentChildren;
}) {
  return (
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79]";

const selectClass =
  "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79] appearance-none";

export function DeviceForm({ device }: DeviceFormProps) {
  useLanguage();
  const isEdit = !!device;

  const [form, setForm] = useState({
    typ: device?.typ ?? "",
    bezeichnung: device?.bezeichnung ?? "",
    modell: device?.modell ?? "",
    hersteller: device?.hersteller ?? "",
    standort_area_id: device?.standort_area_id ?? "",
    standort_name: device?.standort_name ?? "",
    seriennummer: device?.seriennummer ?? "",
    mac_adresse: device?.mac_adresse ?? "",
    ip_adresse: device?.ip_adresse ?? "",
    firmware: device?.firmware ?? "",
    integration: device?.integration ?? "",
    stromversorgung: device?.stromversorgung ?? "",
    netzwerk: device?.netzwerk ?? "",
    anschaffungsdatum: device?.anschaffungsdatum ?? "",
    garantie_bis: device?.garantie_bis ?? "",
    funktion: device?.funktion ?? "",
    anmerkungen: device?.anmerkungen ?? "",
    ha_entity_id: device?.ha_entity_id ?? "",
    ha_device_id: device?.ha_device_id ?? "",
    ain_artikelnr: device?.ain_artikelnr ?? "",
    standort_floor_id: device?.standort_floor_id ?? "",
  });

  const [sections, setSections] = useState({
    basic: true,
    location: true,
    network: false,
    details: false,
    ha: false,
    notes: false,
  });

  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleScan = (data: string) => {
    setShowScanner(false);
    const macMatch = data.match(/([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/);
    if (macMatch) {
      updateField("mac_adresse", macMatch[0]);
      return;
    }
    if (!form.seriennummer) {
      updateField("seriennummer", data);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!form.typ || !form.bezeichnung) return;

    // Check device limit for Free tier (only when creating, not editing)
    if (!isEdit) {
      const count = await db.devices.count();
      if (!canAddDevice(count)) {
        alert(t("license.deviceLimitReached", { limit: 50 }));
        return;
      }
    }

    setSaving(true);
    const now = new Date().toISOString();
    const uuid = device?.uuid ?? generateUUID();

    const deviceData: Device = {
      uuid,
      typ: form.typ,
      bezeichnung: form.bezeichnung,
      modell: form.modell || undefined,
      hersteller: form.hersteller || undefined,
      standort_area_id: form.standort_area_id || undefined,
      standort_name: form.standort_name || undefined,
      seriennummer: form.seriennummer || undefined,
      mac_adresse: form.mac_adresse || undefined,
      ip_adresse: form.ip_adresse || undefined,
      firmware: form.firmware || undefined,
      integration: form.integration || undefined,
      stromversorgung: form.stromversorgung || undefined,
      netzwerk: form.netzwerk || undefined,
      anschaffungsdatum: form.anschaffungsdatum || undefined,
      garantie_bis: form.garantie_bis || undefined,
      funktion: form.funktion || undefined,
      anmerkungen: form.anmerkungen || undefined,
      ha_entity_id: form.ha_entity_id || undefined,
      ha_device_id: form.ha_device_id || undefined,
      ain_artikelnr: form.ain_artikelnr || undefined,
      standort_floor_id: form.standort_floor_id || undefined,
      created_at: device?.created_at ?? now,
      updated_at: now,
      sync_version: (device?.sync_version ?? 0) + 1,
    };

    await db.devices.put(deviceData);

    if (photoBlob) {
      const photo: Photo = {
        uuid: generateUUID(),
        device_uuid: uuid,
        blob: photoBlob,
        is_primary: true,
        created_at: now,
      };
      await db.photos.put(photo);
    }

    if (isEdit) {
      await apiPut(`/devices/${uuid}`, deviceData, "device", uuid);
    } else {
      await apiPost("/devices", deviceData, "device", uuid);
    }

    setSaving(false);
    route(`/devices/${uuid}`);
  };

  return (
    <div class="relative" style="min-height: 100vh;">
      {showCamera && (
        <CameraCapture
          onCapture={(blob) => {
            setPhotoBlob(blob);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
      <form onSubmit={handleSubmit} class="p-4 space-y-4 pb-8">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-800">
            {isEdit ? t("form.editDevice") : t("form.newDevice")}
          </h2>
          <div class="flex gap-2">
            {hasFeature("camera") && (
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                class="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                title={t("form.photoTitle")}
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2" />
                </svg>
              </button>
            )}
            {!hasFeature("camera") && (
              <button
                type="button"
                class="p-2 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed"
                title={t("license.feature.camera") + " (Pro)"}
                disabled
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2" />
                </svg>
              </button>
            )}
            {hasFeature("barcode") && (
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                class="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                title={t("form.scanTitle")}
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
            )}
            {!hasFeature("barcode") && (
              <button
                type="button"
                class="p-2 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed"
                title={t("license.feature.barcode") + " (Pro)"}
                disabled
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {photoBlob && (
          <div class="relative">
            <img
              src={URL.createObjectURL(photoBlob)}
              alt={t("common.photo")}
              class="w-full h-48 object-cover rounded-xl"
            />
            <button
              type="button"
              onClick={() => setPhotoBlob(null)}
              class="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <Section title={t("form.sectionBasic")} open={sections.basic} onToggle={() => toggleSection("basic")}>
          <Field label={t("form.deviceType")}>
            <select
              value={form.typ}
              onChange={(e) => updateField("typ", (e.target as HTMLSelectElement).value)}
              class={selectClass}
              required
            >
              <option value="">{t("form.selectType")}</option>
              {DEVICE_TYPES.map((dt) => (
                <option key={dt.id} value={dt.id}>{t(dt.labelKey)}</option>
              ))}
            </select>
          </Field>
          <Field label={t("form.name")}>
            <input
              type="text"
              value={form.bezeichnung}
              onInput={(e) => updateField("bezeichnung", (e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder={t("form.namePlaceholder")}
              required
            />
          </Field>
          <Field label={t("form.model")}>
            <input
              type="text"
              value={form.modell}
              onInput={(e) => updateField("modell", (e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder={t("form.modelPlaceholder")}
            />
          </Field>
          <Field label={t("form.manufacturer")}>
            <input
              type="text"
              value={form.hersteller}
              onInput={(e) => updateField("hersteller", (e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder={t("form.manufacturerPlaceholder")}
            />
          </Field>
        </Section>

        <Section title={t("form.sectionLocation")} open={sections.location} onToggle={() => toggleSection("location")}>
          <Field label={t("form.area")}>
            <AreaPicker
              value={form.standort_area_id}
              onChange={(id, name) => {
                updateField("standort_area_id", id);
                updateField("standort_name", name);
                const floor = getFloorForArea(id);
                updateField("standort_floor_id", floor?.id ?? "");
              }}
            />
          </Field>
        </Section>

        <Section title={t("form.sectionNetwork")} open={sections.network} onToggle={() => toggleSection("network")}>
          <Field label={t("form.integration")}>
            <select
              value={form.integration}
              onChange={(e) => updateField("integration", (e.target as HTMLSelectElement).value)}
              class={selectClass}
            >
              <option value="">{t("form.selectIntegration")}</option>
              {INTEGRATIONS.map((i) => (
                <option key={i.id} value={i.id}>{t(i.labelKey)}</option>
              ))}
            </select>
          </Field>
          <Field label={t("form.network")}>
            <select
              value={form.netzwerk}
              onChange={(e) => updateField("netzwerk", (e.target as HTMLSelectElement).value)}
              class={selectClass}
            >
              <option value="">{t("form.selectNetwork")}</option>
              {NETWORKS.map((n) => (
                <option key={n.id} value={n.id}>{t(n.labelKey)}</option>
              ))}
            </select>
          </Field>
          <Field label={t("form.power")}>
            <select
              value={form.stromversorgung}
              onChange={(e) => updateField("stromversorgung", (e.target as HTMLSelectElement).value)}
              class={selectClass}
            >
              <option value="">{t("form.selectPower")}</option>
              {POWER_SOURCES.map((p) => (
                <option key={p.id} value={p.id}>{t(p.labelKey)}</option>
              ))}
            </select>
          </Field>
          <Field label={t("form.ip")}>
            <input
              type="text"
              value={form.ip_adresse}
              onInput={(e) => updateField("ip_adresse", (e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder={t("form.ipPlaceholder")}
            />
          </Field>
          <Field label={t("form.mac")}>
            <input
              type="text"
              value={form.mac_adresse}
              onInput={(e) => updateField("mac_adresse", (e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder={t("form.macPlaceholder")}
            />
          </Field>
          <Field label={t("form.firmware")}>
            <input
              type="text"
              value={form.firmware}
              onInput={(e) => updateField("firmware", (e.target as HTMLInputElement).value)}
              class={inputClass}
            />
          </Field>
        </Section>

        <Section title={t("form.sectionDetails")} open={sections.details} onToggle={() => toggleSection("details")}>
          <Field label={t("form.serial")}>
            <input
              type="text"
              value={form.seriennummer}
              onInput={(e) => updateField("seriennummer", (e.target as HTMLInputElement).value)}
              class={inputClass}
            />
          </Field>
          <Field label={t("form.ain")}>
            <input
              type="text"
              value={form.ain_artikelnr}
              onInput={(e) => updateField("ain_artikelnr", (e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder={t("form.ainPlaceholder")}
            />
          </Field>
          <Field label={t("form.purchaseDate")}>
            <input
              type="date"
              value={form.anschaffungsdatum}
              onInput={(e) => updateField("anschaffungsdatum", (e.target as HTMLInputElement).value)}
              class={inputClass}
            />
          </Field>
          <Field label={t("form.warrantyUntil")}>
            <input
              type="date"
              value={form.garantie_bis}
              onInput={(e) => updateField("garantie_bis", (e.target as HTMLInputElement).value)}
              class={inputClass}
            />
          </Field>
        </Section>

        <Section title={t("form.sectionHA")} open={sections.ha} onToggle={() => toggleSection("ha")}>
          <Field label={t("form.entityId")}>
            <input
              type="text"
              value={form.ha_entity_id}
              onInput={(e) => updateField("ha_entity_id", (e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder={t("form.entityIdPlaceholder")}
            />
          </Field>
          <Field label={t("form.deviceId")}>
            <input
              type="text"
              value={form.ha_device_id}
              onInput={(e) => updateField("ha_device_id", (e.target as HTMLInputElement).value)}
              class={inputClass}
            />
          </Field>
        </Section>

        <Section title={t("form.sectionNotes")} open={sections.notes} onToggle={() => toggleSection("notes")}>
          <Field label={t("form.function")}>
            <textarea
              value={form.funktion}
              onInput={(e) => updateField("funktion", (e.target as HTMLTextAreaElement).value)}
              class={inputClass + " resize-none"}
              rows={2}
              placeholder={t("form.functionPlaceholder")}
            />
          </Field>
          <Field label={t("form.notes")}>
            <textarea
              value={form.anmerkungen}
              onInput={(e) => updateField("anmerkungen", (e.target as HTMLTextAreaElement).value)}
              class={inputClass + " resize-none"}
              rows={3}
              placeholder={t("form.notesPlaceholder")}
            />
          </Field>
        </Section>

        <div class="flex gap-3 pt-2 pb-6">
          <button
            type="button"
            onClick={() => history.back()}
            class="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving || !form.typ || !form.bezeichnung}
            class="flex-1 py-3 rounded-xl bg-[#1F4E79] text-white text-sm font-medium hover:bg-[#1a4268] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
