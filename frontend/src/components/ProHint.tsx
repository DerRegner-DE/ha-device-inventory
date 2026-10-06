import { t } from "../i18n";
import { LS_CHECKOUT_URL } from "./LicenseSettings";

/**
 * v3.1.1 (GitHub #25): Gesperrte Pro-Knoepfe sagen, warum sie gesperrt sind
 * und wo es die Lizenz gibt. Vorher war nur "(Pro)" am Knopf zu sehen.
 */
export function ProHint() {
  return (
    <p class="text-xs text-amber-600 dark:text-amber-400 mt-2">
      {t("license.proHint")}{" "}
      <a
        href={LS_CHECKOUT_URL}
        target="_blank"
        rel="noopener noreferrer"
        class="underline font-medium"
      >
        {t("license.buyPro")}
      </a>
    </p>
  );
}
