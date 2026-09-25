"use client";

import { useState, useCallback, useEffect } from "react";
import GameStage from "./GameStage";
import {
  getMode,
  MOVE_META,
  MODE_BEST_KEY,
  MODES,
  type Mode,
  type ModeCfg,
} from "@/lib/mode";

function loadBest(mode: Mode): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(MODE_BEST_KEY(mode));
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : null;
}

function saveBest(mode: Mode, n: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODE_BEST_KEY(mode), String(n));
}

type Status = "playing" | "won" | "lost";

export default function Game() {
  const [mode, setMode] = useState<Mode>("normal");
  const cfg: ModeCfg<any, any> = getMode(mode);
  const [level, setLevel] = useState(() => cfg.generateLevel(0));
  const [state, setState] = useState(() => level.start);
  const [status, setStatus] = useState<Status>("playing");
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState<number | null>(() => loadBest(mode));
  const [helpOpen, setHelpOpen] = useState(false);

  // Reset to a fresh round for the (new) mode.
  const resetForMode = useCallback(
    (m: Mode) => {
      const c = getMode(m);
      const lvl = c.generateLevel(0);
      setLevel(lvl);
      setState(lvl.start);
      setStatus("playing");
      setMoves(0);
      setBest(loadBest(m));
    },
    []
  );

  const switchMode = useCallback(
    (m: Mode) => {
      if (m === mode) return;
      setMode(m);
      resetForMode(m);
    },
    [mode, resetForMode]
  );

  const startNewRound = useCallback(() => {
    const c = getMode(mode);
    const lvl = c.generateLevel(level.id + 1);
    setLevel(lvl);
    setState(lvl.start);
    setStatus("playing");
    setMoves(0);
  }, [mode, level.id]);

  const doMove = useCallback(
    (mv: string) => {
      if (status !== "playing") return;
      const c = getMode(mode);
      const next = c.applyMove(state, mv);
      setState(next);
      setMoves((m) => m + 1);
      if (c.isExplosive(next, level.explosives)) {
        setStatus("lost");
        return;
      }
      if (next === level.golden) {
        setStatus("won");
        const nb = moves + 1;
        setBest((b) => {
          const newBest = b === null ? nb : Math.min(b, nb);
          saveBest(mode, newBest);
          return newBest;
        });
      }
    },
    [state, level, mode, status, moves]
  );

  // Keyboard shortcuts. Map per-mode move ids.
  useEffect(() => {
    const keyMap: Record<string, string> = {
      q: "rotL", ArrowLeft: "rotL", "1": "rotL",
      e: "rotR", ArrowRight: "rotR", "3": "rotR",
      // vertical reflection (hard mode)
      a: "reflectV", ArrowUp: "reflectV", "2": "reflectV",
      // horizontal reflection (both modes)
      w: "reflectH", " ": "reflectH", "4": "reflectH",
    };
    const onKey = (e: KeyboardEvent) => {
      const m = keyMap[e.key];
      if (m) {
        const c = getMode(mode);
        if (c.moveOrder.includes(m)) {
          e.preventDefault();
          doMove(m);
        }
      }
      if (e.key === "n") startNewRound();
      if (e.key === "?") setHelpOpen(true);
      if (e.key === "Escape") setHelpOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove, startNewRound, mode]);

  const outcomeText =
    status === "won"
      ? `You transmuted gold in ${moves} move${moves === 1 ? "" : "s"}!`
      : status === "lost"
      ? `Exploded after ${moves} move${moves === 1 ? "" : "s"}.`
      : "";

  const moveButtons = cfg.moveOrder.map((id) => MOVE_META[id]).filter(Boolean);

  return (
    <div
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-radial-void"
      style={{
        // When OrientationLock force-rotates to landscape, the stage box is
        // the swapped viewport sizes via CSS vars; fall back to 100dvh otherwise.
        height: "var(--gc-stage-h, 100dvh)",
      }}
    >
      {/* Header */}
      <header className="z-10 flex items-center justify-between px-6 py-4">
        <h1 className="font-display text-2xl font-black tracking-wide text-white">
          GOLD<span className="bg-gradient-to-r from-aurum-400 to-aurum-600 bg-clip-text text-transparent">CRAFT</span>
        </h1>

        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-void-900/60 p-1">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => switchMode(m.key)}
                className={`rounded-lg px-3 py-1.5 font-display text-sm font-bold transition ${
                  mode === m.key
                    ? "bg-gradient-to-r from-azure-500 to-azure-700 text-white shadow"
                    : "text-azure-300/60 hover:text-azure-200"
                }`}
                title={m.tagline}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setHelpOpen(true)}
            className="rounded-lg border border-white/10 bg-void-900/60 px-3 py-1.5 font-display text-sm font-bold text-azure-300/80 transition hover:border-azure-400/60 hover:text-azure-200"
            title="How to play (press ?)"
          >
            How to Play
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm text-azure-300/80">
          <span className="font-display">
            Moves: <span className="text-white">{moves}</span>
          </span>
          <span className="font-display">
            Best: <span className="text-aurum-400">{best === null ? "—" : best}</span>
          </span>
          <button
            onClick={startNewRound}
            className="rounded-lg border border-azure-500/40 bg-azure-700/20 px-3 py-1.5 font-display text-azure-300 transition hover:bg-azure-700/40"
            title="press N"
          >
            New Round (N)
          </button>
        </div>
      </header>

      {/* Stage */}
      <div className="relative z-0 min-h-0 flex-1">
        <GameStage
          currentState={state}
          goldenState={level.golden}
          explosiveStates={level.explosives}
          points={cfg.glyphPoints}
          order={cfg.order}
        />

        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <span className="rounded-full bg-void-900/60 px-3 py-1 font-display text-xs uppercase tracking-widest text-aurum-400 animate-goldglow">
            Golden
          </span>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
          <span className="rounded-full bg-void-900/60 px-3 py-1 font-display text-xs uppercase tracking-widest text-cinnabar-400">
            {cfg.numExplosives} Explosive
          </span>
        </div>

        {/* Win / Lose overlay */}
        {status !== "playing" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-void-950/70 backdrop-blur-sm">
            <div className="mx-4 max-w-md rounded-2xl border border-white/10 bg-void-900/80 p-8 text-center shadow-2xl">
              <div className={`font-display text-3xl font-black ${status === "won" ? "text-aurum-400" : "text-cinnabar-400"}`}>
                {status === "won" ? "✨ Transmuted Gold!" : "💥 Exploded!"}
              </div>
              <p className="mt-3 text-azure-300/80">{outcomeText}</p>
              <button
                onClick={startNewRound}
                className="mt-6 rounded-xl bg-gradient-to-r from-aurum-500 to-aurum-700 px-6 py-3 font-display text-lg font-bold text-void-950 shadow-lg shadow-aurum-500/30 transition hover:brightness-110"
              >
                Transmute Again
              </button>
              <p className="mt-3 text-xs text-azure-300/50">press N for a new round</p>
            </div>
          </div>
        )}
      </div>

      {/* Move controls */}
      <footer className="z-10 flex items-end justify-center gap-2 border-t border-white/5 bg-void-950/40 px-4 pb-5 pt-3 backdrop-blur">
        {moveButtons.map((md) => (
          <button
            key={md.id}
            onClick={() => doMove(md.id)}
            disabled={status !== "playing"}
            className="group flex min-w-[8rem] flex-col items-center gap-1 rounded-xl border border-azure-500/30 bg-azure-700/15 px-4 py-3 transition hover:border-azure-400/70 hover:bg-azure-700/30 disabled:opacity-40"
          >
            <span className="text-2xl text-azure-300 transition group-hover:text-white">{md.icon}</span>
            <span className="font-display text-sm font-bold text-azure-200">{md.label}</span>
            <span className="text-[10px] uppercase tracking-wider text-azure-300/50">{md.key}</span>
          </button>
        ))}
      </footer>

      {/* How to Play modal */}
      {helpOpen && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-void-950/70 backdrop-blur-sm"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="mx-4 max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-void-900/95 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="font-display text-2xl font-black text-white">
                How to Play <span className="text-aurum-400">Goldcraft</span>
              </h2>
              <button
                onClick={() => setHelpOpen(false)}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-azure-300/70 transition hover:border-azure-400/60 hover:text-white"
                title="Close (press ? or Esc)"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm leading-relaxed text-azure-200/90">
              <div className="flex items-center gap-3 rounded-xl border border-aurum-500/30 bg-aurum-500/10 p-3">
                <span className="text-2xl">🎯</span>
                <p>
                  <strong className="text-aurum-400">Goal:</strong> you hold a center glyph.
                  Match its shape exactly to the <strong className="text-aurum-400">golden</strong> glyph on the
                  left to transmute gold. Avoid landing on the red <strong>explosive</strong> glyphs to the right.
                </p>
              </div>

              <div>
                <h3 className="font-display text-base font-bold text-white">Your three moves (Normal)</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <div className="text-2xl text-azure-300">⟲</div>
                    <div className="mt-1 font-display font-bold text-azure-200">Rotate Left</div>
                    <div className="text-xs text-azure-300/60">spin your glyph 90°</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-azure-400/60">Q / ← / 1</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <div className="text-2xl text-azure-300">⟳</div>
                    <div className="mt-1 font-display font-bold text-azure-200">Rotate Right</div>
                    <div className="text-xs text-azure-300/60">spin your glyph 90°</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-azure-400/60">E / → / 3</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <div className="text-2xl text-azure-300">⇌</div>
                    <div className="mt-1 font-display font-bold text-azure-200">Reflect</div>
                    <div className="text-xs text-azure-300/60">mirror your glyph top↔bottom</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-azure-400/60">W / Space / 4</div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-azure-300/60">Every move also works by clicking the buttons at the bottom.</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <h3 className="font-display text-base font-bold text-white">A quick example</h3>
                <p className="mt-1">
                  The three glyphs are different states of the <em>same</em> shape. Rotating or reflecting
                  your center glyph slowly walks it through every possible orientation. Your job is to find
                  the handful of moves that land yours exactly on the golden one — while steering clear of
                  the explosives.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <h3 className="font-display text-base font-bold text-white">Tips</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>Every generated round is <strong>winnable</strong> — a safe path always exists.</li>
                  <li>Reaching the golden glyph in fewer moves improves your <strong>Best</strong> score.</li>
                  <li>Hit <strong>N</strong> anytime for a new round.</li>
                  <li>Switch to <strong>Hard</strong> for a tougher D₁₂ challenge once you master Normal.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setHelpOpen(false)}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-aurum-500 to-aurum-700 px-6 py-3 font-display text-lg font-bold text-void-950 shadow-lg shadow-aurum-500/30 transition hover:brightness-110"
            >
              Got it — let's craft!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
