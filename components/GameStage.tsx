"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Glyph3D from "./Glyph3D";

// A single floating glyph that gently bobs and spins toward a target orientation.
function FloatingGlyph({
  position,
  state,
  tone,
  scale = 1,
  autoSpin = false,
}: {
  position: [number, number, number];
  state: number;
  tone: "lightBlue" | "gold" | "danger";
  scale?: number;
  autoSpin?: boolean;
}) {
  const ref = useRef<THREE.Group>(null!);
  const toneMap = {
    lightBlue: "player" as const,
    gold: "gold" as const,
    danger: "danger" as const,
  };
  const baseY = position[1];

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    // gentle float
    ref.current.position.y = baseY + Math.sin(t * 1.4 + position[0]) * 0.12;
    if (autoSpin) {
      ref.current.rotation.y += 0.003;
    }
  });

  return (
    <group
      ref={ref}
      position={position}
      scale={scale}
    >
      <Glyph3D state={state} tone={toneMap[tone]} size={scale} animate />
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
  const goldColor = "#f5a623";
  const blueColor = "#38b6ff";
  const dangerColor = "#e63a25";

  return (
    <Canvas
      dpr={[1, 1.5]} // capped DPR for low-end machines
      camera={{ position: [0, 0, 8], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[4, 5, 6]} intensity={30} color="#7fd4ff" />
      <pointLight position={[-4, 3, 4]} intensity={22} color="#f5a623" />
      <pointLight position={[0, -3, 5]} intensity={14} color="#ffffff" />

      {/* Ambient particles / stars for atmosphere (cheap) */}
      <Stars />

      {/* Player glyph — center, big */}
      <FloatingGlyph
        position={[0, 0, 0]}
        state={currentState}
        tone="lightBlue"
        scale={1.15}
      />

      {/* Golden glyph — top, the target */}
      <FloatingGlyph
        position={[0, 2.9, -0.5]}
        state={goldenState}
        tone="gold"
        scale={0.8}
        autoSpin
      />

      {/* Explosives — spread at the bottom, danger */}
      {explosiveStates.map((s, i) => {
        const x = (i - 1) * 1.9;
        return (
          <FloatingGlyph
            key={i}
            position={[x, -2.8, -0.4]}
            state={s}
            tone="danger"
            scale={0.62}
          />
        );
      })}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
      />
    </Canvas>
  );
}

// Cheap static starfield.
function Stars() {
  const ref = useRef<THREE.Points>(null!);
  const positions = useRef(new Float32Array(0));
  const { viewport } = useThree();

  useEffect(() => {
    const count = 200;
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
