import { useState, useEffect, useMemo } from "preact/hooks";
import { apiPost, syncFromServer } from "../api/client";
import { t } from "../i18n";

interface Change {
  uuid: string;
  bezeichnung: string | null;
  hersteller: string | null;
  modell: string | null;
  old_type: string | null;
  new_type: string;
  evidence: string;
  /** client-only: user unchecked this row → don't apply */
  excluded?: boolean;
}

interface PreviewData {
  changes: Change[];
  unchanged: number;
  skipped_no_ha: number;
  total: number;
}

interface Props {
  /** If provided, preview runs only on these UUIDs (bulk-action from list). */
  uuids?: string[];
  onClose: () => void;
  /** Called after a successful apply so the parent can refresh its state. */
  onApplied?: () => void;
}

/**
 * Full-screen modal that shows the classifier's diff as a table with
 * checkboxes and an evidence column. The user reviews, unchecks the
 * fishy rows, and clicks Apply. Backed by
 * ``/api/ha/recategorize/preview`` and ``/api/ha/recategorize/apply``.
 */
export function RecategorizePreview({ uuids, onClose, onApplied }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PreviewData | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const body = uuids ? { uuids } : {};
        const res = await apiPost<PreviewData>(
          "/ha/recategorize/preview",
          body,
          undefined,
          undefined,
          300000,
        );
        if (!res) {
          setError(t("recategorize.previewFailed"));
        } else {
          setData(res);
          // Default: every proposed change is pre-selected.
          setChecked(new Set(res.changes.map((c) => c.uuid)));
        }
      } catch {
        setError(t("recategorize.previewFailed"));
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data.changes;
    return data.changes.filter((c) =>
      [c.bezeichnung, c.hersteller, c.modell, c.old_type, c.new_type, c.evidence]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [data, filter]);

  const toggle = (uuid: string) => {
    const next = new Set(checked);
    if (next.has(uuid)) next.delete(uuid);
    else next.add(uuid);
    setChecked(next);
  };

  const toggleAllFiltered = () => {
    const next = new Set(checked);
    const allChecked = filtered.every((c) => next.has(c.uuid));
    if (allChecked) filtered.forEach((c) => next.delete(c.uuid));
    else filtered.forEach((c) => next.add(c.uuid));
    setChecked(next);
  };

  const handleApply = async () => {
    if (!data || checked.size === 0) return;
    setApplying(true);
    setResult(null);
    const items = data.changes
      .filter((c) => checked.has(c.uuid))
      .map((c) => ({ uuid: c.uuid, expected_new_type: c.new_type }));
    const res = await apiPost<{
      applied: number;
      skipped_toctou: number;
      total_requested: number;
    }>("/ha/recategorize/apply", { items }, undefined, undefined, 300000);
    if (res) {
      await syncFromServer();
      setResult(
        t("recategorize.applyResult", {
          applied: res.applied,
          skipped: res.skipped_toctou,
          total: res.total_requested,
        }),
      );
      onApplied?.();
    } else {
      setResult(t("recategorize.applyFailed"));
    }
    setApplying(false);
  };

  return (
    <div
      class="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-2"
      onClick={onClose}
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t("recategorize.title")}
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t("recategorize.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            class="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500"
            aria-label={t("common.close")}
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-4 overflow-y-auto flex-1">
          {loading && (
            <p class="text-sm text-gray-500 text-center py-8">
              {t("recategorize.computing")}
            </p>
          )}
          {error && (
            <p class="text-sm text-red-500 text-center py-8">{error}</p>
          )}
          {data && data.changes.length === 0 && (
            <p class="text-sm text-gray-500 text-center py-8">
              {t("recategorize.noChanges", {
                unchanged: data.unchanged,
                total: data.total,
              })}
            </p>
          )}
          {data && data.changes.length > 0 && (
            <div>
              <div class="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={filter}
                  onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
                  placeholder={t("recategorize.filterPlaceholder")}
                  class="flex-1 px-3 py-1.5 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
                <button
                  onClick={toggleAllFiltered}
                  class="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                >
                  {filtered.every((c) => checked.has(c.uuid))
                    ? t("bulk.deselectAll")
                    : t("bulk.selectAll")}
                </button>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t("recategorize.summary", {
                  proposed: data.changes.length,
                  selected: checked.size,
                  unchanged: data.unchanged,
                })}
              </p>
              <div class="space-y-1">
                {filtered.map((c) => {
                  const isChecked = checked.has(c.uuid);
                  return (
                    <label
                      key={c.uuid}
                      class={`flex items-start gap-3 p-2 rounded-lg border cursor-pointer ${
                        isChecked
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(c.uuid)}
                        class="mt-1"
                      />
                      <div class="flex-1 min-w-0 text-sm">
                        <div class="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {c.bezeichnung || "(unnamed)"}
                          {(c.hersteller || c.modell) && (
                            <span class="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
                              {[c.hersteller, c.modell].filter(Boolean).join(" / ")}
                            </span>
                          )}
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                          <span class="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {c.old_type || "—"}
                          </span>
                          <span class="text-gray-400">→</span>
                          <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                            {c.new_type}
                          </span>
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                          {c.evidence}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <button
            onClick={onClose}
            class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t("common.cancel")}
          </button>
          <div class="flex-1" />
          {result && (
            <span class="text-xs text-gray-500 dark:text-gray-400 mr-2">{result}</span>
          )}
          <button
            onClick={handleApply}
            disabled={applying || !data || checked.size === 0}
            class="px-4 py-2 rounded-xl bg-[#1F4E79] text-white text-sm font-medium hover:bg-[#1a4268] disabled:opacity-40"
          >
            {applying
              ? t("recategorize.applying")
              : t("recategorize.applyButton", { count: checked.size })}
          </button>
        </div>
      </div>
    </div>
  );
}
