---
title: Current Project State
updated: 2026-06-28
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
  Playwright 1.61, Capacitor 8, React 19, xstate 5, koota, PixiJS 8,
  Tailwind v4, `vite-plugin-pwa`.
- `vite.config.ts` — React + Tailwind v4 plugins, PWA plugin, path aliases,
  `PAGES_BASE` support for GitHub Pages builds.
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

### Engine — RNG + clock

- `src/engine/rng.ts` — `createRngPair(seed)`: dual mulberry32 facade (one sim
  stream, one spawn stream). Sim code never calls `Math.random()` directly.
- `src/engine/clock.ts` — `createClock()`: fixed-timestep accumulator (1/60 s,
  max 5 sub-steps), outputs `{ steps, dt, alpha }`.

### Sim — physics

- `src/sim/math/vec2.ts` — Vec2 type, `clamp`, `lerp`.
- `src/sim/physics/aabb.ts` — AABB construction and query helpers.
- `src/sim/physics/collide.ts` — `moveAndCollide`: swept tile collision; handles
  Solid, one-way Platform (fall-through from below), Rail, Hazard (kill flag).

### Sim — world

- `src/sim/world/tilemap.ts` — `TileKind` enum, flat tile grid, set/get helpers.
- `src/sim/world/camera.ts` — `createCamera` + `followCamera` deadzone scroll,
  level-bounds clamp.
- `src/sim/world/level.ts` — `parseLevel` ASCII utility + `levelBounds`.
- `src/sim/world/gameLevel.ts` — `GameLevel` type: invisible collision tilemap +
  spawns (collectibles, enemies, pots, npcs, goal). The story's three levels:
  `VILLAGE` (overworld opener) → `DESCENT` (the cave) → `SHRINE` (the climax,
  the cracked staircase to the golden idol). Paired with their paintings by id in
  `src/render/levels/registry.ts` (`LEVEL_ORDER` drives the cutscene→level chain).

### Sim — player controller

- `src/sim/input/intent.ts` — `PlayerIntent` interface, `NEUTRAL_INTENT`.
- `src/sim/input/touchModel.ts` — pure touch→intent model; `touchToAxes`.
- `src/sim/player/tuning.ts` — `PlayerTuning` interface + `DEFAULT_TUNING`.
- `src/sim/player/player.ts` — `stepPlayer`: run/jump/whip, coyote time (0.08 s),
  jump buffering (0.1 s), variable jump height (early-release gravity multiplier),
  gravity 900, maxFall 520.

### Engine — viewport / responsive scaler

- `src/engine/viewport/deviceProfile.ts` — `classifyDevice` pure classifier.
- `src/engine/viewport/scaler.ts` — `computeViewport` pure letterbox geometry.
- `src/engine/viewport/responsive.ts` — DOM + `@capacitor/device` +
  `@capacitor/screen-orientation` adapter; DPR cap 2; debounced resize updates.

### ECS sim — koota world

- `src/sim/ecs/traits.ts` — koota traits: `Position`, `Velocity`, `Size`,
  `Facing`, `Player`, `Enemy`, `Npc`, `Collectible`, `Pot`, `Gravity`, `Hazard`,
  `Lifetime`, `Score`, `MineCart`, and particle traits.
- `src/sim/ecs/systems.ts` — pure ECS systems (fixed-step, no DOM/RNG):
  `physicsSystem`, `playerSystem`, `enemySystem`, `combatSystem`, `potSystem`,
  `collectibleSystem`, `scoreSystem`, `mineCartSystem`, `npcInteractionSystem`,
  `lifetimeSystem`, `particleSystem`, `spawnBurst`.
- `src/sim/ecs/world.ts` — `createSimWorld`: constructs + seeds the koota world.
- `src/sim/ai/steering.ts` — yuka-based steering for chase AI.

### Story — cutscenes + dialogue

- `src/sim/story/cutscenes.ts` — `Cutscene` type + registry; `cutsceneById`.
  "intro" and "escape" cutscenes with GenAI 16-bit painted scenes.
- `src/sim/story/dialogue.ts` — dialogue script registry (NPC lines, pure data).

### Engine — input

- `src/engine/input/keyboard.ts` — DOM key events → `PlayerIntent`.
- `src/engine/input/touch.ts` — Pointer Events adapter → `touchModel`.
- `src/engine/input/inputManager.ts` — `createInputManager`; merges touch +
  keyboard (touch priority).

### Engine — ECS game loop

- `src/engine/gameEcs.ts` — `createGame`: rAF loop, dual-PRNG seed, fixed-step
  ECS systems, `PaintingRenderer` paint, HUD store writes, pause/resume via
  `@capacitor/app`. Rebuilds the koota world on restart (koota caps live worlds at
  16; destroying the old world prevents leaks across deaths).

### Renderer — PixiJS 8 painting

- `src/render/paintingRenderer.ts` — `createPaintingRenderer`: PixiJS
  `Application` that creates its own `<canvas>` inside the host div (StrictMode-
  safe — fresh canvas per init = virgin WebGL context). Layers: parallax backdrop
  → level painting → actor sprites. Cover-scales the authored vertical band to
  fill the canvas height.
- `src/render/composition.ts` — `paintComposition`: assembles `Placement[]` shape
  stamps (pixel rects cut from biome sheets) into a PixiJS `Container`.
- `src/render/levels/{villageApproach,caveDescent,shrineApproach}.ts` — each a
  `*_APPROACH`/`*_DESCENT` placement array + a `*_FRAME` (authored vertical band).
  The shrine reuses the cave masonry catalog plus `src/render/shrineShapes.ts`
  (`SHRINE_PROPS`: idol-altar, cracked steps, braziers, broken pillars — GenAI
  props isolated by `scripts/prep-props.mjs`).
- `src/render/parallax.ts` — `createParallax`: depth-scrolled `TilingSprite`
  stack. `CAVE_PARALLAX` spec.
- `src/render/playerSprite.ts` — Illinois Jim strip controller (idle/run/jump/
  fall/attack states, feet-anchored, scale-flip for facing).
- `src/render/enemySprites.ts` — 4 animated enemy kinds × 5 states from real
  itch.io packs (goblin/skeleton/mushroom/flyingEye).
- `src/render/npc.ts` — `composeNpcSheet`: paper-doll NPC compositor (skin /
  clothing / hair / hand layers baked to a `RenderTexture`).
- `src/render/pots.ts` — `loadPotFrames`: 4-colour breakable pot sheets (4×4
  grid; row 0 = smash sequence).
- `src/render/hpBar.ts` — HP bar overlay.
- `src/render/sprites.ts` — `sliceStrip`, `animatedFromStrip` primitives.
- `src/render/tileLayer.ts` — `@pixi/tilemap` grid paint (Kenney tileset; used
  for debug/UI layers, not the cave painting).
- `src/render/scene.ts` — `buildScene`: full layered scene builder for the render
  koota world.
- `src/render/layers.ts` — render-layer traits (`Layer`, `ParallaxBg`,
  `TileLayerRef`, `SpriteRef`, `Anim`) + compositor functions.

### Audio

- `src/audio/audioEngine.ts` — `createAudioEngine`: Web Audio context, unlock-
  on-gesture, master gain bus, per-bus gain control, SFX scheduling.
- `src/audio/sfxBank.ts` — procedural SFX: `renderBlip`, `renderCoin`,
  `renderThud`, `renderWhipCrack` (square, triangle, noise envelopes; no files).
- `src/audio/gameAudio.ts` — `createGameAudio`: wires SFX events to the ECS
  world (whip, stomp, coin, pot-break, death); starts the looping cave-ambience
  music track.

### React UI / HUD (React 19 + Tailwind v4 + xstate v5)

- `src/ui/gameMachine.ts` — xstate v5 FSM: `title → cutscene → playing →
  won/lost`. Context carries `score`, `bestScore`, `cutsceneId`. Events:
  `START`, `WIN`, `LOSE`, `RESTART`, `TO_TITLE`, `CUTSCENE_DONE`, `SET_BEST`.
- `src/ui/App.tsx` — root shell: mounts the PixiJS host div + HUD overlay,
  drives the FSM via `useMachine`, manages game lifecycle (init/dispose/restart).
  StrictMode-safe via `pendingRef` promise chain.
- `src/ui/Hud.tsx` — in-game HUD: score, combo multiplier, lives display, PAUSED
  overlay. Reads from `hudStore`.
- `src/ui/CutscenePlayer.tsx` — full-screen 16-bit cutscene viewer. Shows the
  GenAI painted scene image; tap/click/Enter advances through narration lines.
- `src/ui/Screens.tsx` — `TitleScreen` + `ResultScreen` (won/lost, score display,
  restart / title buttons).
- `src/ui/hudState.ts` — `hudStore`: plain reactive store (score, lives, combo,
  paused). Engine writes via setters; React components read via `useSyncExternalStore`.
- `src/ui/persistence.ts` — `loadBestScore` / `saveBestScore` via
  `@capacitor/preferences` (cross-platform key-value store).

### Test suite totals

| Tier | Count | Status |
|---|---|---|
| Unit (Node) | ~120+ | Passing (ecs, gameMachine, dialogue, cutscenes, levels, pots, steering, camera, player, physics, rng, clock, device-profile, scaler) |
| Browser (Chromium) | ~30+ | Passing (paintingRenderer, composition, parallax, playerSprite, enemySprites, npc, pots, hpBar, scene, sprites, tileLayer, audio, gameAudio, persistence, pixiStrictMode) |
| E2E (Playwright) | in progress | See directive |

---

## Current game state

The game is playable end-to-end:

- **Landing screen** (`TitleScreen`) with PLAY button.
- **Opening cutscene** ("intro") — 16-bit GenAI scene + narration, tap to
  advance.
- **Playable cave level** ("The Descent"): hand-painted cave with organic shape
  stamps (no tile grid visible), parallax backdrop, physics, enemies (goblin,
  skeleton, mushroom, flyingEye), breakable pots, collectible relics, a mine-cart
  rail segment, and an NPC.
- **Win condition** — reach the goal-x relic block → ending cutscene ("escape")
  → result screen with final score and best score.
- **Lose condition** — lose all lives → result screen.
- **Score + combo system** — kills and collectibles award points; rapid collection
  builds a combo multiplier (decays over time).
- **Audio** — procedural SFX (whip crack, coin, thud, blip) + looping cave-
  ambience music; unlocked on first user gesture.
- **Best score persistence** — saved across sessions via `@capacitor/preferences`.

---

## What comes next

See `.agent-state/directive.md` for the live task queue. Pending areas include:

1. **E2E test suite** — Playwright tests for full flow across phone/tablet/desktop.
2. **Additional levels** — levels 2 and 3 paintings + collision + enemy layouts.
3. **Responsive polish** — visual regression for all four form factors.
4. **Android APK smoke-test** — physical device run.
