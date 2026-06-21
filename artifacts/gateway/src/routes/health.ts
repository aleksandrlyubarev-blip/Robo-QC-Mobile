import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, isDbConfigured } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const inferenceUrl = process.env["INFERENCE_SERVER_URL"] || "http://localhost:8000";

  let inferenceOk = false;
  try {
    const resp = await fetch(`${inferenceUrl}/healthz`, { signal: AbortSignal.timeout(3000) });
    inferenceOk = resp.ok;
  } catch {
    inferenceOk = false;
  }

  let database: "connected" | "unavailable" | "not_configured" = "not_configured";
  if (isDbConfigured()) {
    try {
      await db.execute(sql`select 1`);
      database = "connected";
    } catch {
      database = "unavailable";
    }
  }

  res.json({
    status: "ok",
    database,
    inferenceServer: inferenceOk ? "connected" : "unavailable",
  });
});

export default router;
