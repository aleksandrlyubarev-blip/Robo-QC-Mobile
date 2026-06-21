import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { DbNotConfiguredError } from "@workspace/db";
import router from "./routes";

const app: Express = express();

// CORS: in development we reflect any origin so phones, emulators and other
// LAN browsers can reach the gateway during the mobile MVP. Native shells
// (Capacitor/Cordova) send `capacitor://localhost`, `ionic://localhost` or no
// Origin header at all — reflecting the request origin covers all of these.
// Set CORS_ORIGINS (comma-separated) to lock this down to specific origins.
const corsOrigins = (process.env["CORS_ORIGINS"] ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : true }));

// Phone-camera frames arrive as base64 `data:` image URLs inside the JSON
// body, so the limit must stay generous. Configurable via JSON_BODY_LIMIT for
// higher-resolution captures without a code change.
const bodyLimit = process.env["JSON_BODY_LIMIT"] || "50mb";
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

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
