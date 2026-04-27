import { useMemo } from "preact/hooks";
import { DEVICE_TYPES } from "../utils/constants";
import { t } from "../i18n";
import { useLanguage } from "../i18n";
import { useCategories } from "./CategoryManager";

interface FilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  activeType: string;
  onTypeChange: (val: string) => void;
  /** v2.6.0 (Forum): set of device-type values that have at least one device
   * in the current inventory. When provided, the chip row hides categories
   * with zero devices to declutter the horizontal scrollbar (typical user
   * uses 8–12 of 32 categories). The currently active filter chip is always
   * kept visible so the user can still clear it. */
  usedTypes?: Set<string>;
}

export function FilterBar({
  search,
  onSearchChange,
  activeType,
  onTypeChange,
  usedTypes,
}: FilterBarProps) {
  useLanguage();
  const categories = useCategories();

  // v2.5.3: Bug 3 — chip list is now dynamic (includes Custom Categories
  // added via Settings → "Kategorien verwalten") and sorted alphabetically
  // by the rendered label so users can actually find an entry quickly.
  // Previously only the static DEVICE_TYPES list was rendered in its
  // definition order, so custom categories were missing entirely and the
  // order looked random.
  const chipTypes = useMemo(() => {
    const entries: { value: string; label: string }[] = [];
    if (categories.length > 0) {
      for (const c of categories) {
        const label = c.label_key ? t(c.label_key) || c.name : c.name;
        entries.push({ value: c.name, label });
      }
    } else {
      for (const dt of DEVICE_TYPES) {
        entries.push({ value: dt.id, label: t(dt.labelKey) });
      }
    }
    const sorted = entries.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
    // v2.6.0: drop categories that aren't represented in the current dataset.
    // Keep the currently active filter visible regardless so the user can
    // tap it again to clear.
    if (!usedTypes) return sorted;
    return sorted.filter(
      (e) => usedTypes.has(e.value) || e.value === activeType,
    );
  }, [categories, usedTypes, activeType]);
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
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79]"
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
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          {t("filter.all")}
        </button>
        {chipTypes.map((typ) => (
          <button
            key={typ.value}
            onClick={() => onTypeChange(activeType === typ.value ? "" : typ.value)}
            class={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeType === typ.value
                ? "bg-[#1F4E79] text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {typ.label}
          </button>
        ))}
      </div>
    </div>
  );
}
