---
title: Agent + Contributor Operating Protocols
updated: 2026-06-27
status: current
domain: technical
---

# Agent + Contributor Operating Protocols

Extended rules for AI agents and humans working in this repository. Read this
before touching any source file.

---

## Architecture boundaries

### Layer map

```
src/sim/        ← pure deterministic TypeScript (the "world model")
src/engine/     ← browser glue that drives the sim
src/render/     ← canvas 2D draw calls
src/audio/      ← Web Audio synthesis
src/ui/         ← SolidJS HUD components
```

### sim/ — the purity boundary

`src/sim/**` is the innermost layer. It must remain completely free of browser
APIs, DOM references, and non-deterministic calls. Specifically:

- **No** `Math.random()` — use `createRng(seed)` from `src/engine/rng.ts`.
- **No** `performance.now()` — wall-clock time enters only at the loop boundary
  in `src/engine/clock.ts` via `createClock()`.
- **No** DOM imports (`window`, `document`, `HTMLElement`, etc.).
- **No** Capacitor plugin imports.
- All physics, player logic, camera, tilemap, level parsing, and input modelling
  live here. They must be runnable in a plain Node process with no special setup.

These rules are enforced by `.claude/gates.json` (`ban_patterns`). A commit that
violates them will be blocked at the pre-commit gate.

### engine/ — browser glue

`src/engine/**` is the only layer that may read `performance.now()`, touch the
DOM, call Capacitor plugins, or schedule `requestAnimationFrame`. Sub-modules:

- `clock.ts` — fixed-timestep accumulator; the only place wall-clock time enters.
- `rng.ts` — mulberry32 facade; the only source of pseudo-randomness.
- `input/keyboard.ts` — DOM key event → `PlayerIntent`.
- `input/touch.ts` — Pointer Events → pure `touchModel` → `PlayerIntent`.
- `input/inputManager.ts` — merges touch + keyboard; touch axes take priority.
- `viewport/deviceProfile.ts` — pure device classifier (no DOM).
- `viewport/scaler.ts` — pure letterbox/pillarbox geometry (no DOM).
- `viewport/responsive.ts` — DOM + Capacitor Device/ScreenOrientation adapter;
  debounces resize/orientationchange and recomputes profile + geometry.
- `game.ts` — the `requestAnimationFrame` loop; orchestrates clock, input, sim
  steps, renderer, and HUD signal updates.

### render/ — canvas draw

`src/render/renderer.ts` contains `drawFrame()`. It receives a `FrameInput`
struct (map, camera, viewport, prev/current player states, alpha) and draws to a
`CanvasRenderingContext2D`. It does not hold mutable state between frames.
Interpolation alpha comes from the clock; the renderer lerps between `prevPlayer`
and `player` for sub-frame smoothness.

### ui/ — SolidJS HUD

`src/ui/**` contains the SolidJS component tree: `App.tsx` mounts the canvas and
HUD, manages Capacitor app lifecycle (pause/resume), and hides the status bar.
`Hud.tsx` reads signals from `hudState.ts`. The engine writes to `hudState` each
frame; SolidJS fine-grained reactivity updates only the changed DOM nodes.

### Signal bridge rule

The engine (`src/engine/game.ts`) may import `src/ui/hudState.ts` to write
signals. Engine code must **not** import any SolidJS component (`Hud.tsx`,
`App.tsx`). Components must **not** import engine internals; they read only the
`HudModel` signals exported from `hudState.ts`.

---

## Determinism doctrine

The sim must replay identically from a `(seed, PlayerIntent[])` stream with no
external inputs. This property:

1. Enables snapshot regression tests — record an intent sequence, assert the
   final player state matches.
2. Enables future replay/spectate features.
3. Makes bug reproduction deterministic.

**Facades** that preserve this property:

| What you need | Use | Never use directly |
|---|---|---|
| Random numbers | `createRng(seed)` (mulberry32) | `Math.random()` |
| Wall-clock time | `createClock()` tick/dt | `performance.now()`, `Date.now()` |

Both facades are in `src/engine/` so the sim never imports them — the engine
passes derived values (`dt`, `steps`) into the sim each tick.

---

## Gates (`.claude/gates.json`)

Pre-commit checks enforced by `commit-gate.mjs`:

| Rule | When triggered | Required |
|------|---------------|----------|
| Render/UI test | `src/render/**` or `src/ui/**` changed | `tests/visual/**` or `tests/harness/**` updated |
| Real-browser pass | `src/render/**` or `src/ui/**` changed | `pnpm test:browser` passes |
| Audio test | `src/audio/**` changed | `tests/audio/**` or `tests/browser/**` updated |
| Sim/engine test | `src/sim/**` or `src/engine/**` changed | `tests/unit/**` or `tests/browser/**` updated |
| Cap sync | `capacitor.config.ts` or `android/**` changed | `pnpm cap:sync` run with evidence |
| Ban: Math.random | `src/sim/**`, `src/engine/**`, `src/systems/**` | Blocked; use `createRng(seed)` |
| Ban: performance.now | `src/sim/**`, `src/engine/**` | Blocked; use clock facade |

Override a coverage rule for a specific commit with a comment in the diff:
`// no-visual-impact: <≥10 word reason explaining why no visual change occurs>`.

Max file length warning: 600 lines.

---

## Commit conventions

- **Conventional Commits** always: `feat:`, `fix:`, `chore:`, `docs:`,
  `refactor:`, `perf:`, `test:`, `ci:`, `build:`.
- One logical change per commit. Do not bundle unrelated changes.
- **Squash-merge** PRs only — no merge commits on `main`.
- **pnpm only** — `yarn` and `npm install` are banned by `forbidden_bash` gate.
  Never commit `yarn.lock` or `package-lock.json`.
- `--no-verify` is forbidden.

---

## Test strategy

See [docs/TESTING.md](docs/TESTING.md) for full detail.

**Short version:**
- Unit tests (`tests/unit/`) run in Node; they cover all `src/sim/**` and pure
  `src/engine/**` modules (clock, rng, deviceProfile, scaler, touchModel).
- Browser tests (`tests/browser/`) run in real Chromium via
  `@vitest/browser-playwright`; they cover `src/render/` and `src/audio/`.
- E2E tests (`tests/e2e/`) run Playwright across phone, tablet, and desktop
  viewport form factors.

---

## Stubs and TODOs

`pass`, `// TODO`, `as any`, `it.todo`, and empty stubs are treated as bugs —
they block merge. Fix or delete.
