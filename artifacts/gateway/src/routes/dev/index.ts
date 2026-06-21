import { Router, type IRouter } from "express";
import { seedDatabase } from "../../lib/seed-data";

const router: IRouter = Router();

// Reseed the database with demo AOI data. Disabled in production to avoid
// wiping real inspection records.
router.post("/seed", async (_req, res) => {
  if (process.env["NODE_ENV"] === "production") {
    res.status(403).json({ error: "Seeding is disabled in production" });
    return;
  }
  const summary = await seedDatabase();
  res.json({ seeded: true, ...summary });
});

export default router;
