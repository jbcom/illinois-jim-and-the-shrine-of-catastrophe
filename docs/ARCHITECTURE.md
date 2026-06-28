---
title: System Architecture
updated: 2026-06-28
status: current
domain: technical
---

# System Architecture

## Layered diagram

```
┌──────────────────────────────────────────────────────────────┐
│  src/sim/                                                    │
│  Pure deterministic TypeScript — no DOM, no Math.random,     │
│  no performance.now. Replayable from (seed, intents).        │
│                                                              │
│  math/vec2  physics/aabb+collide  world/tilemap+camera       │
│  world/gameLevel (collision data)  world/level (ASCII util)  │
│  player/player+tuning  input/intent+touchModel               │
│  ecs/traits+systems+world  ai/steering                       │
│  story/cutscenes+dialogue                                    │
└────────────────────────┬─────────────────────────────────────┘
                         │ consumed by
┌────────────────────────▼─────────────────────────────────────┐
│  src/engine/                                                 │
│  Browser glue — the only layer allowed to touch DOM,         │
│  performance.now, or Capacitor plugins.                      │
│                                                              │
│  rng.ts (dual mulberry32)  clock.ts (fixed-step)             │
│  input/keyboard+touch+inputManager                           │
│  viewport/deviceProfile+scaler+responsive                    │
│  gameEcs.ts (rAF loop, koota world, PixiJS paint)            │
└──────┬───────────────────────┬────────────────────────┬──────┘
       │                       │                        │
┌──────▼──────────┐  ┌─────────▼──────────┐  ┌─────────▼──────┐
│ src/render/     │  │ src/ui/            │  │ src/audio/     │
│ PixiJS 8        │  │ React 19 + Tailwind│  │ Web Audio      │
│ paintingRenderer│  │ App.tsx            │  │ audioEngine    │
│ composition.ts  │  │ Hud.tsx            │  │ sfxBank        │
│ (organic shape  │  │ CutscenePlayer.tsx │  │ gameAudio      │
│  stamps)        │  │ Screens.tsx        │  │ (cave ambience │
│ playerSprite.ts │  │ gameMachine.ts     │  │  + SFX)        │
│ enemySprites.ts │  │ hudState.ts        │  │                │
│ npc.ts  pots.ts │  │ persistence.ts     │  │                │
│ hpBar.ts        │  │ (@xstate/react v5) │  │                │
└─────────────────┘  └────────────────────┘  └────────────────┘
```

Import direction: each box may only import from boxes above it in the diagram.
Exception: `gameEcs.ts` in `engine/` imports `hudState.ts` from `ui/` to write
the HUD store, and imports render components from `src/render/`.

---

## Data flow per frame

The game loop in `src/engine/gameEcs.ts` runs on `requestAnimationFrame`:

```
1. clock.tick(performance.now())
   → { steps: N, dt: 0.01667, alpha: 0..1 }

2. input.poll()
   → PlayerIntent { moveX, moveY, jumpPressed, jumpHeld, whipPressed }
   (touch axes take priority; keyboard fills in when touch is inactive)

3. for i in 0..steps:
     physicsSystem(world, dt)   — gravity + moveAndCollide for all entities
     playerSystem(world, intent, dt) — run/jump/whip timers
     enemySystem(world, dt)     — patrol/chase AI via yuka steering
     combatSystem(world)        — whip/stomp kill checks
     potSystem(world)           — smash + drop spawn
     collectibleSystem(world)   — pickup detection + combo award
     mineCartSystem(world, dt)  — cart rail riding
     scoreSystem(world)         — combo decay
     npcInteractionSystem(world)— nearest-NPC talk prompt
     lifetimeSystem(world, dt)  — particle/FX expiry
     particleSystem(world, dt)  — particle motion

4. camera = followCamera(camera, playerCenter, levelBounds)

5. renderer.render({ world, camera, viewport, alpha, prev })
   PaintingRenderer (PixiJS 8):
     a. parallax backdrop scrolls fractionally by depth layer
     b. painted level composition (organic shape stamps from biome sheets,
        assembled by composition.ts + render/levels/caveDescent.ts) —
        cover-scaled so the authored vertical band fills the canvas height
     c. actor sprites synced from sim entities (Position interpolated
        with alpha between prev and current step):
        - player (illinois-jim-*.png strip, feet-anchored)
        - enemies (animated packs: goblin/skeleton/mushroom/flyingEye)
        - breakable pots (4-frame smash animation)
        - collectibles (relic gems)
        - HP bar overlay (hpBar.ts)

6. hudStore.setScore / setLives / setCombo
   → React re-renders only the changed HUD nodes (fine-grained state)
```

The clock caps sub-steps at 5 to prevent the "spiral of death" under lag.
Collision is driven by the invisible `GameLevel.map` tilemap (authored in
`src/sim/world/gameLevel.ts`) — entirely separate from the painted visuals.

---

## Level architecture: painting + invisible collision

Levels are NOT tile grids on screen. A level has two distinct halves:

- **Render side** (`src/render/levels/caveDescent.ts`): an array of `Placement[]`
  — named shape stamps (pixel rects cut from biome sheets) placed at authored
  world positions to build a hand-painted cave scene. `composition.ts` assembles
  these into a PixiJS `Container`.

- **Sim side** (`src/sim/world/gameLevel.ts`): an invisible `TileMap` whose solid
  tiles match the visual ground. Physics runs against this; the painter never
  reads it.

The two halves share a level id (`"cave-descent"`) and are designed to align:
the tilemap's solid floor row sits at the same world-y as the painted floor.

---

## Determinism model

The sim is driven by pure systems over a koota ECS world:

```
(World, PlayerIntent, dt: number) → World (mutated in place)
```

Deterministic replay is achieved by:

- **Dual seeded RNG** — `createRngPair(seed)` (two mulberry32 streams: one for
  the sim, one for spawn). Seed is the only external randomness input.
- **Fixed timestep** — `createClock()` outputs integer step counts with a
  constant `dt`. Floating-point arithmetic is identical across runs.
- **No hidden state** — all sim state lives in koota traits (plain data). No
  `Math.random()`, no `performance.now()` inside `src/sim/**`.

Recording an intent stream and replaying it against the same seed produces
bit-identical entity state at every step. Verified by ECS unit tests.

---

## UI / FSM model

The React shell (`src/ui/App.tsx`) runs an xstate v5 machine (`gameMachine.ts`):

```
title ──START──► cutscene(intro) ──CUTSCENE_DONE──► playing
                                                        │
                                            WIN         │    LOSE
                                             ▼          │     ▼
                                    cutscene(escape)   lost ◄─┘
                                             │
                                    CUTSCENE_DONE
                                             ▼
                                            won
                        won/lost ──RESTART──► playing
                        won/lost ──TO_TITLE──► title
```

The FSM governs which screen (TitleScreen / CutscenePlayer / Hud / ResultScreen)
is displayed and whether the engine is paused. The engine runs continuously;
`g.setPaused(true/false)` is called on state transitions.

Best score is persisted via `@capacitor/preferences` (`persistence.ts`).

---

## Responsive / device-profile model

The viewport pipeline resolves before the first frame and on every resize or
orientation change:

```
window.innerWidth/Height + devicePixelRatio (capped at 2)
     + @capacitor/device platform ("ios"|"android"|"web")
     + @capacitor/screen-orientation
          │
          ▼
classifyDevice() → DeviceProfile
  { category: "phone"|"tablet"|"foldable"|"desktop", orientation, dpr, ... }
          │
          ▼
computeViewport(profile, canvasW, canvasH) → ViewportGeometry
  { scale, offsetX, offsetY, viewW, viewH }
          │
          ▼
PixiJS Application tracks the host container's CSS box and keeps
the backing WebGL canvas + app.screen in sync (resizePlugin + resolution).
```

`deviceProfile.ts` and `scaler.ts` are pure — no DOM — and are fully unit-tested
in Node. `responsive.ts` wraps them with DOM + Capacitor calls and debounces
updates at 100 ms.

The `ViewportGeometry` is passed to `renderer.render()` each frame so the
renderer always projects with the current scale.

---

## Build targets

### GitHub Pages (primary web target)

Vite builds with `PAGES_BASE=/illinois-jim-and-the-shrine-of-catastrophe/` set
as an environment variable. The `base` field in `vite.config.ts` reads this
variable; it defaults to `/` for local dev and Capacitor.

The PWA plugin registers a service worker and produces a `manifest.webmanifest`
for offline-capable, installable web delivery.

Output: `dist/` uploaded to Pages via `actions/upload-pages-artifact`.

### Android APK (Capacitor)

`capacitor.config.ts` sets `appId: "com.jbcom.illinoisjim"` and `webDir: "dist"`.
The release workflow:

1. Runs `pnpm build` (without `PAGES_BASE` — uses `/` base).
2. `pnpm cap:add:android` scaffolds the `android/` directory.
3. `pnpm cap:sync` copies the web build into the Android project.
4. `./gradlew assembleDebug` produces the APK.
5. `actions/attest-build-provenance` signs the APK's provenance.
6. `gh release upload` attaches the APK to the GitHub release.

The Android WebView renders the game fullscreen (`#17110b` background,
`androidScheme: https`). PixiJS renders into a WebGL canvas.
