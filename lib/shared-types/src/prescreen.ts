import { z } from "zod/v4";
import { BBox2DSchema } from "./detection";
import { SeveritySchema } from "./qc";

/**
 * Pre-screen contract: what the on-device gate model posts to
 * POST /api/inspections/:id/pre-screen (docs/specs/prescreen-contract.md).
 * The device runs a fast 2D detector and decides whether the capture is
 * worth server-side WildDet3D analysis, needs a retake, or looks clean.
 */

export const PreScreenGateSchema = z.enum([
  // clean capture, no suspect regions — proceed to server analysis as usual
  "pass",
  // suspect regions found — proceed to server analysis, findings attached
  "escalate",
  // capture unusable (blur, glare, framing) — device should recapture
  "retake",
]);

export const PreScreenFindingSchema = z.object({
  // "component" = expected-part check, "anomaly" = open-set appearance defect
  axis: z.enum(["component", "anomaly"]),
  // ComponentType value or anomaly id from docs/specs/defect-taxonomy.md §3
  classId: z.string().min(1),
  score: z.number().min(0).max(1),
  bbox2d: BBox2DSchema,
  severity: SeveritySchema.optional(),
  // artifact key of the saved ROI crop, if the device uploaded one
  cropKey: z.string().optional(),
});

export const PreScreenResultSchema = z.object({
  // deployed pre-screen model identity, so results stay attributable
  // after retraining (data-flywheel spec §8)
  modelId: z.string().min(1),
  modelVersion: z.string().min(1),
  taxonomyVersion: z.string().min(1),
  gate: PreScreenGateSchema,
  findings: z.array(PreScreenFindingSchema),
  inferenceTimeMs: z.number().nonnegative(),
  imageSize: z.tuple([z.number().positive(), z.number().positive()]),
  capturedAt: z.iso.datetime(),
});

export type PreScreenGate = z.infer<typeof PreScreenGateSchema>;
export type PreScreenFinding = z.infer<typeof PreScreenFindingSchema>;
export type PreScreenResult = z.infer<typeof PreScreenResultSchema>;
