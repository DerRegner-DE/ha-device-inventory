import { type ComponentChildren } from "preact";
import { SyncStatus } from "./SyncStatus";
import { BottomNav } from "./BottomNav";
import { t } from "../i18n";
import { useLanguage } from "../i18n";

interface LayoutProps {
  children: ComponentChildren;
  activeRoute: string;
}

export function Layout({ children, activeRoute }: LayoutProps) {
  useLanguage();
  const isInIframe = window.self !== window.top;
  return (
    <div class="min-h-screen flex flex-col bg-gray-50">
      {!isInIframe && (
        <header class="bg-[#1F4E79] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
          <h1 class="text-lg font-semibold tracking-tight">{t("app.title")}</h1>
          <SyncStatus />
        </header>
      )}
      {isInIframe && (
        <div class="flex justify-end px-2 py-1 bg-gray-50">
          <SyncStatus />
        </div>
      )}
      <main class="flex-1 pb-20 overflow-y-auto">{children}</main>
      <BottomNav activeRoute={activeRoute} />
    </div>
  );
}
