import { Router, type IRouter } from "express";

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

  res.json({
    status: "ok",
    inferenceServer: inferenceOk ? "connected" : "unavailable",
  });
});

export default router;
