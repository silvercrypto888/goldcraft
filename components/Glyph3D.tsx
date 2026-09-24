"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { BASE_POINTS } from "@/lib/d8";
import { stateToQuat } from "@/lib/orient";

export type GlyphTone = "player" | "gold" | "danger";

const TONES: Record<
  GlyphTone,
  { body: string; emissive: string; glow: string }
> = {
  player: {
    body: "#38b6ff",
    emissive: "#0d8fff",
    glow: "#7fd4ff",
  },
  gold: {
    body: "#f5a623",
    emissive: "#d97b0c",
    glow: "#ffe3a3",
  },
  danger: {
    body: "#e63a25",
    emissive: "#b3180f",
    glow: "#ff6b5e",
  },
};

const CELL = 0.3; // world size of each glyph cell (the tile is ~4 cells wide)
const CENTER_LIFT = 0.9; // push the floating tile away from camera a touch
const THICKNESS = 0.18; // tile depth along Z (so it reads as a solid slab)

interface Glyph3DProps {
  state: number;
  tone: GlyphTone;
  size?: number; // overall scale
  animate?: boolean; // smooth-rotate toward state (player) vs static snap (target)
}

export default function Glyph3D({
  state,
  tone,
  size = 1,
  animate = true,
}: Glyph3DProps) {
  const group = useRef<THREE.Group>(null!);
  const target = useRef(new THREE.Quaternion());
  const toneCfg = TONES[tone];

  const { body, emissive } = toneCfg;

  // Build the G-shaped set of cells once (positions on the tile face).
  const cells = useMemo(
    () =>
      BASE_POINTS.map(([x, y]) => ({
        pos: [x * 2.2, y * 2.2, 0] as [number, number, number],
      })),
    []
  );

  // Whenever `state` changes, compute the target orientation.
  useEffect(() => {
    target.current.copy(stateToQuat(state));
    if (!animate) {
      group.current?.quaternion.copy(target.current);
    }
  }, [state, animate]);

  useFrame((_, delta) => {
    if (!animate || !group.current) return;
    group.current.quaternion.slerp(target.current, Math.min(1, delta * 7));
  });

  return (
    <group ref={group} scale={size}>
      {/* The tile slab: back plate so flips read as a solid double-sided slab */}
      {cells.map((c, i) => (
        <mesh key={i} position={c.pos}>
          <boxGeometry args={[CELL, CELL, THICKNESS]} />
          <meshStandardMaterial color={body} emissive={emissive} emissiveIntensity={0.85} metalness={0.4} roughness={0.35} />
        </mesh>
      ))}
      {/* A faint backing panel to make the whole tile silhouette read when flipping */}
      <mesh position={[0, 0, -0.01 - THICKNESS / 2 - 0.02]}>
        <planeGeometry args={[4.6, 5.4]} />
        <meshBasicMaterial color={toneCfg.glow} transparent opacity={0.06} />
      </mesh>
    </group>
  );
}

// Export point data for convenience.
export { CELL };
