import type { Api } from "../api/contract";
import type {
  PcbSpec,
  Inspection,
  InspectionDetail,
  Report,
  AnalyzeResult,
  QcStatus,
  ComponentSpec,
} from "../api/types";
import { ApiError } from "../api/client";
import { createDemoState, buildResults, type DemoState, type IdAlloc } from "./seed";
import { boardImageDataUrl } from "./board";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Strip the nested detail fields so list endpoints match the live shape. */
function toListItem(i: InspectionDetail): Inspection {
  const { detections: _d, qcResults: _q, ...rest } = i;
  void _d;
  void _q;
  return rest;
}

/**
 * Deterministic-but-varied QC outcome for a freshly analyzed board, so the
 * demo "Run analysis" action produces a credible mix of pass / warning /
 * fail / missing instead of all-green.
 */
function generateStatusMap(components: ComponentSpec[], seed: number): Record<string, QcStatus> {
  const map: Record<string, QcStatus> = {};
  components.forEach((c, idx) => {
    const r = (seed * 31 + idx * 17) % 100;
    let status: QcStatus = "pass";
    if (r < 8 && c.required) status = "missing";
    else if (r < 22) status = "fail";
    else if (r < 42) status = "warning";
    map[c.componentId] = status;
  });
  return map;
}

export function createDemoApi(): Api {
  const state: DemoState = createDemoState();
  const alloc: IdAlloc = {
    qc: () => ++state.seq.qc,
    det: () => ++state.seq.detection,
  };

  const findSpec = (id: number) => state.specs.find((s) => s.id === id);
  const findInspection = (id: number) => state.inspections.find((i) => i.id === id);

  return {
    health: async () => ({ status: "ok", inferenceServer: "unavailable" }),

    specs: {
      list: async () => state.specs.slice(),
      get: async (id) => {
        const s = findSpec(id);
        if (!s) throw new ApiError(404, "Spec not found");
        return s;
      },
      create: async (input) => {
        const spec: PcbSpec = {
          id: ++state.seq.spec,
          name: input.name,
          version: input.version ?? "1.0",
          boardDimensions: input.boardDimensions ?? null,
          components: input.components ?? [],
          referenceImageUrl: input.referenceImageUrl ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.specs.push(spec);
        return spec;
      },
      update: async (id, input) => {
        const s = findSpec(id);
        if (!s) throw new ApiError(404, "Spec not found");
        Object.assign(s, input, { updatedAt: new Date().toISOString() });
        return s;
      },
      remove: async (id) => {
        const idx = state.specs.findIndex((s) => s.id === id);
        if (idx === -1) throw new ApiError(404, "Spec not found");
        state.specs.splice(idx, 1);
        return { deleted: true };
      },
    },

    inspections: {
      list: async () => state.inspections.map(toListItem),
      get: async (id) => {
        const i = findInspection(id);
        if (!i) throw new ApiError(404, "Inspection not found");
        return i;
      },
      create: async (input) => {
        const insp: InspectionDetail = {
          id: ++state.seq.inspection,
          specId: input.specId,
          status: input.capturedImageUrl ? "pre_screening" : "capturing",
          operatorId: input.operatorId ?? null,
          deviceInfo: input.deviceInfo ?? null,
          capturedImageUrl: input.capturedImageUrl ?? null,
          capturedDepthMapUrl: input.capturedDepthMapUrl ?? null,
          preScreenResult: null,
          serverDetections: null,
          detections: [],
          qcResults: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.inspections.push(insp);
        return toListItem(insp);
      },
      analyze: async (id) => {
        const insp = findInspection(id);
        if (!insp) throw new ApiError(404, "Inspection not found");
        const spec = findSpec(insp.specId);
        if (!spec) throw new ApiError(404, "Associated spec not found");

        // Simulate on-device → server inference latency.
        insp.status = "analyzing";
        insp.updatedAt = new Date().toISOString();
        await delay(1400);

        if (!insp.capturedImageUrl) insp.capturedImageUrl = boardImageDataUrl(id);

        const statusMap = generateStatusMap(spec.components, id);
        const built = buildResults(id, spec.components, statusMap, alloc);
        insp.detections = built.detections;
        insp.qcResults = built.qcResults;
        insp.serverDetections = built.serverDetections;

        const hasFailures = built.qcResults.some(
          (r) => r.status === "fail" || r.status === "missing",
        );
        insp.status = hasFailures ? "reviewing" : "completed";
        insp.updatedAt = new Date().toISOString();

        return {
          status: insp.status,
          detections: built.serverDetections.detections,
          qcResults: built.qcResults.map((r) => ({
            componentId: r.componentId,
            status: r.status,
            positionDeviation: r.positionDeviation,
            orientationDeviation: r.orientationDeviation,
            extentDeviation: r.extentDeviation,
            scoreDeviation: r.scoreDeviation,
            details: r.details,
          })),
        } satisfies AnalyzeResult;
      },
      review: async (id, input) => {
        const insp = findInspection(id);
        if (!insp) throw new ApiError(404, "Inspection not found");
        const result = insp.qcResults.find((r) => r.componentId === input.componentId);
        if (!result) throw new ApiError(404, "QC result not found");
        result.reviewDecision = input.decision;
        result.reviewedBy = input.reviewedBy;
        result.status = input.decision === "rejected" ? "fail" : "pass";

        // Once nothing is left needing review, the inspection is complete.
        const stillOpen = insp.qcResults.some(
          (r) => (r.status === "fail" || r.status === "missing") && !r.reviewDecision,
        );
        if (!stillOpen && insp.status === "reviewing") insp.status = "completed";
        insp.updatedAt = new Date().toISOString();
        return result;
      },
    },

    reports: {
      list: async () => state.reports.slice(),
      get: async (id) => {
        const r = state.reports.find((x) => x.id === id);
        if (!r) throw new ApiError(404, "Report not found");
        return r;
      },
      generate: async (inspectionId, operatorNotes) => {
        const insp = findInspection(inspectionId);
        if (!insp) throw new ApiError(404, "Inspection not found");
        const spec = findSpec(insp.specId);
        const counts = {
          pass: insp.qcResults.filter((r) => r.status === "pass").length,
          fail: insp.qcResults.filter((r) => r.status === "fail").length,
          warning: insp.qcResults.filter((r) => r.status === "warning").length,
          missing: insp.qcResults.filter((r) => r.status === "missing").length,
        };
        const overall =
          counts.fail > 0 || counts.missing > 0
            ? "fail"
            : counts.warning > 0
              ? "conditional_pass"
              : "pass";
        const report: Report = {
          id: ++state.seq.report,
          inspectionId,
          specId: insp.specId,
          overallStatus: overall,
          passCount: counts.pass,
          failCount: counts.fail,
          warningCount: counts.warning,
          missingCount: counts.missing,
          totalComponents: insp.qcResults.length,
          reportJson: {
            specName: spec?.name ?? `Spec #${insp.specId}`,
            specVersion: spec?.version ?? "",
            generatedAt: new Date().toISOString(),
          },
          reportPdfUrl: null,
          operatorNotes: operatorNotes ?? null,
          createdAt: new Date().toISOString(),
        };
        state.reports.push(report);
        return report;
      },
    },
  };
}
