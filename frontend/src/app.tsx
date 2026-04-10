import { useState, useEffect } from "preact/hooks";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { DeviceList } from "./components/DeviceList";
import { DeviceDetail } from "./components/DeviceDetail";
import { DeviceForm } from "./components/DeviceForm";
import { Settings } from "./components/Settings";
import { useDevice } from "./hooks/useDevices";
import { t } from "./i18n";
import { useLanguage } from "./i18n";
import { useDarkMode } from "./hooks/useDarkMode";
import { getBasePath, stripBasePath, navigate } from "./utils/navigate";

function EditDeviceLoader({ uuid }: { uuid: string }) {
  useLanguage();
  const { device, loading } = useDevice(uuid);

  if (loading) {
    return (
      <div class="flex items-center justify-center py-20">
        <div class="animate-spin w-8 h-8 border-2 border-[#1F4E79] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!device) {
    return <div class="text-center py-20 text-gray-400">{t("detail.notFound")}</div>;
  }

  return <DeviceForm device={device} />;
}

function matchRoute(path: string): { route: string; params: Record<string, string> } {
  // Normalize: remove trailing slash except for root
  const p = path === "/" ? "/" : path.replace(/\/$/, "");

  if (p === "/" || p === "") return { route: "dashboard", params: {} };
  if (p === "/devices") return { route: "devices", params: {} };
  if (p === "/add") return { route: "add", params: {} };
  if (p === "/settings") return { route: "settings", params: {} };

  // /devices/:uuid/edit
  const editMatch = p.match(/^\/devices\/([^/]+)\/edit$/);
  if (editMatch) return { route: "edit", params: { uuid: editMatch[1] } };

  // /devices/:uuid
  const detailMatch = p.match(/^\/devices\/([^/]+)$/);
  if (detailMatch) return { route: "detail", params: { uuid: detailMatch[1] } };

  return { route: "dashboard", params: {} };
}

export function App() {
  // Dark mode must be at App level so the class persists across all routes
  useDarkMode();

  const [currentPath, setCurrentPath] = useState(
    stripBasePath(window.location.pathname)
  );

  useEffect(() => {
    // Listen for popstate (browser back/forward)
    const onPopState = () => {
      setCurrentPath(stripBasePath(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);

    // Intercept pushState so navigate() triggers re-render
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);

    history.pushState = function (...args) {
      origPush(...args);
      setCurrentPath(stripBasePath(window.location.pathname));
    };
    history.replaceState = function (...args) {
      origReplace(...args);
      setCurrentPath(stripBasePath(window.location.pathname));
    };

    return () => {
      window.removeEventListener("popstate", onPopState);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  const { route, params } = matchRoute(currentPath);

  let content;
  switch (route) {
    case "dashboard":
      content = <Dashboard />;
      break;
    case "devices":
      content = <DeviceList />;
      break;
    case "detail":
      content = <DeviceDetail uuid={params.uuid} />;
      break;
    case "edit":
      content = <EditDeviceLoader uuid={params.uuid} />;
      break;
    case "add":
      content = <DeviceForm />;
      break;
    case "settings":
      content = <Settings />;
      break;
    default:
      content = <Dashboard />;
  }

  return (
    <Layout activeRoute={currentPath || "/"}>
      {content}
    </Layout>
  );
}
