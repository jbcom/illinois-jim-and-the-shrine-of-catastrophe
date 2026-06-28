---
title: Changelog
updated: 2026-06-28
status: current
domain: context
---

# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).
Versioning is managed by [release-please](https://github.com/googleapis/release-please) —
do not edit version numbers manually.

---

## [Unreleased]

### Added — Milestone 2: Playable Cave Level (PixiJS + ECS + React shell)

**Stack migration**
- Replaced SolidJS with **React 19** + **Tailwind v4** for the UI/HUD layer.
- Replaced canvas 2D `drawFrame` with **PixiJS 8** `PaintingRenderer`
  (`src/render/paintingRenderer.ts`): WebGL renderer, StrictMode-safe (fresh
  canvas per `Application` init avoids poisoned WebGL contexts).
- Replaced the monolithic game loop (`game.ts`) with the ECS loop
  (`src/engine/gameEcs.ts`) driven by a **koota** world and fixed-step systems.
- Added **xstate v5** FSM (`src/ui/gameMachine.ts`) for game-state flow:
  `title → cutscene → playing → won/lost`.
- Upgraded `vite.config.ts`: `@vitejs/plugin-react` + `@tailwindcss/vite`
  replace the former SolidJS Vite plugin.
- Dual **mulberry32 PRNG** (`createRngPair`): separate sim and spawn streams.

**Level architecture — painting + invisible collision**
- `src/render/composition.ts`: `paintComposition` — assembles hand-placed shape
  stamps (pixel rects cut from biome sheets) into a PixiJS `Container`. Levels
  are paintings, not tile grids.
- `src/render/levels/caveDescent.ts`: `CAVE_DESCENT` placement array +
  `CAVE_DESCENT_FRAME` (authored vertical band bounds); cover-scaled to fill the
  canvas height.
- `src/sim/world/gameLevel.ts`: `GameLevel` — invisible collision tilemap +
  spawn lists (collectibles, enemies, pots, goal-x). `DESCENT` is the first
  cave level. Painting and collision share a level id but are authored separately.
- `src/sim/world/levels/`: `shrine01.ts`, `shrine02.ts`, `shrine03.ts` —
  collision + spawn data for three levels.

**ECS sim (koota)**
- `src/sim/ecs/traits.ts`: koota traits — `Position`, `Velocity`, `Size`,
  `Facing`, `Player`, `Enemy`, `Npc`, `Collectible`, `Pot`, `Gravity`, `Hazard`,
  `Lifetime`, `Score`, `MineCart`, particle traits.
- `src/sim/ecs/systems.ts`: pure fixed-step systems — `physicsSystem`,
  `playerSystem`, `enemySystem` (patrol/chase via yuka steering), `combatSystem`
  (whip/stomp kills), `potSystem` (smash + drop spawn), `collectibleSystem`
  (pickup + combo award), `scoreSystem` (combo decay), `mineCartSystem` (rail
  riding), `npcInteractionSystem`, `lifetimeSystem`, `particleSystem`, `spawnBurst`.
- `src/sim/ecs/world.ts`: `createSimWorld`.
- `src/sim/ai/steering.ts`: yuka-based steering for chase enemies.

**Story**
- `src/sim/story/cutscenes.ts`: `Cutscene` type + registry (`intro`, `escape`).
  GenAI 16-bit painted scene images in `public/assets/cutscenes/`.
- `src/sim/story/dialogue.ts`: NPC dialogue script registry (pure data).

**Renderer components (PixiJS 8)**
- `src/render/parallax.ts`: `createParallax` — depth-scrolled `TilingSprite`
  stack. `CAVE_PARALLAX` spec.
- `src/render/playerSprite.ts`: Illinois Jim animator — idle/run/jump/fall/attack
  states from `public/assets/player/illinois-jim-*.png`, feet-anchored,
  scale-flip for facing.
- `src/render/enemySprites.ts`: 4 animated enemy kinds × 5 states from itch.io
  packs (goblin, skeleton, mushroom, flyingEye).
- `src/render/npc.ts`: `composeNpcSheet` — paper-doll NPC compositor; bakes
  skin/clothing/hair/hand layers into a `RenderTexture`.
- `src/render/pots.ts`: `loadPotFrames` — 4-colour breakable pot sheets; row 0
  is the smash sequence.
- `src/render/hpBar.ts`: HP bar overlay.
- `src/render/layers.ts`: render-layer koota traits + compositor functions.
- `src/render/scene.ts`: `buildScene` — full layered scene builder.

**Audio**
- `src/audio/gameAudio.ts`: `createGameAudio` — wires SFX events (whip, stomp,
  coin, pot-break, death) to the ECS world; starts the looping cave-ambience
  music track.

**React UI/HUD**
- `src/ui/gameMachine.ts`: xstate v5 FSM — title → cutscene → playing →
  won/lost. Context carries score, bestScore, cutsceneId.
- `src/ui/App.tsx`: React 19 root shell — PixiJS host div + HUD overlay,
  `useMachine` FSM driver, StrictMode-safe game lifecycle.
- `src/ui/Hud.tsx`: score, combo multiplier, lives display, PAUSED overlay.
- `src/ui/CutscenePlayer.tsx`: full-screen 16-bit cutscene viewer with
  tap/click/Enter narration advance.
- `src/ui/Screens.tsx`: `TitleScreen` + `ResultScreen` (won/lost, score,
  restart/title buttons).
- `src/ui/hudState.ts`: plain reactive HUD store (score, lives, combo, paused).
- `src/ui/persistence.ts`: `loadBestScore` / `saveBestScore` via
  `@capacitor/preferences`.

**Assets**
- `public/assets/player/illinois-jim-*.png`: GenAI Illinois Jim — Imagen-
  generated, magenta-key isolated, height-normalised transparent frames.
- `public/assets/cutscenes/`: GenAI 16-bit cutscene paintings (intro, escape).
- `public/assets/enemies/`: animated enemy sprite packs (goblin, skeleton,
  mushroom, flyingEye) from itch.io.
- `public/assets/npcs/classes/`: layered NPC paper-doll kit.
- `public/assets/breakables/`: breakable pot colour sheets (gray, red, white,
  yellow).
- `public/assets/biomes/`: cave biome sheet for level composition shape stamps.

**Tests**
- `tests/unit/`: expanded to cover ECS systems, FSM, dialogue, cutscenes,
  levels, pots, steering, atlas, brand.
- `tests/browser/`: full PixiJS component suite — paintingRenderer, composition,
  parallax, playerSprite, enemySprites, npc, pots, hpBar, scene, sprites,
  tileLayer, audio, gameAudio, persistence, pixiStrictMode. Proof screenshots
  committed alongside each test.

---

## Milestone 1 — Scaffold + foundation (released)

**Project scaffold and configuration**
- `package.json` with pnpm 9.15.0, Vite 8, TypeScript 6, Biome 2, Vitest 4,
  Playwright 1.61, Capacitor 8, and release-please configuration.
- `vite.config.ts`: PWA plugin, path aliases, `PAGES_BASE` sub-path support.
- `biome.json`: Biome 2 linter + formatter.
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.test.json` / `tsconfig.node.json`.
- `capacitor.config.ts`: appId `com.jbcom.illinoisjim`, `webDir: "dist"`,
  `androidScheme: https`.
- `vitest.config.ts`: `unit` (Node) and `browser` (Chromium) projects.
- `playwright.config.ts`: phone portrait/landscape, tablet, desktop viewports.
- `release-please-config.json`: node release type, conventional-commit sections.
- `.claude/gates.json`: coverage rules, `Math.random`/`performance.now` ban,
  forbidden bash patterns.

**Engine — RNG + clock**
- `src/engine/rng.ts`: `createRng(seed)` mulberry32 facade.
- `src/engine/clock.ts`: `createClock()` fixed-timestep accumulator.

**Sim — physics**
- `src/sim/math/vec2.ts`, `src/sim/physics/aabb.ts`, `src/sim/physics/collide.ts`.

**Sim — world**
- `src/sim/world/tilemap.ts`, `src/sim/world/camera.ts`, `src/sim/world/level.ts`.

**Sim — player controller**
- `src/sim/input/intent.ts`, `src/sim/input/touchModel.ts`.
- `src/sim/player/tuning.ts`, `src/sim/player/player.ts` (`stepPlayer`).

**Engine — viewport / responsive scaler**
- `src/engine/viewport/deviceProfile.ts`, `scaler.ts`, `responsive.ts`.

**Engine — input**
- `src/engine/input/keyboard.ts`, `touch.ts`, `inputManager.ts`.

**CI / CD**
- `.github/workflows/ci.yml`, `release.yml`, `cd.yml`.

**Tests**
- 99 unit tests (vec2, AABB, collision, tilemap, level, camera, clock, rng,
  device-profile, scaler, touchModel, player).
- 23 browser tests (canvas 2D renderer, Web Audio engine).
