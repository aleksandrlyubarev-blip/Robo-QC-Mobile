import { useCallback, useEffect, useRef, useState } from "react";

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  ready: boolean;
  error: string | null;
  /** Capture the current video frame as a JPEG data URL. */
  capture: (maxWidth?: number) => string | null;
  stop: () => void;
}

/**
 * Wraps getUserMedia for capturing still frames from the rear-facing camera.
 * Streams stop automatically on unmount.
 */
export function useCamera(active: boolean): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }

    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera API is not available in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setError(null);
        setReady(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? `Camera access failed: ${err.message}`
            : "Camera access failed.",
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [active, stop]);

  const capture = useCallback((maxWidth = 1280): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  return { videoRef, ready, error, capture, stop };
}

/** Read an uploaded file into a JPEG/PNG data URL (fallback when no camera). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
