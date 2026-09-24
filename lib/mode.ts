// Shared "game mode" config so the UI (Game / Glyph3D / GameStage) and the
// math (d8 / d12) stay in lockstep. This is the single source of truth for
// what a "mode" means to each layer.

import * as d8 from "./d8";
import * as d12 from "./d12";
import type { GroupOrder } from "./orient";

export type Mode = "normal" | "hard";

export interface ModeCfg<N extends number, M extends string> {
  key: Mode;
  label: string;
  tagline: string;
  order: GroupOrder; // 4 (D8) or 6 (D12)
  numStates: number;
  numExplosives: number;
  // per-mode minimum guaranteed solution length
  minMoves: number;
  // the math module for this mode
  applyMove: (k: number, m: any) => number;
  nextStates: (k: number) => number[];
  generateLevel: (id: number) => any;
  pathToMoves: (path: number[]) => any[];
  isExplosive: (s: number, ex: number[]) => boolean;
  // the glyph point set (chiral for both, but D12 needs its own D12-chiral G)
  glyphPoints: [number, number][];
  // the moves in display order (buttons)
  moveOrder: M[];
}

export const NORMAL_MODE: ModeCfg<number, "rotL" | "rotR" | "reflectH"> = {
  key: "normal",
  label: "Normal",
  tagline: "D₈ · 3 ops",
  order: 4,
  numStates: 8,
  numExplosives: 3,
  minMoves: 3,
  applyMove: d8.applyMove,
  nextStates: d8.nextStates,
  generateLevel: (id) => d8.generateLevel(id, d8.MIN_MOVES_DEFAULT),
  pathToMoves: d8.pathToMoves,
  isExplosive: d8.isExplosive,
  glyphPoints: d8.BASE_POINTS,
  moveOrder: ["rotL", "rotR", "reflectH"],
};

export const HARD_MODE: ModeCfg<number, "rotL" | "rotR" | "reflectV" | "reflectH"> = {
  key: "hard",
  label: "Hard",
  tagline: "D₁₂ · 4 ops",
  order: 6,
  numStates: 12,
  numExplosives: 4,
  minMoves: 4,
  applyMove: d12.applyMove,
  nextStates: d12.nextStates,
  generateLevel: (id) => d12.generateLevel(id, d12.MIN_MOVES_HARD),
  pathToMoves: d12.pathToMoves,
  isExplosive: d12.isExplosive,
  glyphPoints: d12.BASE_POINTS,
  moveOrder: ["rotL", "rotR", "reflectV", "reflectH"],
};

export const MODES: ModeCfg<any, any>[] = [NORMAL_MODE, HARD_MODE];

export function getMode(mode: Mode): ModeCfg<any, any> {
  return mode === "hard" ? HARD_MODE : NORMAL_MODE;
}

/** Move display metadata shared by both modes. */
export interface MoveMeta {
  id: string;
  label: string;
  key: string;
  icon: string;
  hint: string;
}

// Order matters: rotL / rotR / (reflectV) / reflectH
export const MOVE_META: Record<string, MoveMeta> = {
  rotL: { id: "rotL", label: "Rotate Left", key: "Q / ← / 1", icon: "⟲", hint: "rotate left" },
  rotR: { id: "rotR", label: "Rotate Right", key: "E / → / 3", icon: "⟳", hint: "rotate right" },
  reflectV: { id: "reflectV", label: "Reflect ↕", key: "A / ↑ / 2", icon: "⇋", hint: "mirror left↔right" },
  reflectH: { id: "reflectH", label: "Reflect ↔", key: "W / Space / 4", icon: "⇌", hint: "mirror top↔bottom" },
};

export const MODE_BEST_KEY = (mode: Mode) => `goldcraft_best_${mode}`;
