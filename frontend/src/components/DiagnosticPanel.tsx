import { useState } from "preact/hooks";
import { apiPost } from "../api/client";
import { t } from "../i18n";

const GITHUB_REPO = "DerRegner-DE/ha-device-inventory";

export function DiagnosticPanel() {
  const [anonymize, setAnonymize] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  async function ensureReport(): Promise<string | null> {
    if (report) return report;
    setLoading(true);
    const result = await apiPost<{ markdown?: string }>(
      "/diagnostic",
      { anonymize_devices: anonymize }
    );
    setLoading(false);
    if (result && result.markdown) {
      setReport(result.markdown);
      return result.markdown;
    }
    return null;
  }

  async function handleToggleAnonymize() {
    setAnonymize((v) => !v);
    setReport(null); // force re-fetch
  }

  async function handleShowPreview() {
    if (!showPreview) {
      await ensureReport();
    }
    setShowPreview((v) => !v);
  }

  async function handleGithub() {
    const md = await ensureReport();
    if (!md) return;
    const title = encodeURIComponent("[Bug] ");
    const body = encodeURIComponent(
      `<!-- ${t("settings.diagnosticGithubHint") || "Bitte beschreibe das Problem oben. Der Diagnose-Bericht unten hilft bei der Fehlersuche."} -->\n\n\n\n---\n\n<details><summary>Diagnose-Bericht</summary>\n\n\`\`\`\n${md}\n\`\`\`\n\n</details>\n`
    );
    const url = `https://github.com/${GITHUB_REPO}/issues/new?title=${title}&body=${body}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleClipboard() {
    const md = await ensureReport();
    if (!md) return;
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: open a textarea-based copy? Just alert.
      setCopied(false);
    }
  }

  return (
    <div id="diagnostic-panel" class="p-4">
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {t("settings.diagnosticTitle") || "Support & Diagnose"}
      </h3>
      <p class="text-xs text-gray-400 mb-3">
        {t("settings.diagnosticDesc") ||
          "Probleme mit dem Add-on? Ein Diagnose-Bericht hilft dabei, Fehler schnell einzugrenzen."}
      </p>

      <div class="space-y-3 text-xs text-gray-600 dark:text-gray-300">
        <div>
          <div class="font-medium text-gray-800 dark:text-gray-200 mb-1">
            {t("settings.diagnosticContents") || "Was enthält der Bericht?"}
          </div>
          <ul class="list-disc pl-5 space-y-0.5">
            <li>{t("settings.diagnosticContents1") || "Add-on-Version, Architektur, Python-Version"}</li>
            <li>{t("settings.diagnosticContents2") || "MQTT-Status (aktiviert ja/nein, ohne Zugangsdaten)"}</li>
            <li>{t("settings.diagnosticContents3") || "Anzahl gespeicherter Geräte"}</li>
            <li>{t("settings.diagnosticContents4") || "Die letzten ~200 Log-Einträge des Backends"}</li>
          </ul>
        </div>

        <div>
          <div class="font-medium text-gray-800 dark:text-gray-200 mb-1">
            {t("settings.diagnosticRemoved") || "Was wird automatisch entfernt?"}
          </div>
          <ul class="list-disc pl-5 space-y-0.5">
            <li>{t("settings.diagnosticRemoved1") || "Passwörter und Tokens (MQTT, HA, Lizenz)"}</li>
            <li>{t("settings.diagnosticRemoved2") || "IP-Adressen (letzte zwei Oktette maskiert)"}</li>
            <li>{t("settings.diagnosticRemoved3") || "E-Mail-Adressen"}</li>
          </ul>
        </div>
      </div>

      <div class="flex items-center justify-between py-3 mt-3 border-t border-b border-gray-100 dark:border-gray-700">
        <div>
          <div class="text-sm text-gray-700 dark:text-gray-200">
            {t("settings.diagnosticAnonymize") || "Gerätenamen anonymisieren"}
          </div>
          <div class="text-xs text-gray-400">
            {t("settings.diagnosticAnonymizeDesc") ||
              "Ersetzt Namen in Logs durch „Gerät-001\" usw."}
          </div>
        </div>
        <button
          onClick={handleToggleAnonymize}
          class={`relative w-11 h-6 rounded-full transition-colors ${
            anonymize ? "bg-[#1F4E79]" : "bg-gray-300"
          }`}
        >
          <span
            class={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              anonymize ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <button
        onClick={handleShowPreview}
        class="text-xs text-[#1F4E79] dark:text-blue-300 mt-3 hover:underline"
      >
        {showPreview
          ? (t("settings.diagnosticHidePreview") || "▼ Vorschau ausblenden")
          : (t("settings.diagnosticShowPreview") || "▶ Vorschau des Berichts anzeigen")}
      </button>

      {showPreview && (
        <pre class="mt-2 p-3 bg-gray-900 text-gray-200 text-[11px] rounded-lg overflow-auto max-h-56 whitespace-pre-wrap">
{loading ? (t("settings.diagnosticLoading") || "Lade…") : report || ""}
        </pre>
      )}

      <div class="mt-4 space-y-3">
        <div>
          <button
            onClick={handleGithub}
            disabled={loading}
            class="w-full py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-medium hover:bg-[#1a4268] disabled:opacity-50"
          >
            🐛 {t("settings.diagnosticGithubButton") || "Problem auf GitHub melden"}
          </button>
          <p class="text-[11px] text-gray-400 mt-1 ml-1">
            {t("settings.diagnosticGithubDesc") ||
              "Empfohlen — nachverfolgbar. GitHub-Account nötig (kostenlos)."}
          </p>
        </div>

        <div>
          <button
            onClick={handleClipboard}
            disabled={loading}
            class="w-full py-2.5 rounded-xl border border-[#1F4E79] text-[#1F4E79] dark:text-blue-300 dark:border-blue-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            📋 {copied
              ? (t("settings.diagnosticCopied") || "Kopiert!")
              : (t("settings.diagnosticClipboardButton") || "In Zwischenablage kopieren")}
          </button>
          <p class="text-[11px] text-gray-400 mt-1 ml-1">
            {t("settings.diagnosticClipboardDesc") ||
              "Für Forum-Posts, E-Mail oder Chat. Kein Account nötig."}
          </p>
        </div>
      </div>

      <div class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-[11px] text-blue-900 dark:text-blue-200">
        ℹ️ {t("settings.diagnosticNote") ||
          "Der Bericht wird erst nach deinem Klick übertragen oder kopiert. Du kannst ihn vorher in der Vorschau vollständig einsehen."}
      </div>
    </div>
  );
}
