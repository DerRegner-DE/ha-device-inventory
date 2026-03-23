import { useState, useEffect, useCallback } from "preact/hooks";
import { getPendingCount, syncPendingQueue } from "../api/client";

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      syncPendingQueue().then(() => refreshPending());
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    refreshPending();

    const interval = setInterval(refreshPending, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [refreshPending]);

  return { online, pendingCount, refreshPending };
}
