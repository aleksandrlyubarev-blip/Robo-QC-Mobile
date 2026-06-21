import type { ComponentSpec, DetectionResponse } from "@workspace/shared-types";

const IMAGE_SIZE: [number, number] = [1280, 960];

/**
 * Produces a deterministic-but-varied DetectionResponse for a spec without a
 * GPU/WildDet3D server. Enabled with INFERENCE_MOCK=true so the full live AOI
 * flow (analyze → QC → review → report) is demonstrable in dev.
 */
export function mockDetectionResponse(components: ComponentSpec[]): DetectionResponse {
  const [w, h] = IMAGE_SIZE;
  const cols = Math.ceil(Math.sqrt(Math.max(1, components.length)));
  const cellW = w / cols;
  const rows = Math.ceil(components.length / cols);
  const cellH = h / rows;

  const detections = components
    .map((c, idx) => {
      // Occasionally drop a component to exercise the "missing" QC path.
      const drop = idx % 7 === 6;
      if (drop) return null;

      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const pad = Math.min(cellW, cellH) * 0.18;
      const bbox2d = {
        x: Math.round(col * cellW + pad),
        y: Math.round(row * cellH + pad),
        width: Math.round(cellW - pad * 2),
        height: Math.round(cellH - pad * 2),
      };

      // Small deviations; every 3rd component drifts past tolerance to fail.
      const fail = idx % 3 === 1;
      const drift = fail ? c.positionTolerance * 1.8 : c.positionTolerance * 0.3;
      const score = fail
        ? Math.max(0.3, c.minConfidenceScore - 0.05)
        : Math.min(0.99, c.minConfidenceScore + 0.3);

      return {
        label: c.label,
        score,
        bbox3d: {
          center: {
            x: c.expectedPosition.x + drift,
            y: c.expectedPosition.y,
            z: c.expectedPosition.z,
          },
          extent: { ...c.expectedExtent },
          orientation: { ...c.expectedOrientation },
        },
        bbox2d,
        depthUsed: true,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return {
    detections,
    inferenceTimeMs: 180,
    depthAvailable: true,
    imageSize: IMAGE_SIZE,
  };
}
