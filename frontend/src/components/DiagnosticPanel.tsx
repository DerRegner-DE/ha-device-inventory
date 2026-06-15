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
  const [copyFailed, setCopyFailed] = useState(false);
  const [issueUrl, setIssueUrl] = useState<string | null>(null);

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

  // GH #19: navigator.clipboard gibt es nur im Secure Context (HTTPS oder
  // localhost). Sehr viele greifen per http://<LAN-IP>:8123 auf HA zu — dort
  // ist navigator.clipboard undefined und writeText wirft. Daher zusätzlich
  // das Legacy-execCommand-Verfahren, das auch über HTTP funktioniert.
  async function copyText(text: string): Promise<boolean> {
    try {
      if (window.isSecureContext && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // unten auf Legacy-Verfahren zurückfallen
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
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

  function buildIssueUrl(): string {
    const title = encodeURIComponent("[Bug] ");
    const bodyHint =
      t("settings.diagnosticGithubPasteHint") ||
      "Beschreibe das Problem hier. Der Diagnose-Bericht liegt in deiner Zwischenablage — bitte zwischen die ``` unten einfügen (Strg+V / Cmd+V).";
    const bodyTemplate = `${bodyHint}\n\n---\n\n<details><summary>Diagnose-Bericht (hier einfügen)</summary>\n\n\`\`\`\n\n\`\`\`\n\n</details>\n`;
    const body = encodeURIComponent(bodyTemplate);
    return `https://github.com/${GITHUB_REPO}/issues/new?title=${title}&body=${body}`;
  }

  async function handleGithub() {
    // GH #19: Die Issue-Seite öffnen, BEVOR irgendein await läuft — so ist die
    // transiente User-Aktivierung des Klicks noch frisch und der Popup-Blocker
    // lässt das Fenster eher durch. Die URL braucht den Bericht nicht (leere
    // Vorlage, GitHub lehnt lange URLs mit HTTP 414 ab). "noopener" im
    // Feature-String liefert per Spec immer null, daher opener manuell kappen.
    const url = buildIssueUrl();
    const win = window.open(url, "_blank");
    if (win) {
      win.opener = null;
    }
    // Sichtbarer Anker als Fallback — immer einblenden, unabhängig davon, ob
    // window.open oder das Kopieren geklappt hat. Ein echter Link-Tap ist eine
    // frische User-Geste, die Popup-Blocker durchlassen und die Companion-App
    // an den System-Browser weiterreicht.
    setIssueUrl(url);

    // Bericht best-effort in die Zwischenablage. Das Kopieren ist NICHT
    // Voraussetzung fürs Öffnen (GH #19: auf http://<LAN-IP>:8123 ist die
    // Clipboard-API nicht verfügbar). Scheitert es, Bericht zum manuellen
    // Markieren einblenden statt in einer Alert-Sackgasse zu enden.
    const md = await ensureReport();
    if (!md) return;
    const ok = await copyText(md);
    setCopied(ok);
    setCopyFailed(!ok);
    if (ok) {
      setTimeout(() => setCopied(false), 2500);
    } else {
      setShowPreview(true);
    }
  }

  async function handleClipboard() {
    const md = await ensureReport();
    if (!md) return;
    const ok = await copyText(md);
    setCopied(ok);
    setCopyFailed(!ok);
    if (ok) {
      setTimeout(() => setCopied(false), 2500);
    } else {
      // Kein stiller Fehlschlag: Bericht einblenden, damit der User ihn
      // manuell markieren und mit Strg+C / Cmd+C kopieren kann.
      setShowPreview(true);
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

      {copyFailed && (
        <p class="mt-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-[11px] text-amber-800 dark:text-amber-200">
          {t("settings.diagnosticCopyManual") ||
            "Automatisches Kopieren ist über eine HTTP-Verbindung nicht möglich. Der Bericht ist unten eingeblendet — bitte markieren und mit Strg+C / Cmd+C kopieren."}
        </p>
      )}

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
          {issueUrl && (
            <p class="text-[11px] text-gray-500 dark:text-gray-300 mt-1.5 ml-1">
              {t("settings.diagnosticGithubOpenFallback") ||
                "GitHub hat sich nicht geöffnet?"}{" "}
              <a
                href={issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="text-[#1F4E79] dark:text-blue-300 underline font-medium"
              >
                {t("settings.diagnosticGithubOpenLink") ||
                  "Issue-Seite manuell öffnen"}
              </a>
            </p>
          )}
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
