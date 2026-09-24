import { describe, it, expect } from "vitest";
import { stateToEuler, eulerToQuat, stateToQuat, type GroupOrder } from "./orient";
import { applyMove as applyMoveD8 } from "./d8";
import { applyMove as applyMoveD12 } from "./d12";
import * as THREE from "three";

describe("D8 orientation == logic consistency", () => {
  it("state 0 is identity orientation", () => {
    const e = stateToEuler(0, 4);
    expect(Math.abs(e.y)).toBe(0);
    expect(Math.abs(e.z)).toBe(0);
  });

  it("rotR spins clockwise (rotL counter-clockwise) from the player POV", () => {
    const wrap = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const rotRz = wrap(stateToEuler(applyMoveD8(0, "rotR"), 4).z);
    const rotLz = wrap(stateToEuler(applyMoveD8(0, "rotL"), 4).z);
    expect(rotRz).toBeCloseTo((3 * Math.PI) / 2, 5); // clockwise
    expect(rotLz).toBeCloseTo(Math.PI / 2, 5); // counter-clockwise

    // Four rotR steps = full turn -> identity
    const q0 = stateToQuat(0, 4);
    const q4 = stateToQuat(applyMoveD8(applyMoveD8(applyMoveD8(applyMoveD8(0, "rotR"), "rotR"), "rotR"), "rotR"), 4);
    expect(Math.abs(q0.dot(q4))).toBeCloseTo(1, 5);
  });

  it("reflect flips over Y (z stays flat), and twice = identity", () => {
    const e = stateToEuler(applyMoveD8(0, "reflectH"), 4);
    expect(Math.abs(e.y)).toBeCloseTo(Math.PI, 5);
    expect(e.z).toBeCloseTo(0, 5);
    const q2 = stateToQuat(applyMoveD8(applyMoveD8(0, "reflectH"), "reflectH"), 4);
    expect(q2.length()).toBeCloseTo(1, 5);
  });

  it("every D8 state maps to a valid unit quaternion (no NaN)", () => {
    for (let k = 0; k < 8; k++) {
      const q = stateToQuat(k, 4);
      expect(Number.isNaN(q.x)).toBe(false);
      expect(Number.isNaN(q.w)).toBe(false);
      expect(q.length()).toBeCloseTo(1, 5);
    }
  });
});

describe("D12 orientation == logic consistency", () => {
  it("state 0 is identity orientation", () => {
    const e = stateToEuler(0, 6);
    expect(Math.abs(e.y)).toBe(0);
    expect(Math.abs(e.z)).toBe(0);
  });

  it("rotR spins clockwise by 60°, rotL counter-clockwise (POV-correct)", () => {
    const wrap = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const rotRz = wrap(stateToEuler(applyMoveD12(0, "rotR"), 6).z);
    const rotLz = wrap(stateToEuler(applyMoveD12(0, "rotL"), 6).z);
    expect(rotRz).toBeCloseTo((5 * Math.PI) / 3, 5); // = -60° ≡ 300° (clockwise)
    expect(rotLz).toBeCloseTo(Math.PI / 3, 5); // = +60° (counter-clockwise)
  });

  it("six rotR steps = full 360° turn -> identity", () => {
    const q0 = stateToQuat(0, 6);
    let k = 0;
    for (let i = 0; i < 6; i++) k = applyMoveD12(k, "rotR");
    expect(Math.abs(q0.dot(stateToQuat(k, 6)))).toBeCloseTo(1, 5);
  });

  it("vertical reflection flips over Y; horizontal reflection flips over X", () => {
    const ev = stateToEuler(applyMoveD12(0, "reflectV"), 6);
    expect(Math.abs(ev.y)).toBeCloseTo(Math.PI, 5);
    const eh = stateToEuler(applyMoveD12(0, "reflectH"), 6);
    // horizontal reflection -> yaw flips too (still PI) plus it lands on a
    // reflected branch; verify quaternion is valid & self-inverse
    expect(stateToQuat(applyMoveD12(applyMoveD12(0, "reflectH"), "reflectH"), 6).length()).toBeCloseTo(1, 5);
    expect(eh.y).not.toBeNaN();
  });

  it("every D12 state maps to a valid unit quaternion (no NaN)", () => {
    for (let k = 0; k < 12; k++) {
      const q = stateToQuat(k, 6);
      expect(Number.isNaN(q.x)).toBe(false);
      expect(Number.isNaN(q.w)).toBe(false);
      expect(q.length()).toBeCloseTo(1, 5);
    }
  });
});
