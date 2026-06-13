# RoboQC Data Flywheel (v0.1 — draft)

Status: **draft / proposal.** Defines how RoboQC turns everyday inspections into labeled
training data and improved models, on a loop — the "data collection is part of the
inspection machine" principle (mat. 4). Companion to `defect-taxonomy.md`. This is a design
document; proposed schema/route changes are clearly marked and not yet implemented.

---

## 1. The loop

```
        ┌──────────────────────────────────────────────────────────────┐
        │                                                                │
        ▼                                                                │
  (1) CAPTURE ──▶ (2) PRE-SCREEN ──▶ (3) SERVER ANALYZE ──▶ (4) REVIEW ──┘
   device/OAK-D      on-device           WildDet3D +          operator
   RGB(+depth)       gate model          QC rules engine      confirms/corrects
        │                                     │                    │
        └─────────────▶ (5) LABEL STORE ◀─────┴────────────────────┘
                              │
                              ▼
                     (6) DATASET ASSEMBLY ──▶ (7) RETRAIN ──▶ (8) EVAL+DEPLOY
                         versioned split        edge + server     promote if better
                                                                        │
                                                                        └─▶ back to (2)/(3)
```

Stages 1–4 partly exist today. Stages 5–8 are the new flywheel. The point of the loop:
**every reviewed inspection produces at least one label**, so the models that gate (2) and
analyze (3) keep improving without a separate data-collection project.

---

## 2. Stage 1 — Capture

What it produces and where it lands (existing `inspections` columns in parentheses):

| Artifact | Column | Notes |
|---|---|---|
| RGB image | `capturedImageUrl` | required |
| Depth map (16-bit) | `capturedDepthMapUrl` | optional; OAK-D / LiDAR (mat. 8). `/detect` already accepts it |
| Device/capture metadata | `deviceInfo` (jsonb) | model, lighting mode, lens, firmware |
| Operator | `operatorId` | provenance |

**Capture trigger** (proposed convention): each capture event records, in `deviceInfo`:
```jsonc
{
  "trigger": "manual" | "auto_station" | "rosbag_replay",
  "station": "string",
  "lighting": "bright_field" | "grazing" | "mixed",   // mat. 4 illumination plan
  "lensMm": 0, "exposureUs": 0, "gain": 0,
  "captureTs": "ISO-8601"
}
```
Lighting mode is captured because grazing vs bright-field is what makes a scratch visible
(mat. 4) — the model must know which it trained on.

### Golden samples
A "golden" (known-good) board is captured per spec and stored as `pcb_specs.referenceImageUrl`
(already exists). Golden samples are the **normal-only** baseline for anomaly detection
(mat. 4's "unsupervised first") and the input set for synthetic defect generation (mat. 3,
"20 golden + few defect refs"). Proposed: allow N goldens per spec, not one (a `golden`
artifact kind in the artifact store, §3).

---

## 3. Stage 2 — Storage & naming convention (proposed)

A deterministic key scheme so any artifact is locatable from DB ids alone:

```
{specId}/{inspectionId}/{kind}/{captureTs}.{ext}

kind ∈ { rgb, depth, prescreen_overlay, crop, golden }
```
Examples:
```
12/3481/rgb/2026-06-13T09-26-09Z.jpg
12/3481/depth/2026-06-13T09-26-09Z.png
12/golden/2026-06-13T08-00-00Z.jpg          # golden lives under spec, no inspection
12/3481/crop/anomaly_scratch_0.jpg          # ROI crops for review/training
```
Rules: immutable once written, never overwritten (re-capture = new `captureTs`); URLs in
`inspections`/`pcb_specs` point here. This unblocks the OAK-D node's "ROI crop saving"
(mat. 8) and SME-YOLO high-res crops (mat. 5).

---

## 4. Stages 2–3 — Pre-screen + server analyze (mostly exists)

- **Pre-screen** (stage 2): on-device gate. Today `/:id/pre-screen` just stores the posted
  JSON (`preScreenResult`) — no model. The pre-screen *contract* and model are Phase 3 (see
  roadmap); the flywheel only requires that `preScreenResult` records, per finding, the
  same fields the taxonomy defines, with `details.source = "prescreen"`.
- **Server analyze** (stage 3): existing `/:id/analyze` → WildDet3D → `runQcRulesEngine` →
  writes `detections` + `qc_results`. Unchanged by the flywheel except that axis-B anomaly
  findings (taxonomy §5) also land in `qc_results` once a defect model exists.

---

## 5. Stage 4 — Human review / annotation queue

This is the flywheel's label source and the **highest-leverage near-term work**, because the
seam already exists (`/:id/review`, `qc_results.reviewDecision` / `reviewedBy`).

### 5.1 Known limitation to fix first
The current `/:id/review` (`artifacts/gateway/src/routes/inspection/index.ts`) updates
**all** `qc_results` rows for the inspection with one decision and **ignores the
`componentId`** sent in the body:
```ts
.update(qcResults).set({ reviewDecision, ... })
.where(eq(qcResults.inspectionId, id))   // ← no componentId filter: hits every row
```
For trainable labels, review must be **per-finding**. Proposed change: filter by
`and(eq(qcResults.inspectionId, id), eq(qcResults.componentId, componentId))`.

### 5.2 Review actions → labels
The reviewer can do four things; each emits a label record (§6):

| Action | Meaning | Label produced |
|---|---|---|
| **Confirm** | model finding is correct | positive label at model's box/class |
| **Correct** | right region, wrong class/severity/box | corrected label |
| **Reject** | false positive | negative (hard-negative) label |
| **Add** | model missed a defect | new label, operator-drawn box + class |

`reviewDecision` (`approved` / `rejected` / `override_pass`) is kept for the verdict, but the
**training label** needs box + class + severity, which `qc_results` does not hold. Hence the
proposed `annotations` table (§6).

### 5.3 Queue
A simple priority queue over inspections with status `reviewing` (existing status) or any
`qc_results.status ∈ {review_needed, fail, missing}`. Priority by severity then age. No new
status enum needed.

---

## 6. Stages 5–6 — Label store & dataset assembly (proposed)

### 6.1 New table: `annotations`
The training-grade label that `qc_results` can't express. Proposed Drizzle shape (sketch):
```ts
annotations = {
  id, inspectionId (fk), artifactKey,          // which image (§3 key)
  axis: "component" | "anomaly",
  classId,                                       // ComponentType or anomaly id (taxonomy)
  severity,                                       // taxonomy §4, nullable for component
  bbox2d (jsonb), mask (jsonb, nullable),         // mask for RF-DETR-seg (mat. 7)
  origin: "model" | "operator_confirm" | "operator_correct" | "operator_add" | "synthetic",
  reviewedBy, taxonomyVersion, createdAt,
}
```
Origin distinguishes machine-proposed vs human-authored vs synthetic (mat. 3) labels — the
split matters for trust weighting at train time.

### 6.2 Dataset assembly
A dataset version is an **immutable manifest** (file or row) listing artifact keys + their
`annotations` at a point in time, plus the split:
```jsonc
{
  "datasetVersion": "2026-06-13.1",
  "taxonomyVersion": "0.1",
  "split": { "train": [...keys], "val": [...keys], "test": [...keys] },
  "counts": { "component": 0, "anomaly": 0, "synthetic": 0, "hard_negative": 0 },
  "goldens": [...keys]
}
```
Rules: **frozen test set** (never auto-grows — protects against eval drift); synthetic
examples (mat. 3) allowed in train, **never** in test; class balance reported so rare
classes (mat. 3's bottleneck) are visible.

---

## 7. Stage 7 — Retraining cadence & triggers

Retrain when **any** trigger fires (not on a blind schedule):

| Trigger | Threshold (initial, tunable) |
|---|---|
| New labels since last train | ≥ N (e.g. 500) |
| New labels for a *rare* class | ≥ K (e.g. 25) — rare-class priority |
| Measured regression in production | false-reject or miss rate over threshold |
| Taxonomy version bump | always |
| Cadence ceiling | at most weekly, at least monthly |

Two model targets retrain independently:
- **Pre-screen / edge model** (YOLO family, mat. 2/6) — fast gate.
- **Server defect / anomaly model** (mat. 1/5/7) — heavier, higher recall.

---

## 8. Stage 8 — Eval, model registry & deploy

- **Eval on the frozen test set** with the metrics that matter for QC (not just mAP):
  **false-reject rate** (good board flagged → operator cost) and **miss rate** (defect
  shipped → the expensive error). These mirror the roadmap's edge-benchmark metrics
  (mat. 2/6) and MMIOC-1M's closed+open split (mat. 1: report closed presence AND open
  anomaly recall separately).
- **Model registry** (proposed): each model version records dataset version, taxonomy
  version, metrics, and target (edge|server).
- **Promote only if better** on the frozen test set and no regression on critical classes.
  Deployed pre-screen model version is recorded so `preScreenResult` is attributable.

---

## 9. DMAIC / Six Sigma tie-in (mat. 4)

The flywheel is the Measure→Improve engine: capture rate, label throughput, per-class
recall, false-reject rate, and escape (miss) rate are the control metrics. `reports`
(`passCount`/`failCount`/… already exist) is the Measure surface; the retrain triggers (§7)
are the Improve actuator.

---

## 10. Proposed changes summary (what implementing this touches)

| Change | Type | File / area |
|---|---|---|
| Per-component review filter | **bugfix** | `routes/inspection/index.ts` `/:id/review` |
| Artifact naming/storage convention | new | storage layer / capture |
| `annotations` table | new schema | `lib/db/src/schema/` |
| `anomalyPrompts` on spec | schema add | `lib/shared-types/src/spec.ts`, `pcb-specs` |
| Anomaly findings in `qc_results.details` | convention | rules engine (when defect model exists) |
| Dataset manifest + model registry | new | training tooling |

> Smallest first commit that delivers value: the **per-component review bugfix (§5.1)** plus
> the **`annotations` table (§6.1)**. Together they start producing trainable labels from the
> review flow that already runs — no models, no GPUs, no new hardware.

## 11. Open decisions

1. Artifact storage backend (S3-compatible? local volume like the compose `pgdata`?).
2. `annotations` as its own table vs. extending `qc_results` (taxonomy §5 reuses
   `qc_results` for *findings*; labels are richer — recommend separate table).
3. Who owns retrain orchestration (CI job? separate service?).
4. Label trust weighting: do synthetic and machine-confirmed labels count equally to
   operator-authored ones at train time?
