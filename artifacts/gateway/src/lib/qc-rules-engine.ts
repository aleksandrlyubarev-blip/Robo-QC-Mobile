import type { Detection3D, ComponentSpec, QcComponentResult, QcStatus } from "@workspace/shared-types";
import { positionDistance, orientationDistance, extentDeviation } from "./tolerance";

/**
 * QC Rules Engine: compare WildDet3D 3D detections against PCB spec components.
 * Returns per-component pass/fail results with deviation measurements.
 */
export function runQcRulesEngine(
  detections: Detection3D[],
  components: ComponentSpec[],
): QcComponentResult[] {
  const results: QcComponentResult[] = [];
  const matchedDetections = new Set<number>();

  for (const component of components) {
    const match = findBestMatch(component, detections, matchedDetections);

    if (!match) {
      // Component not detected
      results.push({
        componentId: component.componentId,
        status: component.required ? "missing" : "warning",
        positionDeviation: null,
        orientationDeviation: null,
        extentDeviation: null,
        scoreDeviation: null,
        details: { reason: "No matching detection found" },
      });
      continue;
    }

    matchedDetections.add(match.index);
    const det = match.detection;

    // Check each tolerance
    const posDev = positionDistance(component.expectedPosition, det.bbox3d.center);
    const oriDev = orientationDistance(component.expectedOrientation, det.bbox3d.orientation);
    const extDev = extentDeviation(component.expectedExtent, det.bbox3d.extent);
    const scoreDev = det.score < component.minConfidenceScore
      ? component.minConfidenceScore - det.score
      : null;

    const posPass = posDev <= component.positionTolerance;
    const oriPass = oriDev <= component.orientationTolerance;
    const extPass = extDev <= component.extentTolerance;
    const scorePass = det.score >= component.minConfidenceScore;

    let status: QcStatus;
    if (posPass && oriPass && extPass && scorePass) {
      status = "pass";
    } else if (!posPass || !extPass) {
      // Position or dimensional failures are definite fails
      status = component.required ? "fail" : "warning";
    } else if (!scorePass) {
      // Low confidence — needs review
      status = "review_needed";
    } else {
      // Orientation issues are warnings by default
      status = "warning";
    }

    const details: Record<string, unknown> = {};
    if (!posPass) details.positionExceedsTolerance = true;
    if (!oriPass) details.orientationExceedsTolerance = true;
    if (!extPass) details.extentExceedsTolerance = true;
    if (!scorePass) details.scoreBelowThreshold = true;

    results.push({
      componentId: component.componentId,
      status,
      positionDeviation: posDev,
      orientationDeviation: oriDev,
      extentDeviation: extDev,
      scoreDeviation: scoreDev,
      details: Object.keys(details).length > 0 ? details : null,
    });
  }

  return results;
}

/**
 * Find the best matching detection for a component spec.
 * Matching criteria: label similarity + closest 3D position.
 */
function findBestMatch(
  component: ComponentSpec,
  detections: Detection3D[],
  alreadyMatched: Set<number>,
): { detection: Detection3D; index: number } | null {
  let bestScore = -Infinity;
  let bestIdx = -1;

  for (let i = 0; i < detections.length; i++) {
    if (alreadyMatched.has(i)) continue;

    const det = detections[i];

    // Label matching: check if the detected label relates to the component type/prompt
    const labelMatch = labelSimilarity(component, det.label);
    if (labelMatch <= 0) continue;

    // Distance penalty: closer is better
    const dist = positionDistance(component.expectedPosition, det.bbox3d.center);
    const distScore = Math.max(0, 1 - dist / 100); // normalize: 100mm = 0 score

    // Combined score: label match + proximity + detection confidence
    const combined = labelMatch * 0.4 + distScore * 0.4 + det.score * 0.2;

    if (combined > bestScore) {
      bestScore = combined;
      bestIdx = i;
    }
  }

  if (bestIdx < 0) return null;
  return { detection: detections[bestIdx], index: bestIdx };
}

/** Simple label similarity based on keyword matching */
function labelSimilarity(component: ComponentSpec, detectedLabel: string): number {
  const detected = detectedLabel.toLowerCase();
  const type = component.type.toLowerCase().replace("_", " ");
  const label = component.label.toLowerCase();
  const prompt = component.textPrompt.toLowerCase();

  // Exact type match
  if (detected.includes(type)) return 1.0;
  // Label contains detected or vice versa
  if (detected.includes(label) || label.includes(detected)) return 0.8;
  // Prompt keywords match
  const promptWords = prompt.split(/\s+/);
  const matchCount = promptWords.filter((w) => detected.includes(w)).length;
  if (matchCount > 0) return 0.5 * (matchCount / promptWords.length);

  return 0;
}
