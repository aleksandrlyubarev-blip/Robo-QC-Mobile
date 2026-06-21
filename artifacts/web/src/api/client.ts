import type {
  PcbSpec,
  Inspection,
  InspectionDetail,
  Report,
  AnalyzeResult,
  HealthStatus,
  CreateSpecInput,
  CreateInspectionInput,
  ReviewInput,
} from "./types";
import type { Api } from "./contract";

/**
 * Base URL for the gateway API. In development Vite proxies `/api` to the
 * gateway (see vite.config.ts); in production it can be overridden with
 * VITE_API_URL to point at a deployed gateway.
 */
const API_BASE = import.meta.env?.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!resp.ok) {
    let message = `Request failed (${resp.status})`;
    let details: unknown;
    try {
      const body = await resp.json();
      message = body.error ?? body.message ?? message;
      details = body.details;
    } catch {
      // non-JSON error body — keep the default message
    }
    throw new ApiError(resp.status, message, details);
  }

  if (resp.status === 204) return undefined as T;
  return (await resp.json()) as T;
}

/**
 * Probe the gateway with a short timeout. Returns true when the backend is
 * reachable so the app can decide between live and demo data on startup.
 *
 * A real gateway's /healthz reports `status: "ok"`. When the gateway is down,
 * the Vite dev proxy answers 200 with `status: "unavailable"` so the probe
 * resolves cleanly without a failed-resource console entry.
 */
export async function probeBackend(timeoutMs = 2500): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE}/healthz`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) return false;
    const body = (await resp.json().catch(() => null)) as { status?: string } | null;
    return body?.status === "ok";
  } catch {
    return false;
  }
}

export const liveApi: Api = {
  health: () => request<HealthStatus>("/healthz"),

  specs: {
    list: () => request<PcbSpec[]>("/specs"),
    get: (id: number) => request<PcbSpec>(`/specs/${id}`),
    create: (input: CreateSpecInput) =>
      request<PcbSpec>("/specs", { method: "POST", body: JSON.stringify(input) }),
    update: (id: number, input: Partial<CreateSpecInput>) =>
      request<PcbSpec>(`/specs/${id}`, { method: "PUT", body: JSON.stringify(input) }),
    remove: (id: number) =>
      request<{ deleted: boolean }>(`/specs/${id}`, { method: "DELETE" }),
  },

  inspections: {
    list: () => request<Inspection[]>("/inspections"),
    get: (id: number) => request<InspectionDetail>(`/inspections/${id}`),
    create: (input: CreateInspectionInput) =>
      request<Inspection>("/inspections", { method: "POST", body: JSON.stringify(input) }),
    analyze: (id: number) =>
      request<AnalyzeResult>(`/inspections/${id}/analyze`, { method: "POST" }),
    review: (id: number, input: ReviewInput) =>
      request<unknown>(`/inspections/${id}/review`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  },

  reports: {
    list: () => request<Report[]>("/reports"),
    get: (id: number) => request<Report>(`/reports/${id}`),
    generate: (inspectionId: number, operatorNotes?: string) =>
      request<Report>(`/reports/generate/${inspectionId}`, {
        method: "POST",
        body: JSON.stringify({ operatorNotes: operatorNotes ?? null }),
      }),
  },
};
