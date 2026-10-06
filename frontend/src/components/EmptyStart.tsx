import { navigate } from "../utils/navigate";
import { t } from "../i18n";
import { hasFeature } from "../license";
import { ProHint } from "./ProHint";

/**
 * v3.1.1 (GitHub #25): Leerer Bestand bietet den HA-Import gleichberechtigt
 * neben "Erstes Geraet hinzufuegen" an. Bisher stand der Import nur in den
 * Einstellungen, neue Nutzer haben ihn nicht gefunden und Geraete abgetippt.
 */
export function EmptyStart() {
  const hasHaSync = hasFeature("ha_sync");
  return (
    <div class="text-center py-8 px-4">
      <p class="text-gray-500 dark:text-gray-400 text-sm mb-1">{t("dashboard.noDevices")}</p>
      <p class="text-gray-400 text-xs mb-4 max-w-sm mx-auto">{t("dashboard.emptyImportHint")}</p>
      <div class="flex flex-col gap-2 max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => navigate("/settings#ha-import")}
          class="px-4 py-2.5 bg-[#4CAF50] hover:bg-[#43A047] text-white rounded-xl text-sm font-medium"
        >
          {t("dashboard.importFromHa")}
          {!hasHaSync && " (Pro)"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/add")}
          class="px-4 py-2.5 border border-[#1F4E79] text-[#1F4E79] dark:text-blue-300 dark:border-blue-300 rounded-xl text-sm font-medium"
        >
          {t("dashboard.addFirst")}
        </button>
      </div>
      {!hasHaSync && <ProHint />}
    </div>
  );
}
