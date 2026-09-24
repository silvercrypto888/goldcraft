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
    ref.current.position.y = baseY + Math.sin(t * 1.4 + position[0]) * 0.12;
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
  // Layout (screen coords, y up):
  //   golden glyph — LEFT, static
  //   player glyph  — CENTER
  //   explosives    — RIGHT
  // 3 explosives stack vertically so all three are readable side-by-side.
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 10], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[4, 5, 6]} intensity={40} color="#7fd4ff" />
      <pointLight position={[-5, 3, 4]} intensity={28} color="#f5a623" />
      <pointLight position={[0, -3, 5]} intensity={18} color="#ffffff" />

      <Stars />

      {/* Golden glyph — LEFT, static (no spin, not animated) */}
      <FloatingGlyph position={[-3.4, 0, 0]} state={goldenState} tone="gold" scale={1.1} animate={false} />

      {/* Player glyph — CENTER, bigger, animated */}
      <FloatingGlyph position={[0, 0, 0.4]} state={currentState} tone="player" scale={1.6} animate />

      {/* Explosives — RIGHT, vertical stack, all static */}
      {explosiveStates.map((s, i) => {
        const y = (i - 1) * 1.7;
        return (
          <FloatingGlyph key={i} position={[3.4, y, 0]} state={s} tone="danger" scale={0.9} animate={false} />
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
