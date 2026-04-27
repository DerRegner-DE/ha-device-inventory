import { useState } from "preact/hooks";
import { db } from "../db/schema";
import { syncPendingQueue, getPendingCount, apiPost, apiGet, syncFromServer } from "../api/client";
import { t, setLanguage, getLanguage, getAvailableLanguages } from "../i18n";
import { useLanguage } from "../i18n";
import { LicenseSettings } from "./LicenseSettings";
import { DiagnosticPanel } from "./DiagnosticPanel";
import { CategoryManager } from "./CategoryManager";
import { SnapshotManager } from "./SnapshotManager";
import { TrashView } from "./TrashView";
import { RecategorizePreview } from "./RecategorizePreview";
import { ExportPicker } from "./ExportPicker";
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
  // v2.5.3: live progress for the async HA-import poll loop.
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmMqtt, setConfirmMqtt] = useState(false);
  const [mqttEnabled, setMqttEnabled] = useState(false);
  const [mqttSyncing, setMqttSyncing] = useState(false);
  const [mqttResult, setMqttResult] = useState<string | null>(null);
  const [mqttLoaded, setMqttLoaded] = useState(false);
  // v2.6.0 (Forum-Bericht): MQTT discovery cleanup. Two scopes —
  // "orphans" (silent default) and "all" (confirm because it wipes
  // every entity we ever published, including the ones still in the
  // active inventory).
  const [mqttPurging, setMqttPurging] = useState(false);
  const [confirmPurgeAll, setConfirmPurgeAll] = useState(false);
  const [mqttTesting, setMqttTesting] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [recategorizeResult, setRecategorizeResult] = useState<string | null>(null);
  const [confirmRecategorize, setConfirmRecategorize] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exportPickerOpen, setExportPickerOpen] = useState(false);
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
    // v2.5.3: Bug 1A — repopulate from the server so the list doesn't look
    // mysteriously empty. The old behaviour left everything blank, which
    // users mistook for a destructive "delete all devices" action.
    try {
      await syncFromServer();
    } catch {
      // If we're offline, the list will fill on the next sync tick. No
      // error UI — the button text already flipped back to its default.
    }
    setClearing(false);
  };

  // v2.5.3: Bug 1B — real "delete every device" for users who actually want
  // a fresh start (typical case: after a bad HA-import cycle pre-v2.5.2 that
  // left hundreds of self-import dubletten). Server-side soft-delete, 30-day
  // trash retention.
  const [wiping, setWiping] = useState(false);
  const [wipeResult, setWipeResult] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const handleWipeAll = async () => {
    if (!confirmWipe) {
      setConfirmWipe(true);
      return;
    }
    setConfirmWipe(false);
    setWiping(true);
    setWipeResult(null);
    try {
      const res = await apiPost<{ deleted: number }>("/devices/bulk/delete-all", {});
      if (res && typeof res.deleted === "number") {
        setWipeResult(t("settings.wipeDone", { count: res.deleted }));
        await db.devices.clear();
        await db.photos.clear();
        await db.syncQueue.clear();
      } else {
        setWipeResult(t("settings.wipeFailed"));
      }
    } catch {
      setWipeResult(t("settings.wipeFailed"));
    }
    setWiping(false);
  };

  const handleImportHA = async () => {
    if (!confirmImport) {
      setConfirmImport(true);
      return;
    }
    setConfirmImport(false);
    setImporting(true);
    setImportResult(null);
    setImportProgress(null);
    try {
      // v2.5.3: async import — kick off, then poll /status. The old
      // synchronous POST ran into HA Ingress timeouts (~60 s) on large
      // device registries and returned 502 Bad Gateway while the import
      // itself quietly finished.
      const start = await fetch(`${getApiBase()}/ha/import-devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(30000),
      });
      if (!start.ok) throw new Error(`HTTP ${start.status}`);

      // Poll /status until the task finishes (running flips to false).
      const deadline = Date.now() + 30 * 60 * 1000; // absolute cap at 30 min
      let state: any = null;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const res = await fetch(`${getApiBase()}/ha/import-devices/status`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) continue; // transient hiccup, keep polling
        state = await res.json();
        if (state.stage === "processing" && state.total > 0) {
          setImportProgress({ current: state.progress, total: state.total });
        }
        if (!state.running) break;
      }

      if (!state) {
        setImportResult(t("settings.haImportFailed"));
      } else if (state.stage === "error") {
        setImportResult(
          `${t("settings.haImportFailed")}${state.error ? ` — ${state.error}` : ""}`.trim()
        );
      } else if (state.stage !== "done") {
        setImportResult(t("settings.haImportFailed"));
      } else {
        const result = state.result || {};
        // Pull imported devices into local IndexedDB
        await syncFromServer();
        const imported = result.imported || 0;
        const duplicates = result.skipped_duplicates || 0;
        const nonPhysical = result.skipped_non_physical || 0;
        const total = result.total_ha_devices || 0;

        let resultText: string;
        if (total === 0) {
          resultText = t("settings.haImportNoDevices")
            || "No HA devices found — check HA connection & token";
        } else if (imported === 0 && duplicates === total) {
          resultText = t("settings.haImportAllDuplicates", { total })
            || `All ${total} HA devices already imported.`;
        } else if (imported === 0 && nonPhysical === total) {
          resultText = t("settings.haImportAllNonPhysical", { total })
            || `All ${total} HA entries were non-physical.`;
        } else {
          resultText = t("settings.haImportResult", { imported, duplicates, total });
          if (nonPhysical > 0) {
            resultText += t("settings.haImportSkippedNonPhysical", { nonPhysical });
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
    setImportProgress(null);
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
    } else if (result) {
      // Compose: headline (connect-only vs fail) + raw error + translated hint.
      const reason = `${result.error_type || ""} ${result.error || ""}`.trim();
      const hintKey: string | undefined = result.hint;
      const hint = hintKey ? t(hintKey) : "";
      const head = result.connect_ok && !result.publish_ok
        ? t("settings.mqttTestConnectOnly", { broker: result.broker })
        : `FAIL: ${result.broker}`;
      const parts = [head];
      if (reason) parts.push(`— ${reason}`);
      if (hint && hint !== hintKey) parts.push(`\n${hint}`);
      setMqttResult(parts.join(" "));
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

  // v2.6.0 (Forum-Bericht): clean retained discovery topics on the broker.
  // scope="orphans" silently removes config payloads for UUIDs no longer
  // in our DB. scope="all" wipes the lot — useful right before the user
  // disables MQTT-Discovery for good.
  const handleMqttPurge = async (scope: "orphans" | "all") => {
    setMqttPurging(true);
    setMqttResult(null);
    try {
      const result = await apiPost<any>(
        "/mqtt/purge-discovery", { scope }, undefined, undefined, 30000,
      );
      if (result) {
        if (result.error) {
          setMqttResult(`${t("settings.mqttPurgeFailed")}: ${result.error}`);
        } else {
          setMqttResult(
            t("settings.mqttPurgeResult", {
              purged: result.purged || 0,
              discovered: result.discovered || 0,
              scope: scope === "all" ? t("settings.mqttPurgeScopeAll") : t("settings.mqttPurgeScopeOrphans"),
            }),
          );
        }
      }
    } catch {
      setMqttResult(t("settings.mqttPurgeFailed"));
    }
    setMqttPurging(false);
    setConfirmPurgeAll(false);
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
      <div class="flex items-baseline justify-between gap-2">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">{t("settings.title")}</h2>
        {/* v2.6.0 (Forum): direkter Link aufs Handbuch — wer im Settings
            auf einen Toggle starrt und sich fragt "was tut das?", findet
            so die Erklärung in einem Klick. */}
        <a
          href="https://github.com/DerRegner-DE/ha-device-inventory/blob/main/docs/HANDBUCH.md"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-[#1F4E79] dark:text-[#7ab5d6] hover:underline inline-flex items-center gap-1"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          {t("settings.openHandbook")}
        </a>
      </div>

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
          {/* v2.5.3: live progress bar while an async import is polling. */}
          {importing && importProgress && importProgress.total > 0 && (
            <div class="mt-2">
              <div class="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                <span>
                  {importProgress.current} / {importProgress.total}
                </span>
                <span>
                  {Math.round((importProgress.current / importProgress.total) * 100)}%
                </span>
              </div>
              <div class="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-[#4CAF50] transition-all"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
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

        {/* Re-categorize existing devices (v2.4.0) + Preview (v2.4.3) */}
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("settings.recategorize")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.recategorizeDesc")}
          </p>
          {/* Primary button (v2.4.3): preview first, cherry-pick, then apply. */}
          <button
            onClick={() => setPreviewOpen(true)}
            disabled={!hasHaSync}
            class="w-full py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-medium hover:bg-[#1a4268] disabled:opacity-50 mb-2"
          >
            {t("recategorize.previewButton")}
            {!hasHaSync && " (Pro)"}
          </button>
          {/* Legacy "apply immediately" fallback kept behind a disclosure. */}
          <details class="text-xs text-gray-500 dark:text-gray-400">
            <summary class="cursor-pointer select-none">
              {t("recategorize.legacyDisclosure")}
            </summary>
            <div class="mt-2">
              <button
                onClick={handleRecategorize}
                disabled={recategorizing || !hasHaSync}
                class={`w-full py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 ${
                  confirmRecategorize ? "bg-amber-500 hover:bg-amber-600" : "bg-gray-500 hover:bg-gray-600"
                }`}
              >
                {recategorizing
                  ? t("settings.recategorizing")
                  : confirmRecategorize
                  ? t("common.confirm")
                  : t("settings.recategorizeButton")}
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
          </details>
        </div>

        {previewOpen && (
          <RecategorizePreview
            onClose={() => setPreviewOpen(false)}
            onApplied={() => { /* list refresh handled by syncFromServer in modal */ }}
          />
        )}

        {/* Category management (v2.4.0) */}
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("settings.categories")}
          </h3>
          <CategoryManager />
        </div>

        {/* DB snapshots (v2.4.2) — lists and restores pre-action snapshots
            created automatically before destructive bulk operations.
            Default-collapsed (v2.4.4, forum feedback) — most sessions
            don't need it and it used to push everything else down. */}
        <details class="p-4 group">
          <summary class="cursor-pointer list-none flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("settings.snapshots")}
            </h3>
            <svg class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <p class="text-xs text-gray-400 mt-2 mb-3">
            {t("settings.snapshotsDesc")}
          </p>
          <SnapshotManager />
        </details>

        {/* Trash view (v2.4.2) — soft-deleted devices with restore.
            Default-collapsed (v2.4.4). */}
        <details class="p-4 group">
          <summary class="cursor-pointer list-none flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("settings.trash")}
            </h3>
            <svg class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <p class="text-xs text-gray-400 mt-2 mb-3">
            {t("settings.trashDesc")}
          </p>
          <TrashView />
        </details>

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
          {/* v2.6.0 (Forum-Bericht): Beispiel-Box damit Einsteiger ein
              konkretes Bild davon haben, was passiert, wenn der Toggle
              aktiviert wird, und wo die HA-Entities danach auftauchen. */}
          <details class="mb-3 text-xs text-gray-500 dark:text-gray-400">
            <summary class="cursor-pointer text-[#1F4E79] dark:text-[#7ab5d6] hover:underline">
              {t("settings.mqttExampleSummary")}
            </summary>
            <div class="mt-2 space-y-1 pl-1 leading-relaxed">
              <p>{t("settings.mqttExample1")}</p>
              <p>{t("settings.mqttExample2")}</p>
              <p>{t("settings.mqttExample3")}</p>
              <p class="text-amber-600 dark:text-amber-400">{t("settings.mqttExampleCleanup")}</p>
            </div>
          </details>
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
          {/* v2.6.0 (Forum-Bericht) — MQTT-Discovery cleanup. Sichtbar
              auch ohne aktivierten Toggle, weil das genau die Situation
              ist, in der man verwaiste Topics aufräumen will (User hat
              MQTT erst deaktiviert und sieht nun die Phantom-Geräte). */}
          <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <p class="text-xs text-gray-400 dark:text-gray-500">
              {t("settings.mqttPurgeDesc")}
            </p>
            <button
              type="button"
              onClick={() => handleMqttPurge("orphans")}
              disabled={mqttPurging}
              class="w-full py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {mqttPurging
                ? t("settings.mqttPurging")
                : t("settings.mqttPurgeOrphansButton")}
            </button>
            <button
              type="button"
              onClick={() =>
                confirmPurgeAll
                  ? handleMqttPurge("all")
                  : setConfirmPurgeAll(true)
              }
              disabled={mqttPurging}
              class={`w-full py-2 rounded-xl text-xs font-medium disabled:opacity-50 ${
                confirmPurgeAll
                  ? "bg-red-700 text-white hover:bg-red-800 ring-2 ring-red-300"
                  : "border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              }`}
            >
              {confirmPurgeAll
                ? t("settings.mqttPurgeAllConfirm")
                : t("settings.mqttPurgeAllButton")}
            </button>
            {confirmPurgeAll && !mqttPurging && (
              <button
                type="button"
                onClick={() => setConfirmPurgeAll(false)}
                class="w-full text-xs text-gray-400 hover:text-gray-600"
              >
                {t("common.cancel")}
              </button>
            )}
          </div>
          {mqttResult && (
            <p class="text-xs text-gray-500 mt-2 text-center whitespace-pre-line">{mqttResult}</p>
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
              onClick={() => setExportPickerOpen(true)}
              class="flex-1 py-2.5 rounded-xl bg-[#e74c3c] text-white text-sm font-medium hover:bg-[#c0392b]"
            >
              {t("settings.pdfXlsxExportButton")}
            </button>
          </div>
        </div>

        {exportPickerOpen && (
          <ExportPicker onClose={() => setExportPickerOpen(false)} />
        )}

        {/* Support & Diagnose section */}
        <DiagnosticPanel />

        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("settings.clearData")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.clearDataDesc")}
          </p>
          <button
            onClick={handleClearData}
            disabled={clearing}
            class={`w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 ${
              confirmClear
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
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

        {/* v2.5.3: Bug 1B — danger zone: wipe all devices on the server */}
        <div class="p-4 border-t border-red-100 dark:border-red-900/30">
          <h3 class="text-sm font-medium text-red-600 mb-1">{t("settings.wipeData")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.wipeDataDesc")}
          </p>
          <button
            onClick={handleWipeAll}
            disabled={wiping}
            class={`w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 ${
              confirmWipe
                ? "bg-red-500 text-white hover:bg-red-600"
                : "border border-red-200 text-red-600 hover:bg-red-50"
            }`}
          >
            {wiping
              ? t("settings.wiping")
              : confirmWipe
              ? t("settings.wipeConfirm")
              : t("settings.wipeButton")}
          </button>
          {confirmWipe && (
            <button
              onClick={() => setConfirmWipe(false)}
              class="w-full mt-1 text-xs text-gray-400 hover:text-gray-600 text-center"
            >
              {t("common.cancel")}
            </button>
          )}
          {wipeResult && (
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">{wipeResult}</p>
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
