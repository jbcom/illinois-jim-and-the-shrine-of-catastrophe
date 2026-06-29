---
title: Current Project State
updated: 2026-06-29
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
- `src/sim/world/levelSpec.ts` — the SINGLE SOURCE OF TRUTH for a level: a
  `LevelSpec` is an ordered list of surface SEGMENTS (`ground` | `raised` | `gap`)
  laid left-to-right from x=0, plus overlay `platforms` (rooftops/ledges) stacked
  above the floor. Props + spawns + goal anchor RELATIVELY (`{seg, t, dy}`) — no
  absolute world coords. `buildLevel` derives the collision tilemap + world-space
  spawns + goal; `render/levels/fromSpec.ts` `paintingFromSpec` derives the
  painting from the SAME segments — so collision and painting cannot drift.
  NARRATIVE ANCHORING: every raised surface names its `anchorProp` (the beam /
  staircase / rooftop you stand on) — there is no floating platform.
- `src/sim/world/specs/*` — the five level specs. `src/sim/world/gameLevel.ts`
  builds each via `buildLevel`. The story's FIVE levels: `VILLAGE` (overworld
  opener, with rooftop platforms) → `DESCENT` (the cave) → `SHRINE` (the sanctum
  approach) → `SHRINE_HEART` (the idol-grab climax) → `ESCAPE_RUN` (the collapsing
  flight out). Paired with their paintings by id in `src/render/levels/registry.ts`
  (`LEVEL_ORDER` drives the data-driven cutscene→level chain; the full arc is
  village → descent → ruins → shrine → catastrophe → escape ending).

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

### Story — campaign + cutscenes + dialogue

- `src/sim/story/campaign.ts` — the `CAMPAIGN` array: the SINGLE source of truth for
  level order + cutscene chain (see `docs/STORY.md`). Level order, first/next level, and
  the cutscene chain all derive from it.
- `src/sim/story/cutscenes.ts` — `Cutscene` type + `cutsceneById`; `CUTSCENES` is DERIVED
  from the campaign (one intro per chapter + the cliffhanger), GenAI 16-bit painted scenes.
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

A complete **5-level campaign**, playable end-to-end (see `docs/STORY.md`):

- **Landing screen** with PLAY button → the **intro cutscene** (16-bit GenAI scene +
  narration) → the campaign.
- **5 live GenAI levels** in story order — Halward's Reach (clifftop village) →
  The Whispering Jungle → The Rushing Gorge → The Abandoned Mine → The Crystal Cavern.
  Each is Gemini-authored (Zod `Level` schema, validated), rendered from baked
  transparent 3D props over curated 2D parallax, with physics, animated enemies
  (goblin/skeleton/mushroom/flyingEye visuals), breakable pots, collectibles, the
  problem-solving layer (hazards, switches+gates, moving platforms, secrets), and NPCs.
- **Bridge cutscenes** between every level; the arc ends on a **cliffhanger** that
  frames levels 6–10 as the next chapter → win screen.
- **Lose condition** — lose all lives → result screen.
- **Score + combo system** — kills + collectibles award points; rapid collection builds
  a decaying combo multiplier.
- **Audio** — procedural SFX (whip, coin, thud, blip) + looping ambience; gesture-unlocked.
- **Best score persistence** via `@capacitor/preferences`.
- **DEV `?level=<id>`** boot override jumps straight into any level for verification.

---

## Milestone history (shipped — condensed from the old directive)

The directive is kept LEAN (operating mode + the live queue only); shipped history
lives here so it doesn't reload every session.

- **Scaffold (2026-06-27, PR #1/#3):** the arcade-game stack — Vite + TS + Capacitor
  + Biome + Playwright + release-please; engine/sim/render/ui foundations; CI →
  release → cd; Android APK; live on GitHub Pages.
- **Milestone 2 — the complete cave game (2026-06-28, PR #9):** React 19 + PixiJS 8
  + koota ECS + xstate FSM; the painting renderer (organic shape stamps, not tiles);
  all-4 animated enemies, NPC paper-doll factory + dialogue, breakable pots, scoring
  + combo, mine-cart rails, procedural audio, cutscene flow, persistence, landing.
- **Milestone 3 — the real narrative (2026-06-28, PR #11-#13):** overworld→cave with
  cutscenes, NPCs, dialogue; sprite-scale (content-height), flicker, death-plane,
  cutscene timing, typography fixes; death-loop fix (lost-pointerup phantom joystick).
- **Milestone 4 — mobile viewport (PR #15-#22):** torch-wall + safe-area + portrait
  fixes; DEVICE-PROFILE orientation (phones lock, unfolded foldables free; web
  classifies by physical px + Android UA); multi-aspect GenAI; framed HUD + dialogue
  bar; visible touch controls; the surface-SPEC level architecture (relative
  positioning, narrative-anchored platforms) + the 5 hand-built levels (village →
  cave → shrine → heart → escape); the ground-void/camera-pin/thin-strip framing fix.

- **Milestone 5 — the 3D-baked-to-2D GenAI campaign (2026-06-29):** the binding pivot.
  3D is a PRODUCTION TOOL, not the runtime: characters + props are generated as 3D GLB
  via Meshy, baked offline (Blender bpy, alpha) to TRANSPARENT WebP sprites, and rendered
  by the existing PixiJS 2D engine over Gemini 2D parallax. Gemini authors each level
  start-to-finish (art manifest + surfaces + the problem-solving layer) via a Zod `Level`
  schema; `buildFromLevel` + `genaiBundle` adapt it to a live bundle. Shipped: the full
  baked cast (player 5 clips, 2 enemies, 4 NPCs) + 5 live levels (Halward → jungle → gorge
  → mine → crystal), each Chrome-verified. Tooling: `bake-prop.py` (`--pitch` for
  flat-lying disks), `gen-level-parallax.ts`, `gen-cutscenes.ts`, the propBake alpha proof
  (43 props), the `?level=` dev override.
  - **Hard-won pipeline rules** (also in the genai-level-pipeline memory): `role:ground`
    and `role:decor` art (ground tiles, water, waterfall, lava-glow) is OPAQUE from Gemini
    — it becomes the bundle's `groundFill` or stays in the parallax, NEVER a foreground
    placement OR surface anchorArt sprite (it stamps a garbage rectangle either way); bake
    it transparent (e.g. the mine rail) when it must read as a foreground object.
    Chroma-keying gameplay art is forbidden.
- **Milestone 6 — the 5-level campaign + cleanup (2026-06-29):** restructured the story so
  the game ships as a complete 5-level arc with a cliffhanger ending, with a single
  ordered `CAMPAIGN` array as the source of truth (level order + cutscene chain + flow all
  derive from it — see `docs/STORY.md`); deleted the legacy shape-stamp level system end to
  end (5 render modules + 5 sim specs + levelSpec/fromSpec/overworldShapes + 7 test files);
  generated 6 fresh biome-matched cutscene scenes (Gemini, 3 aspects each); threaded the
  authored enemy patrol `range` through to the sim; added the switch ON/OFF visual.

## What comes next

See `.agent-state/directive.md` for the live task queue. The next chapter is **levels 6–10**
(sunken ruins → lava temple → the shrine → catastrophe → the long way up), authored + baked
the same way and appended to `CAMPAIGN`. They are gated only by Meshy credit (each needs
~10 baked 3D props). Other pending polish: dedicated baked jungle-enemy + serpent + spider
characters (currently stand-ins), goblin hurt/death clips, a Playwright E2E pass across
form factors, and an Android APK device smoke-test.
