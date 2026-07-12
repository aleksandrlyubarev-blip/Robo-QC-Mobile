import { describe, it, expect } from "vitest";
import { positionDistance, orientationDistance, extentDeviation } from "../tolerance";

describe("positionDistance", () => {
  it("computes euclidean distance in mm", () => {
    expect(positionDistance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toBe(5);
  });

  it("is zero for identical points", () => {
    expect(positionDistance({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(0);
  });
});

describe("orientationDistance", () => {
  it("wraps angles across the 360 boundary", () => {
    // 350deg vs 10deg is a 20deg difference, not 340
    const d = orientationDistance(
      { roll: 350, pitch: 0, yaw: 0 },
      { roll: 10, pitch: 0, yaw: 0 },
    );
    expect(d).toBeCloseTo(20, 6);
  });

  it("combines per-axis differences as an L2 norm", () => {
    const d = orientationDistance(
      { roll: 3, pitch: 4, yaw: 0 },
      { roll: 0, pitch: 0, yaw: 0 },
    );
    expect(d).toBeCloseTo(5, 6);
  });
});

describe("extentDeviation", () => {
  it("returns the largest absolute axis deviation", () => {
    const d = extentDeviation(
      { width: 10, height: 10, depth: 10 },
      { width: 11, height: 8, depth: 10.5 },
    );
    expect(d).toBe(2); // height off by 2 is the largest
  });
});
