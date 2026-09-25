// Map a Dn state index to a 3D orientation for the glyph tile.
//
// Two supported groups:
//   - D8  (normal mode): order N = 4, rotations = 90° steps
//   - D12 (hard mode):   order N = 6, rotations = 60° steps
//
// Canonical ordering (see lib/d8.ts / lib/d12.ts): [I, R, R2, ..., R^(N-1),
// V, VR, VR2, ...] with
//   rotation part   a = k % N   (rotations about Z)
//   reflection part b = floor(k/N)   (0 = none, 1 = vertical reflection)
//
// The glyph is a flat tile facing the camera. The group action is:
//   - rotR / rotL : in-plane rotation around the Z axis (360/N per step)
//   - reflection  : flip the tile over around an axis in the plane
//
// Because applyMove computes next-state indices using the SAME canonical
// ordering, rendering `state` with this orientation is always visually
// consistent with the game logic.
import * as THREE from "three";

export type GroupOrder = 4 | 6 | 8; // D8 vs D12 vs D16
export type EulerVec = { x: number; y: number; z: number };

/**
 * Map a Dn state index to a 3D Euler orientation.
 * @param k      state index (0..2N-1)
 * @param order  group order (4 for D8, 6 for D12)
 *
 * NOTE on sign: in Three.js a POSITIVE rotation.z spins COUNTER-CLOCKWISE
 * as seen from the camera at +Z. The game's "rotR" must appear CLOCKWISE,
 * and a larger state index `a` means "more rotR applied" — so we NEGATE the
 * angle to make the displayed spin match the button labels (left/right).
 */
export function stateToEuler(k: number, order: GroupOrder = 4): EulerVec {
  const a = ((k % order) + order) % order; // rotations part (0..order-1)
  const b = Math.floor(k / order); // reflection part (0..1)
  return {
    x: 0,
    y: b * Math.PI,
    z: -a * ((2 * Math.PI) / order),
  };
}

export function eulerToQuat(e: EulerVec): THREE.Quaternion {
  const q = new THREE.Quaternion();
  q.setFromEuler(new THREE.Euler(e.x, e.y, e.z, "YXZ"));
  return q;
}

/** Convert a state to a THREE.Quaternion (helper for three.js callers). */
export function stateToQuat(k: number, order: GroupOrder = 4): THREE.Quaternion {
  return eulerToQuat(stateToEuler(k, order));
}
