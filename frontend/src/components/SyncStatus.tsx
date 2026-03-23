import { useOnline } from "../hooks/useOnline";
import { t } from "../i18n";
import { useLanguage } from "../i18n";

export function SyncStatus() {
  useLanguage();
  const { online, pendingCount } = useOnline();

  let color = "bg-green-500";
  let title = t("sync.connected");

  if (!online) {
    color = "bg-red-500";
    title = t("sync.offline");
  } else if (pendingCount > 0) {
    color = "bg-yellow-500";
    title = t("sync.pending", { count: pendingCount });
  }

  return (
    <div class="flex items-center gap-1.5" title={title}>
      <span class={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
      {pendingCount > 0 && (
        <span class="text-xs text-white/80">{pendingCount}</span>
      )}
    </div>
  );
}
