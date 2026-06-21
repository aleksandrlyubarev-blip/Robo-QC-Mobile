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

The app talks to the gateway REST API under `/api`. In dev, Vite proxies
`/api` to the gateway on **port 3001** (override with `GATEWAY_URL`). The
gateway listens on 3001 by default, matching this proxy and `docker-compose`.

```bash
# Frontend only — opens in DEMO mode automatically (no backend needed)
pnpm dev:web                    # → http://localhost:5173

# Full stack — web + gateway + inference server
pnpm dev
```

To run the gateway for **live** mode it needs a Postgres connection:

```bash
docker compose up -d postgres   # or point at your own Postgres
export DATABASE_URL=postgresql://robo_qc:robo_qc_dev@localhost:5432/robo_qc
pnpm --filter @workspace/db run push   # create tables
pnpm dev:gateway                        # listens on :3001
```

With the gateway up, the app's **Auto** source switches to `LIVE`
automatically. Without it, the app stays in `DEMO`.

## Verification

```bash
pnpm --filter @workspace/web run typecheck     # web types
pnpm --filter @workspace/gateway run typecheck  # gateway types
pnpm --filter @workspace/web run build          # production build
pnpm --filter @workspace/web run verify:demo    # headless demo-flow checks
```

## Configuration

| Variable       | Where    | Default                 | Purpose                                  |
| -------------- | -------- | ----------------------- | ---------------------------------------- |
| `GATEWAY_URL`  | dev/Vite | `http://localhost:3001` | Proxy target for `/api` during dev.      |
| `VITE_API_URL` | build    | `/api`                  | API base URL baked into the prod bundle. |

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
