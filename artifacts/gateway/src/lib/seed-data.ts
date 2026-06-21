import {
  db,
  pcbSpecs,
  inspections,
  detections,
  qcResults,
  reports,
} from "@workspace/db";
import type { ComponentSpec } from "@workspace/shared-types";

/**
 * Seeds the database with realistic AOI/PCB inspection data so the live API can
 * be demonstrated end-to-end without GPU inference. Idempotent: clears existing
 * rows first, then inserts a fresh, coherent dataset.
 */

type Slot = { componentId: string; bbox: { x: number; y: number; width: number; height: number } };

const IMAGE_SIZE: [number, number] = [1280, 960];

const SLOTS: Slot[] = [
  { componentId: "osfp-cage-1", bbox: { x: 96, y: 150, width: 300, height: 130 } },
  { componentId: "osfp-cage-2", bbox: { x: 96, y: 320, width: 300, height: 130 } },
  { componentId: "heatsink-asic", bbox: { x: 520, y: 210, width: 320, height: 320 } },
  { componentId: "conn-j1", bbox: { x: 940, y: 150, width: 200, height: 460 } },
  { componentId: "screw-tl", bbox: { x: 60, y: 60, width: 72, height: 72 } },
  { componentId: "screw-br", bbox: { x: 1150, y: 830, width: 72, height: 72 } },
  { componentId: "press-fit-p3", bbox: { x: 540, y: 640, width: 360, height: 90 } },
];

const slot = (id: string) => SLOTS.find((s) => s.componentId === id);

/** Compact PCB-looking SVG so detection overlays render in live mode too. */
function boardImage(seed = 0): string {
  const [w, h] = IMAGE_SIZE;
  const parts: string[] = [`<rect width="${w}" height="${h}" fill="#0c3d28"/>`];
  for (const s of SLOTS) {
    parts.push(
      `<rect x="${s.bbox.x}" y="${s.bbox.y}" width="${s.bbox.width}" height="${s.bbox.height}" rx="6" fill="#2b323b" stroke="#5b6670" stroke-width="2"/>`,
    );
  }
  parts.push(
    `<text x="24" y="${h - 22}" fill="#8fd9b6" font-family="monospace" font-size="22" opacity="0.7">NEURON-VISION · FRAME ${seed}</text>`,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join("")}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SFB_COMPONENTS: ComponentSpec[] = [
  comp("osfp-cage-1", "osfp_cage", "OSFP Cage A1", "metal OSFP transceiver cage", { x: 24, y: 86, z: 6 }, { width: 22, height: 9, depth: 78 }, 1.5, 6, 1.5, true, 0.55),
  comp("osfp-cage-2", "osfp_cage", "OSFP Cage A2", "metal OSFP transceiver cage", { x: 24, y: 64, z: 6 }, { width: 22, height: 9, depth: 78 }, 1.5, 6, 1.5, true, 0.55),
  comp("heatsink-asic", "heatsink", "ASIC Heatsink", "black finned aluminium heatsink", { x: 60, y: 54, z: 14 }, { width: 42, height: 42, depth: 22 }, 2, 8, 2, true, 0.6),
  comp("conn-j1", "connector", "Power Connector J1", "black right-angle power connector", { x: 104, y: 58, z: 8 }, { width: 14, height: 32, depth: 12 }, 1.5, 5, 1.5, true, 0.5),
  comp("screw-tl", "screw", "Mount Screw TL", "silver hex mounting screw", { x: 8, y: 92, z: 3 }, { width: 5, height: 5, depth: 4 }, 1, 15, 1, true, 0.45),
  comp("screw-br", "screw", "Mount Screw BR", "silver hex mounting screw", { x: 116, y: 8, z: 3 }, { width: 5, height: 5, depth: 4 }, 1, 15, 1, true, 0.45),
  comp("press-fit-p3", "press_fit", "Press-fit Header P3", "gold press-fit pin header", { x: 62, y: 22, z: 5 }, { width: 36, height: 8, depth: 6 }, 1.2, 5, 1.2, false, 0.5),
];

const LC_COMPONENTS: ComponentSpec[] = [
  comp("qsfp-cage-1", "osfp_cage", "QSFP Cage B1", "QSFP optical cage", { x: 18, y: 70, z: 6 }, { width: 18, height: 9, depth: 64 }, 1.5, 6, 1.5, true, 0.55),
  comp("th-cap-c14", "through_hole", "Bulk Cap C14", "large through-hole electrolytic capacitor", { x: 70, y: 40, z: 10 }, { width: 16, height: 16, depth: 25 }, 2, 10, 2, true, 0.5),
  comp("solder-q7", "solder_element", "Solder Joint Q7", "reflowed solder joint", { x: 88, y: 30, z: 1 }, { width: 3, height: 3, depth: 1 }, 0.8, 20, 0.8, true, 0.4),
  comp("cable-pwr", "cable", "Power Cable Harness", "black power cable harness", { x: 40, y: 12, z: 8 }, { width: 60, height: 6, depth: 6 }, 4, 25, 4, false, 0.45),
];

function comp(
  componentId: string,
  type: ComponentSpec["type"],
  label: string,
  textPrompt: string,
  expectedPosition: { x: number; y: number; z: number },
  expectedExtent: { width: number; height: number; depth: number },
  positionTolerance: number,
  orientationTolerance: number,
  extentTolerance: number,
  required: boolean,
  minConfidenceScore: number,
): ComponentSpec {
  return {
    componentId,
    type,
    label,
    textPrompt,
    expectedPosition,
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent,
    positionTolerance,
    orientationTolerance,
    extentTolerance,
    required,
    minConfidenceScore,
  };
}

const DEV: Record<string, { pos: number; orient: number; extent: number; score: number }> = {
  pass: { pos: 0.4, orient: 1.8, extent: 0.3, score: 0.05 },
  warning: { pos: 1.3, orient: 5.2, extent: 1.1, score: 0.12 },
  fail: { pos: 3.6, orient: 12.4, extent: 2.9, score: 0.28 },
};

function bbox3dFor(c: ComponentSpec) {
  return { center: { ...c.expectedPosition }, extent: { ...c.expectedExtent }, orientation: { ...c.expectedOrientation } };
}

function buildAnalysis(components: ComponentSpec[], statusMap: Record<string, string>) {
  const dets: { label: string; score: number; bbox3d: unknown; bbox2d: unknown; depthUsed: boolean }[] = [];
  const qc: {
    componentId: string;
    status: string;
    positionDeviation: number | null;
    orientationDeviation: number | null;
    extentDeviation: number | null;
    scoreDeviation: number | null;
    details: Record<string, unknown> | null;
  }[] = [];

  for (const c of components) {
    const status = statusMap[c.componentId] ?? "pass";
    const d = DEV[status === "missing" ? "fail" : status] ?? DEV["pass"]!;
    qc.push({
      componentId: c.componentId,
      status,
      positionDeviation: status === "missing" ? null : d.pos,
      orientationDeviation: status === "missing" ? null : d.orient,
      extentDeviation: status === "missing" ? null : d.extent,
      scoreDeviation: status === "missing" ? null : d.score,
      details:
        status === "fail"
          ? { reason: "Position deviation exceeds tolerance" }
          : status === "missing"
            ? { reason: "Component not detected above confidence threshold" }
            : null,
    });
    if (status === "missing") continue;
    const sl = slot(c.componentId);
    dets.push({
      label: c.label,
      score: Math.max(0.4, Math.min(0.99, c.minConfidenceScore + 0.3 - d.score)),
      bbox3d: bbox3dFor(c),
      bbox2d: sl?.bbox ?? null,
      depthUsed: true,
    });
  }
  return {
    detections: dets,
    serverDetections: { detections: dets, inferenceTimeMs: 196, depthAvailable: true, imageSize: IMAGE_SIZE },
    qc,
  };
}

export async function seedDatabase(): Promise<{ specs: number; inspections: number; reports: number }> {
  // Clear in FK-safe order.
  await db.delete(reports);
  await db.delete(qcResults);
  await db.delete(detections);
  await db.delete(inspections);
  await db.delete(pcbSpecs);

  const [sfb] = await db
    .insert(pcbSpecs)
    .values({ name: "Switch Fabric Board SFB-9000", version: "rev C", boardDimensions: { widthMm: 128, heightMm: 96, depthMm: 2.4 }, components: SFB_COMPONENTS })
    .returning();
  const [lc] = await db
    .insert(pcbSpecs)
    .values({ name: "Line Card LC-400G", version: "rev B", boardDimensions: { widthMm: 110, heightMm: 84, depthMm: 2.0 }, components: LC_COMPONENTS })
    .returning();

  const scenarios: {
    specId: number;
    status: string;
    operatorId: string;
    statusMap?: Record<string, string>;
    components: ComponentSpec[];
    seed: number;
    makeReport?: boolean;
  }[] = [
    {
      specId: sfb!.id,
      status: "completed",
      operatorId: "a.petrov",
      components: SFB_COMPONENTS,
      seed: 2,
      makeReport: true,
      statusMap: { "osfp-cage-1": "pass", "osfp-cage-2": "pass", "heatsink-asic": "pass", "conn-j1": "pass", "screw-tl": "pass", "screw-br": "pass", "press-fit-p3": "pass" },
    },
    {
      specId: sfb!.id,
      status: "reviewing",
      operatorId: "a.petrov",
      components: SFB_COMPONENTS,
      seed: 5,
      statusMap: { "osfp-cage-1": "pass", "osfp-cage-2": "warning", "heatsink-asic": "pass", "conn-j1": "fail", "screw-tl": "pass", "screw-br": "missing", "press-fit-p3": "pass" },
    },
    {
      specId: sfb!.id,
      status: "completed",
      operatorId: "m.ivanova",
      components: SFB_COMPONENTS,
      seed: 8,
      makeReport: true,
      statusMap: { "osfp-cage-1": "pass", "osfp-cage-2": "pass", "heatsink-asic": "warning", "conn-j1": "pass", "screw-tl": "pass", "screw-br": "pass", "press-fit-p3": "warning" },
    },
    { specId: lc!.id, status: "failed", operatorId: "m.ivanova", components: LC_COMPONENTS, seed: 3 },
    { specId: sfb!.id, status: "pre_screening", operatorId: "a.petrov", components: SFB_COMPONENTS, seed: 11 },
  ];

  let reportCount = 0;
  for (const sc of scenarios) {
    const hasResults = !!sc.statusMap;
    const analysis = hasResults ? buildAnalysis(sc.components, sc.statusMap!) : null;

    const [insp] = await db
      .insert(inspections)
      .values({
        specId: sc.specId,
        status: sc.status,
        operatorId: sc.operatorId,
        deviceInfo: { device: "Neuron Vision Handheld", os: "AOI-OS 2.1" },
        capturedImageUrl: boardImage(sc.seed),
        serverDetections: analysis?.serverDetections ?? null,
      })
      .returning();

    if (analysis) {
      for (const det of analysis.detections) {
        await db.insert(detections).values({
          inspectionId: insp!.id,
          componentId: det.label,
          detectedLabel: det.label,
          score: det.score,
          bbox3d: det.bbox3d,
          bbox2d: det.bbox2d ?? null,
          source: "wilddet3d",
        });
      }
      for (const r of analysis.qc) {
        const reviewed = r.componentId === "screw-br" && r.status === "missing";
        await db.insert(qcResults).values({
          inspectionId: insp!.id,
          componentId: r.componentId,
          status: reviewed ? "pass" : r.status,
          positionDeviation: r.positionDeviation,
          orientationDeviation: r.orientationDeviation,
          extentDeviation: r.extentDeviation,
          scoreDeviation: r.scoreDeviation,
          details: r.details,
          reviewedBy: reviewed ? "qa.lead" : null,
          reviewDecision: reviewed ? "override_pass" : null,
        });
      }

      if (sc.makeReport) {
        const counts = {
          pass: analysis.qc.filter((r) => r.status === "pass").length,
          fail: analysis.qc.filter((r) => r.status === "fail").length,
          warning: analysis.qc.filter((r) => r.status === "warning").length,
          missing: analysis.qc.filter((r) => r.status === "missing").length,
        };
        const overall = counts.fail > 0 || counts.missing > 0 ? "fail" : counts.warning > 0 ? "conditional_pass" : "pass";
        await db.insert(reports).values({
          inspectionId: insp!.id,
          specId: sc.specId,
          overallStatus: overall,
          passCount: counts.pass,
          failCount: counts.fail,
          warningCount: counts.warning,
          missingCount: counts.missing,
          totalComponents: analysis.qc.length,
          reportJson: { generatedAt: new Date().toISOString() },
          operatorNotes:
            overall === "pass"
              ? "All components within tolerance. Board cleared for assembly."
              : "Conditional: heatsink seating near tolerance limit — flagged for spot re-check.",
        });
        reportCount++;
      }
    }
  }

  return { specs: 2, inspections: scenarios.length, reports: reportCount };
}
