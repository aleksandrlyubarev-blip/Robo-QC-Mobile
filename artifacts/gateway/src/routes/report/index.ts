import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reports, insertReportSchema, inspections, qcResults, pcbSpecs } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// List reports
router.get("/", async (_req, res) => {
  const results = await db.select().from(reports).orderBy(reports.createdAt);
  res.json(results);
});

// Get report by ID
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [report] = await db.select().from(reports).where(eq(reports.id, id));
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  res.json(report);
});

// Generate report for an inspection
router.post("/generate/:inspectionId", async (req, res) => {
  const inspectionId = Number(req.params.inspectionId);

  const [inspection] = await db.select().from(inspections).where(eq(inspections.id, inspectionId));
  if (!inspection) {
    res.status(404).json({ error: "Inspection not found" });
    return;
  }

  const [spec] = await db.select().from(pcbSpecs).where(eq(pcbSpecs.id, inspection.specId));
  if (!spec) {
    res.status(404).json({ error: "Spec not found" });
    return;
  }

  const results = await db.select().from(qcResults).where(eq(qcResults.inspectionId, inspectionId));

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const warningCount = results.filter((r) => r.status === "warning").length;
  const missingCount = results.filter((r) => r.status === "missing").length;
  const totalComponents = results.length;

  const overallStatus =
    failCount > 0 || missingCount > 0
      ? "fail"
      : warningCount > 0
        ? "conditional_pass"
        : "pass";

  const reportJson = {
    specName: spec.name,
    specVersion: spec.version,
    inspectionId,
    overallStatus,
    passCount,
    failCount,
    warningCount,
    missingCount,
    totalComponents,
    componentResults: results,
    generatedAt: new Date().toISOString(),
  };

  const [report] = await db
    .insert(reports)
    .values({
      inspectionId,
      specId: inspection.specId,
      overallStatus,
      passCount,
      failCount,
      warningCount,
      missingCount,
      totalComponents,
      reportJson,
      operatorNotes: req.body.operatorNotes ?? null,
    })
    .returning();

  res.status(201).json(report);
});

export default router;
