import { DEVICE_TYPES } from "../utils/constants";
import { t } from "../i18n";
import { useLanguage } from "../i18n";

interface FilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  activeType: string;
  onTypeChange: (val: string) => void;
}

export function FilterBar({
  search,
  onSearchChange,
  activeType,
  onTypeChange,
}: FilterBarProps) {
  useLanguage();
  return (
    <div class="space-y-3 p-4">
      <div class="relative">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder={t("filter.search")}
          value={search}
          onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79]"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => onTypeChange("")}
          class={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeType === ""
              ? "bg-[#1F4E79] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {t("filter.all")}
        </button>
        {DEVICE_TYPES.map((typ) => (
          <button
            key={typ.id}
            onClick={() => onTypeChange(activeType === typ.id ? "" : typ.id)}
            class={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeType === typ.id
                ? "bg-[#1F4E79] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t(typ.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
