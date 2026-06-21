import { useEffect, useRef, useState } from "react";
import type { DetectionResponse } from "../api/types";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Draws 2D detection boxes over the captured image.
 *
 * The image is rendered with `object-fit: contain`, so it may be letterboxed
 * inside its box. Detection coordinates are expressed in the model's reported
 * `imageSize` space; we map them to fractions of that space and then onto the
 * *displayed* image rectangle (accounting for the contain letterbox offsets),
 * which keeps boxes aligned at any container size or aspect ratio.
 */
export function DetectionOverlay({
  imageUrl,
  detections,
}: {
  imageUrl: string;
  detections: DetectionResponse | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [contentRect, setContentRect] = useState<Box | null>(null);

  const [imgW, imgH] = detections?.imageSize ?? [0, 0];
  const boxes = detections?.detections.filter((d) => d.bbox2d) ?? [];

  // Recompute the displayed image rectangle (the contain-fit content box)
  // whenever the container resizes or the image's natural size is known.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !natural) return;

    const compute = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!cw || !ch) return;
      const scale = Math.min(cw / natural.w, ch / natural.h);
      const dw = natural.w * scale;
      const dh = natural.h * scale;
      setContentRect({
        left: (cw - dw) / 2,
        top: (ch - dh) / 2,
        width: dw,
        height: dh,
      });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [natural]);

  const canDraw = contentRect && imgW > 0 && imgH > 0;

  return (
    <div className="bbox-stage" ref={containerRef}>
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Inspected board"
        onLoad={(e) =>
          setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
        }
      />
      {canDraw &&
        boxes.map((d, i) => {
          const b = d.bbox2d!;
          const left = contentRect!.left + (b.x / imgW) * contentRect!.width;
          const top = contentRect!.top + (b.y / imgH) * contentRect!.height;
          const width = (b.width / imgW) * contentRect!.width;
          const height = (b.height / imgH) * contentRect!.height;
          return (
            <div key={i} className="bbox" style={{ left, top, width, height }}>
              <span className="bbox-label">
                {d.label} {(d.score * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
    </div>
  );
}
