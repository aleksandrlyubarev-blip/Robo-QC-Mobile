# Neuron Vision — MVP Demo Handoff

Operator console for Robo-QC-Mobile PCB/PCBA AOI inspection. This is the
runbook for demonstrating the MVP end-to-end. Two ways to run it: **Demo**
(no backend) and **Live stack** (gateway + Postgres). Neither requires a GPU.

---

## 1. Run it

### Demo only — fastest, no backend / DB / GPU

```bash
pnpm install
pnpm dev:web            # → http://localhost:5173
```

The app probes for a gateway; finding none, it opens in **DEMO** mode with
seeded AOI data and a banner. Everything (analyze, review, report) works
against an in-memory backend.

### Live stack — gateway + Postgres (still no GPU)

```bash
pnpm install
cp .env.example .env          # DATABASE_URL, PORT=3001, INFERENCE_MOCK=true
pnpm db:setup                 # docker compose up postgres + db:push + db:seed
pnpm dev                      # web + gateway   (http://localhost:5173)
```

`pnpm db:setup` = `db:up` (start Postgres) + `db:push` (create tables) +
`db:seed` (insert AOI demo data). With the gateway up, the header data-source
pill switches from **DEMO** to **LIVE** automatically (the "Auto" setting).

Individual steps if you prefer:

```bash
pnpm db:up      # docker compose up -d postgres
pnpm db:push    # drizzle: create tables
pnpm db:seed    # seed specs / inspections / detections / QC / reports
pnpm dev        # web + gateway
pnpm dev:full   # also start the real WildDet3D inference server (needs GPU)
```

Ports: gateway and Vite proxy both use **3001**; the web app is on **5173**.

### On a phone, emulator, or simulator

The app is a mobile PWA and can run against the gateway from a device. See
[`MOBILE.md`](./MOBILE.md) for the per-device gateway address (Android emulator
`10.0.2.2:3001`, iOS simulator `localhost:3001`, physical phone
`<LAN-IP>:3001`) and the in-app **Gateway URL** override.

---

## 2. Demo script (≈3 minutes)

Run in **DEMO** mode (or LIVE after `db:seed`). The header has a **Checker /
Display** toggle and a **LIVE / DEMO** data-source pill.

1. **Dashboard** (Home tab, Checker mode) — inspection counts (in-progress,
   completed, failed) and recent activity from seeded boards.
2. **Specs** (Specs tab) — open **Switch Fabric Board SFB-9000** to show the
   typed components (OSFP cages, heatsink, connector, screws, press-fit) with
   per-component position / orientation / extent **tolerances**.
3. **New inspection** (Inspect tab) — pick a spec, **Open camera** (or
   **Upload** an image), then **Create & continue**.
4. **Analyze** — on the inspection detail, press **Run WildDet3D analysis**.
   Detections are overlaid on the board image (boxes scale with the image),
   and per-component **QC results** appear: pass / warning / fail / missing.
5. **Review (HITL)** — for a failing/missing component, use **Approve**,
   **Reject**, or **Override pass**. Only that component updates; once nothing
   needs review the inspection flips to *completed*.
6. **Report** — **Generate QC report**, then open the **Reports** tab to see
   the overall verdict (pass / conditional / fail) with pass/fail counts.

Then flip the header to **Display** to show the read-only dashboard: same data,
all mutations (capture, edit, analyze, review, report) disabled.

---

## 3. Known limitations

- **Real WildDet3D is untested without a GPU.** Live "Analyze" uses
  `INFERENCE_MOCK=true` to synthesize detections so the flow runs end-to-end.
  The real inference path (`pnpm dev:full`, `INFERENCE_MOCK=false`) is wired
  but unverified in this environment.
- **Demo state is in-memory.** In DEMO mode the seeded data lives in the
  browser session and resets on reload. The LIVE seed persists in Postgres, but
  re-running `db:seed` clears and re-inserts (serial IDs advance).
- **No PDF export.** Reports render on-screen only; `reportPdfUrl` is reserved
  but not generated.
- **No visual/browser test.** Layout and the detection overlay were verified by
  build + logic; a quick manual pass on desktop and a 320px viewport is advised.

---

## 4. Verification

```bash
pnpm typecheck                                  # web + gateway + libs
pnpm --filter @workspace/web run build          # production build
pnpm --filter @workspace/web run verify:demo    # headless demo-flow checks
```

These also run in CI on every push / PR — see `.github/workflows/ci.yml`.
