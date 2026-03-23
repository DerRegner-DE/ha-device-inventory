import type { ComponentChildren } from "preact";
import { useLicense } from "../license/useLicense";
import { t } from "../i18n";
import { useLanguage } from "../i18n";

interface LicenseGateProps {
  feature: string;
  children: ComponentChildren;
  fallback?: ComponentChildren;
}

/**
 * Wraps children and only renders them when the given Pro feature is unlocked.
 * Shows an upgrade prompt (or custom fallback) when the feature is locked.
 */
export function LicenseGate({ feature, children, fallback }: LicenseGateProps) {
  useLanguage();
  const license = useLicense();
  const unlocked =
    license.valid && license.tier === "pro" && license.features.includes(feature);

  if (unlocked) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return <UpgradePrompt feature={feature} />;
}

/** Compact inline upgrade prompt shown when a Pro feature is locked. */
function UpgradePrompt({ feature }: { feature: string }) {
  useLanguage();
  const featureLabel = t(`license.feature.${feature}`);

  return (
    <div class="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
      <svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <span class="text-xs text-amber-700">
        {t("license.featureLockedInline", { feature: featureLabel })}
      </span>
    </div>
  );
}

/**
 * Variant that hides children entirely when locked (no fallback at all).
 */
export function LicenseHide({ feature, children }: { feature: string; children: ComponentChildren }) {
  const license = useLicense();
  const unlocked =
    license.valid && license.tier === "pro" && license.features.includes(feature);

  if (unlocked) return <>{children}</>;
  return null;
}
