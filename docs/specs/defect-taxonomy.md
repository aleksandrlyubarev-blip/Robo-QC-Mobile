# RoboQC Defect Taxonomy (v0.1 — draft)

Status: **draft / proposal.** This document defines *what* RoboQC is allowed to call a
defect, how defects are named, and how each maps onto the existing data model
(`ComponentSpec`, `QcStatus`, `qc_results.details`). It is the shared vocabulary for the
spec author, the QC rules engine, the annotation UI, and every future model. Nothing here
changes code by itself.

Source anchors: MMIOC-1M super-category → subcategory structure (mat. 1); the
carpet-paper "defect taxonomy precedes models" principle (mat. 4); DeepPCB /
Tiny-Defect-Detection-for-PCB classes (mat. 6); SME-YOLO tiny-defect framing (mat. 5).

---

## 1. Two axes of judgment

RoboQC judges a board on two independent axes. Every finding belongs to exactly one.

| Axis | Question | Detector today | Detector planned |
|---|---|---|---|
| **A. Component (closed-set)** | Is the *expected* part present, in the right place, right size, right orientation? | WildDet3D + `runQcRulesEngine` (geometry) | unchanged |
| **B. Anomaly (open-set)** | Is there *anything wrong* on a surface, regardless of whether a part was expected there? | **none** (gap B) | 2D defect / open-vocab model |

Axis A is "spec says X should be here — verify it." Axis B is "the spec said nothing, but
this looks wrong." Today only axis A exists. The taxonomy must name both so axis-B findings
have somewhere to land the day a model produces them.

---

## 2. Axis A — component classes (closed-set)

These are the existing `ComponentType` values (`lib/shared-types/src/spec.ts`). A
component **defect** is a tolerance breach already computed by `runQcRulesEngine`, mapped to
a `QcStatus`. The taxonomy here just names the *failure modes* per type so reports and
annotations are consistent.

| `ComponentType` | Expected check | Component-defect modes (what "fail/warning/missing" means) |
|---|---|---|
| `screw` | presence, seating, position | missing, wrong position, not fully seated (z/extent), cross-threaded (orientation), extra screw |
| `connector` | presence, position, orientation | missing, mis-seated, rotated/skewed, wrong connector variant |
| `heatsink` | presence, position, extent | missing, shifted, lifted (z deviation), wrong size |
| `solder_element` | presence | missing, displaced |
| `press_fit` | presence, full insertion | missing, partial insertion (z), tilted (orientation) |
| `through_hole` | presence | unpopulated, mis-positioned |
| `osfp_cage` | presence, position | missing, shifted, deformed (extent) |
| `cable` | presence, routing | missing, mis-routed, not seated |

Mapping to existing `QcStatus` (`lib/shared-types/src/qc.ts`) — **already implemented** in
`qc-rules-engine.ts`, restated for reference:

| Condition | `QcStatus` |
|---|---|
| all tolerances pass | `pass` |
| required component, position/extent breach | `fail` |
| optional component, position/extent breach | `warning` |
| confidence below `minConfidenceScore` | `review_needed` |
| orientation-only breach | `warning` |
| required component not detected | `missing` |
| optional component not detected | `warning` |

> No change to axis A is proposed here. It is documented so axis B uses the same status
> grammar.

---

## 3. Axis B — anomaly classes (open-set)

Appearance defects that geometric QC cannot see. Organized by **surface**, because the
defect model and the capture lighting (mat. 4) differ per surface. IDs are stable strings;
labels are human-facing.

### 3.1 Board / laminate surface
| id | label | notes |
|---|---|---|
| `scratch` | Scratch / abrasion | linear material removal |
| `contamination` | Contamination / debris | foreign particle on surface |
| `residue_flux` | Flux / coolant residue | the RoboQC coolant-residue case (mat. 3) |
| `discoloration` | Discoloration / burn | thermal or chemical mark |
| `delamination` | Delamination / blister | layer separation |

### 3.2 Solder / pad / trace (electronics AOI — mat. 5, 6)
| id | label | notes |
|---|---|---|
| `solder_bridge` | Solder bridge / short | DeepPCB "short" |
| `solder_insufficient` | Insufficient solder | cold/dry joint |
| `solder_excess` | Excess solder / blob | DeepPCB "spur"/"spurious copper" family |
| `missing_hole` | Missing hole | DeepPCB class |
| `open_circuit` | Open / broken trace | DeepPCB "open" |
| `pad_damage` | Pad lifted / damaged | |
| `tiny_anomaly` | Sub-0.1%-area anomaly | SME-YOLO regime; needs tiling/SAHI path (mat. 5) |

### 3.3 Connector / pin / cable mechanical
| id | label | notes |
|---|---|---|
| `bent_pin` | Bent pin / tab | bent connector tab case (mat. 3) |
| `jacket_damage` | Cable jacket damage | mat. 3 |
| `foreign_object` | Foreign object / FOD | loose screw, debris between parts |

### 3.4 Label / marking
| id | label | notes |
|---|---|---|
| `label_missing` | Label missing | |
| `label_defect` | Label damaged / illegible | crop feeds OCR (mat. 7) |
| `label_misplaced` | Label misplaced / skewed | |

> This list is **versioned and extensible.** New ids are added by appending, never by
> renaming (renames break historical labels). MMIOC-1M's 351 subcategories are a reservoir
> to draw from — we adopt classes only when we have or can synthesize examples (mat. 3).

---

## 4. Severity model

Severity is **orthogonal** to class — the same `scratch` can be cosmetic or rejecting
depending on location and size. Severity drives the overall verdict, not the class.

| severity | meaning | effect on `OverallStatus` |
|---|---|---|
| `critical` | functional failure, ship-stopper | `fail` |
| `major` | likely field failure / customer-visible | `fail` (or `conditional_pass` if reviewer overrides) |
| `minor` | cosmetic, within process limits | `conditional_pass` / `warning` |
| `info` | logged, no action | no effect |

Severity is decided by **rule** (per class + size + zone) where possible, and by the
**reviewer** otherwise. The reviewer's severity is a label (see flywheel spec §5).

---

## 5. How anomalies fit the existing data model (proposed, minimal)

No new top-level tables are required to *represent* an anomaly finding — the existing
`qc_results` row is reused with a small convention. Two minimal additions are proposed:

1. **`ComponentSpec` gains optional anomaly prompts** (axis B input). Proposed addition to
   `ComponentSpecSchema` / the `pcb_specs.components` JSONB — illustrative only:
   ```jsonc
   // new optional field on the spec (not per-component), or a sibling array:
   "anomalyPrompts": ["scratch", "flux residue", "bent pin"]   // open-vocab text prompts
   ```
   These are fed to the open-vocab/2D model the same way `textPrompt` feeds WildDet3D.

2. **Anomaly findings reuse `qc_results`** with:
   - `componentId`: `"anomaly:<id>"` (e.g. `anomaly:scratch`) — namespaced so it never
     collides with a real `ComponentSpec.componentId`.
   - `status`: `fail` | `warning` | `review_needed` per severity table.
   - `details` JSONB carries the anomaly-specific payload:
     ```jsonc
     {
       "axis": "anomaly",
       "anomalyClass": "scratch",
       "severity": "minor",
       "surface": "board",
       "bbox2d": { "x": 0, "y": 0, "width": 0, "height": 0 },
       "areaFraction": 0.0007,        // SME-YOLO tiny-defect tracking
       "source": "prescreen" | "server" | "operator"
     }
     ```

> Why reuse `qc_results` instead of a new table: the report aggregation
> (`pass/fail/warning/missing` counts in `reports`) and the HITL review route already key
> off `qc_results`. Reusing it means axis-B findings appear in reports and reviews with
> zero new plumbing. A dedicated table can come later if anomaly volume warrants it.

---

## 6. Labeling guidelines (for the annotation queue)

Consistency rules so operator labels are trainable (mat. 4 flywheel):

- **One finding = one box.** Don't merge two scratches into one box.
- **Class before severity.** Pick the class from §3 first; severity second.
- **Ambiguous → `review_needed`, not a guess.** Better to escalate than mislabel.
- **Boundary cases** (documented per class as examples accrue): `scratch` vs `pad_damage`;
  `residue_flux` vs `contamination`; `solder_excess` vs `solder_bridge`.
- **Negative labels matter.** "Looks suspicious but is normal texture" (PCB repetition,
  mat. 5) must be recordable as a confirmed-normal label, else the model over-flags.

---

## 7. Versioning

- This taxonomy is versioned (`v0.1`). Each retraining run records the taxonomy version it
  trained against (see flywheel spec §6).
- **Append-only ids.** Add classes; never repurpose an id. Deprecate by marking, not
  deleting.
- Changes go through the same review as code.

---

## 8. Open decisions

1. Do anomaly prompts live at spec level (board-wide) or per-zone? (Per-zone enables
   location-based severity rules.)
2. Is severity rule-driven from day one, or reviewer-only until we have enough labels?
3. Minimum `areaFraction` floor before tiling/SAHI is mandatory (mat. 5)?
