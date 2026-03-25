import { useState, useEffect, useCallback } from "preact/hooks";
import { getPendingCount, syncPendingQueue, syncFromServer } from "../api/client";

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const fullSync = useCallback(async () => {
    // First push pending local changes
    await syncPendingQueue();
    // Then pull from server
    await syncFromServer();
    // Update pending count
    await refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      fullSync();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial sync on mount
    fullSync();

    // Periodic sync every 30 seconds
    const interval = setInterval(fullSync, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [fullSync]);

  return { online, pendingCount, refreshPending };
}
