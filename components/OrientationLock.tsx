"use client";

// Mobile-only landscape presentation.
//
// On a narrow touch device held in PORTRAIT, we rotate the entire game 90°
// so it presents in landscape (as if the phone were held sideways) — giving
// the 3D stage, side glyphs, and move bar the same wide layout as desktop.
//
// When the device is already held in REAL landscape (or it's a desktop /
// wide viewport), we render NORMALLY — no transform, no layout change.
//
// Implementation detail: the browser still reports the *portrait* viewport
// dimensions even after a CSS transform, so we must (a) size the rotated stage
// to the SWAPPED viewport (width = portrait height, height = portrait width)
// and (b) emit a custom `orientation-applied` resize signal so the embedded
// react-three-fiber canvas re-measures against the rotated box. We also keep
// the CSS `resize` handler firing for the canvas via a brief re-layout nudge.

import { useEffect, useRef, useState, type ReactNode } from "react";

const MOBILE_QUERY = "(pointer: coarse)";
// Landscape = viewport width > height. On phones in portrait that's reversed.
function isLandscape() {
  return typeof window !== "undefined" && window.innerWidth > window.innerHeight;
}

interface Size {
  w: number;
  h: number;
}

export default function OrientationLock({ children }: { children: ReactNode }) {
  // active = we are currently force-rotating to landscape.
  const [active, setActive] = useState(false);
  // stage size used when active (the swapped viewport dimensions).
  const [stage, setStage] = useState<Size>({ w: 0, h: 0 });
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
        // Nudge React Three Fiber's ResizeObserver so the canvas re-measures
        // against the (possibly now-rotated) container.
        window.dispatchEvent(new Event("resize"));
      });
    };

    const computeAndBump = () => {
      compute();
      // A second tick after layout settles catches rounding from the transform.
      setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
    };

    window.addEventListener("resize", computeAndBump);
    window.addEventListener("orientationchange", computeAndBump);
    compute();

    return () => {
      cancelAnimationFrame(raf);
      mm.removeEventListener("change", onMatch);
      window.removeEventListener("resize", computeAndBump);
      window.removeEventListener("orientationchange", computeAndBump);
    };
  }, []);

  if (!active) {
    // Desktop, wide viewport, or phone held in real landscape: render normally.
    return <>{children}</>;
  }

  // Force-rotated landscape on a portrait phone.
  return (
    <div
      className="fixed inset-0 overflow-hidden bg-[#05060a]"
      style={{
        height: "100dvh",
        width: "100dvw",
        // Expose the effective stage dimensions to children (the Game uses
        // these via CSS vars so its flex layout fills the landscape box
        // instead of the raw portrait 100dvh).
        "--gc-stage-w": `${stage.w}px`,
        "--gc-stage-h": `${stage.h}px`,
      } as React.CSSProperties}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: stage.w,
          height: stage.h,
          transform: "translate(-50%, -50%) rotate(90deg)",
          transformOrigin: "center",
        }}
      >
        {/* width/height are the swapped viewport -> the child lays out in landscape */}
        <div style={{ width: stage.w, height: stage.h }}>
          {children}
        </div>
      </div>
    </div>
  );
}
