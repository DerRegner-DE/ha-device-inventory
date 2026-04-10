import { useState } from "preact/hooks";
import { db } from "../db/schema";
import { syncPendingQueue, getPendingCount, apiPost, apiGet, syncFromServer } from "../api/client";
import { t, setLanguage, getLanguage, getAvailableLanguages } from "../i18n";
import { useLanguage } from "../i18n";
import { LicenseSettings } from "./LicenseSettings";
import { hasFeature } from "../license";
import { useLicense } from "../license/useLicense";
import { useDarkMode } from "../hooks/useDarkMode";
import { getApiBase } from "../utils/navigate";

export function Settings() {
  useLanguage();
  const license = useLicense();
  const [darkMode, toggleDarkMode] = useDarkMode();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [currentLang, setCurrentLang] = useState(getLanguage());

  const isPro = license.valid && license.tier === "pro";
  const hasMultilingual = hasFeature("multilingual");
  const hasHaSync = hasFeature("ha_sync");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmMqtt, setConfirmMqtt] = useState(false);
  const [mqttEnabled, setMqttEnabled] = useState(false);
  const [mqttSyncing, setMqttSyncing] = useState(false);
  const [mqttResult, setMqttResult] = useState<string | null>(null);
  const [mqttLoaded, setMqttLoaded] = useState(false);

  // Load MQTT status on mount
  if (!mqttLoaded) {
    setMqttLoaded(true);
    apiGet<any>("/mqtt/status")
      .then((data) => { if (data) { setMqttEnabled(data.enabled); localStorage.setItem("gv_mqtt_enabled", String(data.enabled)); } })
      .catch(() => {});
  }

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCurrentLang(lang);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const count = await syncPendingQueue();
      const remaining = await getPendingCount();
      setSyncResult(
        t("settings.syncResult", { count, remaining })
      );
    } catch {
      setSyncResult(t("settings.syncFailed"));
    }
    setSyncing(false);
  };

  const handleClearData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    setClearing(true);
    await db.devices.clear();
    await db.photos.clear();
    await db.syncQueue.clear();
    setClearing(false);
  };

  const handleImportHA = async () => {
    if (!confirmImport) {
      setConfirmImport(true);
      return;
    }
    setConfirmImport(false);
    setImporting(true);
    setImportResult(null);
    try {
      // Use longer timeout for import (can take 60s+ for large device registries)
      const res = await fetch(`${getApiBase()}/ha/import-devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (result) {
        // Pull imported devices into local IndexedDB
        await syncFromServer();
        let resultText = t("settings.haImportResult", {
            imported: result.imported || 0,
            duplicates: result.skipped_duplicates || 0,
            total: result.total_ha_devices || 0,
          });
        if (result.skipped_non_physical > 0) {
          resultText += t("settings.haImportSkippedNonPhysical", {
            nonPhysical: result.skipped_non_physical,
          });
        }
        setImportResult(resultText);
      } else {
        setImportResult(t("settings.haImportFailed"));
      }
    } catch {
      setImportResult(t("settings.haImportFailed"));
    }
    setImporting(false);
  };

  const handleMqttToggle = async () => {
    const newVal = !mqttEnabled;
    if (newVal && !confirmMqtt) {
      setConfirmMqtt(true);
      return;
    }
    setConfirmMqtt(false);
    try {
      await apiPost("/mqtt/settings", { enabled: newVal });
      setMqttEnabled(newVal);
      localStorage.setItem("gv_mqtt_enabled", String(newVal));
      setMqttResult(null);
    } catch {
      // revert
    }
  };

  const handleMqttSync = async () => {
    setMqttSyncing(true);
    setMqttResult(null);
    try {
      const result = await apiPost<any>("/mqtt/sync", {}, undefined, undefined, 60000);
      if (result) {
        setMqttResult(
          t("settings.mqttSyncResult", {
            published: result.published || 0,
            total: result.total || 0,
          })
        );
      }
    } catch {
      setMqttResult(t("settings.mqttSyncFailed"));
    }
    setMqttSyncing(false);
  };

  const handleExport = async () => {
    const devices = await db.devices.toArray();
    const blob = new Blob([JSON.stringify(devices, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geraete-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePdfExport = () => {
    window.open(`${getApiBase()}/export/pdf`, "_blank");
  };

  // Free tier: only English.  Pro: all languages.
  const allLanguages = getAvailableLanguages();
  const languages = hasMultilingual
    ? allLanguages
    : allLanguages.filter((l) => l.code === "en");

  // If current language is not available in free tier, reset to English
  if (!hasMultilingual && currentLang !== "en") {
    handleLanguageChange("en");
  }

  return (
    <div class="p-4 space-y-6">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">{t("settings.title")}</h2>

      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm divide-y divide-gray-50 dark:divide-gray-700">
        {/* License section */}
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t("license.title")}</h3>
          <LicenseSettings />
        </div>

        {/* Language section */}
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("settings.language")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.languageDesc")}
          </p>
          <select
            value={currentLang}
            onChange={(e) => handleLanguageChange((e.target as HTMLSelectElement).value)}
            class="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79] appearance-none"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
          {!hasMultilingual && (
            <p class="text-xs text-amber-600 mt-2">
              {t("license.languageProOnly")}
            </p>
          )}
        </div>

        {/* Dark Mode section */}
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("settings.darkMode")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.darkModeDesc")}
          </p>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">{t("settings.darkModeToggle")}</span>
            <button
              onClick={toggleDarkMode}
              class={`relative w-11 h-6 rounded-full transition-colors ${
                darkMode ? "bg-[#1F4E79]" : "bg-gray-300"
              }`}
            >
              <span
                class={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  darkMode ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
        </div>

        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("settings.sync")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.syncDesc")}
          </p>
          <button
            onClick={handleSync}
            disabled={syncing}
            class="w-full py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-medium hover:bg-[#1a4268] disabled:opacity-50"
          >
            {syncing ? t("settings.syncing") : t("settings.syncNow")}
          </button>
          {syncResult && (
            <p class="text-xs text-gray-500 mt-2 text-center">{syncResult}</p>
          )}
        </div>

        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("settings.haImport")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.haImportDesc")}
          </p>
          <button
            onClick={handleImportHA}
            disabled={importing || !hasHaSync}
            class={`w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 ${
              confirmImport ? "bg-amber-500 hover:bg-amber-600" : "bg-[#4CAF50] hover:bg-[#43A047]"
            }`}
          >
            {importing
              ? t("settings.haImporting")
              : confirmImport
              ? t("common.confirm")
              : t("settings.haImportButton")}
            {!hasHaSync && " (Pro)"}
          </button>
          {confirmImport && (
            <button
              onClick={() => setConfirmImport(false)}
              class="w-full mt-1 text-xs text-gray-400 hover:text-gray-600 text-center"
            >
              {t("common.cancel")}
            </button>
          )}
          {importResult && (
            <p class="text-xs text-gray-500 mt-2 text-center">{importResult}</p>
          )}
        </div>

        {/* MQTT Discovery section */}
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("settings.mqttTitle")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.mqttDesc")}
          </p>
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-gray-600 dark:text-gray-300">{t("settings.mqttPublish")}</span>
            <div class="flex items-center gap-2">
              {confirmMqtt && (
                <button
                  onClick={() => setConfirmMqtt(false)}
                  class="text-xs text-gray-400 hover:text-gray-600"
                >
                  {t("common.cancel")}
                </button>
              )}
              <button
                onClick={handleMqttToggle}
                class={`relative w-11 h-6 rounded-full transition-colors ${
                  confirmMqtt ? "bg-amber-400" : mqttEnabled ? "bg-[#4CAF50]" : "bg-gray-300"
                }`}
                title={confirmMqtt ? t("common.confirm") : undefined}
              >
                <span
                  class={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    mqttEnabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          </div>
          {mqttEnabled && (
            <button
              onClick={handleMqttSync}
              disabled={mqttSyncing}
              class="w-full py-2.5 rounded-xl bg-[#FF9800] text-white text-sm font-medium hover:bg-[#F57C00] disabled:opacity-50"
            >
              {mqttSyncing ? t("settings.mqttSyncing") : t("settings.mqttSyncButton")}
            </button>
          )}
          {mqttResult && (
            <p class="text-xs text-gray-500 mt-2 text-center">{mqttResult}</p>
          )}
        </div>

        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("settings.export")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.exportDesc")}
          </p>
          <div class="flex gap-2">
            <button
              onClick={handleExport}
              class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t("settings.exportButton")}
            </button>
            <button
              onClick={handlePdfExport}
              class="flex-1 py-2.5 rounded-xl bg-[#e74c3c] text-white text-sm font-medium hover:bg-[#c0392b]"
            >
              {t("settings.pdfExportButton")}
            </button>
          </div>
        </div>

        <div class="p-4">
          <h3 class="text-sm font-medium text-red-600 mb-1">{t("settings.clearData")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.clearDataDesc")}
          </p>
          <button
            onClick={handleClearData}
            disabled={clearing}
            class={`w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 ${
              confirmClear
                ? "bg-red-500 text-white hover:bg-red-600"
                : "border border-red-200 text-red-600 hover:bg-red-50"
            }`}
          >
            {clearing
              ? t("settings.clearing")
              : confirmClear
              ? t("common.confirm")
              : t("settings.clearButton")}
          </button>
          {confirmClear && (
            <button
              onClick={() => setConfirmClear(false)}
              class="w-full mt-1 text-xs text-gray-400 hover:text-gray-600 text-center"
            >
              {t("common.cancel")}
            </button>
          )}
        </div>
      </div>

      <div class="text-center text-[10px] text-gray-300">
        {t("app.version")}
        {isPro && " (Pro)"}
        <br />
        {t("app.api")}
      </div>
    </div>
  );
}
