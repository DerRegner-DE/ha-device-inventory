import { navigate } from "../utils/navigate";
import { type Device } from "../db/schema";
import { getAreaName, getDeviceTypeLabel } from "../utils/constants";
import { t } from "../i18n";
import { useLanguage } from "../i18n";

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  useLanguage();
  return (
    <div
      onClick={() => navigate(`/devices/${device.uuid}`)}
      class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex gap-3 active:bg-gray-50 dark:active:bg-gray-700 cursor-pointer transition-colors"
    >
      <div class="relative w-14 h-14 shrink-0">
        <div class="w-14 h-14 rounded-lg bg-[#1F4E79]/10 dark:bg-[#1F4E79]/20 flex items-center justify-center">
          <span class="text-[#1F4E79] dark:text-[#7ab5d6] text-xl font-bold">
            {device.bezeichnung.charAt(0).toUpperCase()}
          </span>
        </div>
        {(device as any).reviewed === 1 && (
          <span class="absolute -bottom-1 -left-1 text-green-500 bg-white dark:bg-gray-800 rounded-full">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </span>
        )}
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
          {device.bezeichnung}
        </h3>
        {device.modell && (
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{device.modell}</p>
        )}
        <div class="flex items-center gap-2 mt-1.5">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1F4E79]/10 dark:bg-[#1F4E79]/20 text-[#1F4E79] dark:text-[#7ab5d6]">
            {t(getDeviceTypeLabel(device.typ))}
          </span>
          {device.standort_area_id && (
            <span class="text-[10px] text-gray-400 truncate">
              {device.standort_name || getAreaName(device.standort_area_id)}
            </span>
          )}
        </div>
      </div>
      <div class="flex items-center text-gray-300 dark:text-gray-600">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
