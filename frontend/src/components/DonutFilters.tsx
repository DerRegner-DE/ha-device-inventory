import { type Device } from "../db/schema";
import { getDeviceTypeLabel } from "../utils/constants";
import { t } from "../i18n";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

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

export type DonutFilterKey =
  | "gv_filter_type"
  | "gv_filter_netzwerk"
  | "gv_filter_power"
  | "gv_filter_warranty";

function warrantyDays(garantieBis: string | undefined | null): number | null {
  if (!garantieBis) return null;
  try {
    const exp = new Date(garantieBis);
    return Math.ceil((exp.getTime() - Date.now()) / 86400000);
  } catch {
    return null;
  }
}

function mapToChartData(
  map: Map<string, number>,
  labelFn?: (key: string) => string,
) {
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const keys = sorted.map(([k]) => k);
  return {
    keys,
    data: {
      labels: sorted.map(([k]) => (labelFn ? labelFn(k) : k)),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: sorted.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 0,
      }],
    },
  };
}

function donutOptions(compact: boolean) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    cutout: compact ? "55%" : "60%",
    plugins: {
      legend: compact
        ? { display: false }
        : {
            position: "bottom" as const,
            labels: { boxWidth: 10, padding: 8, font: { size: 10 }, color: "#6b7280" },
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
}

function DonutCard({
  title,
  data,
  compact,
  onSegmentClick,
}: {
  title: string;
  data: any;
  compact: boolean;
  onSegmentClick: (index: number) => void;
}) {
  const options = {
    ...donutOptions(compact),
    onClick: (_evt: any, elements: any[]) => {
      if (elements.length > 0) onSegmentClick(elements[0].index);
    },
    onHover: (evt: any, elements: any[]) => {
      const target = evt?.native?.target;
      if (target) target.style.cursor = elements.length > 0 ? "pointer" : "default";
    },
  };
  const sizeClass = compact ? "p-2 w-[110px] shrink-0" : "p-3";
  const titleClass = compact
    ? "text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1 text-center truncate"
    : "text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center";
  return (
    <div class={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 ${sizeClass}`}>
      <h4 class={titleClass}>{title}</h4>
      <Doughnut data={data} options={options} />
    </div>
  );
}

interface Props {
  devices: Device[];
  onSelect: (key: DonutFilterKey, value: string) => void;
  compact?: boolean;
}

/**
 * Donut chart grid for filtering devices by type, network, power, and warranty.
 * `compact` renders a horizontal-scroll row of small cards without legends (for
 * the device list); otherwise renders a responsive grid with legends (dashboard).
 */
export function DonutFilters({ devices, onSelect, compact = false }: Props) {
  const byType = new Map<string, number>();
  const byNetwork = new Map<string, number>();
  const byPower = new Map<string, number>();
  let warrantyOk = 0, warrantyWarning = 0, warrantyExpired = 0, warrantyNone = 0;

  for (const d of devices) {
    byType.set(d.typ, (byType.get(d.typ) ?? 0) + 1);
    if (d.netzwerk) byNetwork.set(d.netzwerk, (byNetwork.get(d.netzwerk) ?? 0) + 1);
    if (d.stromversorgung) byPower.set(d.stromversorgung, (byPower.get(d.stromversorgung) ?? 0) + 1);
    const days = warrantyDays(d.garantie_bis);
    if (days === null) warrantyNone++;
    else if (days < 0) warrantyExpired++;
    else if (days < 30) warrantyWarning++;
    else warrantyOk++;
  }

  const typeChart = mapToChartData(byType, (k) => t(getDeviceTypeLabel(k)));
  const networkChart = mapToChartData(byNetwork);
  const powerChart = mapToChartData(byPower);

  const warrantyKeys = ["ok", "warning", "expired", "none"] as const;
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

  const containerClass = compact
    ? "flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
    : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto";

  return (
    <div class={containerClass}>
      {byType.size > 0 && (
        <DonutCard
          title={t("dashboard.byType")}
          data={typeChart.data}
          compact={compact}
          onSegmentClick={(i) => onSelect("gv_filter_type", typeChart.keys[i])}
        />
      )}
      {byNetwork.size > 0 && (
        <DonutCard
          title={t("dashboard.byNetwork")}
          data={networkChart.data}
          compact={compact}
          onSegmentClick={(i) => onSelect("gv_filter_netzwerk", networkChart.keys[i])}
        />
      )}
      {byPower.size > 0 && (
        <DonutCard
          title={t("dashboard.byPower")}
          data={powerChart.data}
          compact={compact}
          onSegmentClick={(i) => onSelect("gv_filter_power", powerChart.keys[i])}
        />
      )}
      {hasWarrantyData && (
        <DonutCard
          title={t("dashboard.warrantyStatus")}
          data={warrantyChartData}
          compact={compact}
          onSegmentClick={(i) => onSelect("gv_filter_warranty", warrantyKeys[i])}
        />
      )}
    </div>
  );
}
