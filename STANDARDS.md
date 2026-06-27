---
title: Code Quality Standards
updated: 2026-06-27
status: current
domain: technical
---

# Code Quality Standards

Non-negotiable rules for all code in this repository.

---

## Sim purity (hard rule)

`src/sim/**` is a pure deterministic TypeScript layer. It must have zero
dependencies on the browser environment.

**Banned in `src/sim/**` and `src/engine/**`:**

| Banned call | Reason | Replacement |
|---|---|---|
| `Math.random()` | Non-deterministic | `createRng(seed)` in `src/engine/rng.ts` |
| `performance.now()` | Non-deterministic wall clock | `createClock()` in `src/engine/clock.ts` |
| Any DOM API | Node-incompatible | — |
| Any Capacitor plugin import | Browser/native-only | Keep in `src/engine/` or `src/ui/` |

These are enforced by `.claude/gates.json` `ban_patterns` and will block commit.

---

## Determinism doctrine

The simulation must replay identically from a `(seed, PlayerIntent[])` stream.
This means:

1. `createRng(seed)` is the sole source of pseudo-randomness. The mulberry32
   implementation is seeded per run; the seed is the only external input.
2. `createClock()` is the sole time source. It converts wall-clock `nowMs` into
   a fixed step count (`steps`) and step duration (`dt`). The sim only ever sees
   `dt`; it never sees `nowMs`.
3. All sim functions are pure: given the same inputs they return the same outputs.
4. No `async` code inside `src/sim/**`.

---

## Factory pattern for stateful modules

Stateful engine modules (`clock`, `rng`, `inputManager`, `responsiveViewport`,
`game`) are constructed via factory functions (`createClock`, `createRng`, etc.).
There are no singletons; tests can construct isolated instances.

---

## Boundary rules between layers

```
sim       ← no imports from engine/, render/, audio/, ui/
engine    ← may import from sim/ (for types and pure functions only)
render    ← may import from sim/ (TileMap, Camera, PlayerState, Palette)
audio     ← no imports from sim/, engine/, render/, ui/
ui        ← may import from ui/hudState.ts; must not import engine internals
game.ts   ← the only file that imports from all layers
```

`src/ui/hudState.ts` is the only shared surface between engine and UI. Engine
writes signals; components read them. No component may import `game.ts`.

---

## Biome formatting

All TypeScript and JSON is formatted and linted by Biome 2 (`biome.json`):

- Indent: 2 spaces.
- Line width: 100 characters.
- Quotes: double.
- Trailing commas: all.
- Semicolons: always.
- Import organizer: on (auto-sort on `biome check --write`).
- `console.log` is banned; `console.warn` and `console.error` are allowed.

Run `pnpm lint` before committing. Run `pnpm check` to lint + format in one pass.

---

## File size

- Files over **600 lines** trigger a gate warning.
- A file that owns more than one distinct responsibility is a decomposition
  candidate, regardless of line count.
- Configuration tables (tuning constants, tile maps) may be longer than 400 lines
  if each line is a single value — this is acceptable.
- The reader-can-hold-it-in-head principle is the true gate: if a reviewer needs
  to scroll back and forth to understand a single function, split it.

---

## Mobile-first responsive requirement

The game must scale correctly on:

- **Phone portrait** (e.g. 390 × 844 CSS px, 1× – 3× DPR)
- **Phone landscape** (e.g. 844 × 390 CSS px)
- **Tablet** (e.g. 1024 × 768 CSS px)
- **Foldable unfolded** (e.g. 884 × 1104 CSS px)
- **Desktop** (1280+ wide)

`src/engine/viewport/` handles this via the `DeviceProfile` classifier and
`computeViewport` letterbox scaler. DPR is capped at 2 in the responsive adapter.
Any change that regresses a form factor must update the relevant unit and/or
browser tests.

Touch input is primary; keyboard is the fallback. The virtual d-pad and action
buttons in `src/engine/input/touch.ts` must remain functional on all touch
devices.

---

## Brand palette

The single source of truth is `BRAND` in `src/brand.ts`. Every colour the game
shows — the renderer's `SHRINE_PALETTE`, the HUD, global CSS, the PWA
`manifest.theme_color`, and `capacitor.config.ts` `backgroundColor` — derives
from these tokens. `.claude/gates.json` bans raw brand hex literals outside
`src/brand.ts` so the palette has one place to change.

```
obsidian:  #17110b   (temple-stone black — backgrounds, letterbox)
stone:     #6f4e2e   (torch-lit stone — solid tiles)
sandstone: #9a7240   (weathered stone — one-way platforms)
idolGold:  #e3b341   (tarnished idol gold — title, ladders, whip origin)
relicGold: #f6d36b   (bright relic gold — score, collectibles, whip)
bloodRed:  #c2402e   (danger — hazards, lives)
parchment: #f3e9d2   (the hero, primary text)
jungle:    #26331f   (UI depth, vignette)
steel:     #9a9a9a   (mine-cart rails)
```

Typography (`TYPE` in `src/brand.ts`): a carved-stone display face for titles,
a legible sans for the HUD, tabular monospace numerals for score/timers.

---

## TypeScript strictness

`tsconfig.app.json` uses `strict: true`. Do not disable strict mode or introduce
`as any` casts — they are treated as bugs and block merge.
