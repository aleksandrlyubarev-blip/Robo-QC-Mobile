import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  inspections,
  insertInspectionSchema,
  detections,
  qcResults,
  pcbSpecs,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { callInferenceServer } from "../../lib/inference-client";
import { runQcRulesEngine } from "../../lib/qc-rules-engine";
import type { ComponentSpec } from "@workspace/shared-types";

const router: IRouter = Router();

// List inspections
router.get("/", async (_req, res) => {
  const results = await db.select().from(inspections).orderBy(inspections.createdAt);
  res.json(results);
});

// Get inspection by ID (with detections + QC results)
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [inspection] = await db.select().from(inspections).where(eq(inspections.id, id));
  if (!inspection) {
    res.status(404).json({ error: "Inspection not found" });
    return;
  }

  const dets = await db.select().from(detections).where(eq(detections.inspectionId, id));
  const qcRes = await db.select().from(qcResults).where(eq(qcResults.inspectionId, id));

  res.json({ ...inspection, detections: dets, qcResults: qcRes });
});

// Create inspection
router.post("/", async (req, res) => {
  const parsed = insertInspectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid inspection data", details: parsed.error.issues });
    return;
  }
  const [inspection] = await db.insert(inspections).values(parsed.data).returning();
  res.status(201).json(inspection);
});

// Upload pre-screen results from on-device detection
router.post("/:id/pre-screen", async (req, res) => {
  const id = Number(req.params.id);
  const [updated] = await db
    .update(inspections)
    .set({
      preScreenResult: req.body,
      status: "pre_screening",
      updatedAt: new Date(),
    })
    .where(eq(inspections.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Inspection not found" });
    return;
  }
  res.json(updated);
});

// Trigger server-side WildDet3D analysis
router.post("/:id/analyze", async (req, res) => {
  const id = Number(req.params.id);

  const [inspection] = await db.select().from(inspections).where(eq(inspections.id, id));
  if (!inspection) {
    res.status(404).json({ error: "Inspection not found" });
    return;
  }

  if (!inspection.capturedImageUrl) {
    res.status(400).json({ error: "No image uploaded for this inspection" });
    return;
  }

  // Get the spec to extract text prompts
  const [spec] = await db.select().from(pcbSpecs).where(eq(pcbSpecs.id, inspection.specId));
  if (!spec) {
    res.status(404).json({ error: "Associated spec not found" });
    return;
  }

  const components = spec.components as ComponentSpec[];
  const textPrompts = components.map((c) => c.textPrompt);

  // Update status to analyzing
  await db
    .update(inspections)
    .set({ status: "analyzing", updatedAt: new Date() })
    .where(eq(inspections.id, id));

  try {
    // Call inference server
    const detectionResponse = await callInferenceServer({
      imageUrl: inspection.capturedImageUrl,
      depthMapUrl: inspection.capturedDepthMapUrl ?? undefined,
      textPrompts,
      scoreThreshold: 0.3,
    });

    // Store raw detections
    await db
      .update(inspections)
      .set({
        serverDetections: detectionResponse,
        updatedAt: new Date(),
      })
      .where(eq(inspections.id, id));

    // Run QC rules engine
    const qcComponentResults = runQcRulesEngine(detectionResponse.detections, components);

    // Store individual detection records
    for (const det of detectionResponse.detections) {
      await db.insert(detections).values({
        inspectionId: id,
        componentId: det.label,
        detectedLabel: det.label,
        score: det.score,
        bbox3d: det.bbox3d,
        bbox2d: det.bbox2d ?? null,
        source: "wilddet3d",
      });
    }

    // Store QC results
    for (const result of qcComponentResults) {
      await db.insert(qcResults).values({
        inspectionId: id,
        componentId: result.componentId,
        status: result.status,
        positionDeviation: result.positionDeviation,
        orientationDeviation: result.orientationDeviation,
        extentDeviation: result.extentDeviation,
        scoreDeviation: result.scoreDeviation,
        details: result.details,
      });
    }

    // Update inspection status
    const hasFailures = qcComponentResults.some(
      (r) => r.status === "fail" || r.status === "missing",
    );
    const finalStatus = hasFailures ? "reviewing" : "completed";

    await db
      .update(inspections)
      .set({ status: finalStatus, updatedAt: new Date() })
      .where(eq(inspections.id, id));

    res.json({
      status: finalStatus,
      detections: detectionResponse.detections,
      qcResults: qcComponentResults,
    });
  } catch (err) {
    await db
      .update(inspections)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(inspections.id, id));

    res.status(500).json({
      error: "Analysis failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

// Submit HITL review for a component
router.post("/:id/review", async (req, res) => {
  const id = Number(req.params.id);
  const { componentId, decision, reviewedBy } = req.body;

  if (typeof componentId !== "string" || componentId.length === 0) {
    res.status(400).json({ error: "componentId is required" });
    return;
  }

  // Map the operator's decision to the resulting QC status.
  const statusByDecision: Record<string, string> = {
    approved: "pass",
    override_pass: "pass",
    rejected: "fail",
  };
  const nextStatus = statusByDecision[decision];
  if (!nextStatus) {
    res.status(400).json({
      error: "Invalid review decision",
      allowed: Object.keys(statusByDecision),
    });
    return;
  }

  // Scope the update to the specific component being reviewed — otherwise a
  // single review would overwrite the status of every component on the board.
  const [updated] = await db
    .update(qcResults)
    .set({
      reviewDecision: decision,
      reviewedBy,
      status: nextStatus,
    })
    .where(and(eq(qcResults.inspectionId, id), eq(qcResults.componentId, componentId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "QC result not found for this component" });
    return;
  }
  res.json(updated);
});

export default router;
