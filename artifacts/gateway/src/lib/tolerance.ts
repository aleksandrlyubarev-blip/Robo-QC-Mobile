import type { Vec3, Orientation, Extent } from "@workspace/shared-types";

/** Euclidean distance between two 3D points (mm) */
export function positionDistance(a: Vec3, b: Vec3): number {
  return Math.sqrt(
    (a.x - b.x) ** 2 +
    (a.y - b.y) ** 2 +
    (a.z - b.z) ** 2,
  );
}

/** Angular difference between two orientations (degrees) */
export function orientationDistance(a: Orientation, b: Orientation): number {
  const dRoll = angleDiff(a.roll, b.roll);
  const dPitch = angleDiff(a.pitch, b.pitch);
  const dYaw = angleDiff(a.yaw, b.yaw);
  return Math.sqrt(dRoll ** 2 + dPitch ** 2 + dYaw ** 2);
}

/** Maximum extent deviation across all axes (mm) */
export function extentDeviation(expected: Extent, detected: Extent): number {
  return Math.max(
    Math.abs(expected.width - detected.width),
    Math.abs(expected.height - detected.height),
    Math.abs(expected.depth - detected.depth),
  );
}

/** Normalize angle difference to [-180, 180] range */
function angleDiff(a: number, b: number): number {
  let diff = ((a - b) % 360 + 540) % 360 - 180;
  return diff;
}
