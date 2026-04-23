import { useState, useEffect } from "preact/hooks";
import { apiGet, apiPost, apiDelete } from "../api/client";
import { t } from "../i18n";

interface DeletedDevice {
  uuid: string;
  typ: string | null;
  bezeichnung: string | null;
  modell: string | null;
  hersteller: string | null;
  standort_name: string | null;
  integration: string | null;
  deleted_at: string | null;
  updated_at: string | null;
}

function formatAge(iso: string | null): string {
  if (!iso) return "—";
  const deleted = new Date(iso + (iso.endsWith("Z") ? "" : "Z")).getTime();
  const diffSec = (Date.now() - deleted) / 1000;
  if (diffSec < 60) return t("snapshots.ageJustNow") || "just now";
  if (diffSec < 3600)
    return t("snapshots.ageMinutes", { count: Math.floor(diffSec / 60) });
  if (diffSec < 86400)
    return t("snapshots.ageHours", { count: Math.floor(diffSec / 3600) });
  return t("snapshots.ageDays", { count: Math.floor(diffSec / 86400) });
}

export function TrashView() {
  const [items, setItems] = useState<DeletedDevice[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function refresh() {
    const data = await apiGet<{ items: DeletedDevice[] }>("/devices/trash/list");
    setItems(data?.items || []);
    setSelected(new Set());
    setLoading(false);
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  const toggle = (uuid: string) => {
    const next = new Set(selected);
    if (next.has(uuid)) next.delete(uuid);
    else next.add(uuid);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.uuid)));
  };

  const handleRestore = async (uuid: string) => {
    setBusy(true);
    setResult(null);
    const res = await apiPost<{ status: string }>(`/devices/${uuid}/restore`, {});
    if (res?.status === "ok") {
      setResult(t("trash.restored", { count: 1 }));
      await refresh();
    } else {
      setResult(t("trash.restoreFailed"));
    }
    setBusy(false);
  };

  const handleBulkRestore = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    setResult(null);
    const res = await apiPost<{ restored: number; total: number }>(
      "/devices/bulk/restore",
      { uuids: [...selected] },
    );
    if (res) {
      setResult(t("trash.restored", { count: res.restored }));
      await refresh();
    } else {
      setResult(t("trash.restoreFailed"));
    }
    setBusy(false);
  };

  const handlePurge = async (uuid: string) => {
    if (purgeConfirm !== uuid) {
      setPurgeConfirm(uuid);
      return;
    }
    setPurgeConfirm(null);
    setBusy(true);
    setResult(null);
    const ok = await apiDelete(`/devices/trash/${uuid}`);
    if (ok) {
      setResult(t("trash.purged", { count: 1 }));
      await refresh();
    } else {
      setResult(t("trash.purgeFailed"));
    }
    setBusy(false);
  };

  if (loading) {
    return <p class="text-xs text-gray-500">{t("trash.loading")}</p>;
  }

  if (items.length === 0) {
    return <p class="text-xs text-gray-500">{t("trash.empty")}</p>;
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-3 gap-2">
        <button
          onClick={selectAll}
          class="text-xs text-gray-600 dark:text-gray-400 hover:underline"
        >
          {selected.size === items.length
            ? t("bulk.deselectAll")
            : t("bulk.selectAll")}
        </button>
        {selected.size > 0 && (
          <button
            onClick={handleBulkRestore}
            disabled={busy}
            class="text-xs px-3 py-1.5 rounded-lg bg-[#4CAF50] text-white hover:bg-[#43A047] disabled:opacity-50"
          >
            {t("trash.bulkRestore", { count: selected.size })}
          </button>
        )}
      </div>
      <div class="space-y-2">
        {items.map((d) => {
          const isSelected = selected.has(d.uuid);
          const isPurgeConfirming = purgeConfirm === d.uuid;
          return (
            <div
              key={d.uuid}
              class={`p-3 rounded-xl border text-sm ${
                isSelected
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              }`}
            >
              <div class="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(d.uuid)}
                  class="mt-1"
                />
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-gray-800 dark:text-gray-200 truncate">
                    {d.bezeichnung || "(unnamed)"}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {[d.typ, d.hersteller, d.standort_name]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {t("trash.deletedAgo", { age: formatAge(d.deleted_at) })}
                  </div>
                </div>
              </div>
              <div class="flex gap-2 mt-2">
                <button
                  onClick={() => handleRestore(d.uuid)}
                  disabled={busy}
                  class="flex-1 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  {t("trash.restoreButton")}
                </button>
                <button
                  onClick={() => handlePurge(d.uuid)}
                  disabled={busy}
                  class={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    isPurgeConfirming
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  } disabled:opacity-50`}
                >
                  {isPurgeConfirming
                    ? t("trash.purgeConfirm")
                    : t("trash.purgeButton")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {result && (
        <p class="text-xs text-gray-500 mt-2 text-center">{result}</p>
      )}
    </div>
  );
}
