import { describe, it, expect } from "vitest";
import {
  MOVES,
  applyMove,
  nextStates,
  generateLevel,
  pathToMoves,
  isExplosive,
} from "./d12";

describe("D12 group structure", () => {
  it("has exactly 12 distinct states, all reachable from 0", () => {
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
    expect(seen.size).toBe(12);
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("is 4 moves per state (Cayley graph is 4-regular)", () => {
    for (let k = 0; k < 12; k++) {
      expect(new Set(nextStates(k)).size).toBe(4);
    }
  });

  it("rotL and rotR are inverse (60° steps)", () => {
    for (let k = 0; k < 12; k++) {
      expect(applyMove(applyMove(k, "rotR"), "rotL")).toBe(k);
      expect(applyMove(applyMove(k, "rotL"), "rotR")).toBe(k);
    }
  });

  it("six 60° rotations return to identity", () => {
    for (let k = 0; k < 12; k++) {
      let s = k;
      for (let i = 0; i < 6; i++) s = applyMove(s, "rotR");
      expect(s).toBe(k);
    }
  });

  it("vertical and horizontal reflections are self-inverse", () => {
    for (let k = 0; k < 12; k++) {
      expect(applyMove(applyMove(k, "reflectV"), "reflectV")).toBe(k);
      expect(applyMove(applyMove(k, "reflectH"), "reflectH")).toBe(k);
    }
  });

  it("rotation then reflection stays inside D12", () => {
    for (let k = 0; k < 12; k++) {
      const mix = applyMove(applyMove(applyMove(k, "rotR"), "reflectV"), "rotL");
      expect(mix).toBeGreaterThanOrEqual(0);
      expect(mix).toBeLessThan(12);
    }
  });
});

describe("level generation (hard mode)", () => {
  it("produces 500 valid, winnable levels", () => {
    for (let i = 0; i < 500; i++) {
      const lvl = generateLevel(i);
      expect(lvl.start).not.toBe(lvl.golden);
      expect(nextStates(lvl.start)).not.toContain(lvl.golden);
      // at least one safe first move
      expect(
        nextStates(lvl.start).some((s) => !isExplosive(s, lvl.explosives))
      ).toBe(true);
      // 4 distinct explosives, none = start/golden
      expect(new Set(lvl.explosives).size).toBe(4);
      for (const e of lvl.explosives) {
        expect(e).not.toBe(lvl.start);
        expect(e).not.toBe(lvl.golden);
      }
      // optimal path valid & >= MIN_MOVES_HARD
      expect(lvl.optimalPath.length - 1).toBe(lvl.minMoves);
      expect(lvl.minMoves).toBeGreaterThanOrEqual(4);
    }
  });

  it("solution path is actually valid", () => {
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
});
