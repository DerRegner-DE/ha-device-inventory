import { useState } from "preact/hooks";
import { db } from "../db/schema";
import { syncPendingQueue, getPendingCount, apiPost, apiGet, syncFromServer } from "../api/client";
import { t, setLanguage, getLanguage, getAvailableLanguages } from "../i18n";
import { useLanguage } from "../i18n";
import { LicenseSettings } from "./LicenseSettings";
import { DiagnosticPanel } from "./DiagnosticPanel";
import { CategoryManager } from "./CategoryManager";
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
  const [mqttTesting, setMqttTesting] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [recategorizeResult, setRecategorizeResult] = useState<string | null>(null);
  const [confirmRecategorize, setConfirmRecategorize] = useState(false);
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [autoCategorizeLoaded, setAutoCategorizeLoaded] = useState(false);

  if (!autoCategorizeLoaded) {
    setAutoCategorizeLoaded(true);
    apiGet<{ enabled?: boolean }>("/settings/auto_categorize")
      .then((data) => {
        if (data && typeof data.enabled === "boolean") setAutoCategorize(data.enabled);
      })
      .catch(() => {});
  }

  // Load MQTT status on mount (backend is source of truth, not localStorage)
  if (!mqttLoaded) {
    setMqttLoaded(true);
    apiGet<any>("/mqtt/status")
      .then((data) => { if (data) setMqttEnabled(!!data.enabled); })
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
      // Use longer timeout for import (can take 5 min+ for large device registries with 500+ devices)
      const res = await fetch(`${getApiBase()}/ha/import-devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(300000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (!result) {
        setImportResult(t("settings.haImportFailed"));
      } else if (result.status === "error") {
        // Backend reported structured error (e.g. HA registry unreachable)
        setImportResult(
          `${t("settings.haImportFailed")} ${result.message ? `— ${result.message}` : ""}`.trim()
        );
      } else {
        // Pull imported devices into local IndexedDB
        await syncFromServer();
        const imported = result.imported || 0;
        const duplicates = result.skipped_duplicates || 0;
        const nonPhysical = result.skipped_non_physical || 0;
        const total = result.total_ha_devices || 0;

        let resultText: string;
        if (total === 0) {
          // HA returned zero devices — likely token/connection issue.
          resultText = t("settings.haImportNoDevices")
            || "No HA devices found — check HA connection & token";
        } else if (imported === 0 && duplicates === total) {
          // Everything already imported on a previous run.
          resultText = t("settings.haImportAllDuplicates", { total })
            || `All ${total} HA devices already imported (re-import uses device id, nothing new).`;
        } else if (imported === 0 && nonPhysical === total) {
          // Everything was filtered out.
          resultText = t("settings.haImportAllNonPhysical", { total })
            || `All ${total} HA entries were non-physical (automations, helpers) and skipped.`;
        } else {
          resultText = t("settings.haImportResult", {
            imported,
            duplicates,
            total,
          });
          if (nonPhysical > 0) {
            resultText += t("settings.haImportSkippedNonPhysical", {
              nonPhysical,
            });
          }
        }
        if (result.error_count > 0) {
          resultText += ` (${result.error_count} errors — see logs)`;
        }
        setImportResult(resultText);
      }
    } catch {
      setImportResult(t("settings.haImportFailed"));
    }
    setImporting(false);
  };

  const handleRecategorize = async () => {
    if (!confirmRecategorize) {
      setConfirmRecategorize(true);
      return;
    }
    setConfirmRecategorize(false);
    setRecategorizing(true);
    setRecategorizeResult(null);
    try {
      const res = await fetch(`${getApiBase()}/ha/recategorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(300000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      await syncFromServer();
      setRecategorizeResult(
        t("settings.recategorizeResult", {
          updated: result.updated || 0,
          unchanged: result.unchanged || 0,
          total: result.total || 0,
        })
      );
    } catch {
      setRecategorizeResult(t("settings.recategorizeFailed"));
    }
    setRecategorizing(false);
  };

  const handleMqttToggle = async () => {
    const newVal = !mqttEnabled;
    if (newVal && !confirmMqtt) {
      setConfirmMqtt(true);
      return;
    }
    setConfirmMqtt(false);
    // apiPost returns null on failure (no throw). Use server response as source of truth.
    const result = await apiPost<{ ok?: boolean; enabled?: boolean }>(
      "/mqtt/settings",
      { enabled: newVal }
    );
    if (result && result.ok) {
      setMqttEnabled(!!result.enabled);
      setMqttResult(null);
    } else {
      // Backend did not persist — re-sync from server and show error.
      const status = await apiGet<{ enabled?: boolean }>("/mqtt/status");
      setMqttEnabled(!!(status && status.enabled));
      setMqttResult(t("settings.mqttToggleFailed") || "MQTT toggle could not be saved");
    }
  };

  const handleMqttTest = async () => {
    setMqttTesting(true);
    setMqttResult(null);
    const result = await apiPost<any>("/mqtt/test", {});
    if (result && result.ok) {
      setMqttResult(t("settings.mqttTestPublishOk", { broker: result.broker }));
    } else if (result && result.connect_ok && !result.publish_ok) {
      // Connect works but publish blocked — most likely broker ACL.
      const reason = `${result.error_type || ""} ${result.error || ""}`.trim();
      setMqttResult(
        `${t("settings.mqttTestConnectOnly", { broker: result.broker })} ${reason ? `— ${reason}` : ""}`.trim()
      );
    } else if (result) {
      setMqttResult(`FAIL: ${result.broker} — ${result.error_type || ""} ${result.error || ""}`.trim());
    } else {
      setMqttResult(t("settings.mqttSyncFailed"));
    }
    setMqttTesting(false);
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
            <div class="mt-2 text-center">
              <p class="text-xs text-gray-500">{importResult}</p>
              {importResult === t("settings.haImportFailed") && (
                <a
                  href="#diagnostic-panel"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById("diagnostic-panel");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  class="inline-block mt-1 text-xs text-[#1F4E79] dark:text-blue-300 underline"
                >
                  🐛 {t("settings.reportProblem") || "Problem melden →"}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Re-categorize existing devices (v2.4.0) */}
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("settings.recategorize")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.recategorizeDesc")}
          </p>
          <button
            onClick={handleRecategorize}
            disabled={recategorizing || !hasHaSync}
            class={`w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 ${
              confirmRecategorize ? "bg-amber-500 hover:bg-amber-600" : "bg-[#1F4E79] hover:bg-[#1a4268]"
            }`}
          >
            {recategorizing
              ? t("settings.recategorizing")
              : confirmRecategorize
              ? t("common.confirm")
              : t("settings.recategorizeButton")}
            {!hasHaSync && " (Pro)"}
          </button>
          {confirmRecategorize && (
            <button
              onClick={() => setConfirmRecategorize(false)}
              class="w-full mt-1 text-xs text-gray-400 hover:text-gray-600 text-center"
            >
              {t("common.cancel")}
            </button>
          )}
          {recategorizeResult && (
            <p class="text-xs text-gray-500 mt-2 text-center">{recategorizeResult}</p>
          )}
        </div>

        {/* Category management (v2.4.0) */}
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("settings.categories")}
          </h3>
          <CategoryManager />
        </div>

        {/* Auto-categorize toggle (v2.4.0) */}
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("settings.autoCategorize")}
          </h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.autoCategorizeDesc")}
          </p>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600 dark:text-gray-300">
              {t("settings.autoCategorizeToggle")}
            </span>
            <button
              onClick={async () => {
                const newVal = !autoCategorize;
                setAutoCategorize(newVal);
                await apiPost("/settings/auto_categorize", { enabled: newVal });
              }}
              class={`relative w-11 h-6 rounded-full transition-colors ${
                autoCategorize ? "bg-[#4CAF50]" : "bg-gray-300"
              }`}
            >
              <span
                class={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  autoCategorize ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
          <details class="text-xs text-gray-500">
            <summary class="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
              {t("settings.autoCategorizeCriteria")}
            </summary>
            <ol class="mt-2 ml-4 list-decimal space-y-0.5">
              <li>{t("settings.autoCategorizeCriteria1")}</li>
              <li>{t("settings.autoCategorizeCriteria2")}</li>
              <li>{t("settings.autoCategorizeCriteria3")}</li>
              <li>{t("settings.autoCategorizeCriteria4")}</li>
            </ol>
          </details>
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
          <button
            onClick={handleMqttTest}
            disabled={mqttTesting}
            class="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 mb-2"
          >
            {mqttTesting ? "…" : (t("settings.mqttTestButton") || "Test MQTT connection")}
          </button>
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

        {/* Support & Diagnose section */}
        <DiagnosticPanel />

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
