"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Glyph3D, { type GlyphTone } from "./Glyph3D";

// A single floating glyph that gently bobs (and for the player, eases toward
// a target orientation when the state changes).
function FloatingGlyph({
  position,
  state,
  tone,
  scale = 1,
  animate = true,
}: {
  position: [number, number, number];
  state: number;
  tone: GlyphTone;
  scale?: number;
  animate?: boolean;
}) {
  const ref = useRef<THREE.Group>(null!);
  const baseY = position[1];

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    // Gentle bob only — no spin.
    ref.current.position.y = baseY + Math.sin(t * 1.4 + position[0]) * 0.1;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <Glyph3D state={state} tone={tone} size={1} animate={animate} />
    </group>
  );
}

export default function GameStage({
  currentState,
  goldenState,
  explosiveStates,
}: {
  currentState: number;
  goldenState: number;
  explosiveStates: number[];
}) {
  // Layout (screen coords, y up), with generous spacing between zones:
  //   golden glyph — FAR LEFT, static
  //   player glyph  — CENTER
  //   explosives    — FAR RIGHT, vertical stack with clear gaps
  // The G is ~3.6 world-units wide, so zones sit well outside each other.
  const ZONE_X = 6.6; // how far left/right the side glyphs sit from center
  const PLAYER_SCALE = 1.15;
  const SIDE_SCALE = 1.0;
  const EXPLO_SPACING = 2.3; // vertical gap between the 3 explosives

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

      {/* Golden glyph — FAR LEFT, static (no spin, not animated) */}
      <FloatingGlyph position={[-ZONE_X, 0, 0]} state={goldenState} tone="gold" scale={SIDE_SCALE} animate={false} />

      {/* Player glyph — CENTER, animated */}
      <FloatingGlyph position={[0, 0, 0.4]} state={currentState} tone="player" scale={PLAYER_SCALE} animate />

      {/* Explosives — FAR RIGHT, vertical stack with clear gaps */}
      {explosiveStates.map((s, i) => {
        const y = (i - 1) * EXPLO_SPACING;
        return (
          <FloatingGlyph key={i} position={[ZONE_X, y, 0]} state={s} tone="danger" scale={SIDE_SCALE} animate={false} />
        );
      })}

      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
    </Canvas>
  );
}

// Cheap static starfield.
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
        <bufferAttribute
          attach="attributes-position"
          args={[positions.current, 3]}
          count={positions.current.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#7fa0ff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}
