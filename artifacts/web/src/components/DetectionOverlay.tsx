import type { DetectionResponse } from "../api/types";

/**
 * Draws 2D detection boxes over the captured image. Boxes are positioned as
 * percentages of the model's reported image size so the overlay scales with
 * whatever width the image is rendered at.
 */
export function DetectionOverlay({
  imageUrl,
  detections,
}: {
  imageUrl: string;
  detections: DetectionResponse | null;
}) {
  const [imgW, imgH] = detections?.imageSize ?? [0, 0];
  const boxes = detections?.detections.filter((d) => d.bbox2d) ?? [];

  return (
    <div className="bbox-canvas">
      <img src={imageUrl} alt="Inspected board" />
      {imgW > 0 &&
        imgH > 0 &&
        boxes.map((d, i) => {
          const b = d.bbox2d!;
          return (
            <div
              key={i}
              className="bbox"
              style={{
                left: `${(b.x / imgW) * 100}%`,
                top: `${(b.y / imgH) * 100}%`,
                width: `${(b.width / imgW) * 100}%`,
                height: `${(b.height / imgH) * 100}%`,
              }}
            >
              <span className="bbox-label">
                {d.label} {(d.score * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
    </div>
  );
}
