"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { stateToQuat, type GroupOrder } from "@/lib/orient";

export type GlyphTone = "player" | "gold" | "danger";

interface ToneCfg {
  body: string;
  emissive: string;
  glow: string;
}

const TONES: Record<GlyphTone, ToneCfg> = {
  player: { body: "#3d8bff", emissive: "#1f6fff", glow: "#7fd4ff" },
  gold: { body: "#f5a623", emissive: "#d97b0c", glow: "#ffe3a3" },
  danger: { body: "#e63a25", emissive: "#b3180f", glow: "#ff6b5e" },
};

interface Glyph3DProps {
  state: number;
  tone: GlyphTone;
  /** base glyph points in [-1,1]^2 — passed in per mode so each mode uses its own chiral shape */
  points: [number, number][];
  /** group order (4=D8, 6=D12) driving orientation */
  order: GroupOrder;
  size?: number;
  animate?: boolean; // smooth-rotate toward state (player) vs static snap
}

export default function Glyph3D({
  state,
  tone,
  points,
  order,
  size = 1,
  animate = true,
}: Glyph3DProps) {
  const group = useRef<THREE.Group>(null!);
  const target = useRef(new THREE.Quaternion());
  const toneCfg = TONES[tone];

  const cellSize = 0.55;
  const cellDepth = 0.4;
  const spacing = 0.72;

  const cells = useMemo(
    () =>
      points.map(([x, y]) => ({
        pos: [x * spacing, y * spacing, 0] as [number, number, number],
      })),
    [points, spacing]
  );

  useEffect(() => {
    target.current.copy(stateToQuat(state, order));
    if (!animate) {
      group.current?.quaternion.copy(target.current);
    }
  }, [state, order, animate]);

  useFrame((_, delta) => {
    if (!animate || !group.current) return;
    group.current.quaternion.slerp(target.current, Math.min(1, delta * 7));
  });

  return (
    <group ref={group} scale={size}>
      {cells.map((c, i) => (
        <mesh key={i} position={c.pos}>
          <boxGeometry args={[cellSize, cellSize, cellDepth]} />
          <meshStandardMaterial
            color={toneCfg.body}
            emissive={toneCfg.emissive}
            emissiveIntensity={0.9}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}
