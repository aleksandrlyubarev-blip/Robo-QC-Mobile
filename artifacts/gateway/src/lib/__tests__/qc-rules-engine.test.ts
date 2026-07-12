import { describe, it, expect } from "vitest";
import { runQcRulesEngine } from "../qc-rules-engine";
import type { ComponentSpec, Detection3D } from "@workspace/shared-types";

function spec(overrides: Partial<ComponentSpec> = {}): ComponentSpec {
  return {
    componentId: "C1",
    type: "screw",
    label: "M3 screw",
    textPrompt: "screw",
    expectedPosition: { x: 0, y: 0, z: 0 },
    expectedOrientation: { roll: 0, pitch: 0, yaw: 0 },
    expectedExtent: { width: 5, height: 5, depth: 5 },
    positionTolerance: 2,
    orientationTolerance: 10,
    extentTolerance: 1,
    required: true,
    minConfidenceScore: 0.5,
    ...overrides,
  };
}

function detection(overrides: Partial<Detection3D> = {}): Detection3D {
  return {
    label: "screw",
    score: 0.9,
    bbox3d: {
      center: { x: 0, y: 0, z: 0 },
      extent: { width: 5, height: 5, depth: 5 },
      orientation: { roll: 0, pitch: 0, yaw: 0 },
    },
    depthUsed: false,
    ...overrides,
  };
}

describe("runQcRulesEngine", () => {
  it("passes when a detection matches the spec within tolerances", () => {
    const results = runQcRulesEngine([detection()], [spec()]);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
    expect(results[0].positionDeviation).toBe(0);
  });

  it("marks a required component missing when nothing matches", () => {
    const results = runQcRulesEngine([], [spec()]);
    expect(results[0].status).toBe("missing");
  });

  it("marks an optional component warning when nothing matches", () => {
    const results = runQcRulesEngine([], [spec({ required: false })]);
    expect(results[0].status).toBe("warning");
  });

  it("fails a required component whose position exceeds tolerance", () => {
    const det = detection({
      bbox3d: {
        center: { x: 50, y: 0, z: 0 },
        extent: { width: 5, height: 5, depth: 5 },
        orientation: { roll: 0, pitch: 0, yaw: 0 },
      },
    });
    const results = runQcRulesEngine([det], [spec()]);
    expect(results[0].status).toBe("fail");
    expect(results[0].details).toMatchObject({ positionExceedsTolerance: true });
  });

  it("flags low-confidence matches for review", () => {
    const det = detection({ score: 0.3 }); // below minConfidenceScore, geometry ok
    const results = runQcRulesEngine([det], [spec()]);
    expect(results[0].status).toBe("review_needed");
    expect(results[0].scoreDeviation).toBeCloseTo(0.2, 6);
  });

  it("does not match one detection to two components", () => {
    const specs = [spec({ componentId: "C1" }), spec({ componentId: "C2" })];
    const statuses = runQcRulesEngine([detection()], specs).map((r) => r.status);
    expect(statuses).toContain("pass");
    expect(statuses).toContain("missing");
  });
});
