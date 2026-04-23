import { useState, useEffect } from "preact/hooks";
import { apiGet, apiPost, apiDelete } from "../api/client";
import { t } from "../i18n";

interface Snapshot {
  filename: string;
  op: string;
  created_at: string | null;
  size_bytes: number;
  note: string | null;
}

/** Friendly label for the op slug that was used when the snapshot was taken.
 *  Falls back to the raw op string for unknown values. */
function opLabel(op: string): string {
  const key = `snapshots.op.${op}`;
  const translated = t(key);
  return translated && translated !== key ? translated : op;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatAge(iso: string | null): string {
  if (!iso) return "—";
  const created = new Date(iso).getTime();
  const diffSec = (Date.now() - created) / 1000;
  if (diffSec < 60) return t("snapshots.ageJustNow") || "just now";
  if (diffSec < 3600)
    return t("snapshots.ageMinutes", { count: Math.floor(diffSec / 60) })
      || `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400)
    return t("snapshots.ageHours", { count: Math.floor(diffSec / 3600) })
      || `${Math.floor(diffSec / 3600)} h ago`;
  return t("snapshots.ageDays", { count: Math.floor(diffSec / 86400) })
    || `${Math.floor(diffSec / 86400)} d ago`;
}

export function SnapshotManager() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function refresh() {
    const data = await apiGet<{ snapshots: Snapshot[] }>("/snapshots");
    setSnapshots(data?.snapshots || []);
    setLoading(false);
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  const handleRestore = async (filename: string) => {
    if (confirmId !== filename) {
      setConfirmId(filename);
      return;
    }
    setConfirmId(null);
    setRestoringId(filename);
    setResult(null);
    const res = await apiPost<{ restored: string; pre_restore_snapshot: string | null }>(
      `/snapshots/${encodeURIComponent(filename)}/restore`,
      {},
      undefined,
      undefined,
      60000,
    );
    if (res && res.restored) {
      setResult(
        t("snapshots.restoreSuccess", { name: res.pre_restore_snapshot || "—" })
      );
      await refresh();
    } else {
      setResult(t("snapshots.restoreFailed"));
    }
    setRestoringId(null);
  };

  const handleDelete = async (filename: string) => {
    if (deleteConfirmId !== filename) {
      setDeleteConfirmId(filename);
      return;
    }
    setDeleteConfirmId(null);
    const ok = await apiDelete(`/snapshots/${encodeURIComponent(filename)}`);
    if (ok) await refresh();
    else setResult(t("snapshots.deleteFailed"));
  };

  if (loading) {
    return <p class="text-xs text-gray-500">{t("snapshots.loading")}</p>;
  }

  if (snapshots.length === 0) {
    return (
      <p class="text-xs text-gray-500">
        {t("snapshots.empty")}
      </p>
    );
  }

  return (
    <div class="space-y-2">
      {snapshots.map((s) => {
        const isConfirming = confirmId === s.filename;
        const isDeleteConfirming = deleteConfirmId === s.filename;
        const isRestoring = restoringId === s.filename;
        return (
          <div
            key={s.filename}
            class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex-1 min-w-0">
                <div class="font-medium text-gray-800 dark:text-gray-200">
                  {opLabel(s.op)}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatAge(s.created_at)} · {formatSize(s.size_bytes)}
                </div>
                {s.note && (
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                    {s.note}
                  </div>
                )}
              </div>
            </div>
            <div class="flex gap-2">
              <button
                onClick={() => handleRestore(s.filename)}
                disabled={isRestoring}
                class={`flex-1 py-2 rounded-lg text-xs font-medium ${
                  isConfirming
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                } disabled:opacity-50`}
              >
                {isRestoring
                  ? t("snapshots.restoring")
                  : isConfirming
                  ? t("snapshots.restoreConfirm")
                  : t("snapshots.restoreButton")}
              </button>
              <button
                onClick={() => handleDelete(s.filename)}
                disabled={isRestoring}
                class={`px-3 py-2 rounded-lg text-xs font-medium ${
                  isDeleteConfirming
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                } disabled:opacity-50`}
              >
                {isDeleteConfirming ? t("common.confirm") : t("common.delete")}
              </button>
            </div>
          </div>
        );
      })}
      {result && (
        <p class="text-xs text-gray-500 mt-2 text-center">{result}</p>
      )}
    </div>
  );
}
