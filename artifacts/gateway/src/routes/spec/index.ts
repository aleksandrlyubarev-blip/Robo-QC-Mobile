import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pcbSpecs, insertPcbSpecSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// List all specs
router.get("/", async (_req, res) => {
  const specs = await db.select().from(pcbSpecs).orderBy(pcbSpecs.createdAt);
  res.json(specs);
});

// Get spec by ID
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [spec] = await db.select().from(pcbSpecs).where(eq(pcbSpecs.id, id));
  if (!spec) {
    res.status(404).json({ error: "Spec not found" });
    return;
  }
  res.json(spec);
});

// Create spec
router.post("/", async (req, res) => {
  const parsed = insertPcbSpecSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid spec data", details: parsed.error.issues });
    return;
  }
  const [spec] = await db.insert(pcbSpecs).values(parsed.data).returning();
  res.status(201).json(spec);
});

// Update spec
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertPcbSpecSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid spec data", details: parsed.error.issues });
    return;
  }
  const [updated] = await db
    .update(pcbSpecs)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(pcbSpecs.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Spec not found" });
    return;
  }
  res.json(updated);
});

// Delete spec
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [deleted] = await db.delete(pcbSpecs).where(eq(pcbSpecs.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Spec not found" });
    return;
  }
  res.json({ deleted: true });
});

export default router;
