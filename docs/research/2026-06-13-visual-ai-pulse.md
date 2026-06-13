# Visual AI / RoboQC Pulse — Research → Roadmap (2026-06-13)

Mapping of 8 recent materials onto the current Robo-QC-Mobile architecture, with a
prioritized roadmap. This is a planning document — no code changes are implied by
merging it.

## 1. Where we are today (Phase 1 baseline)

Robo-QC-Mobile is a two-service monorepo:

| Service | Stack | Responsibility |
|---|---|---|
| `artifacts/gateway` | TypeScript / Express / Drizzle / Postgres | Inspection lifecycle, QC rules, HITL review, reports |
| `services/inference-server` | Python / FastAPI / WildDet3D | Text-prompted **3D** object detection (optional depth map) |

Current inspection flow (`artifacts/gateway/src/routes/inspection/index.ts`):

```
create inspection
  → POST /:id/pre-screen   (on-device result is just stored; no model yet)
  → POST /:id/analyze      (calls inference-server /detect with spec textPrompts)
        → WildDet3D returns Detection3D[]  (3D bbox + optional 2D bbox + score)
        → runQcRulesEngine() matches detections to ComponentSpec by label+proximity,
          checks position / orientation / extent / confidence tolerances
        → writes detections + qcResults, sets status reviewing|completed
  → POST /:id/review       (human override: approved | rejected | override_pass)
```

Key facts that constrain everything below:

- **Detection is fundamentally "known-class via text prompts."** `ComponentSpec` carries
  a `textPrompt` (`lib/shared-types/src/spec.ts`) and the rules engine matches by label
  keyword similarity + 3D position. There is **no open-vocabulary anomaly path** — an
  unexpected defect with no matching spec component is simply never surfaced.
- **QC is geometric, not appearance-based.** `qc-rules-engine.ts` only judges
  position/orientation/extent/confidence. It cannot flag a scratch, residue, bent tab,
  or contamination — only "wrong place / wrong size / missing."
- **The "Mobile" pre-screen is a stub.** `/:id/pre-screen` stores whatever the device
  posts; there is no on-device model defined.
- **Depth is already a first-class input.** `/detect` accepts a 16-bit PNG depth map and
  `wilddet3d.py` threads it through inference. We are wired for RGB-D but have no capture
  story.
- **`ComponentType` enum is electronics/PCB-centric** (screw, connector, heatsink,
  solder_element, press_fit, through_hole, osfp_cage, cable).

The two largest capability gaps are therefore **(A) appearance/surface-defect detection**
and **(B) open-vocabulary / unknown-anomaly handling** — and both are exactly what this
batch of materials addresses.

---

## 2. Material-by-material relevance

### 1. MMIOC-1M + RTVPNet — closed-open unification benchmark
- **Maps to:** the open-vocab gap (B). Their fixed-class + open-prompt split is the
  conceptual model for extending `ComponentSpec`/the rules engine so a spec can declare
  both *expected components* (closed) and *anomaly prompts* (open, e.g. "scratch",
  "residue", "bent pin") that produce findings even with no spec match.
- **Action:** treat MMIOC-1M's taxonomy (super-categories → defect subcategories) as the
  template for a RoboQC defect taxonomy; design our eval split as closed (presence/geometry)
  + open (anomaly recall).
- **Cost/risk:** Design-only now; RTVPNet is a heavier model swap, not near-term.
- **Priority:** Medium (informs the schema design in §3, item B1).

### 2. Industrial-YOLO — fine-tuned YOLOv8 on edge (Jetson Orin, 120+ FPS, TensorRT/OpenVINO)
- **Maps to:** the pre-screen stub. This is the natural model behind `/:id/pre-screen` —
  a fast on-device gate that decides "looks fine / send to server for WildDet3D 3D + QC."
- **Why it fits "Mobile":** the product name implies on-device capture; a TensorRT/OpenVINO
  YOLO is the right weight class for a phone/Jetson edge tier.
- **Action:** define the pre-screen contract (what JSON the device posts), then a thin
  YOLO baseline + an edge latency/FPS/mAP/false-reject benchmark harness.
- **Priority:** **High** — unblocks the only stubbed part of the live flow.

### 3. NVIDIA Defect Image Generation + Roboflow/Wistron synthetic data
- **Maps to:** the data-scarcity problem that blocks *both* a YOLO pre-screen (item 2) and
  any supervised defect model. We have zero training data and no capture pipeline.
- **Action:** define a synthetic-defect pipeline spec: golden images + few defect refs →
  generated variants + masks/labels/severity → train/eval set. This is a spec/design step
  before we own GPUs or NVIDIA tooling.
- **Priority:** **High** (as a spec) — it is the dependency for items 2, 5, 6, 7.

### 4. Carpet-manufacturing data-collection paper — "data collection as part of the machine"
- **Maps to:** the HITL loop we already have a seam for (`/:id/review`). Their
  anomaly-first → human-in-the-loop annotation → supervised maturation flywheel is the
  process blueprint for turning our review decisions into training data.
- **Action:** write a data-flywheel spec — capture trigger, image naming, golden-sample
  capture, defect taxonomy, the operator review UI/queue, retraining cadence. The
  `reviewDecision` field is the natural label source.
- **Priority:** **High** (as a spec) — cheap, no new infra, and it makes every later model
  improvable.

### 5. SME-YOLO — tiny defects on PCB (defects ~0.1% of board area)
- **Maps to:** our PCB focus + `max_image_size: 1920` downscaling in `config.py`, which
  destroys tiny defects. Relevant to surface/solder/trace-level inspection that geometric
  QC cannot see.
- **Action:** a tiling / SAHI-style evaluation: crop high-res PCB zones, measure
  defect-level recall vs. whole-frame inference.
- **Priority:** Medium — depends on having defect data (item 3/4) first.

### 6. YOLOv8 vs YOLOv10 on PCB surface defects
- **Maps to:** the "is a light YOLO enough before heavier models?" decision for the
  pre-screen tier (item 2) and any board-surface defect model.
- **Action:** reuse the item-2 benchmark harness; add YOLOv10 / RF-DETR / RT-DETR under one
  data split + edge-latency constraint.
- **Priority:** Medium — engineering baseline, folds into item 2's harness.

### 7. RF-DETR — real-time detection + instance segmentation (DINOv2 backbone)
- **Maps to:** evidence quality. Our `Detection3D` carries a 2D bbox but **no masks**.
  Instance masks for cable routes / connector housings / label crops would make the
  evidence log far stronger and improve label/OCR cropping.
- **Action:** evaluate RF-DETR-Seg vs YOLO-seg on a small set for cable/connector masks;
  if adopted, extend the `Detection3D` schema with an optional mask/polygon.
- **Priority:** Medium-Low — valuable but a schema + model addition, not a gap-closer.

### 8. Luxonis DepthAI ROS v3 (OAK-D RGB-D, on-camera inference, ROS2)
- **Maps to:** the missing capture story for our already-supported depth input. OAK-D gives
  RGB + stereo depth + on-camera inference + ROS2 — a low-cost path to feed
  `capturedDepthMapUrl` and run the item-2 pre-screen on the camera.
- **Action:** prototype a ROS2 node: synchronized RGB/depth capture, on-camera pre-screen,
  ROI crop saving, defect-event JSON posted to the gateway, rosbag replay.
- **Priority:** Medium — hardware-dependent; do after the pre-screen contract (item 2) and
  data flywheel (item 4) exist so the node has a real target to post to.

---

## 3. Capability gaps these materials close

| Gap (today) | Closed by | Concrete change |
|---|---|---|
| **A. No appearance/surface-defect detection** — QC is geometry-only | 2, 3, 5, 6 | New 2D defect model + defect findings alongside geometric `qcResults` |
| **B. No open-vocabulary / unknown anomalies** | 1 | `ComponentSpec` gains anomaly prompts; rules engine emits unmatched-anomaly findings |
| **C. Pre-screen is a stub** | 2, 6, 8 | Define device→gateway pre-screen contract + on-device model |
| **D. No training data / no capture pipeline** | 3, 4, 8 | Synthetic-defect pipeline + HITL data flywheel + RGB-D capture |
| **E. Tiny defects lost to 1920px downscale** | 5 | Tiling/SAHI eval; high-res ROI path |
| **F. Thin evidence (bbox only, no masks)** | 7 | Optional segmentation masks on `Detection3D` |

---

## 4. Prioritized roadmap

Ordering reflects dependencies: **data and contracts before models, models before
hardware.** Nothing here is committed scope — it is a sequencing recommendation.

### Phase 2 — Data & contracts (specs, no GPUs required) — **do first**
1. **Data-flywheel spec** (mat. 4) — capture trigger, image naming, golden-sample capture,
   defect taxonomy, operator review queue (build on `/:id/review` + `reviewDecision`),
   retraining cadence. *Cheapest, unblocks everything.*
2. **RoboQC defect taxonomy** (mat. 1, 4) — closed component classes (already in
   `ComponentType`) + open anomaly classes (scratch, residue, bent tab, missing-screw edge
   cases, label defects, contamination).
3. **Synthetic-defect pipeline spec** (mat. 3) — golden images + few defect refs → variants
   + masks/labels/severity → train/eval split. Vendor-agnostic interface so NVIDIA
   tooling is swappable.
4. **Pre-screen contract** (mat. 2, 8) — define the JSON the device posts to
   `/:id/pre-screen` (per-region scores, gate decision, crops).

### Phase 3 — Edge pre-screen + baselines
5. **Edge benchmark harness** (mat. 2, 6) — YOLOv8/v10 (+ RF-DETR / RT-DETR) on RoboQC
   images: latency, FPS, mAP, false rejects, missed defects. Picks the pre-screen model.
6. **On-device pre-screen model** wired into `/:id/pre-screen` (the gate before WildDet3D).

### Phase 4 — Appearance defects & evidence
7. **Open-vocab anomaly path** (mat. 1) — extend `ComponentSpec` with anomaly prompts;
   `qc-rules-engine.ts` emits findings for spec-less anomalies (gap B).
8. **Tiny-defect eval + tiling/SAHI** (mat. 5) — high-res ROI path around `max_image_size`.
9. **Segmentation masks** (mat. 7) — RF-DETR-Seg eval; optional mask field on `Detection3D`.

### Phase 5 — Hardware capture
10. **OAK-D ROS2 node** (mat. 8) — RGB-D capture + on-camera pre-screen feeding
    `capturedImageUrl` / `capturedDepthMapUrl` and posting defect-event JSON.

---

## 5. Recommended immediate next step

Start with **Phase 2, items 1–2 (data-flywheel spec + defect taxonomy)**. They are pure
design, touch no infra, and unblock every model-side item. They also slot directly into the
existing `/:id/review` seam and the `ComponentSpec`/`ComponentType` types, so they are
additive rather than a rewrite.

> Note on stated benchmark figures (120+ FPS Jetson Orin / 98.5% mAP, 5–20% accuracy gains,
> "8 real images" results): these are vendor/author claims from the source materials and
> have not been reproduced here. Treat them as hypotheses to validate with the Phase 3
> harness, not as targets.

## Source index

| # | Material | Practicality (as stated) |
|---|---|---|
| 1 | MMIOC-1M + RTVPNet (closed-open unification) | High |
| 2 | Industrial-YOLO edge (YOLOv8 + TensorRT/OpenVINO) | High |
| 3 | NVIDIA Defect Image Generation + Roboflow/Wistron | High |
| 4 | Carpet-manufacturing data-collection paper | High |
| 5 | SME-YOLO (tiny PCB defects) | Medium-High |
| 6 | YOLOv8 vs YOLOv10 on PCB | Medium |
| 7 | RF-DETR (detection + instance segmentation) | High |
| 8 | Luxonis DepthAI ROS v3 (OAK-D RGB-D) | High |
