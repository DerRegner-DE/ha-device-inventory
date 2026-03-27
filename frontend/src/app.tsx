import { useState } from "preact/hooks";
import Router, { type RoutableProps } from "preact-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { DeviceList } from "./components/DeviceList";
import { DeviceDetail } from "./components/DeviceDetail";
import { DeviceForm } from "./components/DeviceForm";
import { Settings } from "./components/Settings";
import { useDevice } from "./hooks/useDevices";
import { t } from "./i18n";
import { useLanguage } from "./i18n";
import { routePath, stripBasePath } from "./utils/navigate";

function DashboardPage(_props: RoutableProps) {
  return <Dashboard />;
}

function DevicesPage(_props: RoutableProps) {
  return <DeviceList />;
}

function DeviceDetailPage(props: RoutableProps & { uuid?: string }) {
  return <DeviceDetail uuid={props.uuid} />;
}

function AddDevicePage(_props: RoutableProps) {
  return <DeviceForm />;
}

function EditDevicePage(props: RoutableProps & { uuid?: string }) {
  useLanguage();
  const { device, loading } = useDevice(props.uuid);

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

function SettingsPage(_props: RoutableProps) {
  return <Settings />;
}

export function App() {
  const [activeRoute, setActiveRoute] = useState("/");

  const handleRoute = (e: { url: string }) => {
    setActiveRoute(stripBasePath(e.url));
  };

  return (
    <Layout activeRoute={activeRoute}>
      <Router onChange={handleRoute}>
        <DashboardPage path={routePath("/")} />
        <DevicesPage path={routePath("/devices")} />
        <DeviceDetailPage path={routePath("/devices/:uuid")} />
        <EditDevicePage path={routePath("/devices/:uuid/edit")} />
        <AddDevicePage path={routePath("/add")} />
        <SettingsPage path={routePath("/settings")} />
      </Router>
    </Layout>
  );
}
