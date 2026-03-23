import { useState, useRef, useEffect } from "preact/hooks";
import { t } from "../i18n";
import { useLanguage } from "../i18n";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      })
      .then((s) => {
        mediaStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => {
        setError(t("camera.error"));
      });

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const capture = () => {
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
          onCapture(blob);
          stream?.getTracks().forEach((t) => t.stop());
        }
      },
      "image/jpeg",
      0.85
    );
  };

  if (error) {
    return (
      <div class="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div class="text-white text-center p-4">
          <p class="mb-4">{error}</p>
          <button onClick={onClose} class="px-4 py-2 bg-white text-black rounded-lg">
            {t("common.close")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="fixed inset-0 bg-black z-50 flex flex-col">
      <div class="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          class="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} class="hidden" />
      </div>
      <div class="flex items-center justify-center gap-8 p-6 bg-black">
        <button
          onClick={onClose}
          class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={capture}
          class="w-16 h-16 rounded-full bg-white flex items-center justify-center"
        >
          <div class="w-14 h-14 rounded-full border-2 border-gray-300" />
        </button>
        <div class="w-12" />
      </div>
    </div>
  );
}
