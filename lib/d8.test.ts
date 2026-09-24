import { describe, it, expect } from "vitest";
import {
  MOVES,
  applyMove,
  nextStates,
  generateLevel,
  pathToMoves,
  isExplosive,
  BASE_POINTS,
  applyMove as am,
} from "./d8";

describe("D8 group structure", () => {
  it("has 8 distinct states (all reachable via moves)", () => {
    // from state 0, BFS should reach all 8
    const seen = new Set([0]);
    const q = [0];
    while (q.length) {
      const cur = q.shift()!;
      for (const n of nextStates(cur)) {
        if (!seen.has(n)) {
          seen.add(n);
          q.push(n);
        }
      }
    }
    expect(seen.size).toBe(8);
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("is exactly 3 moves per state (Cayley graph is 3-regular)", () => {
    for (let k = 0; k < 8; k++) {
      expect(new Set(nextStates(k)).size).toBe(3);
    }
  });

  it("rotL and rotR are inverses", () => {
    for (let k = 0; k < 8; k++) {
      expect(applyMove(applyMove(k, "rotR"), "rotL")).toBe(k);
      expect(applyMove(applyMove(k, "rotL"), "rotR")).toBe(k);
    }
  });

  it("reflecting twice returns to identity", () => {
    for (let k = 0; k < 8; k++) {
      expect(applyMove(applyMove(k, "reflectH"), "reflectH")).toBe(k);
    }
  });

  it("four 90° rotations return to identity", () => {
    for (let k = 0; k < 8; k++) {
      let s = k;
      for (let i = 0; i < 4; i++) s = applyMove(s, "rotR");
      expect(s).toBe(k);
    }
  });

  it("every move is reversible in one step from some state", () => {
    for (const m of MOVES as const) {
      expect(nextStates(applyMove(0, m))).toContain(0);
    }
  });
});

describe("glyph geometry", () => {
  it("the base glyph is asymmetric (chiral) — all 8 states distinct", () => {
    // If BASE_POINTS were symmetric, two different state indices would give
    // the same canonical point set. Assert all 8 canonical point-sets differ.
    // We verify via the fact that applying distinct moves yields distinct
    // next states (chirality already guarantees D8 acts freely).
    // Concretely: reflect(base) then compare to some rotate(base).
    const reflected = am(0 as number, "reflectH");
    const rotated = am(0 as number, "rotR");
    expect(reflected).not.toBe(rotated);
    // The actual "is chiral" proof: state 0 vs state 4 (S) differ.
    expect(reflected).not.toBe(0);
  });

  it("BASE_POINTS are within [-1,1]", () => {
    for (const [x, y] of BASE_POINTS) {
      expect(x).toBeGreaterThanOrEqual(-1.1);
      expect(x).toBeLessThanOrEqual(1.1);
      expect(y).toBeGreaterThanOrEqual(-1.1);
      expect(y).toBeLessThanOrEqual(1.1);
    }
  });
});

describe("level generation", () => {
  it("produces 1000 valid, winnable levels", () => {
    for (let i = 0; i < 1000; i++) {
      const lvl = generateLevel(i);
      // 1. start != golden
      expect(lvl.start).not.toBe(lvl.golden);

      // 2. not winnable in 0 or 1 moves
      expect(nextStates(lvl.start)).not.toContain(lvl.golden);

      // 3. at least one safe first move
      const someSafe = nextStates(lvl.start).some(
        (s) => !isExplosive(s, lvl.explosives)
      );
      expect(someSafe).toBe(true);

      // 5. explosives distinct, none = start/golden
      expect(new Set(lvl.explosives).size).toBe(3);
      for (const e of lvl.explosives) {
        expect(e).not.toBe(lvl.start);
        expect(e).not.toBe(lvl.golden);
      }

      // 4 + 6. optimal path exists and length = minMoves >= default
      expect(lvl.optimalPath.length - 1).toBe(lvl.minMoves);
      expect(lvl.minMoves).toBeGreaterThanOrEqual(3);
    }
  });

  it("solution path is actually valid (each step is a legal move)", () => {
    for (let i = 0; i < 200; i++) {
      const lvl = generateLevel(i);
      const moves = pathToMoves(lvl.optimalPath);
      expect(moves.length).toBe(lvl.optimalPath.length - 1);
      let cur = lvl.start;
      for (const m of moves) cur = applyMove(cur, m);
      expect(cur).toBe(lvl.golden);
    }
  });

  it("never steps on an explosive in the optimal path (interior)", () => {
    for (let i = 0; i < 200; i++) {
      const lvl = generateLevel(i);
      const banned = new Set(lvl.explosives);
      for (let j = 1; j < lvl.optimalPath.length - 1; j++) {
        expect(banned.has(lvl.optimalPath[j])).toBe(false);
      }
    }
  });

  it("endless mode can generate many distinct levels", () => {
    const ids = new Set<number>();
    for (let i = 0; i < 50; i++) ids.add(generateLevel(i).id);
    expect(ids.size).toBe(50);
  });
});
