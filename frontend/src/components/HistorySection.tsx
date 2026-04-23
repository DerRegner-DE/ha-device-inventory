import { useState, useEffect } from "preact/hooks";
import { apiGet, apiPost } from "../api/client";
import { t } from "../i18n";

interface HistoryEntry {
  id: number;
  field: string;
  old_value: string | null;
  new_value: string | null;
  source: string;
  changed_at: string;
}

/**
 * v2.5.0: Per-device change history with single-click revert.
 * Default-collapsed so it stays out of the way for the common case.
 */
export function HistorySection({ deviceUuid, onChanged }: {
  deviceUuid: string;
  onChanged?: () => void;
}) {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reverted, setReverted] = useState<number | null>(null);

  const refresh = () =>
    apiGet<{ items: HistoryEntry[] }>(`/devices/${deviceUuid}/history`)
      .then((r) => setItems(r?.items || []))
      .catch(() => setItems([]));

  const handleToggle = (e: Event) => {
    // Load only the first time the <details> is opened.
    if (!loaded && (e.target as HTMLDetailsElement).open) {
      setLoaded(true);
      refresh();
    }
  };

  const handleRevert = async (id: number) => {
    if (reverted === id) return;
    setBusy(true);
    const res = await apiPost<{ status: string }>(
      `/devices/${deviceUuid}/history/${id}/revert`,
      {},
    );
    if (res?.status === "ok") {
      setReverted(id);
      await refresh();
      onChanged?.();
    }
    setBusy(false);
  };

  const formatValue = (v: string | null) =>
    v === null ? <em class="text-gray-400">–</em> : <span class="font-mono text-[11px]">{v}</span>;

  return (
    <details
      onToggle={handleToggle}
      class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 group"
    >
      <summary class="p-4 cursor-pointer list-none flex items-center justify-between">
        <h3 class="text-xs font-medium text-gray-400 dark:text-gray-500">
          {t("history.sectionTitle")}
        </h3>
        <svg class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div class="px-4 pb-4">
        {!loaded ? null : items.length === 0 ? (
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {t("history.empty")}
          </p>
        ) : (
          <div class="space-y-2">
            {items.map((h) => {
              const date = new Date(h.changed_at + (h.changed_at.endsWith("Z") ? "" : "Z"));
              return (
                <div
                  key={h.id}
                  class="flex items-start gap-3 text-xs border-b border-gray-100 dark:border-gray-700 last:border-b-0 pb-2 last:pb-0"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class="font-medium text-gray-700 dark:text-gray-300">
                        {t(`history.field.${h.field}`) || h.field}
                      </span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {t(`history.source.${h.source}`) || h.source}
                      </span>
                    </div>
                    <div class="text-gray-600 dark:text-gray-400">
                      {formatValue(h.old_value)}
                      <span class="mx-1 text-gray-400">→</span>
                      {formatValue(h.new_value)}
                    </div>
                    <div class="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {date.toLocaleString()}
                    </div>
                  </div>
                  {h.source !== "revert" && (
                    <button
                      onClick={() => handleRevert(h.id)}
                      disabled={busy}
                      class="text-[11px] text-[#1F4E79] dark:text-[#7ab5d6] hover:underline disabled:opacity-50 shrink-0"
                      title={t("history.revertHint")}
                    >
                      {t("history.revertButton")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </details>
  );
}
