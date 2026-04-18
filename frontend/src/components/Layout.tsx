import { type ComponentChildren } from "preact";
import { SyncStatus } from "./SyncStatus";
import { BottomNav } from "./BottomNav";
import { t } from "../i18n";
import { useLanguage } from "../i18n";
import { isOnPanelPath } from "../utils/navigate";

interface LayoutProps {
  children: ComponentChildren;
  activeRoute: string;
}

export function Layout({ children, activeRoute }: LayoutProps) {
  useLanguage();
  const isInIframe = window.self !== window.top;
  const panelPath = isOnPanelPath();
  return (
    <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {!isInIframe && (
        <header class="bg-[#1F4E79] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
          <h1 class="text-lg font-semibold tracking-tight">{t("app.title")}</h1>
          <SyncStatus />
        </header>
      )}
      {isInIframe && (
        <div class="flex justify-end px-2 py-1 bg-gray-50 dark:bg-gray-900">
          <SyncStatus />
        </div>
      )}
      {panelPath && (
        <div class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
          <p class="font-semibold mb-1">{t("panel.warningTitle")}</p>
          <p>{t("panel.warningBody")}</p>
          <a
            href="/hassio/addon/geraeteverwaltung/ingress"
            target="_top"
            class="inline-block mt-1.5 font-semibold underline hover:text-amber-900 dark:hover:text-amber-100"
          >
            {t("panel.openIngress")} →
          </a>
        </div>
      )}
      <main
        class="flex-1 overflow-y-auto"
        style="padding-bottom: calc(5.5rem + max(env(safe-area-inset-bottom, 0px), 12px));"
      >
        {children}
      </main>
      <BottomNav activeRoute={activeRoute} />
    </div>
  );
}
