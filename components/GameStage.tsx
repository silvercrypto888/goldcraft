"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Glyph3D, { type GlyphTone } from "./Glyph3D";
import type { GroupOrder } from "@/lib/orient";

function FloatingGlyph({
  position,
  state,
  tone,
  points,
  order,
  scale = 1,
  animate = true,
}: {
  position: [number, number, number];
  state: number;
  tone: GlyphTone;
  points: [number, number][];
  order: GroupOrder;
  scale?: number;
  animate?: boolean;
}) {
  const ref = useRef<THREE.Group>(null!);
  const baseY = position[1];
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = baseY + Math.sin(t * 1.4 + position[0]) * 0.1;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      <Glyph3D state={state} tone={tone} points={points} order={order} size={1} animate={animate} />
    </group>
  );
}

export default function GameStage({
  currentState,
  goldenState,
  explosiveStates,
  points,
  order,
}: {
  currentState: number;
  goldenState: number;
  explosiveStates: number[];
  points: [number, number][];
  order: GroupOrder;
}) {
  const ZONE_X = 6.6;
  const PLAYER_SCALE = 1.15;
  const SIDE_SCALE = 1.0;
  const EXPLO_SPACING = 2.3;

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 15], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[6, 5, 6]} intensity={40} color="#7fd4ff" />
      <pointLight position={[-6, 3, 4]} intensity={28} color="#f5a623" />
      <pointLight position={[0, -3, 5]} intensity={18} color="#ffffff" />

      <Stars />

      <FloatingGlyph position={[-ZONE_X, 0, 0]} state={goldenState} tone="gold" points={points} order={order} scale={SIDE_SCALE} animate={false} />
      <FloatingGlyph position={[0, 0, 0.4]} state={currentState} tone="player" points={points} order={order} scale={PLAYER_SCALE} animate />

      {explosiveStates.map((s, i) => {
        const y = (i - 1) * EXPLO_SPACING;
        return (
          <FloatingGlyph key={i} position={[ZONE_X, y, 0]} state={s} tone="danger" points={points} order={order} scale={SIDE_SCALE} animate={false} />
        );
      })}

      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
    </Canvas>
  );
}

function Stars() {
  const ref = useRef<THREE.Points>(null!);
  const positions = useRef(new Float32Array(0));
  const { viewport } = useThree();
  useEffect(() => {
    const count = 220;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * viewport.width * 2;
      arr[i * 3 + 1] = (Math.random() - 0.5) * viewport.height * 2;
      arr[i * 3 + 2] = -2 - Math.random() * 3;
    }
    positions.current = arr;
  }, [viewport]);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z += 0.0004;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} count={positions.current.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#7fa0ff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}
