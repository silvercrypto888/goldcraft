// ---------------------------------------------------------------------------
// Goldcraft — D12 group (symmetries of a regular hexagon), glyph geometry,
// moves, generator & solver for HARD MODE.
//
// 12 states = 6 rotations (60° steps) + 6 reflections.
// 4 operations: Rotate Left 60° / Rotate Right 60° /
//               Vertical reflection (mirror left<->right) /
//               Horizontal reflection (mirror top<->bottom).
// 4 explosive glyphs.
//
// Uses its OWN chiral "G" glyph (see G_GRID below) because the normal-mode
// G (from ./d8) is only asymmetric under 90° steps and collapses under 60° —
// a D12-chiral shape is required for all 12 states to be visually distinct.
// Pure 2D math, fully web2. Unit-tested in lib/d12.test.ts.
// ---------------------------------------------------------------------------

export type Move = "rotL" | "rotR" | "reflectV" | "reflectH";

export const MOVES: Move[] = ["rotL", "rotR", "reflectV", "reflectH"];

// ---- Chiral G glyph geometry (4 wide x 4 tall) ----------------------------
// An asymmetric "G": notch open on the middle-right (row 2 is missing the
// rightmost cell), so it is asymmetric under all 60° rotations and reflections
// -> the full D12 action yields 12 distinct visual states.
// (col,row) cells, row 0 = top.
const G_GRID: [number, number][] = [
  // top bar
  [0, 0], [1, 0], [2, 0], [3, 0],
  // left stem
  [0, 1], [0, 2],
  // notch row (right column missing)
  [3, 2],
  // bottom bar
  [0, 3], [1, 3], [2, 3],
];

const GLYPH_W = 4;
const GLYPH_H = 4;

/** Normalized base glyph points in [-1,1]^2, centered at origin. */
export const BASE_POINTS: [number, number][] = G_GRID.map(([c, r]) => {
  const x = (c - (GLYPH_W - 1) / 2) / ((GLYPH_W - 1) / 2); // [-1,1]
  const y = -(r - (GLYPH_H - 1) / 2) / ((GLYPH_H - 1) / 2); // [-1,1], row0 top
  return [x, y];
});

// ---- 2D transforms ----------------------------------------------------------
// Column-vector convention: a point p = [x,y]^T.
// R = rotation by +60° CLOCKWISE (matches D8's R sign convention).
// V = vertical mirror (left<->right): x -> -x (reflect across the y-axis).
// H = horizontal mirror (top<->bottom): y -> -y (reflect across the x-axis).
const SQ3 = Math.sqrt(3);
type Mat = number[][]; // 2x2

const R: Mat = [
  [0.5, SQ3 / 2],
  [-SQ3 / 2, 0.5],
];
const V: Mat = [
  [-1, 0],
  [0, 1],
];
const H: Mat = [
  [1, 0],
  [0, -1],
];

/** multiply two matrices A*B */
function mul(A: Mat, B: Mat): Mat {
  return [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]],
  ];
}

/** apply a 2x2 matrix to a point [x,y] */
function apply(M: Mat, p: [number, number]): [number, number] {
  return [M[0][0] * p[0] + M[0][1] * p[1], M[1][0] * p[0] + M[1][1] * p[1]];
}

const P: Mat[] = [
  [[1, 0], [0, 1]], // R^0
  R, // R^1
  mul(R, R), // R^2
  mul(mul(R, R), R), // R^3
  mul(mul(mul(R, R), R), R), // R^4
  mul(mul(mul(mul(R, R), R), R), R), // R^5
];

// The 12 state matrices of D12, canonical ordering:
//   k in 0..5   : pure rotations R^k      (b=0)
//   k in 6..11  : reflections R^(k-6) · V (b=1)
// So a = k % 6, b = floor(k/6), M_k = P[a] · V^b.
const STATE_MATS: Mat[] = [];
for (let k = 0; k < 12; k++) {
  const a = k % 6;
  const b = Math.floor(k / 6);
  STATE_MATS.push(b === 0 ? P[a] : mul(P[a], V));
}

// Move transform matrices (apply-move = left-multiply current matrix).
const MOVE_MATS: Record<Move, Mat> = {
  rotR: R, // 60° clockwise
  rotL: P[5], // R^-1 = R^5 : 60° counter-clockwise
  reflectV: V, // mirror left<->right
  reflectH: H, // mirror top<->bottom
};

/** Canonical points for each of the 12 D12 states. */
const CANON_POINTS: [number, number][][] = STATE_MATS.map((M) =>
  BASE_POINTS.map((p) => apply(M, p))
);

function pointsEqual(a: [number, number][], b: [number, number][]): boolean {
  if (a.length !== b.length) return false;
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
 * Apply a move to a state index, returning the new state index (0..11).
 * new = MOVE · STATE[k], canonicalized back to an index.
 */
export function applyMove(k: number, move: Move): number {
  const newM = mul(MOVE_MATS[move], STATE_MATS[k]);
  const newPts = BASE_POINTS.map((p) => apply(newM, p));
  for (let i = 0; i < 12; i++) {
    if (pointsEqual(newPts, CANON_POINTS[i])) return i;
  }
  return k; // unreachable (D12 is closed under these moves)
}

/** All distinct next states reachable in one move. */
export function nextStates(k: number): number[] {
  return MOVES.map((m) => applyMove(k, m));
}

// ---------------------------------------------------------------------------
// Level generation — same guarantees as D8, but 4 explosives & 12 states.
// ---------------------------------------------------------------------------
export interface Level {
  id: number;
  start: number;
  golden: number;
  explosives: number[]; // 4 distinct states
  minMoves: number;
  optimalPath: number[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shortestPath(start: number, goal: number, banned: Set<number>): number[] | null {
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

export const MIN_MOVES_HARD = 4; // hard mode demands a longer solution

/**
 * Generate a valid, winnable hard-mode level.
 * Guarantees:
 *  1. start != golden
 *  2. golden not reachable in 0 or 1 moves
 *  3. at least one safe first move (not all 4 are explosive)
 *  4. winnable (safe path avoiding explosives) — via BFS
 *  5. 4 distinct explosives, none equal start or golden
 *  6. shortest solution length >= minMoves
 */
export function generateLevel(id: number, minMoves = MIN_MOVES_HARD): Level {
  for (let attempt = 0; attempt < 8000; attempt++) {
    const start = Math.floor(Math.random() * 12);
    let golden = Math.floor(Math.random() * 12);
    while (golden === start) golden = Math.floor(Math.random() * 12);
    if (new Set(nextStates(start)).has(golden)) continue; // not winnable in 1 move

    const candidates = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((s) => s !== start && s !== golden));
    if (candidates.length < 4) continue;
    const explosives = candidates.slice(0, 4);
    const banned = new Set(explosives);
    if (nextStates(start).every((s) => banned.has(s))) continue; // >=1 safe first move

    const path = shortestPath(start, golden, banned);
    if (!path) continue;
    if (path.length - 1 < minMoves) continue;

    return { id, start, golden, explosives, minMoves: path.length - 1, optimalPath: path };
  }
  throw new Error("goldcraft: failed to generate a valid D12 level in 8000 attempts");
}

/** Human-readable solution path (string of moves). */
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
