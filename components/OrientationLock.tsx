"use client";

// Mobile-only landscape presentation.
//
// On a narrow touch device held in PORTRAIT, we rotate the entire game 90° so
// it presents in landscape (wide layout for the 3D stage + side glyphs + move
// bar). When the device is already in real landscape (or desktop / wide
// viewport) we render NORMALLY — no transform.
//
// Robust vs R3F: instead of trusting a CSS transform + ResizeObserver (which
// measures the un-transformed portrait box and renders the 3D scene portrait),
// we size the game container to EXPLICIT landscape pixel dimensions
// (width = portrait height, height = portrait width) AND bump a `key` that
// forces the <Canvas> to remount, so React Three Fiber measures the correct
// landscape box on mount. The 90° spin is applied by an outer display wrapper
// that carries no measuring children.

import { useEffect, useRef, useState, type ReactNode } from "react";

const MOBILE_QUERY = "(pointer: coarse)";

export default function OrientationLock({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false); // currently force-rotated
  const [stage, setStage] = useState({ w: 0, h: 0 }); // swapped viewport size
  // bump on every (de)activation so the <Canvas> remounts fresh
  const [mountKey, setMountKey] = useState(0);
  const isCoarse = useRef(false);

  useEffect(() => {
    const mm = window.matchMedia(MOBILE_QUERY);
    isCoarse.current = mm.matches;
    const onMatch = () => {
      isCoarse.current = mm.matches;
      compute();
    };
    mm.addEventListener("change", onMatch);

    let raf = 0;
    const compute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const portrait = window.innerHeight > window.innerWidth;
        const shouldRotate = isCoarse.current && portrait;
        setActive(shouldRotate);
        if (shouldRotate) {
          setStage({ w: window.innerHeight, h: window.innerWidth });
        }
        setMountKey((k) => k + 1);
      });
    };

    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    compute();

    return () => {
      cancelAnimationFrame(raf);
      mm.removeEventListener("change", onMatch);
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);

  if (!active) {
    // Desktop / wide viewport / portrait phone in true landscape: render normally.
    return (
      <div key={mountKey} className="h-full w-full">
        {children}
      </div>
    );
  }

  // Force-rotated landscape on a portrait phone.
  return (
    <div
      className="fixed inset-0 overflow-hidden bg-[#05060a]"
      style={{
        height: "100dvh",
        width: "100dvw",
        // Expose effective stage dims so the Game's root resolves its height
        // to the landscape box (falling back to 100dvh when not rotating).
        "--gc-stage-w": `${stage.w}px`,
        "--gc-stage-h": `${stage.h}px`,
      } as React.CSSProperties}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          // This is the LAYOUT box: explicit landscape dimensions. Its children
          // (the game) measure as landscape via ResizeObserver.
          width: stage.w,
          height: stage.h,
          transform: "translate(-50%, -50%) rotate(90deg)",
          transformOrigin: "center",
        }}
      >
        {/* key forces <Canvas> to remount so R3F re-measures the landscape box */}
        <div key={mountKey} style={{ width: stage.w, height: stage.h }}>
          {children}
        </div>
      </div>
    </div>
  );
}
