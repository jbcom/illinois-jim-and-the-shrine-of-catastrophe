---
title: Current Project State
updated: 2026-06-27
status: current
domain: context
---

# Current Project State

Snapshot of what is built, what is tested, and what comes next.
The live work queue is `.agent-state/directive.md`.

---

## Completed layers

### Infrastructure and configuration

- `package.json` — pnpm 9.15.0, Vite 8, TypeScript 6, Biome 2, Vitest 4,
  Playwright 1.61, Capacitor 8, SolidJS 1.9, `vite-plugin-pwa`.
- `vite.config.ts` — SolidJS + PWA plugins, path aliases, `PAGES_BASE` support.
- `biome.json` — lint + format config (2 sp, 100 chars, double quotes).
- `tsconfig.{app,test,node,json}` — strict TypeScript across all project slices.
- `capacitor.config.ts` — appId `com.jbcom.illinoisjim`, webDir `dist`.
- `vitest.config.ts` — `unit` (Node) and `browser` (Chromium) projects.
- `playwright.config.ts` — phone portrait/landscape, tablet, desktop projects.
- `release-please-config.json` + `.release-please-manifest.json`.
- `.claude/gates.json` — coverage rules, ban patterns, forbidden bash.
- `.github/workflows/ci.yml` — lint → typecheck → unit → browser → build.
- `.github/workflows/release.yml` — release-please + APK build + attestation.
- `.github/workflows/cd.yml` — GitHub Pages deploy.

### Engine — RNG + clock (17 unit tests)

- `src/engine/rng.ts` — `createRng(seed)` mulberry32 facade.
- `src/engine/clock.ts` — `createClock()` fixed-timestep accumulator (1/60 s,
  max 5 sub-steps), outputs `{ steps, dt, alpha }`.

### Sim — physics (32 unit tests)

- `src/sim/math/vec2.ts` — Vec2 type, `clamp`.
- `src/sim/physics/aabb.ts` — AABB construction and query helpers.
- `src/sim/physics/collide.ts` — `moveAndCollide` swept tile collision; handles
  Solid, one-way Platform (fall-through from below), Rail, Hazard (kill flag).

### Sim — world (6 unit tests for camera)

- `src/sim/world/tilemap.ts` — `TileKind` enum, flat tile grid, set/get helpers.
- `src/sim/world/camera.ts` — `createCamera` + `followCamera` deadzone scroll,
  level-bounds clamp.
- `src/sim/world/level.ts` — `parseLevel` ASCII art parser (`. # = ^ H ~ @`).
- `src/sim/world/levels/shrine01.ts` — `SHRINE_01` demo level "Threshold of the
  Shrine".

### Sim — player controller (10 unit tests)

- `src/sim/input/intent.ts` — `PlayerIntent` interface, `NEUTRAL_INTENT`.
- `src/sim/input/touchModel.ts` — pure touch→intent model; `touchToAxes`,
  `defaultTouchLayout`.
- `src/sim/player/tuning.ts` — `PlayerTuning` interface + `DEFAULT_TUNING`.
- `src/sim/player/player.ts` — `stepPlayer`: run/jump/whip, coyote time (0.08 s),
  jump buffering (0.1 s), variable jump height (early-release gravity multiplier
  2.4×), gravity 900, maxFall 520, hazard death flag.

### Engine — viewport / responsive scaler (47 unit tests)

- `src/engine/viewport/deviceProfile.ts` — `classifyDevice` pure classifier
  (phone, tablet, foldable, desktop).
- `src/engine/viewport/scaler.ts` — `computeViewport` pure contain/letterbox
  scaler.
- `src/engine/viewport/responsive.ts` — DOM + Capacitor Device +
  ScreenOrientation adapter; DPR cap 2; debounced resize/orientation updates.

### Audio (19 browser tests)

- `src/audio/audioEngine.ts` — `createAudioEngine`: Web Audio context, unlock-on-
  gesture, master gain bus, per-bus control, SFX scheduling.
- `src/audio/sfxBank.ts` — procedural SFX: `renderBlip`, `renderCoin`,
  `renderThud`, `renderWhipCrack` (square, triangle, noise envelopes; no files).

### Engine — input

- `src/engine/input/keyboard.ts` — DOM key events → `PlayerIntent` (WASD/arrows,
  Space/Z/K jump, X/J/ShiftLeft whip).
- `src/engine/input/touch.ts` — Pointer Events adapter → `touchModel`.
- `src/engine/input/inputManager.ts` — `createInputManager`; merges touch +
  keyboard (touch priority).

### Renderer (browser tests in `renderer.test.ts`)

- `src/render/renderer.ts` — `drawFrame(ctx, FrameInput)`: backdrop, tile grid
  with camera projection + `ViewportGeometry` scale/offset, interpolated player
  position (`alpha`), whip arc. `SHRINE_PALETTE` placeholder colours.

### Engine — game loop

- `src/engine/game.ts` — `createGame`: rAF loop, clock tick, input poll, N ×
  `stepPlayer`, `followCamera`, `drawFrame`, HUD signal writes, pause/resume via
  `@capacitor/app`.

### SolidJS UI / HUD

- `src/ui/hudState.ts` — `HudModel` signals (score, lives, paused, deviceClass).
- `src/ui/Hud.tsx` — score + lives display, PAUSED overlay.
- `src/ui/App.tsx` — canvas mount, HUD mount, Capacitor lifecycle, status bar.

### Test suite totals

| Tier | Count | Status |
|---|---|---|
| Unit (Node) | 99 | Passing |
| Browser (Chromium) | 23 | Passing |
| E2E (Playwright) | 12 | Passing across phone/tablet/desktop |

---

## What comes next

See `.agent-state/directive.md` for the live task queue. In priority order:

1. **Original branding + fontography** — final palette, typeface, logo for
   "Illinois Jim and the Shrine of Catastrophe". Replaces `SHRINE_PALETTE`
   placeholder and updates `manifest.theme_color`, `backgroundColor`.

2. **Asset pipeline** — copy Kenney `2DLowPoly` packs from
   `/Volumes/home/assets/2DLowPoly` into `src/assets/`; fetch itch.io packs via
   `ITCH_API_KEY` into `raw-assets/itch/` (gitignored); generate unique sprites
   + branding via Gemini (`GEMINI_API_KEY`).

3. **E2E test suite** — Playwright tests covering load, canvas render, HUD mount,
   and basic touch + keyboard interaction across phone/tablet/desktop form factors.

4. **Gameplay expansion:**
   - Enemy entities (patrol, aggro, collision).
   - Collectibles (coins, relics — score system wired through HUD signals).
   - Mine-cart rail segments (automatic forward motion, jump-off trigger).
   - Multiple levels (level progression, door/exit tiles).

5. **Responsive polish** — visual regression tests for all four form factors;
   ensure HUD layout adapts to phone landscape vs. portrait.
