# Synthetic Defect Pipeline (v0.1 — draft)

Status: **draft / proposal.** Design for generating rare-defect training data from a small
number of real examples — the main RoboQC data bottleneck (Pulse mat. 3: NVIDIA Defect
Image Generation, Roboflow/Corning "8 real defect images," Wistron SMT deployment).
Companion to `data-flywheel.md` (feeds stage 6) and `defect-taxonomy.md` (classes and
severity). No code is implied by this document.

## 1. Why synthetic, and why now

Real rejecting defects are rare by definition: a line producing mostly good boards yields
thousands of goldens and a handful of `bent_pin` examples. Supervised models for the
taxonomy's rare classes (coolant residue, jacket damage, bent tabs, missing-screw edge
cases, label defects) are unreachable on organic data alone in any reasonable time. The
cited results (Corning: strong detection from 8 real defect images + synthetic; Wistron:
days → seconds defect prep, +5–20% accuracy) are vendor claims, but the direction is
well-supported. Synthetic generation converts our abundant asset (goldens) into training
coverage for our scarce one (defects).

## 2. Contract (vendor-agnostic)

The pipeline is defined by its interface so the generation backend is swappable — NVIDIA's
skill today, an open-source inpainting/copy-paste baseline tomorrow.

**Inputs**
| Input | Source | Notes |
|---|---|---|
| Golden images (≥ ~20 per spec) | `pcb_specs.referenceImageUrl` / `golden` artifacts (flywheel §2–3) | clean backgrounds to damage |
| Defect references (1–10 per class) | reviewed real findings (`annotations` with `origin != "synthetic"`) or curated external images | what the defect looks like |
| Target classes + counts | taxonomy §3 ids, prioritized by rare-class gap (flywheel §7 trigger) | e.g. "200 × `residue_flux`, 150 × `bent_pin`" |
| Placement constraints | spec component geometry (`ComponentSpec.expectedPosition`/`expectedExtent`) | a `bent_pin` goes on a connector, not bare laminate |

**Outputs** — per generated sample:
| Output | Format |
|---|---|
| Image | artifact under the flywheel key convention, `kind: "crop"` or full-frame |
| Mask | polygon/bitmap of the injected defect region |
| Label | `annotations` row: `axis: "anomaly"`, `classId`, `severity`, `bbox2d`, `mask`, **`origin: "synthetic"`** |
| Provenance | generator id+version, source golden key, source defect refs, generation params |

The `origin: "synthetic"` tag (already in the `annotations` schema) is the load-bearing
bit: it lets dataset assembly enforce the placement rules below and lets training weight
synthetic labels differently (flywheel open decision 4).

## 3. Pipeline stages

```
(1) SELECT     rare-class gaps from label counts (flywheel dataset manifest counts)
(2) SOURCE     goldens + defect refs for those classes
(3) GENERATE   backend produces image+mask variants (severity/size/position/lighting sweep)
(4) SCREEN     automatic filter: mask sanity, realism score, no golden-content corruption
(5) HUMAN SPOT-CHECK   operator reviews a sample (e.g. 10%) per batch; batch rejected if
                        unrealistic — same review UI as the flywheel queue
(6) INGEST     accepted samples → artifacts + annotations(origin: "synthetic")
(7) ASSEMBLE   dataset manifest picks them up for train split only
```

## 4. Placement rules (non-negotiable)

1. **Synthetic never enters the frozen test set** (flywheel §6.2). Test is real data only;
   otherwise metrics measure how well we detect our own generator.
2. **Report synthetic fraction per class** in the dataset manifest `counts` — a class
   that is 95% synthetic is flagged, not hidden.
3. **Validate the transfer**: for any class trained with synthetic data, eval must include
   at least some real positives before the class's detections are allowed to auto-`fail`
   a board (until then: `review_needed` only).
4. **Severity comes from generation params** (defect size/depth/zone), mapped via taxonomy
   §4 — not guessed after the fact.

## 5. Backend options (in preference order for a first pass)

| Backend | Effort | Fidelity | Notes |
|---|---|---|---|
| Classical copy-paste + blending (defect refs onto goldens) | low | low-med | no GPU vendor lock; good enough for `contamination`, `foreign_object`, label defects; the baseline every fancier method must beat |
| Diffusion inpainting (open-source) with defect-ref conditioning | med | med-high | good for `scratch`, `residue_flux`, `discoloration` |
| NVIDIA Defect Image Generation skill (Isaac Sim / Cosmos path) | high | high (claimed) | strongest for 3D-dependent defects (`bent_pin`, seating); requires NVIDIA stack; validate claims per §4.3 |

Recommendation: build stages 1–2 and 4–7 (they are backend-independent), start with
copy-paste as backend, and swap upward per class where the baseline's transfer validation
(§4.3) fails.

## 6. Metrics for the pipeline itself

- **Transfer gap** per class: recall on real positives vs recall on held-out synthetic.
  Large gap = generator artifacts are being learned.
- **Spot-check rejection rate** per batch (§3.5) — rising rate means the generator or the
  sweep params drifted.
- **False-positive delta**: adding synthetic data must not raise false-reject rate on the
  real test set.

## 7. Open decisions

1. Full-frame generation vs ROI-crop generation (crops are cheaper and fit the SME-YOLO
   tiling path, mat. 5; full frames match the pre-screen's input distribution).
2. Where generation runs (offline workstation batch vs a service) — no runtime coupling to
   the gateway either way.
3. Per-class synthetic:real ratio caps.
