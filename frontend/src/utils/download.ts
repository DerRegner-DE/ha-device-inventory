/**
 * Datei-Download aus der laufenden Seite heraus.
 *
 * Warum nicht einfach `window.open(url)`: Chrome behandelt das als Navigation
 * zu einer http-Adresse und blockiert den Download stillschweigend
 * ("Unsicherer Download blockiert"), sobald Home Assistant ueber
 * http://<LAN-IP>:8123 laeuft -- also bei den meisten Nutzern. Der Kunde
 * klickt auf Export und es passiert scheinbar nichts.
 *
 * Der Umweg ueber `fetch` + `blob:` vermeidet das: Ein Blob-Link erbt den
 * Ursprung der Seite und faellt nicht unter die Regel fuer unsichere
 * Downloads. Gefunden in der Testrunde am 05.09.2026.
 */

/** Dateiname aus dem Content-Disposition-Header ziehen. */
function filenameFromResponse(resp: Response, fallback: string): string {
  const disposition = resp.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (!match) return fallback;
  try {
    return decodeURIComponent(match[1]).trim();
  } catch {
    return match[1].trim();
  }
}

/**
 * Laedt `url` und bietet das Ergebnis als Datei an.
 *
 * Gibt `true` zurueck, wenn der Blob-Weg geklappt hat. Schlaegt er fehl --
 * etwa weil der Browser kein `URL.createObjectURL` kann -- wird auf
 * `window.open` zurueckgefallen und `false` gemeldet, damit der Aufrufer
 * einen Hinweis anzeigen kann.
 */
export async function downloadFile(url: string, fallbackName: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { credentials: "same-origin" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filenameFromResponse(resp, fallbackName);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Erst freigeben, wenn der Browser den Download uebernommen hat.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    return true;
  } catch {
    window.open(url, "_blank");
    return false;
  }
}
