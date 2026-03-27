import { useState, useEffect } from "preact/hooks";
import { navigate } from "../utils/navigate";
import { liveQuery } from "dexie";
import { db, type Device } from "../db/schema";
import { FLOORS, getAreaName, getDeviceTypeLabel } from "../utils/constants";
import { t } from "../i18n";
import { useLanguage } from "../i18n";
import { getDeviceLimit } from "../license";
import { useLicense } from "../license/useLicense";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface CountItem {
  label: string;
  count: number;
  filterKey: string;
  filterValue: string;
}

// Color palette based on the app's design (#1F4E79)
const CHART_COLORS = [
  "#1F4E79", "#2d6da3", "#4a90c4", "#7ab5d6", "#a8d4ea",
  "#3d7a5f", "#5a9e7c", "#7bc29e", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
  "#84cc16", "#06b6d4", "#e11d48", "#a855f7", "#22c55e",
  "#64748b", "#d97706",
];

const WARRANTY_COLORS = {
  ok: "#22c55e",
  warning: "#f59e0b",
  expired: "#ef4444",
  none: "#d1d5db",
};

function warrantyDays(garantieBis: string | undefined | null): number | null {
  if (!garantieBis) return null;
  try {
    const exp = new Date(garantieBis);
    const now = new Date();
    return Math.ceil((exp.getTime() - now.getTime()) / 86400000);
  } catch {
    return null;
  }
}

export function Dashboard() {
  useLanguage();
  const license = useLicense();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const deviceLimit = getDeviceLimit();

  useEffect(() => {
    const sub = liveQuery(() => db.devices.toArray()).subscribe({
      next: (result) => {
        setDevices(result);
        setLoading(false);
      },
      error: () => setLoading(false),
    });
    return () => sub.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div class="flex items-center justify-center py-20">
        <div class="animate-spin w-8 h-8 border-2 border-[#1F4E79] border-t-transparent rounded-full" />
      </div>
    );
  }

  const total = devices.length;

  // --- Aggregations ---
  const byType = new Map<string, number>();
  const byArea = new Map<string, number>();
  const byIntegration = new Map<string, number>();
  const byNetwork = new Map<string, number>();
  const byPower = new Map<string, number>();
  const byManufacturer = new Map<string, number>();
  let warrantyOk = 0;
  let warrantyWarning = 0;
  let warrantyExpired = 0;
  let warrantyNone = 0;

  for (const d of devices) {
    byType.set(d.typ, (byType.get(d.typ) ?? 0) + 1);
    if (d.standort_area_id) {
      byArea.set(d.standort_area_id, (byArea.get(d.standort_area_id) ?? 0) + 1);
    }
    if (d.integration) {
      byIntegration.set(d.integration, (byIntegration.get(d.integration) ?? 0) + 1);
    }
    if (d.netzwerk) {
      byNetwork.set(d.netzwerk, (byNetwork.get(d.netzwerk) ?? 0) + 1);
    }
    if (d.stromversorgung) {
      byPower.set(d.stromversorgung, (byPower.get(d.stromversorgung) ?? 0) + 1);
    }
    if (d.hersteller) {
      byManufacturer.set(d.hersteller, (byManufacturer.get(d.hersteller) ?? 0) + 1);
    }

    const days = warrantyDays(d.garantie_bis);
    if (days === null) {
      warrantyNone++;
    } else if (days < 0) {
      warrantyExpired++;
    } else if (days < 30) {
      warrantyWarning++;
    } else {
      warrantyOk++;
    }
  }

  const typeCounts: CountItem[] = [...byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([typeId, count]) => ({
      label: t(getDeviceTypeLabel(typeId)),
      count,
      filterKey: "typ",
      filterValue: typeId,
    }));

  const areaCounts: CountItem[] = [...byArea.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      label: getAreaName(id),
      count,
      filterKey: "area",
      filterValue: id,
    }));

  const integrationCounts: CountItem[] = [...byIntegration.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      count,
      filterKey: "integration",
      filterValue: label,
    }));

  const manufacturerCounts: CountItem[] = [...byManufacturer.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count]) => ({
      label,
      count,
      filterKey: "manufacturer",
      filterValue: label,
    }));

  const recentDevices = [...devices]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  // --- Chart data ---
  const typeChartData = mapToChartData(byType, (k) => t(getDeviceTypeLabel(k)));
  const networkChartData = mapToChartData(byNetwork);
  const powerChartData = mapToChartData(byPower);

  const warrantyChartData = {
    labels: [
      t("dashboard.warrantyOk"),
      t("dashboard.warrantyWarning"),
      t("dashboard.warrantyExpired"),
      t("dashboard.warrantyNone"),
    ],
    datasets: [{
      data: [warrantyOk, warrantyWarning, warrantyExpired, warrantyNone],
      backgroundColor: [
        WARRANTY_COLORS.ok,
        WARRANTY_COLORS.warning,
        WARRANTY_COLORS.expired,
        WARRANTY_COLORS.none,
      ],
      borderWidth: 0,
    }],
  };

  const hasWarrantyData = warrantyOk + warrantyWarning + warrantyExpired + warrantyNone > 0;

  return (
    <div class="p-4 space-y-6">
      {/* Total count header */}
      <div class="bg-gradient-to-br from-[#1F4E79] to-[#2d6da3] rounded-2xl p-5 text-white">
        <p class="text-white/70 text-xs font-medium uppercase tracking-wider">{t("dashboard.total")}</p>
        <p class="text-4xl font-bold mt-1">{total}</p>
        <p class="text-white/70 text-sm mt-1">
          {deviceLimit < Infinity
            ? t("license.deviceLimit", { count: total, limit: deviceLimit })
            : total !== 1
            ? t("dashboard.devicesCountPlural", { count: total })
            : t("dashboard.devicesCount", { count: total })}
        </p>
        <div class="flex gap-4 mt-4">
          <div>
            <p class="text-2xl font-semibold">{byType.size}</p>
            <p class="text-white/60 text-xs">{t("dashboard.types")}</p>
          </div>
          <div>
            <p class="text-2xl font-semibold">{byArea.size}</p>
            <p class="text-white/60 text-xs">{t("dashboard.locations")}</p>
          </div>
          <div>
            <p class="text-2xl font-semibold">{byIntegration.size}</p>
            <p class="text-white/60 text-xs">{t("dashboard.integrations")}</p>
          </div>
        </div>
      </div>

      {total === 0 && (
        <div class="text-center py-8">
          <p class="text-gray-400 text-sm mb-3">{t("dashboard.noDevices")}</p>
          <button
            onClick={() => navigate("/add")}
            class="px-4 py-2 bg-[#1F4E79] text-white rounded-xl text-sm font-medium"
          >
            {t("dashboard.addFirst")}
          </button>
        </div>
      )}

      {/* Donut charts grid */}
      {total > 0 && (
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {typeCounts.length > 0 && (
            <DonutChart title={t("dashboard.byType")} data={typeChartData} />
          )}
          {byNetwork.size > 0 && (
            <DonutChart title={t("dashboard.byNetwork")} data={networkChartData} />
          )}
          {byPower.size > 0 && (
            <DonutChart title={t("dashboard.byPower")} data={powerChartData} />
          )}
          {hasWarrantyData && (
            <DonutChart title={t("dashboard.warrantyStatus")} data={warrantyChartData} />
          )}
        </div>
      )}

      {/* Bar chart sections */}
      {areaCounts.length > 0 && (
        <CountSection title={t("dashboard.byLocation")} items={areaCounts} />
      )}

      {manufacturerCounts.length > 0 && (
        <CountSection title={t("dashboard.byManufacturer")} items={manufacturerCounts} />
      )}

      {integrationCounts.length > 0 && (
        <CountSection title={t("dashboard.byIntegration")} items={integrationCounts} />
      )}

      {/* Recently edited */}
      {recentDevices.length > 0 && (
        <div>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t("dashboard.recentlyEdited")}</h3>
          <div class="space-y-2">
            {recentDevices.map((d) => (
              <div
                key={d.uuid}
                onClick={() => navigate(`/devices/${d.uuid}`)}
                class="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{d.bezeichnung}</p>
                  <p class="text-[10px] text-gray-400">
                    {new Date(d.updated_at).toLocaleString("de-DE")}
                  </p>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shrink-0 ml-2">
                  {t(getDeviceTypeLabel(d.typ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Helper: Convert Map to Chart.js data ---
function mapToChartData(
  map: Map<string, number>,
  labelFn?: (key: string) => string,
) {
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  return {
    labels: sorted.map(([k]) => labelFn ? labelFn(k) : k),
    datasets: [{
      data: sorted.map(([, v]) => v),
      backgroundColor: sorted.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      borderWidth: 0,
    }],
  };
}

// --- Donut Chart Component ---
const DONUT_OPTIONS = {
  responsive: true,
  maintainAspectRatio: true,
  cutout: "60%",
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        boxWidth: 10,
        padding: 8,
        font: { size: 10 },
        color: "#6b7280",
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
          return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
        },
      },
    },
  },
};

function DonutChart({
  title,
  data,
}: {
  title: string;
  data: any;
}) {
  return (
    <div class="bg-white rounded-xl border border-gray-100 p-3">
      <h4 class="text-xs font-semibold text-gray-700 mb-2 text-center">{title}</h4>
      <Doughnut data={data} options={DONUT_OPTIONS} />
    </div>
  );
}

// --- Horizontal Bar Section (existing pattern) ---
function CountSection({
  title,
  items,
}: {
  title: string;
  items: CountItem[];
}) {
  const maxCount = Math.max(...items.map((i) => i.count));

  return (
    <div>
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{title}</h3>
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
        {items.map((item) => (
          <div key={item.label} class="flex items-center gap-3 px-4 py-2.5">
            <span class="text-xs text-gray-600 dark:text-gray-400 w-28 truncate shrink-0">{item.label}</span>
            <div class="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-[#1F4E79] dark:bg-[#4a90c4] rounded-full transition-all"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
