// Map a D8 state index (0..7) to a 3D orientation for the glyph tile.
//
// Canonical ordering (see lib/d8.ts): [I, R, R2, R3, S, SR, SR2, SR3]
//   rotation part   a = k % 4   (quarter turns about Z)
//   reflection part b = floor(k/4)   (0 = none, 1 = horizontal reflection)
//
// The glyph is a flat tile facing the camera. The group action is:
//   - rotR / rotL : in-plane rotation around the Z axis (90° steps)
//   - reflectH    : flip the tile over around the Y axis (left/right swap)
//
// Because lib/d8::applyMove computes next-state indices using the SAME
// canonical ordering, rendering `state` with this orientation is always
// visually consistent with the game logic.
import * as THREE from "three";

export type EulerVec = { x: number; y: number; z: number };

export function stateToEuler(k: number): EulerVec {
  const a = k % 4; // quarter turns (rotation part)
  const b = Math.floor(k / 4); // 0..1 reflections
  // NOTE on sign: in Three.js a POSITIVE rotation.z spins COUNTER-CLOCKWISE
  // as seen from the camera at +Z. The game's "rotR" must appear CLOCKWISE,
  // and a larger state index `a` means "more rotR applied" — so we NEGATE the
  // angle to make the displayed spin match the button labels (left/right).
  return {
    x: 0,
    y: b * Math.PI,
    z: -a * (Math.PI / 2),
  };
}

export function eulerToQuat(e: EulerVec): THREE.Quaternion {
  const q = new THREE.Quaternion();
  // order YXZ: apply yaw (Y) then... we want Z after Y. Use explicit compose:
  q.setFromEuler(new THREE.Euler(e.x, e.y, e.z, "YXZ"));
  return q;
}

/** Convert a state to a THREE.Quaternion (helper for three.js callers). */
export function stateToQuat(k: number): THREE.Quaternion {
  return eulerToQuat(stateToEuler(k));
}
