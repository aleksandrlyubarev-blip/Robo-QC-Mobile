import type {
  PcbSpec,
  InspectionDetail,
  Report,
  ComponentSpec,
  QcStatus,
  QcResultRecord,
  DetectionRecord,
  DetectionResponse,
  BBox3D,
} from "../api/types";
import { BOARD_SLOTS, BOARD_IMAGE_SIZE, boardImageDataUrl } from "./board";

export interface DemoState {
  specs: PcbSpec[];
  inspections: InspectionDetail[];
  reports: Report[];
  seq: { spec: number; inspection: number; detection: number; qc: number; report: number };
}

const now = Date.now();
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();

const slot = (id: string) => BOARD_SLOTS.find((s) => s.componentId === id);

function bbox3dFor(c: ComponentSpec, jitter = 0): BBox3D {
  return {
    center: {
      x: c.expectedPosition.x + jitter,
      y: c.expectedPosition.y + jitter,
      z: c.expectedPosition.z,
    },
    extent: { ...c.expectedExtent },
    orientation: { ...c.expectedOrientation },
  };
}

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------

const SFB_COMPONENTS: ComponentSpec[] = [
  {
    componentId: "osfp-cage-1",
    type: "osfp_cage",
    label: "OSFP Cage A1",
    textPrompt: "metal OSFP transceiver cage",
    expectedPosition: { x: 24, y: 86, z: 6 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent: { width: 22, height: 9, depth: 78 },
    positionTolerance: 1.5,
    orientationTolerance: 6,
    extentTolerance: 1.5,
    required: true,
    minConfidenceScore: 0.55,
  },
  {
    componentId: "osfp-cage-2",
    type: "osfp_cage",
    label: "OSFP Cage A2",
    textPrompt: "metal OSFP transceiver cage",
    expectedPosition: { x: 24, y: 64, z: 6 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent: { width: 22, height: 9, depth: 78 },
    positionTolerance: 1.5,
    orientationTolerance: 6,
    extentTolerance: 1.5,
    required: true,
    minConfidenceScore: 0.55,
  },
  {
    componentId: "heatsink-asic",
    type: "heatsink",
    label: "ASIC Heatsink",
    textPrompt: "black finned aluminium heatsink",
    expectedPosition: { x: 60, y: 54, z: 14 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent: { width: 42, height: 42, depth: 22 },
    positionTolerance: 2,
    orientationTolerance: 8,
    extentTolerance: 2,
    required: true,
    minConfidenceScore: 0.6,
  },
  {
    componentId: "conn-j1",
    type: "connector",
    label: "Power Connector J1",
    textPrompt: "black right-angle power connector",
    expectedPosition: { x: 104, y: 58, z: 8 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 90 },
    expectedExtent: { width: 14, height: 32, depth: 12 },
    positionTolerance: 1.5,
    orientationTolerance: 5,
    extentTolerance: 1.5,
    required: true,
    minConfidenceScore: 0.5,
  },
  {
    componentId: "screw-tl",
    type: "screw",
    label: "Mount Screw TL",
    textPrompt: "silver hex mounting screw",
    expectedPosition: { x: 8, y: 92, z: 3 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent: { width: 5, height: 5, depth: 4 },
    positionTolerance: 1,
    orientationTolerance: 15,
    extentTolerance: 1,
    required: true,
    minConfidenceScore: 0.45,
  },
  {
    componentId: "screw-br",
    type: "screw",
    label: "Mount Screw BR",
    textPrompt: "silver hex mounting screw",
    expectedPosition: { x: 116, y: 8, z: 3 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent: { width: 5, height: 5, depth: 4 },
    positionTolerance: 1,
    orientationTolerance: 15,
    extentTolerance: 1,
    required: true,
    minConfidenceScore: 0.45,
  },
  {
    componentId: "press-fit-p3",
    type: "press_fit",
    label: "Press-fit Header P3",
    textPrompt: "gold press-fit pin header",
    expectedPosition: { x: 62, y: 22, z: 5 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent: { width: 36, height: 8, depth: 6 },
    positionTolerance: 1.2,
    orientationTolerance: 5,
    extentTolerance: 1.2,
    required: false,
    minConfidenceScore: 0.5,
  },
];

const LC_COMPONENTS: ComponentSpec[] = [
  {
    componentId: "qsfp-cage-1",
    type: "osfp_cage",
    label: "QSFP Cage B1",
    textPrompt: "QSFP optical cage",
    expectedPosition: { x: 18, y: 70, z: 6 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent: { width: 18, height: 9, depth: 64 },
    positionTolerance: 1.5,
    orientationTolerance: 6,
    extentTolerance: 1.5,
    required: true,
    minConfidenceScore: 0.55,
  },
  {
    componentId: "th-cap-c14",
    type: "through_hole",
    label: "Bulk Cap C14",
    textPrompt: "large through-hole electrolytic capacitor",
    expectedPosition: { x: 70, y: 40, z: 10 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent: { width: 16, height: 16, depth: 25 },
    positionTolerance: 2,
    orientationTolerance: 10,
    extentTolerance: 2,
    required: true,
    minConfidenceScore: 0.5,
  },
  {
    componentId: "solder-q7",
    type: "solder_element",
    label: "Solder Joint Q7",
    textPrompt: "reflowed solder joint",
    expectedPosition: { x: 88, y: 30, z: 1 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent: { width: 3, height: 3, depth: 1 },
    positionTolerance: 0.8,
    orientationTolerance: 20,
    extentTolerance: 0.8,
    required: true,
    minConfidenceScore: 0.4,
  },
  {
    componentId: "cable-pwr",
    type: "cable",
    label: "Power Cable Harness",
    textPrompt: "black power cable harness",
    expectedPosition: { x: 40, y: 12, z: 8 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent: { width: 60, height: 6, depth: 6 },
    positionTolerance: 4,
    orientationTolerance: 25,
    extentTolerance: 4,
    required: false,
    minConfidenceScore: 0.45,
  },
];

const specs: PcbSpec[] = [
  {
    id: 1,
    name: "Switch Fabric Board SFB-9000",
    version: "rev C",
    boardDimensions: { widthMm: 128, heightMm: 96, depthMm: 2.4 },
    components: SFB_COMPONENTS,
    referenceImageUrl: null,
    createdAt: iso(60 * 24 * 9),
    updatedAt: iso(60 * 30),
  },
  {
    id: 2,
    name: "Line Card LC-400G",
    version: "rev B",
    boardDimensions: { widthMm: 110, heightMm: 84, depthMm: 2.0 },
    components: LC_COMPONENTS,
    referenceImageUrl: null,
    createdAt: iso(60 * 24 * 6),
    updatedAt: iso(60 * 24 * 2),
  },
];

// ---------------------------------------------------------------------------
// Result builders
// ---------------------------------------------------------------------------

const DEV_BY_STATUS: Record<string, { pos: number; orient: number; extent: number; score: number }> = {
  pass: { pos: 0.4, orient: 1.8, extent: 0.3, score: 0.05 },
  warning: { pos: 1.3, orient: 5.2, extent: 1.1, score: 0.12 },
  fail: { pos: 3.6, orient: 12.4, extent: 2.9, score: 0.28 },
};

export interface IdAlloc {
  qc: () => number;
  det: () => number;
}

let seedQcId = 0;
let seedDetId = 0;
const seedAlloc: IdAlloc = { qc: () => ++seedQcId, det: () => ++seedDetId };

export function buildResults(
  inspectionId: number,
  components: ComponentSpec[],
  statusMap: Record<string, QcStatus>,
  alloc: IdAlloc = seedAlloc,
): { qcResults: QcResultRecord[]; detections: DetectionRecord[]; serverDetections: DetectionResponse } {
  const qcResults: QcResultRecord[] = [];
  const detections: DetectionRecord[] = [];
  const detResponse: DetectionResponse["detections"] = [];

  for (const c of components) {
    const status = statusMap[c.componentId] ?? "pass";
    const dev = DEV_BY_STATUS[status === "missing" ? "fail" : status] ?? DEV_BY_STATUS["pass"]!;

    qcResults.push({
      id: alloc.qc(),
      inspectionId,
      componentId: c.componentId,
      status,
      positionDeviation: status === "missing" ? null : dev.pos,
      orientationDeviation: status === "missing" ? null : dev.orient,
      extentDeviation: status === "missing" ? null : dev.extent,
      scoreDeviation: status === "missing" ? null : dev.score,
      details:
        status === "fail"
          ? { reason: "Position deviation exceeds tolerance", measuredScore: 0.62 }
          : status === "missing"
            ? { reason: "Component not detected above confidence threshold" }
            : null,
      reviewedBy: null,
      reviewDecision: null,
      createdAt: iso(20),
    });

    if (status === "missing") continue;

    const sl = slot(c.componentId);
    const score = Math.max(0.4, Math.min(0.99, c.minConfidenceScore + 0.3 - dev.score));
    detections.push({
      id: alloc.det(),
      inspectionId,
      componentId: c.componentId,
      detectedLabel: c.label,
      score,
      bbox3d: bbox3dFor(c, status === "fail" ? dev.pos : 0),
      bbox2d: sl?.bbox ?? null,
      source: "wilddet3d",
      createdAt: iso(20),
    });
    detResponse.push({
      label: c.label,
      score,
      bbox3d: bbox3dFor(c, status === "fail" ? dev.pos : 0),
      bbox2d: sl?.bbox,
      depthUsed: true,
    });
  }

  return {
    qcResults,
    detections,
    serverDetections: {
      detections: detResponse,
      inferenceTimeMs: 184 + Math.round(Math.random() * 40),
      depthAvailable: true,
      imageSize: BOARD_IMAGE_SIZE,
    },
  };
}

function makeInspection(
  id: number,
  opts: {
    specId: number;
    status: InspectionDetail["status"];
    operatorId: string;
    minsAgo: number;
    withImage?: boolean;
    statusMap?: Record<string, QcStatus>;
    boardSeed?: number;
  },
): InspectionDetail {
  const spec = specs.find((s) => s.id === opts.specId)!;
  const built = opts.statusMap
    ? buildResults(id, spec.components, opts.statusMap)
    : { qcResults: [], detections: [], serverDetections: null as DetectionResponse | null };

  return {
    id,
    specId: opts.specId,
    status: opts.status,
    operatorId: opts.operatorId,
    deviceInfo: { device: "Neuron Vision Handheld", os: "AOI-OS 2.1" },
    capturedImageUrl: opts.withImage === false ? null : boardImageDataUrl(opts.boardSeed ?? id),
    capturedDepthMapUrl: null,
    preScreenResult: null,
    serverDetections: built.serverDetections,
    detections: built.detections,
    qcResults: built.qcResults,
    createdAt: iso(opts.minsAgo + 4),
    updatedAt: iso(opts.minsAgo),
  };
}

const inspections: InspectionDetail[] = [
  makeInspection(1024, {
    specId: 1,
    status: "completed",
    operatorId: "a.petrov",
    minsAgo: 35,
    boardSeed: 2,
    statusMap: {
      "osfp-cage-1": "pass",
      "osfp-cage-2": "pass",
      "heatsink-asic": "pass",
      "conn-j1": "pass",
      "screw-tl": "pass",
      "screw-br": "pass",
      "press-fit-p3": "pass",
    },
  }),
  makeInspection(1025, {
    specId: 1,
    status: "reviewing",
    operatorId: "a.petrov",
    minsAgo: 18,
    boardSeed: 5,
    statusMap: {
      "osfp-cage-1": "pass",
      "osfp-cage-2": "warning",
      "heatsink-asic": "pass",
      "conn-j1": "fail",
      "screw-tl": "pass",
      "screw-br": "missing",
      "press-fit-p3": "pass",
    },
  }),
  makeInspection(1026, {
    specId: 1,
    status: "completed",
    operatorId: "m.ivanova",
    minsAgo: 90,
    boardSeed: 8,
    statusMap: {
      "osfp-cage-1": "pass",
      "osfp-cage-2": "pass",
      "heatsink-asic": "warning",
      "conn-j1": "pass",
      "screw-tl": "pass",
      "screw-br": "pass",
      "press-fit-p3": "warning",
    },
  }),
  makeInspection(1027, {
    specId: 2,
    status: "failed",
    operatorId: "m.ivanova",
    minsAgo: 120,
    boardSeed: 3,
    withImage: true,
  }),
  makeInspection(1028, {
    specId: 1,
    status: "pre_screening",
    operatorId: "a.petrov",
    minsAgo: 3,
    boardSeed: 11,
  }),
];

// Mark reviewed components on the reviewing inspection so review history shows.
const reviewing = inspections.find((i) => i.id === 1025)!;
for (const r of reviewing.qcResults) {
  if (r.componentId === "screw-br") {
    r.reviewDecision = "override_pass";
    r.reviewedBy = "qa.lead";
    r.status = "pass";
  }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

function reportFor(id: number, inspectionId: number, minsAgo: number): Report {
  const insp = inspections.find((i) => i.id === inspectionId)!;
  const spec = specs.find((s) => s.id === insp.specId)!;
  const counts = {
    pass: insp.qcResults.filter((r) => r.status === "pass").length,
    fail: insp.qcResults.filter((r) => r.status === "fail").length,
    warning: insp.qcResults.filter((r) => r.status === "warning").length,
    missing: insp.qcResults.filter((r) => r.status === "missing").length,
  };
  const overall =
    counts.fail > 0 || counts.missing > 0 ? "fail" : counts.warning > 0 ? "conditional_pass" : "pass";
  return {
    id,
    inspectionId,
    specId: insp.specId,
    overallStatus: overall,
    passCount: counts.pass,
    failCount: counts.fail,
    warningCount: counts.warning,
    missingCount: counts.missing,
    totalComponents: insp.qcResults.length,
    reportJson: {
      specName: spec.name,
      specVersion: spec.version,
      generatedAt: iso(minsAgo),
    },
    reportPdfUrl: null,
    operatorNotes:
      overall === "pass"
        ? "All components within tolerance. Board cleared for assembly."
        : "Conditional: heatsink seating near tolerance limit — flagged for spot re-check.",
    createdAt: iso(minsAgo),
  };
}

const reports: Report[] = [
  reportFor(5001, 1024, 33),
  reportFor(5002, 1026, 86),
];

export function createDemoState(): DemoState {
  // Deep clone so each session/store starts from a clean, isolated snapshot.
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  return {
    specs: clone(specs),
    inspections: clone(inspections),
    reports: clone(reports),
    seq: { spec: 100, inspection: 2000, detection: 9000, qc: 9000, report: 6000 },
  };
}
