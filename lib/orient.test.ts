import { describe, it, expect } from "vitest";
import { stateToEuler, eulerToQuat } from "./orient";
import { applyMove } from "./d8";
import * as THREE from "three";

describe("orientation == logic consistency", () => {
  it("state 0 is identity orientation", () => {
    const e = stateToEuler(0);
    expect(Math.abs(e.y)).toBe(0);
    expect(Math.abs(e.z)).toBe(0);
  });

  it("rotR spins clockwise (rotL counter-clockwise) from the player POV", () => {
    // Three.js positive Z rotation is counter-clockwise from camera at +Z.
    // So "rotate right" (rotR) must render as a NEGATIVE z-angle,
    // and "rotate left" (rotL) as a POSITIVE z-angle.
    const wrap = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const rotRz = wrap(stateToEuler(applyMove(0, "rotR")).z);
    const rotLz = wrap(stateToEuler(applyMove(0, "rotL")).z);
    // rotR: clockwise => wrapped angle ~270° (i.e. -90° + 360°)
    expect(rotRz).toBeCloseTo((3 * Math.PI) / 2, 5);
    // rotL: counter-clockwise => wrapped angle ~90°
    expect(rotLz).toBeCloseTo(Math.PI / 2, 5);

    // Four rotR steps = full turn -> identity
    const q0 = eulerToQuat(stateToEuler(0));
    const q4 = eulerToQuat(
      stateToEuler(
        applyMove(applyMove(applyMove(applyMove(0, "rotR"), "rotR"), "rotR"), "rotR")
      )
    );
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
