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
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-radial-void">
      {/* Header */}
      <header className="z-10 flex items-center justify-between px-6 py-4">
        <h1 className="font-display text-2xl font-black tracking-wide text-white">
          GOLD<span className="bg-gradient-to-r from-aurum-400 to-aurum-600 bg-clip-text text-transparent">CRAFT</span>
        </h1>

        {/* Mode toggle */}
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
      <div className="relative z-0 flex-1">
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
    </div>
  );
}
