import { useEffect, useState } from "preact/hooks";
import { t } from "../i18n";

/**
 * Lightweight "undo toast" — a Gmail-style strip at the bottom that appears
 * after a destructive action and fades after 6 seconds, giving the user one
 * click to revert. Used for single-device delete and bulk delete so far.
 *
 * Pattern: a module-level event bus. Components emit via ``showUndoToast()``,
 * a single ``<UndoToastHost />`` rendered at app root listens and renders.
 * Avoids prop-drilling through half the component tree.
 */

const DURATION_MS = 6000;

interface ToastState {
  id: number;
  message: string;
  onUndo: () => Promise<void> | void;
}

type Listener = (t: ToastState | null) => void;

let counter = 0;
const listeners = new Set<Listener>();
let current: ToastState | null = null;

function setToast(next: ToastState | null) {
  current = next;
  listeners.forEach((l) => l(next));
}

/** Show an undo toast. Call from any destructive action. */
export function showUndoToast(message: string, onUndo: () => Promise<void> | void) {
  counter += 1;
  setToast({ id: counter, message, onUndo });
}

/** Single mount at app root — listens for toast emits and renders. */
export function UndoToastHost() {
  const [toast, setVisible] = useState<ToastState | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    listeners.add(setVisible);
    return () => {
      listeners.delete(setVisible);
    };
  }, []);

  // Auto-dismiss timer. Resets whenever a new toast arrives (id changes).
  useEffect(() => {
    if (!toast) return;
    const id = toast.id;
    const timer = window.setTimeout(() => {
      // Only dismiss if we're still the current toast (user didn't click undo).
      if (current && current.id === id) setToast(null);
    }, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast?.id]);

  if (!toast) return null;

  const handleUndo = async () => {
    if (acting) return;
    setActing(true);
    try {
      await toast.onUndo();
    } catch {
      // Swallow — the onUndo callback is responsible for its own error UX.
    }
    setActing(false);
    setToast(null);
  };

  return (
    <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)]">
      <div class="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
        <span class="flex-1 text-sm">{toast.message}</span>
        <button
          onClick={handleUndo}
          disabled={acting}
          class="text-sm font-medium text-amber-300 dark:text-amber-600 hover:text-amber-200 dark:hover:text-amber-700 uppercase disabled:opacity-50"
        >
          {acting ? "…" : t("undo.button")}
        </button>
      </div>
    </div>
  );
}
