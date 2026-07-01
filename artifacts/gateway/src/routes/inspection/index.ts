import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  inspections,
  insertInspectionSchema,
  detections,
  qcResults,
  pcbSpecs,
  annotations,
  insertAnnotationSchema,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { callInferenceServer } from "../../lib/inference-client";
import { runQcRulesEngine } from "../../lib/qc-rules-engine";
import { PreScreenResultSchema, type ComponentSpec } from "@workspace/shared-types";

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

  const parsed = PreScreenResultSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid pre-screen result", details: parsed.error.issues });
    return;
  }

  // "retake" means the capture is unusable — send the device back to capturing
  const status = parsed.data.gate === "retake" ? "capturing" : "pre_screening";

  const [updated] = await db
    .update(inspections)
    .set({
      preScreenResult: parsed.data,
      status,
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

  const [updated] = await db
    .update(qcResults)
    .set({
      reviewDecision: decision,
      reviewedBy,
      status: decision === "override_pass" ? "pass" : decision === "approved" ? "pass" : "fail",
    })
    .where(and(eq(qcResults.inspectionId, id), eq(qcResults.componentId, componentId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "QC result not found" });
    return;
  }
  res.json(updated);
});

// List training annotations for an inspection
router.get("/:id/annotations", async (req, res) => {
  const id = Number(req.params.id);
  const results = await db
    .select()
    .from(annotations)
    .where(eq(annotations.inspectionId, id))
    .orderBy(annotations.createdAt);
  res.json(results);
});

// Record a training annotation (confirm/correct/add label from review)
router.post("/:id/annotations", async (req, res) => {
  const id = Number(req.params.id);

  const [inspection] = await db.select().from(inspections).where(eq(inspections.id, id));
  if (!inspection) {
    res.status(404).json({ error: "Inspection not found" });
    return;
  }

  const parsed = insertAnnotationSchema.safeParse({ ...req.body, inspectionId: id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid annotation data", details: parsed.error.issues });
    return;
  }

  const [annotation] = await db.insert(annotations).values(parsed.data).returning();
  res.status(201).json(annotation);
});

export default router;
