import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { apiGet, apiPost } from "../api/client";
import { db, type Device } from "../db/schema";
import { t } from "../i18n";
import { navigate } from "../utils/navigate";

/**
 * v3.1.0 (Roadmap Nr. 15): Geraet in ein anderes zusammenfuehren.
 *
 * Fuer Zwillinge ohne gemeinsame Kennung (und fuer Paare, die vor v3.1 schon
 * doppelt importiert wurden). Das gewaehlte Ziel bleibt, dieses Geraet geht in
 * den Papierkorb; Fotos, Anhaenge, Dokumente, Verlauf und leere Felder wandern
 * mit. Vorher legt der Server einen Schnappschuss an.
 */
export async function mergeInto(sourceUuid: string, targetUuid: string): Promise<boolean> {
  const res = await apiPost<{ device: Device }>(`/devices/${sourceUuid}/merge`, { into: targetUuid });
  if (!res?.device) return false;
  await db.devices.delete(sourceUuid);
  await db.photos.where("device_uuid").equals(sourceUuid).delete();
  // Lokalen Stand des Ziels erhalten (reviewed, nr ...) und mit dem Server mischen.
  const local = await db.devices.get(targetUuid);
  await db.devices.put({ ...(local ?? {}), ...res.device } as Device);
  return true;
}

export function MergeDialog({ source, onClose }: { source: Device; onClose: () => void }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Device | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    db.devices.toArray().then((all) => setDevices(all.filter((d) => d.uuid !== source.uuid)));
    searchRef.current?.focus();
  }, [source.uuid]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? devices.filter((d) =>
          [d.bezeichnung, d.hersteller, d.modell, d.standort_name, d.mac_adresse, d.integration]
            .filter(Boolean)
            .some((v) => (v as string).toLowerCase().includes(q)),
        )
      : devices;
    return [...list]
      .sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, undefined, { sensitivity: "base" }))
      .slice(0, 50);
  }, [devices, query]);

  const confirm = async () => {
    if (!target || busy) return;
    setBusy(true);
    setError(false);
    const ok = await mergeInto(source.uuid, target.uuid);
    setBusy(false);
    if (!ok) {
      setError(true);
      return;
    }
    onClose();
    navigate(`/devices/${target.uuid}`);
  };

  return (
    <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2" onClick={onClose}>
      <div
        class="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("merge.title")}</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("merge.desc", { name: source.bezeichnung })}
          </p>
        </div>
        <div class="p-4 space-y-2 overflow-y-auto flex-1">
          <input
            type="text"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder={t("merge.search")}
            class="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            ref={searchRef}
          />
          <ul class="divide-y divide-gray-100 dark:divide-gray-700">
            {shown.map((d) => (
              <li key={d.uuid}>
                <button
                  type="button"
                  onClick={() => setTarget(d)}
                  class={`w-full text-left px-2 py-2 rounded-lg text-sm ${
                    target?.uuid === d.uuid
                      ? "bg-[#1F4E79] text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <span class="font-medium">{d.bezeichnung}</span>
                  <span class={`block text-[11px] ${target?.uuid === d.uuid ? "text-white/70" : "text-gray-400"}`}>
                    {[d.integration, d.standort_name, d.mac_adresse].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {target && (
            <p class="text-xs text-gray-600 dark:text-gray-300">
              {t("merge.summary", { source: source.bezeichnung, target: target.bezeichnung })}
            </p>
          )}
          {error && <p class="text-xs text-red-600">{t("merge.failed")}</p>}
          <div class="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              class="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!target || busy}
              class="flex-1 py-2 rounded-xl bg-[#1F4E79] text-white text-sm font-medium disabled:opacity-40"
            >
              {busy ? "…" : t("merge.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** v3.1.0 (Roadmap Nr. 12): Dubletten mit gleicher MAC, fuer die Einstellungen. */
export function DuplicatesSection() {
  const [groups, setGroups] = useState<{ mac: string; devices: Device[] }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const r = await apiGet<{ groups: { mac: string; devices: Device[] }[] }>("/devices/duplicates/list");
    setGroups(r?.groups ?? []);
  };

  const merge = async (source: Device, target: Device) => {
    setBusy(source.uuid);
    await mergeInto(source.uuid, target.uuid);
    setBusy(null);
    await load();
  };

  return (
    <div class="space-y-2">
      <p class="text-xs text-gray-400">{t("duplicates.desc")}</p>
      {groups === null ? (
        <button
          type="button"
          onClick={load}
          class="px-3 py-1.5 rounded-lg text-xs border border-[#1F4E79] text-[#1F4E79] dark:text-[#7ab5d6] dark:border-[#7ab5d6]"
        >
          {t("duplicates.search")}
        </button>
      ) : groups.length === 0 ? (
        <p class="text-xs text-gray-500 dark:text-gray-400">{t("duplicates.none")}</p>
      ) : (
        <ul class="space-y-2">
          {groups.map((g) => {
            const [keep, ...rest] = g.devices;
            return (
              <li key={g.mac} class="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-xs">
                <div class="font-mono text-gray-400 mb-1">{g.mac}</div>
                <div class="text-gray-700 dark:text-gray-200">
                  <span class="font-medium">{keep.bezeichnung}</span>
                  <span class="text-gray-400"> · {keep.integration}</span>
                </div>
                {rest.map((d) => (
                  <div key={d.uuid} class="flex items-center justify-between gap-2 mt-1">
                    <span class="text-gray-600 dark:text-gray-300 truncate">
                      {d.bezeichnung} <span class="text-gray-400">· {d.integration}</span>
                    </span>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => merge(d, keep)}
                      class="shrink-0 px-2 py-1 rounded bg-[#1F4E79] text-white disabled:opacity-40"
                    >
                      {busy === d.uuid ? "…" : t("duplicates.mergeInto", { name: keep.bezeichnung })}
                    </button>
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
