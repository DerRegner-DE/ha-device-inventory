import { useState, useCallback, useEffect, useRef, useMemo } from "preact/hooks";
import { liveQuery } from "dexie";
import { useDevices, type WarrantyStatus, type SortKey } from "../hooks/useDevices";
import { DeviceCard } from "./DeviceCard";
import { FilterBar } from "./FilterBar";
import { DonutFilters, type DonutFilterKey } from "./DonutFilters";
import { t } from "../i18n";
import { useLanguage } from "../i18n";
import { getDeviceLimit } from "../license";
import { useLicense } from "../license/useLicense";
import { apiPost } from "../api/client";
import { showUndoToast } from "./UndoToast";
import { db, type Device } from "../db/schema";
import { DEVICE_TYPES, INTEGRATIONS } from "../utils/constants";

const WARRANTY_LABEL_KEY: Record<string, string> = {
  ok: "dashboard.warrantyOk",
  warning: "dashboard.warrantyWarning",
  expired: "dashboard.warrantyExpired",
  none: "dashboard.warrantyNone",
};

// v2.5.3: Bug 4 — sort Bulk-Edit dropdowns alphabetically by label.
const OTHER_BULK_IDS = new Set(["Sonstiges", "Nicht angebunden"]);

export function DeviceList() {
  useLanguage();
  const license = useLicense();

  const sortedTypes = useMemo(
    () => [...DEVICE_TYPES].sort((a, b) => {
      const ao = OTHER_BULK_IDS.has(a.id);
      const bo = OTHER_BULK_IDS.has(b.id);
      if (ao && !bo) return 1;
      if (!ao && bo) return -1;
      return t(a.labelKey).localeCompare(t(b.labelKey), undefined, { sensitivity: "base" });
    }),
    [],
  );
  const sortedIntegrations = useMemo(
    () => [...INTEGRATIONS].sort((a, b) => {
      const ao = OTHER_BULK_IDS.has(a.id);
      const bo = OTHER_BULK_IDS.has(b.id);
      if (ao && !bo) return 1;
      if (!ao && bo) return -1;
      return a.id.localeCompare(b.id, undefined, { sensitivity: "base" });
    }),
    [],
  );
  const [search, _setSearch] = useState(() => sessionStorage.getItem("gv_filter_search") || "");
  const [activeType, _setActiveType] = useState(() => sessionStorage.getItem("gv_filter_type") || "");
  const [sortKey, _setSortKey] = useState<SortKey>(() =>
    (sessionStorage.getItem("gv_sort") as SortKey) || "updated_desc"
  );
  const setSortKey = useCallback((v: SortKey) => {
    sessionStorage.setItem("gv_sort", v);
    _setSortKey(v);
  }, []);
  const [activeNetwork, _setActiveNetwork] = useState(() => sessionStorage.getItem("gv_filter_netzwerk") || "");
  const [activePower, _setActivePower] = useState(() => sessionStorage.getItem("gv_filter_power") || "");
  const [activeWarranty, _setActiveWarranty] = useState(() => sessionStorage.getItem("gv_filter_warranty") || "");
  // v2.5.3: Bug 5 — integration/manufacturer/area filters land from the
  // clickable bar charts on the Dashboard.
  const [activeIntegration, _setActiveIntegration] = useState(() => sessionStorage.getItem("gv_filter_integration") || "");
  const [activeManufacturer, _setActiveManufacturer] = useState(() => sessionStorage.getItem("gv_filter_manufacturer") || "");
  const [activeArea, _setActiveArea] = useState(() => sessionStorage.getItem("gv_filter_area") || "");
  const setSearch = useCallback((v: string) => { sessionStorage.setItem("gv_filter_search", v); _setSearch(v); }, []);
  const setActiveType = useCallback((v: string) => { sessionStorage.setItem("gv_filter_type", v); _setActiveType(v); }, []);
  const clearNetwork = useCallback(() => { sessionStorage.removeItem("gv_filter_netzwerk"); _setActiveNetwork(""); }, []);
  const clearPower = useCallback(() => { sessionStorage.removeItem("gv_filter_power"); _setActivePower(""); }, []);
  const clearWarranty = useCallback(() => { sessionStorage.removeItem("gv_filter_warranty"); _setActiveWarranty(""); }, []);
  const clearIntegration = useCallback(() => { sessionStorage.removeItem("gv_filter_integration"); _setActiveIntegration(""); }, []);
  const clearManufacturer = useCallback(() => { sessionStorage.removeItem("gv_filter_manufacturer"); _setActiveManufacturer(""); }, []);
  const clearArea = useCallback(() => { sessionStorage.removeItem("gv_filter_area"); _setActiveArea(""); }, []);
  const deviceLimit = getDeviceLimit();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimer = useRef<number | null>(null);

  // Unfiltered device list — drives the donut aggregations so the overview
  // stays stable regardless of the current filter selection.
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  useEffect(() => {
    const sub = liveQuery(() => db.devices.toArray()).subscribe({
      next: setAllDevices,
      error: () => {},
    });
    return () => sub.unsubscribe();
  }, []);

  const { devices, loading } = useDevices({
    typ: activeType || undefined,
    netzwerk: activeNetwork || undefined,
    stromversorgung: activePower || undefined,
    warranty: (activeWarranty || undefined) as WarrantyStatus | undefined,
    integration: activeIntegration || undefined,
    hersteller: activeManufacturer || undefined,
    standort_area_id: activeArea || undefined,
    search: search || undefined,
    sort: sortKey,
  });

  // Donut segment click: replaces whatever was active, stays on the list view.
  const applyDonutFilter = useCallback((key: DonutFilterKey, value: string) => {
    sessionStorage.removeItem("gv_filter_type");
    sessionStorage.removeItem("gv_filter_netzwerk");
    sessionStorage.removeItem("gv_filter_power");
    sessionStorage.removeItem("gv_filter_warranty");
    sessionStorage.removeItem("gv_filter_integration");
    sessionStorage.removeItem("gv_filter_manufacturer");
    sessionStorage.removeItem("gv_filter_area");
    _setActiveType("");
    _setActiveNetwork("");
    _setActivePower("");
    _setActiveWarranty("");
    _setActiveIntegration("");
    _setActiveManufacturer("");
    _setActiveArea("");
    if (!value) return;
    sessionStorage.setItem(key, value);
    if (key === "gv_filter_type") _setActiveType(value);
    else if (key === "gv_filter_netzwerk") _setActiveNetwork(value);
    else if (key === "gv_filter_power") _setActivePower(value);
    else if (key === "gv_filter_warranty") _setActiveWarranty(value);
    else if (key === "gv_filter_integration") _setActiveIntegration(value);
    else if (key === "gv_filter_manufacturer") _setActiveManufacturer(value);
    else if (key === "gv_filter_area") _setActiveArea(value);
  }, []);

  const extraChips: { label: string; onClear: () => void }[] = [];
  if (activeNetwork) extraChips.push({ label: `${t("dashboard.byNetwork")}: ${activeNetwork}`, onClear: clearNetwork });
  if (activePower) extraChips.push({ label: `${t("dashboard.byPower")}: ${activePower}`, onClear: clearPower });
  if (activeWarranty) extraChips.push({
    label: `${t("dashboard.warrantyStatus")}: ${t(WARRANTY_LABEL_KEY[activeWarranty] ?? activeWarranty)}`,
    onClear: clearWarranty,
  });
  if (activeIntegration) extraChips.push({ label: `${t("dashboard.byIntegration")}: ${activeIntegration}`, onClear: clearIntegration });
  if (activeManufacturer) extraChips.push({ label: `${t("dashboard.byManufacturer")}: ${activeManufacturer}`, onClear: clearManufacturer });
  if (activeArea) extraChips.push({ label: `${t("dashboard.byLocation")}: ${activeArea}`, onClear: clearArea });

  const toggleSelect = (uuid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === devices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(devices.map((d) => d.uuid)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
    setBulkAction(null);
    setBulkValue("");
    setConfirmDelete(false);
    if (confirmTimer.current) { clearTimeout(confirmTimer.current); confirmTimer.current = null; }
  };

  const handleBulkUpdate = async (field: string, value: string) => {
    if (!value || selected.size === 0) return;
    setBulkBusy(true);
    try {
      await apiPost("/devices/bulk/update", {
        uuids: [...selected],
        updates: { [field]: value },
      });
      await db.devices.where("uuid").anyOf([...selected]).modify((d: any) => { d[field] = value; });
      exitSelectMode();
    } catch {
      // silent
    }
    setBulkBusy(false);
  };

  // Inline two-tap delete confirmation — works inside HA Ingress, where
  // window.confirm() is blocked by the iframe sandbox.
  const handleBulkDeleteClick = async () => {
    if (selected.size === 0) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      confirmTimer.current = window.setTimeout(() => {
        setConfirmDelete(false);
        confirmTimer.current = null;
      }, 4000);
      return;
    }
    if (confirmTimer.current) { clearTimeout(confirmTimer.current); confirmTimer.current = null; }
    setBulkBusy(true);
    const uuids = [...selected];
    // Cache the full rows before we delete from IndexedDB so we can
    // re-insert them if the user clicks Undo on the toast.
    const cachedRows = await db.devices.where("uuid").anyOf(uuids).toArray();
    try {
      await apiPost("/devices/bulk/delete", { uuids });
      await db.devices.where("uuid").anyOf(uuids).delete();
      exitSelectMode();
      showUndoToast(
        t("undo.bulkDeleted", { count: uuids.length }),
        async () => {
          await apiPost("/devices/bulk/restore", { uuids });
          if (cachedRows.length) await db.devices.bulkPut(cachedRows);
        },
      );
    } catch {
      // silent
    }
    setBulkBusy(false);
  };

  return (
    <div>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        activeType={activeType}
        onTypeChange={setActiveType}
      />

      {allDevices.length > 0 && (
        <div class="px-4 -mt-2 mb-3">
          <DonutFilters devices={allDevices} onSelect={applyDonutFilter} compact />
        </div>
      )}

      {extraChips.length > 0 && (
        <div class="px-4 mb-2 flex flex-wrap gap-2">
          {extraChips.map((chip) => (
            <button
              key={chip.label}
              onClick={chip.onClear}
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1F4E79] text-white text-xs font-medium hover:bg-[#1a4268]"
            >
              <span>{chip.label}</span>
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {devices.length > 0 && (
        <div class="px-4 flex items-center justify-between mb-2 gap-2">
          <p class="text-xs text-gray-400 px-1 flex-1 min-w-0 truncate">
            {selectMode
              ? t("bulk.selected", { count: selected.size, total: devices.length })
              : deviceLimit < Infinity
              ? t("license.deviceLimit", { count: devices.length, limit: deviceLimit })
              : devices.length !== 1
              ? t("devices.countPlural", { count: devices.length })
              : t("devices.countSingular", { count: devices.length })}
          </p>
          {!selectMode && (
            <select
              value={sortKey}
              onChange={(e) => setSortKey((e.target as HTMLSelectElement).value as SortKey)}
              class="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1"
              title={t("devices.sortBy")}
            >
              <option value="updated_desc">{t("devices.sort.updated_desc")}</option>
              <option value="bezeichnung_asc">{t("devices.sort.bezeichnung_asc")}</option>
              <option value="bezeichnung_desc">{t("devices.sort.bezeichnung_desc")}</option>
              <option value="typ_asc">{t("devices.sort.typ_asc")}</option>
              <option value="hersteller_asc">{t("devices.sort.hersteller_asc")}</option>
              <option value="standort_asc">{t("devices.sort.standort_asc")}</option>
              <option value="warranty_soonest">{t("devices.sort.warranty_soonest")}</option>
            </select>
          )}
          <button
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            class="text-xs text-[#1F4E79] font-medium"
          >
            {selectMode ? t("bulk.cancel") : t("bulk.select")}
          </button>
        </div>
      )}

      {selectMode && devices.length > 0 && (
        <div class="px-5 mb-2">
          <button onClick={selectAll} class="text-xs text-[#1F4E79] font-medium">
            {selected.size === devices.length ? t("bulk.deselectAll") : t("bulk.selectAll")}
          </button>
        </div>
      )}

      <div class="px-4 space-y-3">
        {loading ? (
          <div class="text-center py-12 text-gray-400">
            <div class="animate-spin w-8 h-8 border-2 border-[#1F4E79] border-t-transparent rounded-full mx-auto mb-3" />
            {t("devices.loading")}
          </div>
        ) : devices.length === 0 ? (
          <div class="text-center py-12 text-gray-400">
            <svg
              class="w-16 h-16 mx-auto mb-3 text-gray-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
                d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p class="text-sm">{t("devices.noDevicesFound")}</p>
            {(search || activeType || activeNetwork || activePower || activeWarranty ||
              activeIntegration || activeManufacturer || activeArea) && (
              <button
                onClick={() => {
                  setSearch("");
                  setActiveType("");
                  clearNetwork();
                  clearPower();
                  clearWarranty();
                  clearIntegration();
                  clearManufacturer();
                  clearArea();
                }}
                class="mt-2 text-[#1F4E79] text-sm font-medium"
              >
                {t("devices.resetFilter")}
              </button>
            )}
          </div>
        ) : (
          <>
            {devices.map((device) => (
              <div key={device.uuid} class="flex items-center gap-2">
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(device.uuid)}
                    class={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selected.has(device.uuid)
                        ? "bg-[#1F4E79] border-[#1F4E79]"
                        : "border-gray-300"
                    }`}
                  >
                    {selected.has(device.uuid) && (
                      <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )}
                <div class="flex-1">
                  <DeviceCard device={device} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div
          class="fixed bottom-24 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-40 px-4 py-3"
          style="padding-bottom: max(env(safe-area-inset-bottom, 0px), 4px);"
        >
          {!bulkAction ? (
            <div class="flex gap-2 justify-center items-center">
              <button
                onClick={() => setBulkAction("typ")}
                class="px-4 py-2 rounded-lg bg-[#1F4E79] text-white text-xs font-medium hover:bg-[#1a4268] cursor-pointer"
              >
                {t("bulk.changeType")}
              </button>
              <button
                onClick={() => setBulkAction("integration")}
                class="px-4 py-2 rounded-lg bg-[#2d6da3] text-white text-xs font-medium hover:bg-[#245d8e] cursor-pointer"
              >
                {t("bulk.changeIntegration")}
              </button>
              <button
                onClick={handleBulkDeleteClick}
                disabled={bulkBusy}
                class={`px-4 py-2 rounded-lg text-white text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  confirmDelete
                    ? "bg-red-700 hover:bg-red-800 ring-2 ring-red-300"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {confirmDelete ? t("bulk.deleteConfirmInline") : t("bulk.delete")}
              </button>
            </div>
          ) : (
            <div class="flex gap-2 items-center">
              <select
                value={bulkValue}
                onChange={(e) => setBulkValue((e.target as HTMLSelectElement).value)}
                class="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200"
              >
                <option value="">{t("bulk.selectValue")}</option>
                {bulkAction === "typ" &&
                  sortedTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {t(dt.labelKey)}
                    </option>
                  ))}
                {bulkAction === "integration" &&
                  sortedIntegrations.map((i) => (
                    <option key={i.id} value={i.id}>{i.id}</option>
                  ))}
              </select>
              <button
                onClick={() => handleBulkUpdate(bulkAction, bulkValue)}
                disabled={!bulkValue || bulkBusy}
                class="px-4 py-2 rounded-lg bg-[#1F4E79] text-white text-xs font-medium disabled:opacity-50"
              >
                {t("bulk.apply")}
              </button>
              <button
                onClick={() => { setBulkAction(null); setBulkValue(""); }}
                class="px-3 py-2 text-gray-500 text-xs"
              >
                {t("bulk.cancel")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
