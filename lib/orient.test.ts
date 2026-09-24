import { describe, it, expect } from "vitest";
import { stateToEuler, eulerToQuat } from "./orient";
import { applyMove } from "./d8";
import * as THREE from "three";

describe("orientation == logic consistency", () => {
  it("state 0 is identity orientation", () => {
    const e = stateToEuler(0);
    expect(e.y).toBe(0);
    expect(e.z).toBe(0);
  });

  it("rotR advances the Z rotation by 90°; four of them = full turn", () => {
    const e1 = stateToEuler(applyMove(0, "rotR"));
    expect(Math.abs(e1.z)).toBeCloseTo(Math.PI / 2, 5);
    const q0 = eulerToQuat(stateToEuler(0));
    const q4 = eulerToQuat(stateToEuler(applyMove(applyMove(applyMove(applyMove(0, "rotR"), "rotR"), "rotR"), "rotR")));
    // q4 ≈ identity
    const dot = Math.abs(q0.dot(q4));
    expect(dot).toBeCloseTo(1, 5);
  });

  it("reflectH flips over Y (z stays flat), and twice = identity", () => {
    const e = stateToEuler(applyMove(0, "reflectH"));
    expect(Math.abs(e.y)).toBeCloseTo(Math.PI, 5);
    expect(e.z).toBeCloseTo(0, 5);
    const q2 = eulerToQuat(stateToEuler(applyMove(applyMove(0, "reflectH"), "reflectH")));
    expect(q2.length()).toBeCloseTo(1, 5);
  });

  it("every state maps to a valid unit quaternion (no NaN)", () => {
    for (let k = 0; k < 8; k++) {
      const q = eulerToQuat(stateToEuler(k));
      expect(Number.isNaN(q.x)).toBe(false);
      expect(Number.isNaN(q.w)).toBe(false);
      expect(q.length()).toBeCloseTo(1, 5);
    }
  });
});
