"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { generateLevel, applyMove, isExplosive, MOVES, type Move } from "@/lib/d8";
import GameStage from "./GameStage";

const SAVED_BEST_KEY = "goldcraft_best";

function loadBest(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(SAVED_BEST_KEY);
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : null;
}

function saveBest(n: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVED_BEST_KEY, String(n));
}

interface MoveDef {
  id: Move;
  label: string;
  key: string;
  icon: string;
  hint: string;
}

const MOVE_DEFS: MoveDef[] = [
  { id: "rotL", label: "Rotate Left", key: "Q / ← / 1", icon: "⟲", hint: "90° counter-clockwise" },
  { id: "rotR", label: "Rotate Right", key: "E / → / 3", icon: "⟳", hint: "90° clockwise" },
  { id: "reflectH", label: "Reflect", key: "W / Space / 2", icon: "⇋", hint: "flip horizontally" },
];

type Status = "playing" | "won" | "lost";

export default function Game() {
  const [level, setLevel] = useState(() => generateLevel(0));
  const [state, setState] = useState(() => level.start);
  const [status, setStatus] = useState<Status>("playing");
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState<number | null>(() => (typeof window === "undefined" ? null : loadBest()));
  const [message, setMessage] = useState("");

  const busyRef = useRef(false);

  // New round: keep the SAME base but regenerate a fresh, valid level.
  const startNewRound = useCallback(() => {
    const nextId = level.id + 1;
    const lvl = generateLevel(nextId);
    setLevel(lvl);
    setState(lvl.start);
    setStatus("playing");
    setMoves(0);
    setMessage("");
  }, [level.id]);

  const doMove = useCallback(
    (m: Move) => {
      if (status !== "playing") return;
      const next = applyMove(state, m);
      setState(next);
      setMoves((m) => m + 1);

      if (isExplosive(next, level.explosives)) {
        setStatus("lost");
        setMessage("💥 Your experiment exploded!");
        return;
      }
      if (next === level.golden) {
        setStatus("won");
        setMessage("✨ You transmuted gold!");
        // best-moves: lower is better
        setBest((b) => {
          const nb = moves + 1;
          const newBest = b === null ? nb : Math.min(b, nb);
          saveBest(newBest);
          return newBest;
        });
      }
    },
    [state, level, status, moves]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const keyMap: Record<string, Move> = {
      q: "rotL", ArrowLeft: "rotL", "1": "rotL",
      e: "rotR", ArrowRight: "rotR", "3": "rotR",
      w: "reflectH", " ": "reflectH", "2": "reflectH",
    };
    const onKey = (e: KeyboardEvent) => {
      const m = keyMap[e.key];
      if (m) {
        e.preventDefault();
        doMove(m);
      }
      // 'n' = next round
      if (e.key === "n") startNewRound();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove, startNewRound]);

  const outcomeText = useMemo(() => {
    if (status === "won") return `You transmuted gold in ${moves} move${moves === 1 ? "" : "s"}!`;
    if (status === "lost") return `Exploded after ${moves} move${moves === 1 ? "" : "s"}. The glyphs are unforgiving.`;
    return "";
  }, [status, moves]);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-radial-void">
      {/* Header */}
      <header className="z-10 flex items-center justify-between px-6 py-4">
        <h1 className="font-display text-2xl font-black tracking-wide text-white">
          GOLD<span className="bg-gradient-to-r from-aurum-400 to-aurum-600 bg-clip-text text-transparent">CRAFT</span>
        </h1>
        <div className="flex items-center gap-4 text-sm text-azure-300/80">
          <span className="font-display">
            Moves: <span className="text-white">{moves}</span>
          </span>
          <span className="font-display">
            Best:{" "}
            <span className="text-aurum-400">{best === null ? "—" : best}</span>
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
        <GameStage currentState={state} goldenState={level.golden} explosiveStates={level.explosives} />

        {/* Labels */}
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          <span className="rounded-full bg-void-900/60 px-3 py-1 font-display text-xs uppercase tracking-widest text-aurum-400 animate-goldglow">
            Golden
          </span>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
          <span className="rounded-full bg-void-900/60 px-3 py-1 font-display text-xs uppercase tracking-widest text-cinnabar-400">
            Explosive
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

        {/* Message toast (transient) */}
        {message && status === "playing" && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
            <span className="rounded bg-void-900/80 px-4 py-1 text-azure-300">{message}</span>
          </div>
        )}
      </div>

      {/* Move controls */}
      <footer className="z-10 flex items-end justify-center gap-3 border-t border-white/5 bg-void-950/40 px-4 pb-5 pt-3 backdrop-blur">
        {MOVE_DEFS.map((md) => (
          <button
            key={md.id}
            onClick={() => doMove(md.id)}
            disabled={status !== "playing"}
            className="group flex min-w-[9rem] flex-col items-center gap-1 rounded-xl border border-azure-500/30 bg-azure-700/15 px-4 py-3 transition hover:border-azure-400/70 hover:bg-azure-700/30 disabled:opacity-40"
          >
            <span className="text-2xl text-azure-300 transition group-hover:text-white">{md.icon}</span>
            <span className="font-display text-sm font-bold text-azure-200">{md.label}</span>
            <span className="text-[10px] uppercase tracking-wider text-azure-300/50">{md.key}</span>
          </button>
        ))}
        <span className="ml-2 hidden text-xs text-azure-300/40 sm:block">
          {message && status === "playing" ? message : "Avoid the red glyphs. Reach the golden one."}
        </span>
      </footer>
    </div>
  );
}
