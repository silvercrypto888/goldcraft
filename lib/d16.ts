// ---------------------------------------------------------------------------
// Goldcraft — D16 group (symmetries of a regular octagon), glyph geometry,
// moves, generator & solver for EXTREME MODE.
//
// 16 states = 8 rotations (45° steps) + 8 reflections.
// 4 operations: Rotate Left 45° / Rotate Right 45° /
//               Vertical reflection (mirror left<->right) /
//               Horizontal reflection (mirror top<->bottom).
// 4 explosive glyphs.
//
// Uses its OWN chiral glyph — a 6-wide × 5-tall asymmetric shape with
// two notches (one on the right, one on the top) so no reflection or
// 45° rotation accidentally lands on the same point set.
// Pure 2D math, fully web2. Unit-tested in lib/d16.test.ts.
// ---------------------------------------------------------------------------

export type Move = "rotL" | "rotR" | "reflectV" | "reflectH";

export const MOVES: Move[] = ["rotL", "rotR", "reflectV", "reflectH"];

// ---- Chiral G glyph geometry (6 wide x 5 tall) ----------------------------
// An asymmetric "G" with TWO notches:
//   - right side: row 2 is missing the rightmost cell (notch 1)
//   - top side:    col 3 is missing the top cell (notch 2)
// The double notch breaks any accidental 45° or reflection symmetry.
// (col,row) cells, row 0 = top.
const G_GRID: [number, number][] = [
  // top bar (notch at col 3 — missing [3,0])
  [0, 0], [1, 0], [2, 0], /* gap */ [4, 0], [5, 0],
  // left stem (cols 0-1)
  [0, 1], [1, 1],
  [0, 2], [1, 2],
  // right column (only row 1, not row 2 — notch 1)
  [5, 1],
  // bottom bar
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],
  // bottom-left corner extension (breaks symmetry further)
  [0, 4], [1, 4],
];

const GLYPH_W = 6;
const GLYPH_H = 5;

/** Normalized base glyph points in [-1,1]^2, centered at origin. */
export const BASE_POINTS: [number, number][] = G_GRID.map(([c, r]) => {
  const x = (c - (GLYPH_W - 1) / 2) / ((GLYPH_W - 1) / 2); // [-1,1]
  const y = -(r - (GLYPH_H - 1) / 2) / ((GLYPH_H - 1) / 2); // [-1,1], row0 top
  return [x, y];
});

// ---- 2D transforms ----------------------------------------------------------
// Column-vector convention: a point p = [x,y]^T.
// R = rotation by +45° CLOCKWISE (matches D8/D12 sign convention).
// V = vertical mirror (left<->right): x -> -x (reflect across the y-axis).
// H = horizontal mirror (top<->bottom): y -> -y (reflect across the x-axis).
const SQ2 = Math.sqrt(2);
type Mat = number[][]; // 2x2

const R: Mat = [
  [SQ2 / 2, SQ2 / 2],
  [-SQ2 / 2, SQ2 / 2],
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

// Pre-compute rotation powers R^0 .. R^7
const P: Mat[] = (() => {
  const mats: Mat[] = [];
  let cur: Mat = [[1, 0], [0, 1]]; // R^0 = I
  for (let i = 0; i < 8; i++) {
    mats.push(cur);
    if (i < 7) cur = mul(R, cur);
  }
  return mats;
})();

// The 16 state matrices of D16, canonical ordering:
//   k in 0..7   : pure rotations R^k      (b=0)
//   k in 8..15  : reflections R^(k-8) · V (b=1)
// So a = k % 8, b = floor(k/8), M_k = P[a] · V^b.
const STATE_MATS: Mat[] = [];
for (let k = 0; k < 16; k++) {
  const a = k % 8;
  const b = Math.floor(k / 8);
  STATE_MATS.push(b === 0 ? P[a] : mul(P[a], V));
}

// Move transform matrices (apply-move = left-multiply current matrix).
const MOVE_MATS: Record<Move, Mat> = {
  rotR: R,           // 45° clockwise
  rotL: P[7],        // R^-1 = R^7 : 45° counter-clockwise
  reflectV: V,        // mirror left<->right
  reflectH: H,       // mirror top<->bottom
};

/** Canonical points for each of the 16 D16 states. */
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
 * Apply a move to a state index, returning the new state index (0..15).
 * new = MOVE · STATE[k], canonicalized back to an index.
 */
export function applyMove(k: number, move: Move): number {
  const newM = mul(MOVE_MATS[move], STATE_MATS[k]);
  const newPts = BASE_POINTS.map((p) => apply(newM, p));
  for (let i = 0; i < 16; i++) {
    if (pointsEqual(newPts, CANON_POINTS[i])) return i;
  }
  return k; // unreachable (D16 is closed under these moves)
}

/** All distinct next states reachable in one move. */
export function nextStates(k: number): number[] {
  return MOVES.map((m) => applyMove(k, m));
}

// ---------------------------------------------------------------------------
// Level generation — same guarantees as D8/D12, but 4 explosives & 16 states.
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

export const MIN_MOVES_EXTREME = 5; // extreme mode demands a longer solution

/**
 * Generate a valid, winnable extreme-mode level.
 * Guarantees:
 *  1. start != golden
 *  2. golden not reachable in 0 or 1 moves
 *  3. at least one safe first move (not all 4 are explosive)
 *  4. winnable (safe path avoiding explosives) — via BFS
 *  5. 4 distinct explosives, none equal start or golden
 *  6. shortest solution length >= minMoves
 */
export function generateLevel(id: number, minMoves = MIN_MOVES_EXTREME): Level {
  for (let attempt = 0; attempt < 12000; attempt++) {
    const start = Math.floor(Math.random() * 16);
    let golden = Math.floor(Math.random() * 16);
    while (golden === start) golden = Math.floor(Math.random() * 16);
    if (new Set(nextStates(start)).has(golden)) continue; // not winnable in 1 move

    const candidates = shuffle(
      Array.from({ length: 16 }, (_, i) => i).filter((s) => s !== start && s !== golden)
    );
    if (candidates.length < 4) continue;
    const explosives = candidates.slice(0, 4);
    const banned = new Set(explosives);
    if (nextStates(start).every((s) => banned.has(s))) continue; // >=1 safe first move

    const path = shortestPath(start, golden, banned);
    if (!path) continue;
    if (path.length - 1 < minMoves) continue;

    return { id, start, golden, explosives, minMoves: path.length - 1, optimalPath: path };
  }
  throw new Error("goldcraft: failed to generate a valid D16 level in 12000 attempts");
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
