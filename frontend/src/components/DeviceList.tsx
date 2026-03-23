import { useState } from "preact/hooks";
import { useDevices } from "../hooks/useDevices";
import { DeviceCard } from "./DeviceCard";
import { FilterBar } from "./FilterBar";
import { t } from "../i18n";
import { useLanguage } from "../i18n";
import { getDeviceLimit } from "../license";
import { useLicense } from "../license/useLicense";

export function DeviceList() {
  useLanguage();
  const license = useLicense();
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("");
  const deviceLimit = getDeviceLimit();

  const { devices, loading } = useDevices({
    typ: activeType || undefined,
    search: search || undefined,
  });

  return (
    <div>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        activeType={activeType}
        onTypeChange={setActiveType}
      />
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
            {(search || activeType) && (
              <button
                onClick={() => {
                  setSearch("");
                  setActiveType("");
                }}
                class="mt-2 text-[#1F4E79] text-sm font-medium"
              >
                {t("devices.resetFilter")}
              </button>
            )}
          </div>
        ) : (
          <>
            <p class="text-xs text-gray-400 px-1">
              {deviceLimit < Infinity
                ? t("license.deviceLimit", { count: devices.length, limit: deviceLimit })
                : devices.length !== 1
                ? t("devices.countPlural", { count: devices.length })
                : t("devices.countSingular", { count: devices.length })}
            </p>
            {devices.map((device) => (
              <DeviceCard key={device.uuid} device={device} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
