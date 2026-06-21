import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { DbNotConfiguredError } from "@workspace/db";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Centralised error handler. Express 5 forwards rejected async handlers here,
// so a missing/unreachable database becomes a clean 503 instead of a crash.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof DbNotConfiguredError) {
    res.status(503).json({
      error: "Database not configured",
      message: err.message,
      hint: "Run Postgres and set DATABASE_URL, or use the frontend Demo mode.",
    });
    return;
  }
  const isConnError =
    err instanceof Error && /ECONNREFUSED|ENOTFOUND|database .* does not exist|terminating connection/i.test(err.message);
  if (isConnError) {
    res.status(503).json({
      error: "Database unavailable",
      message: (err as Error).message,
    });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err instanceof Error ? err.message : "Unknown error",
  });
});

export default app;
