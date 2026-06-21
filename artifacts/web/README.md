# Neuron Vision — Checker / Display

The operator-facing frontend for Robo-QC-Mobile. A single React + Vite PWA that
runs in two modes sharing one data layer:

- **Checker** — the operator flow: pick a spec, capture a board image, run the
  WildDet3D analysis, and review failing components (HITL approve / reject /
  override).
- **Display** — the read-only dashboard: fleet status, inspection history, and
  generated QC reports.

Toggle modes from the header; the choice is remembered in `localStorage`.

## Data source: Live vs Demo

The app can run against the live gateway **or** a fully seeded in-memory demo
backend, so the complete AOI flow is demonstrable without a database or GPU.

The active source is shown in the header (`LIVE` / `DEMO`) and is selectable:

- **Auto** (default) — probes the gateway on startup; uses it when reachable,
  otherwise falls back to demo and shows a banner. No more silent zero-states.
- **Live** — always use the gateway API.
- **Demo** — always use the seeded data (specs, inspections with mixed
  pass/warning/fail/missing results, detections, reports). The demo backend
  implements the same contract (`src/api/contract.ts`) as the live client, so
  create / analyze / review / report all work — `analyze` simulates inference
  latency and produces a realistic QC verdict mix.

## Stack

- React 19 + React Router 7
- TanStack Query for server state
- Vite 7 + `vite-plugin-pwa` (installable, offline shell)
- Types shared with the backend via `@workspace/shared-types`

## Development

Everything is on **port 3001**: the gateway listens there, Vite proxies `/api`
there, and `docker-compose` maps it there. There is no 3000 anywhere.

There are two coherent ways to run it.

### A. Frontend only — instant Demo (no backend, no DB, no GPU)

```bash
pnpm dev:web        # → http://localhost:5173, opens in DEMO mode automatically
```

The app probes the gateway; when it's absent it falls back to seeded demo data
and shows a `DEMO` banner. Nothing is silently zeroed.

### B. Full live stack — web + gateway + Postgres

```bash
cp .env.example .env          # DATABASE_URL, PORT=3001, INFERENCE_MOCK=true
pnpm db:up                    # docker compose up -d postgres
pnpm db:push                  # create tables (drizzle)
pnpm db:seed                  # insert realistic AOI demo data
pnpm dev                      # web + gateway (reads .env via dotenv)
```

`pnpm db:setup` runs `db:up && db:push && db:seed` in one shot. With the gateway
up, the app's **Auto** data source switches to `LIVE` automatically.

- The gateway **boots without a database** and `/api/healthz` still works; data
  endpoints return a clear `503` until `DATABASE_URL` is set (never a crash).
- `INFERENCE_MOCK=true` makes the gateway synthesize detections, so the live
  **Analyze → QC → review → report** flow runs end-to-end without a GPU. Set it
  to `false` (and run `pnpm dev:full`) to use the real WildDet3D server.

### Display mode is read-only

Switching the header to **Display** disables every mutation: no capture, spec
editing, analysis, review, or report generation. Mutating routes
(`/specs/new`, `/inspections/new`) redirect, and the spec editor renders
read-only.

## Verification

```bash
pnpm typecheck                                  # web + gateway + libs
pnpm --filter @workspace/web run build          # production build
pnpm --filter @workspace/web run verify:demo    # headless demo-flow checks
```

> **CI:** No GitHub Actions / CI pipeline is configured for this repository
> yet. The checks above are run locally; there is no automated CI gate on PRs.

## Configuration

| Variable          | Where    | Default                 | Purpose                                       |
| ----------------- | -------- | ----------------------- | --------------------------------------------- |
| `GATEWAY_URL`     | dev/Vite | `http://localhost:3001` | Proxy target for `/api` during dev.           |
| `VITE_API_URL`    | build    | `/api`                  | API base URL baked into the prod bundle.      |
| `DATABASE_URL`    | gateway  | —                       | Postgres connection (live mode).              |
| `PORT`            | gateway  | `3001`                  | Gateway HTTP port.                            |
| `INFERENCE_MOCK`  | gateway  | `false`                 | Synthesize detections instead of WildDet3D.   |

## Project layout

```
src/
  api/         contract.ts (shared Api shape), client.ts (live gateway),
               types.ts (response types), hooks.ts (TanStack Query)
  app/         mode.tsx (Checker/Display), dataSource.tsx (live/demo + useApi)
  demo/        demoApi.ts (in-memory backend), seed.ts (realistic AOI data),
               board.ts (synthetic PCB image + detection slots)
  components/  Layout, StatusBadge, DetectionOverlay, shared states
  lib/         camera capture, formatting helpers
  pages/       Dashboard, Specs, SpecEditor, Inspections, NewInspection,
               InspectionDetail, Reports
scripts/
  verify-demo.ts   headless end-to-end check of the demo workflow
```

## Notes

- Image capture uses `getUserMedia` (rear camera) with a file-upload fallback.
  Frames are encoded as JPEG data URLs and sent as `capturedImageUrl`; the
  gateway resolves `data:` URLs when calling the inference server, so no
  separate upload endpoint is required.
- Detection boxes are overlaid using the model's reported `imageSize`, so they
  scale to whatever width the image renders at.
