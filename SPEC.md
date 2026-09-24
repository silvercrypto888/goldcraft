# Goldcraft — Game Spec (DRAFT v0.1)

Simple, unusual puzzle game themed around alchemy + geometry/abstract math.
Core mechanic = carefully traversing the dihedral group **D₈** (symmetries of a square).

## 1. Core concept

You start with an **asymmetric glyph** (e.g. the letter *G*). The goal is to transform
it into a **Golden Glyph** (the target) using a sequence of three allowed
**transmutations** (operations):

| Operation | Keyboard | Math | Effect |
|---|---|---|---|
| Rotate right 90° | → / E / 1 | ×r | rotate 90° clockwise |
| Rotate left 90°  | ← / Q / 2 | ×r⁻¹ (=r³) | rotate 90° counter-clockwise |
| Reflect horizontal | W / Space / 3 | ×s | mirror across vertical axis |

You **lose** the round if at any point your current glyph matches one of **3 explosive
glyphs** (your "experiment exploded"). You **win** when you match the **Golden Glyph**
("you transmuted gold").

**Math framing:** D₈ has 8 elements = 8 distinct visual states of an asymmetric base
glyph: {e, r, r², r³, s, sr, sr², sr³}. Allowed moves generate the whole group, so from
any state you *can* reach any other — the puzzle is finding a safe path that avoids the
3 forbidden vertices.

## 2. Level constraints (generator guarantees)

A generated level must satisfy ALL of these:

1. **Not winnable in 0 moves:** start ≠ golden.
2. **Not winnable in 1 move:** golden ∉ {start·r, start·r⁻¹, start·s}.
3. **Not a forced loss at start:** NOT all three of {start·r, start·r⁻¹, start·s} are
   explosive (player always has ≥1 safe first move).
4. **Winnable:** a safe path exists from start to golden that never steps on an
   explosive glyph (verified by BFS over non-explosive states).
5. Explosives are distinct, and none equal start or golden.
6. *(Optional difficulty knob)* enforce a **minimum solution length** (e.g. ≥ 2, 3, 4)
   so harder levels aren't just "1 step away + one blocked."

**Generator algorithm:** pick golden ∈ D₈ → pick start (≠ golden, and not adjacent to
it per #2) → pick 3 random explosives (#5) → check #3 → BFS for winnability (#4) →
optionally enforce #6. Regenerate on any failed check (it converges almost instantly —
the D₈ Cayley graph is small and well-connected, so a safe path exists ~always).

## 3. State / win / lose model

- Current state = group element of the oriented glyph on screen.
- **Win check** precedes explode check if ever both apply (they're kept disjoint, so it
  never binds in practice).
- **Moves:** unlimited (per your note), but we show a move counter + track **fewest
  moves** to transmute (best score) to give replays a goal.
- **Undo:** none within a round (an explosive hit = hard explosion). Provide a **Reset
  round** button instead.

## 4. Game flow / screens

- **Home:** Title "Goldcraft", tagline, Play / How to Play.
- **How to Play:** shows the 3 moves + the win/lose rule.
- **Round:** grid-less single-panel board:
  - Center: current glyph (glowing blue/white).
  - Top: **Golden Glyph** (gold/orange glow) — the target, always shown.
  - Side: 3 **Explosive glyphs** (red/danger glow) — always shown (planning puzzle, not
    memory). [CONFIRM — see questions]
  - Move counter + best.
  - 3 move buttons (+ keyboard shortcuts) + Reset.
- **Win overlay:** "✨ You transmuted gold!" + moves used, best updated, Next round.
- **Lose overlay:** "💥 Exploded!" + glyph that killed you, Try again.

## 5. Visual style (per your brief)

- **Background:** near-black with subtle radial depth.
- **Palette:** bold **light/dark blue** gradients (player/current glyph) + **gold/orange**
  gradients (target/win), glows, soft bloom.
- **Explosives:** red/orange danger glow, clearly "do not touch."
- **Rendering:** to be confirmed — Three.js (3D tile, rotation/reflection animated in 3D)
  vs crisp 2D. See questions.

## 6. Tech stack

- **Next.js** (App Router), TypeScript, Tailwind for UI shell.
- **Three.js** (if 3D confirmed) via `@react-three/fiber` + `@react-three/drei`.
- Pure math/generator module (D₈ group, level gen, BFS) with unit tests — fully web2,
  no GOLD/web3 for now. Clean seam left to add GOLD rewards later.
- Repo: `silvercrypto888/goldcraft` (deploy key already requested).

## 7. Out of scope (v1)

- GOLD token / web3 integration (deferred by you).
- Persistent accounts/scores server (local best only for now).
- Audio, leaderboards, level editor.
