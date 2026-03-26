import { route } from "preact-router";
import { t } from "../i18n";
import { useLanguage } from "../i18n";

interface BottomNavProps {
  activeRoute: string;
}

interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/", labelKey: "nav.dashboard", icon: "dashboard" },
  { path: "/devices", labelKey: "nav.devices", icon: "devices" },
  { path: "/add", labelKey: "nav.add", icon: "add" },
  { path: "/settings", labelKey: "nav.settings", icon: "settings" },
];

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? "#1F4E79" : "#6B7280";
  switch (icon) {
    case "dashboard":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="1" fill={color} />
          <rect x="13" y="3" width="8" height="8" rx="1" fill={color} opacity="0.6" />
          <rect x="3" y="13" width="8" height="8" rx="1" fill={color} opacity="0.6" />
          <rect x="13" y="13" width="8" height="8" rx="1" fill={color} opacity="0.4" />
        </svg>
      );
    case "devices":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="2" width="16" height="14" rx="2" stroke={color} stroke-width="2" />
          <path d="M8 20h8M12 16v4" stroke={color} stroke-width="2" stroke-linecap="round" />
        </svg>
      );
    case "add":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={color} stroke-width="2" />
          <path d="M12 8v8M8 12h8" stroke={color} stroke-width="2" stroke-linecap="round" />
        </svg>
      );
    case "settings":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke={color} stroke-width="2" />
          <path
            d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
            stroke={color}
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function BottomNav({ activeRoute }: BottomNavProps) {
  useLanguage();
  return (
    <nav
      class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50"
      style="padding-bottom: max(env(safe-area-inset-bottom, 0px), 12px);"
    >
      <div class="flex justify-around items-center h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            activeRoute === item.path ||
            (item.path === "/devices" && activeRoute.startsWith("/devices"));
          return (
            <button
              key={item.path}
              onClick={() => route(item.path)}
              class={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors ${
                isActive ? "text-[#1F4E79] dark:text-[#7ab5d6]" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <NavIcon icon={item.icon} active={isActive} />
              <span class="text-[10px] font-medium">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
