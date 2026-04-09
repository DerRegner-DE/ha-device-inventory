import { useState } from "preact/hooks";
import {
  setLicenseKey,
  removeLicense,
  getStoredKey,
  PRO_FEATURES,
} from "../license";
import { useLicense } from "../license/useLicense";
import { t } from "../i18n";
import { useLanguage } from "../i18n";

const LS_CHECKOUT_URL =
  "https://derregner.lemonsqueezy.com/checkout/buy/a3809409-6ce4-467d-a399-750150f65c39";

export function LicenseSettings() {
  useLanguage();
  const license = useLicense();
  const [keyInput, setKeyInput] = useState(getStoredKey());
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const handleActivate = async () => {
    setActivating(true);
    setError(null);
    const result = await setLicenseKey(keyInput);
    setActivating(false);
    if (!result.valid) {
      setError(result.error || t("license.invalidKey"));
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDeactivate) {
      setConfirmDeactivate(true);
      return;
    }
    setConfirmDeactivate(false);
    setActivating(true);
    setError(null);
    await removeLicense();
    setKeyInput("");
    setActivating(false);
  };

  const isPro = license.valid && license.tier === "pro";

  return (
    <div class="space-y-4">
      {/* Status badge */}
      <div class="flex items-center gap-3">
        <span
          class={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isPro
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <span
            class={`w-2 h-2 rounded-full ${
              isPro ? "bg-emerald-500" : "bg-gray-400"
            }`}
          />
          {isPro ? t("license.pro") : t("license.free")}
        </span>
        {license.email && (
          <span class="text-xs text-gray-400">{license.email}</span>
        )}
      </div>

      {/* Expiry info */}
      {isPro && license.expiresAt && (
        <p class="text-xs text-gray-500">
          {t("license.expiresAt", {
            date: license.expiresAt.toLocaleDateString(),
          })}
        </p>
      )}

      {/* Key input */}
      <div>
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {t("license.keyLabel")}
        </label>
        <div class="relative">
          <input
            type={showKey ? "text" : "password"}
            value={keyInput}
            onInput={(e) => {
              setKeyInput((e.target as HTMLInputElement).value);
              setError(null);
            }}
            class="w-full px-3 py-2.5 pr-20 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79]"
            placeholder={t("license.keyPlaceholder")}
            disabled={isPro}
          />
          {keyInput && (
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1"
            >
              {showKey ? t("license.hideKey") : t("license.showKey")}
            </button>
          )}
        </div>
        {error && <p class="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {/* Buttons */}
      <div class="flex flex-col gap-2">
        {!isPro ? (
          <>
            <button
              onClick={handleActivate}
              disabled={activating || !keyInput.trim()}
              class="w-full py-2.5 rounded-xl bg-[#1F4E79] text-white text-sm font-medium hover:bg-[#1a4268] disabled:opacity-50"
            >
              {activating ? t("license.activating") : t("license.activate")}
            </button>
            <a
              href={LS_CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              class="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold text-center hover:bg-emerald-700 block"
            >
              {t("license.buyPro")}
            </a>
            <p class="text-xs text-gray-400 text-center">{t("license.buyProHint")}</p>
          </>
        ) : (
          <>
            <button
              onClick={handleDeactivate}
              class={`w-full py-2.5 rounded-xl text-sm font-medium ${
                confirmDeactivate
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "border border-red-200 text-red-600 hover:bg-red-50"
              }`}
            >
              {confirmDeactivate ? t("common.confirm") : t("license.deactivate")}
            </button>
            {confirmDeactivate && (
              <button
                onClick={() => setConfirmDeactivate(false)}
                class="w-full text-xs text-gray-400 hover:text-gray-600 text-center"
              >
                {t("common.cancel")}
              </button>
            )}
          </>
        )}
      </div>

      {/* Feature list */}
      <div>
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          {t("license.featuresTitle")}
        </p>
        <div class="space-y-1.5">
          {PRO_FEATURES.map((feat) => {
            const unlocked = isPro && license.features.includes(feat);
            return (
              <div key={feat} class="flex items-center gap-2">
                {unlocked ? (
                  <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg class="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                )}
                <span
                  class={`text-xs ${unlocked ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}`}
                >
                  {t(`license.feature.${feat}`)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
