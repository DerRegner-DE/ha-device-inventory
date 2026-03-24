import { useEffect, useRef, useState } from "preact/hooks";
import { t } from "../i18n";
import { useLanguage } from "../i18n";

interface BarcodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  useLanguage();
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  const handleClose = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(() => {});
    }
    onCloseRef.current();
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!window.isSecureContext) {
          if (mounted) setError(t("scanner.httpsRequired"));
          return;
        }

        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted || !scannerRef.current) return;

        const scanner = new Html5Qrcode("barcode-reader");
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScanRef.current(decodedText);
            scanner.stop().catch(() => {});
          },
          () => {}
        );
      } catch {
        if (mounted) setError(t("scanner.error"));
      }
    })();

    return () => {
      mounted = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            // Clear any leftover DOM elements from html5-qrcode
            const container = document.getElementById("barcode-reader");
            if (container) {
              while (container.firstChild) {
                container.removeChild(container.firstChild);
              }
            }
            html5QrCodeRef.current = null;
          });
      }
    };
  }, []);

  if (error) {
    return (
      <div
        class="absolute top-0 left-0 w-full bg-black flex items-center justify-center"
        style="height: 100vh; height: 100dvh; z-index: 9999;"
      >
        <div class="text-white text-center p-4">
          <p class="mb-4">{error}</p>
          <button onClick={handleClose} class="px-4 py-2 bg-white text-black rounded-lg">
            {t("common.close")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      class="absolute top-0 left-0 w-full bg-black flex flex-col"
      style="height: 100vh; height: 100dvh; z-index: 9999;"
    >
      <div class="flex items-center justify-between p-4 flex-shrink-0">
        <h2 class="text-white font-semibold">{t("scanner.title")}</h2>
        <button onClick={handleClose} class="text-white p-2">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="flex-1 flex items-center justify-center overflow-hidden">
        <div ref={scannerRef} id="barcode-reader" class="w-full max-w-md" />
      </div>
      <p class="text-center text-white/60 text-xs pb-8 flex-shrink-0">
        {t("scanner.hint")}
      </p>
    </div>
  );
}
