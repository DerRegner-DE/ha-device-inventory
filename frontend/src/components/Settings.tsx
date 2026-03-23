import { useState } from "preact/hooks";
import { db } from "../db/schema";
import { syncPendingQueue, getPendingCount } from "../api/client";
import { t, setLanguage, getLanguage, getAvailableLanguages } from "../i18n";
import { useLanguage } from "../i18n";
import { LicenseSettings } from "./LicenseSettings";
import { hasFeature } from "../license";
import { useLicense } from "../license/useLicense";

export function Settings() {
  useLanguage();
  const license = useLicense();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [currentLang, setCurrentLang] = useState(getLanguage());

  const isPro = license.valid && license.tier === "pro";
  const hasMultilingual = hasFeature("multilingual");

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
    if (!confirm(t("settings.clearConfirm"))) {
      return;
    }
    setClearing(true);
    await db.devices.clear();
    await db.photos.clear();
    await db.syncQueue.clear();
    setClearing(false);
    alert(t("settings.clearDone"));
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
      <h2 class="text-lg font-semibold text-gray-800">{t("settings.title")}</h2>

      <div class="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {/* License section */}
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 mb-3">{t("license.title")}</h3>
          <LicenseSettings />
        </div>

        {/* Language section */}
        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 mb-1">{t("settings.language")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.languageDesc")}
          </p>
          <select
            value={currentLang}
            onChange={(e) => handleLanguageChange((e.target as HTMLSelectElement).value)}
            class="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79] appearance-none"
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

        <div class="p-4">
          <h3 class="text-sm font-medium text-gray-700 mb-1">{t("settings.sync")}</h3>
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
          <h3 class="text-sm font-medium text-gray-700 mb-1">{t("settings.export")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.exportDesc")}
          </p>
          <button
            onClick={handleExport}
            class="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t("settings.exportButton")}
          </button>
        </div>

        <div class="p-4">
          <h3 class="text-sm font-medium text-red-600 mb-1">{t("settings.clearData")}</h3>
          <p class="text-xs text-gray-400 mb-3">
            {t("settings.clearDataDesc")}
          </p>
          <button
            onClick={handleClearData}
            disabled={clearing}
            class="w-full py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {clearing ? t("settings.clearing") : t("settings.clearButton")}
          </button>
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
