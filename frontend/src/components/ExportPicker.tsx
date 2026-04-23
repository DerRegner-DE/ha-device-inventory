import { useState, useEffect, useMemo } from "preact/hooks";
import { apiGet } from "../api/client";
import { t } from "../i18n";
import { getApiBase } from "../utils/navigate";

/** Canonical list of exportable fields, same names as DB columns.
 *  Order here determines check-list order in the UI. */
const ALL_FIELDS: string[] = [
  "nr", "typ", "bezeichnung", "modell", "hersteller",
  "seriennummer", "ain_artikelnr", "firmware",
  "standort_name", "standort_floor_id", "standort_area_id",
  "integration", "netzwerk", "stromversorgung",
  "ip_adresse", "mac_adresse",
  "anschaffungsdatum", "garantie_bis",
  "ha_device_id", "ha_entity_id",
  "funktion", "anmerkungen",
];

const STORAGE_KEY = "gv_export_fields_v1";

type Format = "pdf" | "xlsx";

interface Props {
  onClose: () => void;
}

/**
 * v2.5.0: modal that shows presets + per-field checkboxes and triggers
 * the actual export with the chosen subset. Persists the last selection
 * in localStorage so opening the modal again shows what you used last.
 */
export function ExportPicker({ onClose }: Props) {
  const [presets, setPresets] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set(ALL_FIELDS);
    } catch {
      return new Set(ALL_FIELDS);
    }
  });

  useEffect(() => {
    apiGet<{ presets: Record<string, string[]> }>("/export/presets")
      .then((r) => setPresets(r?.presets || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));
    } catch {}
  }, [selected]);

  const toggle = (f: string) => {
    const next = new Set(selected);
    if (next.has(f)) next.delete(f);
    else next.add(f);
    setSelected(next);
  };

  const applyPreset = (name: "all" | string) => {
    if (name === "all") setSelected(new Set(ALL_FIELDS));
    else if (presets[name]) setSelected(new Set(presets[name]));
  };

  const download = (format: Format) => {
    if (selected.size === 0) return;
    const fields = [...selected].join(",");
    const url = `${getApiBase()}/export/${format}?fields=${encodeURIComponent(fields)}`;
    window.open(url, "_blank");
  };

  const presetNames = useMemo(() => Object.keys(presets), [presets]);

  return (
    <div
      class="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-2"
      onClick={onClose}
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("exportPicker.title")}
          </h2>
          <button
            onClick={onClose}
            class="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-4 overflow-y-auto flex-1 space-y-3">
          <div>
            <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              {t("exportPicker.presets")}
            </h3>
            <div class="flex gap-2 flex-wrap">
              <button
                onClick={() => applyPreset("all")}
                class="px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t("exportPicker.preset.all")}
              </button>
              {presetNames.map((name) => (
                <button
                  key={name}
                  onClick={() => applyPreset(name)}
                  class="px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {t(`exportPicker.preset.${name}`) || name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              {t("exportPicker.fields", { count: selected.size, total: ALL_FIELDS.length })}
            </h3>
            <div class="grid grid-cols-2 gap-y-1 gap-x-3">
              {ALL_FIELDS.map((f) => (
                <label key={f} class="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(f)}
                    onChange={() => toggle(f)}
                  />
                  <span class="text-gray-700 dark:text-gray-300">
                    {t(`exportPicker.field.${f}`) || f}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <button
            onClick={onClose}
            class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t("common.cancel")}
          </button>
          <div class="flex-1" />
          <button
            onClick={() => download("xlsx")}
            disabled={selected.size === 0}
            class="px-4 py-2 rounded-xl bg-[#4CAF50] text-white text-sm font-medium hover:bg-[#43A047] disabled:opacity-40"
          >
            {t("exportPicker.downloadXlsx")}
          </button>
          <button
            onClick={() => download("pdf")}
            disabled={selected.size === 0}
            class="px-4 py-2 rounded-xl bg-[#e74c3c] text-white text-sm font-medium hover:bg-[#c0392b] disabled:opacity-40"
          >
            {t("exportPicker.downloadPdf")}
          </button>
        </div>
      </div>
    </div>
  );
}
