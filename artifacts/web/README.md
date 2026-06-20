# Neuron Vision — Checker / Display

The operator-facing frontend for Robo-QC-Mobile. A single React + Vite PWA that
runs in two modes sharing one data layer:

- **Checker** — the operator flow: pick a spec, capture a board image, run the
  WildDet3D analysis, and review failing components (HITL approve / reject /
  override).
- **Display** — the read-only dashboard: fleet status, inspection history, and
  generated QC reports.

Toggle modes from the header; the choice is remembered in `localStorage`.

## Stack

- React 19 + React Router 7
- TanStack Query for server state
- Vite 7 + `vite-plugin-pwa` (installable, offline shell)
- Types shared with the backend via `@workspace/shared-types`

## Development

The app talks to the gateway REST API under `/api`. In dev, Vite proxies
`/api` to the gateway (default `http://localhost:3001`, override with
`GATEWAY_URL`).

```bash
# from the repo root — runs web + gateway + inference server together
pnpm dev

# or just the frontend
pnpm dev:web
```

Then open http://localhost:5173.

## Configuration

| Variable       | Where    | Default                 | Purpose                                  |
| -------------- | -------- | ----------------------- | ---------------------------------------- |
| `GATEWAY_URL`  | dev/Vite | `http://localhost:3001` | Proxy target for `/api` during dev.      |
| `VITE_API_URL` | build    | `/api`                  | API base URL baked into the prod bundle. |

## Project layout

```
src/
  api/         typed client (client.ts), response types (types.ts), query hooks
  app/         app-wide context (mode.tsx)
  components/  Layout, StatusBadge, DetectionOverlay, shared states
  lib/         camera capture, formatting helpers
  pages/       Dashboard, Specs, SpecEditor, Inspections, NewInspection,
               InspectionDetail, Reports
```

## Notes

- Image capture uses `getUserMedia` (rear camera) with a file-upload fallback.
  Frames are encoded as JPEG data URLs and sent as `capturedImageUrl`; the
  gateway resolves `data:` URLs when calling the inference server, so no
  separate upload endpoint is required.
- Detection boxes are overlaid using the model's reported `imageSize`, so they
  scale to whatever width the image renders at.
