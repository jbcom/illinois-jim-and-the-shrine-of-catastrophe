---
title: Changelog
updated: 2026-06-27
status: current
domain: context
---

# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).
Versioning is managed by [release-please](https://github.com/googleapis/release-please) —
do not edit version numbers manually.

---

## 1.0.0 (2026-06-28)


### Features

* asset pipeline — CC0 Kenney sprites + atlas + itch/Gemini scripts ([e40371f](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/e40371fd754ae19ca156ea3be62b41ea99bd2870))
* canvas2d renderer with camera + interpolation ([839b64c](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/839b64c9e3f645372e478a8e48ccac4a50ea081e))
* deterministic engine foundation — RNG + fixed-timestep clock ([15500f6](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/15500f67b6c801a3058e988f50dcc40b7a253e14))
* device-aware responsive viewport scaler ([88010af](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/88010af503e2fae86a0a2924b5d6440fdc4b8b46))
* game loop + SolidJS HUD — first playable build ([c9d1aca](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/c9d1acabb4ca07f5829337613e81d1f18c9995c0))
* mobile-first input — virtual touch controls + keyboard, merged to intent ([585b671](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/585b6712156e3b41fd4183a4befe7cc34f6f91f8))
* original brand identity — palette + typography ([cac6c16](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/cac6c1666a1a7b52c7857af0af604843c0a799cf))
* player controller — run/jump/whip with platformer feel ([bf0e59e](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/bf0e59e22e291df75dc2fa96115a237acae2ac00))
* side-scroll camera with deadzone follow + level clamping ([3ab36ee](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/3ab36ee0152300f35443949510a1cd2ef58eb533))
* sim physics core — vec2, AABB, tilemap, swept tile collision ([b20e7e5](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/b20e7e5cbf17c577ad2876d6a521293b650e4e0c))
* Web Audio engine with procedural SFX bank ([f8922bf](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/f8922bf30ad9c1f7e40796fdfcee1f89d62c5d21))


### Bug Fixes

* address PR review — release APK, RNG bounds guards, key parsing ([f107b70](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/f107b70977e83ff65f06efc7ace0a3d97fa19e41))


### Refactors

* simplify collision sweep + player step; clear all lint warnings ([2ce04a1](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/2ce04a1dbca9f5b854d91c6b74f5d2249ff6e146))


### Documentation

* standard-repo docs + asset-pipeline art direction ([c390133](https://github.com/jbcom/illinois-jim-and-the-shrine-of-catastrophe/commit/c39013360f8858b3d72abbd923621dba6c026160))

## [Unreleased]

### Added

**Project scaffold and configuration**
- `package.json` with pnpm 9.15.0, Vite 8, TypeScript 6, Biome 2, Vitest 4,
  Playwright 1.61, Capacitor 8, SolidJS 1.9, and release-please configuration.
- `vite.config.ts`: SolidJS plugin, PWA plugin (`vite-plugin-pwa`), path aliases
  (`@`, `@sim`, `@engine`, `@render`, `@ui`, `@audio`, `@assets`), `PAGES_BASE`
  sub-path support for GitHub Pages builds.
- `biome.json`: Biome 2 linter + formatter (2-space indent, 100-char line width,
  double quotes, trailing commas, import organizer).
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.test.json` / `tsconfig.node.json`.
- `capacitor.config.ts`: appId `com.jbcom.illinoisjim`, `webDir: "dist"`,
  dark background `#17110b`, `androidScheme: https`.
- `vitest.config.ts`: `unit` project (Node, pure sim) and `browser` project
  (Chromium via `@vitest/browser-playwright`).
- `playwright.config.ts`: multi-project across phone portrait, phone landscape,
  tablet, and desktop viewports.
- `release-please-config.json`: node release type, conventional-commit sections.
- `.claude/gates.json`: pre-commit coverage rules, `Math.random`/`performance.now`
  ban patterns for sim+engine, forbidden bash patterns.

**Engine — RNG + clock facades**
- `src/engine/rng.ts`: `createRng(seed)` — mulberry32 deterministic PRNG facade.
  Sim code must never call `Math.random()` directly.
- `src/engine/clock.ts`: `createClock()` — fixed-timestep accumulator (default
  1/60 s step, max 5 sub-steps). Returns `{ steps, dt, alpha }` per tick.
  `alpha` is the interpolation fraction for the renderer.

**Sim — physics**
- `src/sim/math/vec2.ts`: 2D vector type + `clamp` utility.
- `src/sim/physics/aabb.ts`: axis-aligned bounding box helpers.
- `src/sim/physics/collide.ts`: `moveAndCollide` — swept tile collision against
  all tile kinds (solid, one-way platform, hazard); returns hit flags + hazard
  touch flag.

**Sim — world**
- `src/sim/world/tilemap.ts`: `TileKind` enum (Empty, Solid, Platform, Rail,
  Hazard, Ladder), flat row-major tile grid, query helpers.
- `src/sim/world/camera.ts`: `createCamera` + `followCamera` — deadzone scroll
  camera clamped to level bounds.
- `src/sim/world/level.ts`: `parseLevel` — ASCII level art parser. Characters:
  `.` empty, `#` solid, `=` one-way platform, `^` hazard, `H` ladder, `~` rail,
  `@` player spawn.
- `src/sim/world/levels/shrine01.ts`: `SHRINE_01` — "Threshold of the Shrine",
  the first hand-authored demo level.

**Sim — player controller**
- `src/sim/input/intent.ts`: `PlayerIntent` interface (moveX, moveY, jumpPressed,
  jumpHeld, whipPressed) + `NEUTRAL_INTENT`.
- `src/sim/input/touchModel.ts`: pure touch→intent model (no DOM); `touchToAxes`
  maps pointer positions + `TouchLayout` to axes and button states.
- `src/sim/player/tuning.ts`: `PlayerTuning` interface + `DEFAULT_TUNING`
  constants (runSpeed 130, gravity 900, jumpSpeed 330, coyoteTime 0.08,
  jumpBuffer 0.1, whipReach 26, whipDuration 0.18, etc.).
- `src/sim/player/player.ts`: `stepPlayer` — deterministic platformer controller.
  Implements acceleration/deceleration curves, variable-height jump (early-release
  gravity multiplier), coyote time, jump buffering, whip state, hazard death.

**Engine — viewport / responsive scaler**
- `src/engine/viewport/deviceProfile.ts`: `classifyDevice` — pure classifier
  producing `DeviceProfile` category (phone, tablet, foldable, desktop) from CSS
  dimensions, DPR, and platform string.
- `src/engine/viewport/scaler.ts`: `computeViewport` — pure "contain/fit"
  letterbox geometry: largest integer-friendly scale that fits the design
  resolution within the canvas, centered with pillarbox/letterbox bars.
- `src/engine/viewport/responsive.ts`: DOM + Capacitor adapter; reads
  `window.innerWidth/Height`, `devicePixelRatio` (capped at 2),
  `@capacitor/device` platform, `@capacitor/screen-orientation`; debounces
  resize/orientationchange events; exposes `current()` / `onChange()` / `dispose()`.

**Engine — input**
- `src/engine/input/keyboard.ts`: DOM `keydown`/`keyup` → `PlayerIntent`. Bound
  keys: WASD + arrows (move), Space/Z/K (jump), X/J/ShiftLeft (whip).
- `src/engine/input/touch.ts`: Pointer Events adapter → `touchModel.touchToAxes`.
- `src/engine/input/inputManager.ts`: `createInputManager` — merges touch +
  keyboard intents (touch axes take priority when non-zero).

**Engine — game loop**
- `src/engine/game.ts`: `createGame` — `requestAnimationFrame` loop. Each frame:
  `clock.tick` → `input.poll` → N × `stepPlayer` → `followCamera` →
  `drawFrame` (with interpolation alpha) → HUD signal writes.
  Respawns player on death. Handles pause via `@capacitor/app` lifecycle events.

**Renderer**
- `src/render/renderer.ts`: `drawFrame(ctx, FrameInput)` — canvas 2D renderer.
  `SHRINE_PALETTE` derives from the `BRAND` tokens in `src/brand.ts` (obsidian, stone, sandstone, idolGold, relicGold, bloodRed, parchment, steel
  rail `#9a9a9a`, player `#f3e9d2`, whip `#e8c66b`). Camera projection transforms
  world coordinates into canvas pixels via the `ViewportGeometry` scale + offset.
  Player and whip are drawn with interpolated positions.

**Audio**
- `src/audio/audioEngine.ts`: `createAudioEngine` — Web Audio context wrapper;
  unlock-on-user-gesture, master gain bus, per-bus gain control, SFX scheduling.
- `src/audio/sfxBank.ts`: procedural SFX bank — `renderBlip`, `renderCoin`,
  `renderThud`, `renderWhipCrack` — square, triangle, and noise envelopes rendered
  into `AudioBuffer`s; no asset files required.

**SolidJS UI / HUD**
- `src/ui/hudState.ts`: `HudModel` Solid signal bridge (score, lives, paused,
  deviceClass). Engine writes via setters; components read via reactive getters.
- `src/ui/Hud.tsx`: score and lives display, PAUSED overlay.
- `src/ui/App.tsx`: mounts canvas + HUD, Capacitor app lifecycle pause/resume,
  status bar hide.

**CI / CD**
- `.github/workflows/ci.yml`: lint → typecheck → unit tests → Playwright Chromium
  install → browser tests → build; runs on PR and push to main.
- `.github/workflows/release.yml`: release-please PR automation + debug APK build
  (Java 21, Gradle `assembleDebug`) + build-provenance attestation + APK attached
  to GitHub release; triggers on push to main when a release is created.
- `.github/workflows/cd.yml`: GitHub Pages deploy; builds with
  `PAGES_BASE=/illinois-jim-and-the-shrine-of-catastrophe/`; triggers on push to
  main and `workflow_dispatch`.

**Tests**
- `tests/unit/`: 99 passing unit tests covering vec2, AABB, collision, tilemap,
  level parser, camera, clock, rng, device-profile classifier, viewport scaler,
  touch model, and player controller.
- `tests/browser/`: 23 passing browser tests covering the canvas 2D renderer and
  the Web Audio engine, running in real Chromium.
