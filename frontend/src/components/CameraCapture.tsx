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

  // Check if getUserMedia is available (secure context + not in restrictive iframe)
  // Hide webcam button on mobile devices where getUserMedia doesn't work in Ingress iframes
  useEffect(() => {
    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (
      !isMobile &&
      window.isSecureContext &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    ) {
      setWebcamAvailable(true);
    }
  }, []);

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
      // Assign stream to video element after state update
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      });
    } catch {
      // getUserMedia failed (e.g. iframe restriction), fall back to file input
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
          <h2 class="text-white font-semibold">{t("camera.preview") || "Preview"}</h2>
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
            {t("camera.retake") || "Retake"}
          </button>
          <button
            onClick={confirmPhoto}
            class="px-6 py-3 rounded-xl bg-white text-black text-sm font-medium"
          >
            {t("camera.confirm") || "Use Photo"}
          </button>
        </div>
      </div>
    );
  }

  // Webcam mode: live video feed with capture button
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
            class="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} class="hidden" />
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
            class="w-16 h-16 rounded-full bg-white flex items-center justify-center"
          >
            <div class="w-14 h-14 rounded-full border-2 border-gray-300" />
          </button>
          <div class="w-12" />
        </div>
      </div>
    );
  }

  // Default mode: buttons to take photo (file input) or use webcam
  return (
    <div
      class="absolute top-0 left-0 w-full bg-black flex flex-col items-center justify-center"
      style="height: 100vh; height: 100dvh; z-index: 9999;"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        class="hidden"
      />

      <div class="flex items-center justify-between p-4 absolute top-0 left-0 w-full">
        <h2 class="text-white font-semibold">{t("camera.title") || "Camera"}</h2>
        <button onClick={handleClose} class="text-white p-2">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex flex-col items-center gap-4">
        <button
          onClick={triggerFileInput}
          class="flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-black text-sm font-medium"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2" />
          </svg>
          {t("camera.takePhoto") || "Take Photo"}
        </button>

        {webcamAvailable && (
          <button
            onClick={startWebcam}
            class="flex items-center gap-3 px-8 py-4 rounded-xl bg-white/20 text-white text-sm font-medium"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {t("camera.useWebcam") || "Use Webcam"}
          </button>
        )}

        <p class="text-white/40 text-xs mt-4 text-center px-8">
          {t("camera.fileInputHint") || "Opens your camera app on mobile, or file picker on desktop."}
        </p>
      </div>
    </div>
  );
}
