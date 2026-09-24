// ---------------------------------------------------------------------------
// Goldcraft — D8 group, glyph geometry, moves, generator & solver.
// Pure 2D math, fully web2 (no web3). Unit-tested.
// ---------------------------------------------------------------------------

export type Move = "rotL" | "rotR" | "reflectH";

export const MOVES: Move[] = ["rotL", "rotR", "reflectH"];

// ---- 2D transforms ----------------------------------------------------------
// R = rotate 90° clockwise; S = reflect horizontally (across vertical y-axis).
// A point p is a column vector [x, y]^T.
type Mat = number[][]; // 2x2

const R: Mat = [
  [0, 1],
  [-1, 0],
];
const S: Mat = [
  [-1, 0],
  [0, 1],
];
const I: Mat = [
  [1, 0],
  [0, 1],
];

/** multiply two matrices A*B */
function mul(A: Mat, B: Mat): Mat {
  return [
    [
      A[0][0] * B[0][0] + A[0][1] * B[1][0],
      A[0][0] * B[0][1] + A[0][1] * B[1][1],
    ],
    [
      A[1][0] * B[0][0] + A[1][1] * B[1][0],
      A[1][0] * B[0][1] + A[1][1] * B[1][1],
    ],
  ];
}

/** apply a 2x2 matrix to a point [x,y] */
function apply(M: Mat, p: [number, number]): [number, number] {
  return [M[0][0] * p[0] + M[0][1] * p[1], M[1][0] * p[0] + M[1][1] * p[1]];
}

/** The 8 state matrices of D8 = { R^a · S^b }. Index = a*2 + b. */
const STATE_MATS: Mat[] = [
  I,
  R,
  mul(R, R),
  mul(mul(R, R), R),
  S,
  mul(S, R),
  mul(S, mul(R, R)),
  mul(S, mul(mul(R, R), R)),
];

// Move transform matrices (apply-move = left-multiply current matrix).
const MOVE_MATS: Record<Move, Mat> = {
  rotR: R, // 90° clockwise
  rotL: mul(R, mul(R, R)), // R^-1 = R^3 : 90° counter-clockwise
  reflectH: S,
};

// ---------------------------------------------------------------------------
// Glyph geometry: a chiral "G" so all 8 D8 states are visually distinct.
// (col,row) grid cells, 5 wide x 5 tall. Centered/scaled to [-1,1]^2 later.
// The notch is on the right (row 3 lacks the right column) — this asymmetry
// is what makes the glyph chiral (no reflection symmetry), so the full D8
// action yields 8 distinct visual states.
// ---------------------------------------------------------------------------
const G_GRID: [number, number][] = [
  // top bar
  [1, 0], [2, 0], [3, 0], [4, 0],
  // left stem
  [0, 1], [0, 2], [0, 3],
  // right column (upper only) — the notch
  [3, 3],
  // bottom bar
  [0, 4], [1, 4], [2, 4], [3, 4],
];

const GLYPH_W = 5;
const GLYPH_H = 5;

/** Normalized base glyph points in [-1,1]^2, centered at origin.
 *  x: right, y: up — but grid rows go "up" so map row0 -> top (+y). */
export const BASE_POINTS: [number, number][] = G_GRID.map(([c, r]) => {
  const x = (c - (GLYPH_W - 1) / 2) / ((GLYPH_W - 1) / 2); // [-1,1]
  const y = -(r - (GLYPH_H - 1) / 2) / ((GLYPH_H - 1) / 2); // [-1,1], row0 top
  return [x, y];
});

/** Canonical points for each of the 8 D8 states. */
const CANON_POINTS: [number, number][][] = STATE_MATS.map((M) =>
  BASE_POINTS.map((p) => apply(M, p))
);

function pointsEqual(a: [number, number][], b: [number, number][]): boolean {
  if (a.length !== b.length) return false;
  // Exact-coordinate match with a tight epsilon. Rounding to a coarse grid
  // collapses distinct D8 states (e.g. a reflection lands on the same rounded
  // cell as a rotation) which breaks chirality — so we compare floats exactly.
  const eps = 1e-6;
  const used = new Array(b.length).fill(false);
  outer: for (const pa of a) {
    for (let i = 0; i < b.length; i++) {
      if (used[i]) continue;
      const pb = b[i];
      if (Math.abs(pa[0] - pb[0]) < eps && Math.abs(pa[1] - pb[1]) < eps) {
        used[i] = true;
        continue outer;
      }
    }
    return false;
  }
  return true;
}

/**
 * Apply a move to a state index, returning the new state index (0..7).
 * Mathematically: new = MOVE · STATE[k], then canonicalize back to an index.
 */
export function applyMove(k: number, move: Move): number {
  const newM = mul(MOVE_MATS[move], STATE_MATS[k]);
  const newPts = BASE_POINTS.map((p) => apply(newM, p));
  for (let i = 0; i < 8; i++) {
    if (pointsEqual(newPts, CANON_POINTS[i])) return i;
  }
  // Should be unreachable (D8 is closed under these moves).
  return k;
}

/** All distinct next states reachable in one move. */
export function nextStates(k: number): number[] {
  return MOVES.map((m) => applyMove(k, m));
}

// ---------------------------------------------------------------------------
// Level generation — must satisfy all constraints.
// ---------------------------------------------------------------------------
export interface Level {
  id: number;
  start: number;
  golden: number;
  explosives: number[]; // 3 distinct states
  minMoves: number; // guaranteed shortest solution length
  optimalPath: number[]; // for verification / hints
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** BFS shortest path from start to goal avoiding banned states (inclusive). */
function shortestPath(
  start: number,
  goal: number,
  banned: Set<number>
): number[] | null {
  if (start === goal) return [start];
  if (banned.has(start) || banned.has(goal)) return null;
  const dist = new Map<number, number>([[start, 0]]);
  const prev = new Map<number, number>();
  const queue: number[] = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === goal) break;
    for (const n of nextStates(cur)) {
      if (banned.has(n) || dist.has(n)) continue;
      dist.set(n, dist.get(cur)! + 1);
      prev.set(n, cur);
      queue.push(n);
    }
  }
  if (!dist.has(goal)) return null;
  const path = [goal];
  let cur = goal;
  while (cur !== start) {
    cur = prev.get(cur)!;
    path.unshift(cur);
  }
  return path;
}

export const MIN_MOVES_DEFAULT = 3;

/**
 * Generate a valid, winnable level.
 * Guarantees:
 *  1. start != golden
 *  2. not winnable in 0 or 1 moves (golden is not reachable in <=1 step)
 *  3. not all three first moves are explosive (>=1 safe first move)
 *  4. winnable (safe path avoiding explosives exists) — enforced via BFS
 *  5. explosives distinct, none equal start or golden
 *  6. shortest solution length >= minMoves
 */
export function generateLevel(id: number, minMoves = MIN_MOVES_DEFAULT): Level {
  for (let attempt = 0; attempt < 5000; attempt++) {
    const start = Math.floor(Math.random() * 8);
    // golden not equal start
    const golden = (() => {
      let g = Math.floor(Math.random() * 8);
      while (g === start) g = Math.floor(Math.random() * 8);
      return g;
    })();
    // not winnable in 1 move: golden not adjacent to start
    const adjacent = new Set(nextStates(start));
    if (adjacent.has(golden)) continue;

    // pick 3 distinct explosives, none = start or golden
    const candidates = shuffle(
      [0, 1, 2, 3, 4, 5, 6, 7].filter((s) => s !== start && s !== golden)
    );
    if (candidates.length < 3) continue;
    const explosives = candidates.slice(0, 3);
    const banned = new Set(explosives);

    // constraint 3: at least one first move is safe
    const firstMoves = nextStates(start);
    if (firstMoves.every((s) => banned.has(s))) continue;

    // constraint 4 + 6: safe path exists and length >= minMoves
    const path = shortestPath(start, golden, banned);
    if (!path) continue;
    if (path.length - 1 < minMoves) continue;

    return { id, start, golden, explosives, minMoves: path.length - 1, optimalPath: path };
  }
  throw new Error("goldcraft: failed to generate a valid level in 5000 attempts");
}

/** Human-readable solution path (string of moves) for debugging/hints. */
export function pathToMoves(path: number[]): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const m = MOVES.find((mv) => applyMove(from, mv) === to)!;
    moves.push(m);
  }
  return moves;
}

/** Is this state one of the explosives? */
export function isExplosive(state: number, explosives: number[]): boolean {
  return explosives.includes(state);
}
