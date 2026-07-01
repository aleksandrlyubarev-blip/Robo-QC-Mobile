# Pre-Screen Contract (v0.1)

Status: **implemented** (schema + route validation). Defines the JSON an on-device
pre-screen model posts to `POST /api/inspections/:id/pre-screen`, closing the "pre-screen
is a stub" gap (roadmap Phase 2 item 4). The schema is the source of truth:
`lib/shared-types/src/prescreen.ts` (`PreScreenResultSchema`); the route validates against
it and rejects non-conforming payloads with 400.

## Role in the flow

The pre-screen is a fast 2D gate that runs on the capture device (phone / Jetson / OAK-D,
mat. 2/8) *before* the image is sent for server-side WildDet3D analysis. It answers one
question: **is this capture worth server analysis, and did anything jump out?**

```
device capture ──▶ on-device model ──▶ POST /:id/pre-screen
                                            │
                        gate = "retake"  ──▶ status → capturing   (recapture)
                        gate = "pass"    ──▶ status → pre_screening, then /:id/analyze
                        gate = "escalate"──▶ status → pre_screening, then /:id/analyze
                                             (findings ride along for prioritization)
```

The gate never *replaces* server analysis — `pass` vs `escalate` only distinguishes "no
suspect regions" from "suspect regions found." Both proceed; `escalate` findings let the
server/reviewer prioritize and let the flywheel measure pre-screen precision against the
server verdict.

## Payload

```jsonc
{
  "modelId": "prescreen-yolo",          // deployed model identity (flywheel §8:
  "modelVersion": "0.0.1",              //   results must stay attributable after retrains)
  "taxonomyVersion": "0.1",             // defect-taxonomy version the classIds come from
  "gate": "pass" | "escalate" | "retake",
  "findings": [
    {
      "axis": "component" | "anomaly",  // expected-part check vs open-set appearance defect
      "classId": "scratch",             // ComponentType value or taxonomy §3 anomaly id
      "score": 0.72,                    // [0..1]
      "bbox2d": { "x": 10, "y": 20, "width": 40, "height": 8 },  // px, capture coords
      "severity": "minor",              // optional; taxonomy §4
      "cropKey": "12/3481/crop/anomaly_scratch_0.jpg"  // optional; artifact key of ROI crop
    }
  ],
  "inferenceTimeMs": 18.4,
  "imageSize": [1920, 1080],            // capture resolution the bboxes refer to
  "capturedAt": "2026-06-13T09:26:09Z"  // ISO-8601
}
```

Rules:

- `findings` may be empty (typical for `gate: "pass"`); `retake` findings are usually
  quality-related and advisory only.
- `bbox2d` is in pixels of `imageSize` — the server rescales if it analyzes a different
  resolution.
- `classId` values must come from the taxonomy version named in `taxonomyVersion`; unknown
  ids are stored but flagged during dataset assembly.
- `cropKey` follows the artifact key convention (`lib/shared-types/src/artifacts.ts`,
  flywheel §3).

## Server behavior (implemented)

- Payload is validated with `PreScreenResultSchema`; invalid → `400` with zod issues.
- `gate: "retake"` sets inspection status back to `capturing`; otherwise `pre_screening`.
- The validated payload is stored verbatim in `inspections.preScreenResult` (jsonb).

## Not in v0.1 (future)

- Auto-creating `annotations` rows from `escalate` findings (needs dedup against server
  detections first).
- Per-finding depth attachment for RGB-D devices (mat. 8).
- Device auth / signed payloads.
