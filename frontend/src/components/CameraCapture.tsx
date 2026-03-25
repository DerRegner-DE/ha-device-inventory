import { useState, useRef, useEffect } from "preact/hooks";
import { t } from "../i18n";
import { useLanguage } from "../i18n";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [useWebcam, setUseWebcam] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [webcamAvailable, setWebcamAvailable] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [capturedViaWebcam, setCapturedViaWebcam] = useState(false);

  // Check if getUserMedia is available (secure context required)
  useEffect(() => {
    if (
      window.isSecureContext &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    ) {
      setWebcamAvailable(true);
    }
  }, []);

  // Assign stream to video element when both are available
  useEffect(() => {
    if (useWebcam && stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      setVideoReady(false);

      const onCanPlay = () => {
        video.play().then(() => {
          setVideoReady(true);
        }).catch(() => {
          video.muted = true;
          video.play().catch(() => {
            setVideoReady(false);
          });
        });
      };

      video.addEventListener("canplay", onCanPlay, { once: true });

      return () => {
        video.removeEventListener("canplay", onCanPlay);
      };
    }
  }, [useWebcam, stream]);

  // Cleanup webcam stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    setPendingBlob(file);
    setCapturedViaWebcam(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      setStream(mediaStream);
      setUseWebcam(true);
      setVideoReady(false);
    } catch {
      // getUserMedia failed, fall back to file input
      setWebcamAvailable(false);
      triggerFileInput();
    }
  };

  const captureFromWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          // Stop webcam
          stream?.getTracks().forEach((track) => track.stop());
          setStream(null);
          setUseWebcam(false);
          // Show preview
          setPreview(URL.createObjectURL(blob));
          setPendingBlob(blob);
          setCapturedViaWebcam(true);
        }
      },
      "image/jpeg",
      0.85,
    );
  };

  const confirmPhoto = () => {
    if (pendingBlob) {
      onCapture(pendingBlob);
    }
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPendingBlob(null);

    // If the photo was taken via webcam, go directly back to camera
    if (capturedViaWebcam && webcamAvailable) {
      setCapturedViaWebcam(false);
      startWebcam();
    }
    // Otherwise (file input), go back to selection screen
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (preview) URL.revokeObjectURL(preview);
    onClose();
  };

  // Preview mode: show taken/selected photo with confirm/retake
  if (preview) {
    return (
      <div
        class="absolute top-0 left-0 w-full bg-black flex flex-col"
        style="height: 100vh; height: 100dvh; z-index: 9999;"
      >
        <div class="flex items-center justify-between p-4 flex-shrink-0">
          <h2 class="text-white font-semibold">{t("camera.preview") || "Vorschau"}</h2>
          <button onClick={handleClose} class="text-white p-2">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 flex items-center justify-center overflow-hidden p-4">
          <img src={preview} alt="Preview" class="max-w-full max-h-full object-contain rounded-xl" />
        </div>
        <div class="flex items-center justify-center gap-6 p-6 pb-8 bg-black flex-shrink-0">
          <button
            onClick={retake}
            class="px-6 py-3 rounded-xl bg-white/20 text-white text-sm font-medium"
          >
            {t("camera.retake") || "Erneut aufnehmen"}
          </button>
          <button
            onClick={confirmPhoto}
            class="px-6 py-3 rounded-xl bg-white text-black text-sm font-medium"
          >
            {t("camera.confirm") || "Foto verwenden"}
          </button>
        </div>
      </div>
    );
  }

  // Webcam/Camera mode: live video feed with capture button
  if (useWebcam && stream) {
    return (
      <div
        class="absolute top-0 left-0 w-full bg-black flex flex-col"
        style="height: 100vh; height: 100dvh; z-index: 9999;"
      >
        <div class="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            class="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} class="hidden" />
          {!videoReady && (
            <div class="absolute inset-0 flex items-center justify-center bg-black/80">
              <div class="text-white/60 text-sm">{t("camera.starting") || "Kamera wird gestartet..."}</div>
            </div>
          )}
        </div>
        <div class="flex items-center justify-center gap-8 p-6 pb-8 bg-black flex-shrink-0">
          <button
            onClick={handleClose}
            class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={captureFromWebcam}
            disabled={!videoReady}
            class={`w-16 h-16 rounded-full flex items-center justify-center ${videoReady ? "bg-white" : "bg-white/30"}`}
          >
            <div class={`w-14 h-14 rounded-full border-2 ${videoReady ? "border-gray-300" : "border-gray-500"}`} />
          </button>
          <div class="w-12" />
        </div>
      </div>
    );
  }

  // Default mode: camera (primary) or choose from gallery
  return (
    <div
      class="absolute top-0 left-0 w-full bg-black flex flex-col items-center justify-center"
      style="height: 100vh; height: 100dvh; z-index: 9999;"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        class="hidden"
      />

      <div class="flex items-center justify-between p-4 absolute top-0 left-0 w-full">
        <h2 class="text-white font-semibold">{t("camera.title") || "Kamera"}</h2>
        <button onClick={handleClose} class="text-white p-2">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex flex-col items-center gap-4">
        {webcamAvailable && (
          <button
            onClick={startWebcam}
            class="flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-black text-sm font-medium"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2" />
            </svg>
            {t("camera.takePhoto") || "Foto aufnehmen"}
          </button>
        )}

        <button
          onClick={triggerFileInput}
          class={`flex items-center gap-3 px-8 py-4 rounded-xl text-sm font-medium ${webcamAvailable ? "bg-white/20 text-white" : "bg-white text-black"}`}
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {t("camera.chooseImage") || "Bild auswählen"}
        </button>

        <p class="text-white/40 text-xs mt-4 text-center px-8">
          {t("camera.fileInputHint") || "Öffnet die Kamera-App auf dem Handy oder die Dateiauswahl auf dem PC"}
        </p>
      </div>
    </div>
  );
}
