import { z } from "zod/v4";

export const QcStatusSchema = z.enum([
  "pass",
  "fail",
  "warning",
  "missing",
  "review_needed",
  "pending",
]);

export const OverallStatusSchema = z.enum([
  "pass",
  "fail",
  "conditional_pass",
  "pending",
]);

export const InspectionStatusSchema = z.enum([
  "capturing",
  "pre_screening",
  "uploading",
  "analyzing",
  "reviewing",
  "completed",
  "failed",
]);

export const ReviewDecisionSchema = z.enum([
  "approved",
  "rejected",
  "override_pass",
]);

export const QcComponentResultSchema = z.object({
  componentId: z.string(),
  status: QcStatusSchema,
  positionDeviation: z.number().nullable(),
  orientationDeviation: z.number().nullable(),
  extentDeviation: z.number().nullable(),
  scoreDeviation: z.number().nullable(),
  details: z.record(z.string(), z.unknown()).nullable(),
});

export const QcReportSummarySchema = z.object({
  overallStatus: OverallStatusSchema,
  passCount: z.number().int(),
  failCount: z.number().int(),
  warningCount: z.number().int(),
  missingCount: z.number().int(),
  totalComponents: z.number().int(),
  componentResults: z.array(QcComponentResultSchema),
});

export type QcStatus = z.infer<typeof QcStatusSchema>;
export type OverallStatus = z.infer<typeof OverallStatusSchema>;
export type InspectionStatus = z.infer<typeof InspectionStatusSchema>;
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;
export type QcComponentResult = z.infer<typeof QcComponentResultSchema>;
export type QcReportSummary = z.infer<typeof QcReportSummarySchema>;
