import type {
  ComponentSpec,
  ComponentType,
  BoardDimensions,
  Detection3D,
  DetectionResponse,
  BBox3D,
  BBox2D,
  QcStatus,
  OverallStatus,
  InspectionStatus,
  ReviewDecision,
  QcComponentResult,
} from "@workspace/shared-types";

/**
 * API response shapes returned by the gateway (@workspace/gateway).
 *
 * These mirror the Drizzle row types in @workspace/db but are redeclared here
 * because the db package pulls in Node/Postgres dependencies that cannot be
 * imported into a browser bundle. Nested JSON payloads reuse the shared zod
 * types so the contract stays in sync with the backend.
 */

export type {
  ComponentSpec,
  ComponentType,
  BoardDimensions,
  Detection3D,
  DetectionResponse,
  BBox3D,
  BBox2D,
  QcStatus,
  OverallStatus,
  InspectionStatus,
  ReviewDecision,
  QcComponentResult,
};

export interface PcbSpec {
  id: number;
  name: string;
  version: string;
  boardDimensions: BoardDimensions | null;
  components: ComponentSpec[];
  referenceImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Inspection {
  id: number;
  specId: number;
  status: InspectionStatus;
  operatorId: string | null;
  deviceInfo: Record<string, unknown> | null;
  capturedImageUrl: string | null;
  capturedDepthMapUrl: string | null;
  preScreenResult: unknown;
  serverDetections: DetectionResponse | null;
  createdAt: string;
  updatedAt: string;
}

/** A persisted detection row (one component instance found by the model). */
export interface DetectionRecord {
  id: number;
  inspectionId: number;
  componentId: string;
  detectedLabel: string;
  score: number;
  bbox3d: BBox3D;
  bbox2d: BBox2D | null;
  source: string;
  createdAt: string;
}

/** A persisted QC verdict row for a single component. */
export interface QcResultRecord {
  id: number;
  inspectionId: number;
  componentId: string;
  status: QcStatus;
  positionDeviation: number | null;
  orientationDeviation: number | null;
  extentDeviation: number | null;
  scoreDeviation: number | null;
  details: Record<string, unknown> | null;
  reviewedBy: string | null;
  reviewDecision: ReviewDecision | null;
  createdAt: string;
}

export interface InspectionDetail extends Inspection {
  detections: DetectionRecord[];
  qcResults: QcResultRecord[];
}

export interface Report {
  id: number;
  inspectionId: number;
  specId: number;
  overallStatus: OverallStatus;
  passCount: number;
  failCount: number;
  warningCount: number;
  missingCount: number;
  totalComponents: number;
  reportJson: Record<string, unknown> | null;
  reportPdfUrl: string | null;
  operatorNotes: string | null;
  createdAt: string;
}

/** Response from POST /inspections/:id/analyze. */
export interface AnalyzeResult {
  status: InspectionStatus;
  detections: Detection3D[];
  qcResults: QcComponentResult[];
}

export interface HealthStatus {
  status: string;
  inferenceServer: "connected" | "unavailable";
}

/** Payloads for create/update mutations. */
export type CreateSpecInput = {
  name: string;
  version?: string;
  boardDimensions?: BoardDimensions | null;
  components?: ComponentSpec[];
  referenceImageUrl?: string | null;
};

export type CreateInspectionInput = {
  specId: number;
  operatorId?: string | null;
  deviceInfo?: Record<string, unknown> | null;
  capturedImageUrl?: string | null;
  capturedDepthMapUrl?: string | null;
};

export type ReviewInput = {
  componentId: string;
  decision: ReviewDecision;
  reviewedBy: string;
};
