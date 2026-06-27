---
title: System Architecture
updated: 2026-06-27
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
│  math/vec2  physics/aabb+collide  world/tilemap+camera+level │
│  player/player+tuning  input/intent+touchModel               │
└────────────────────────┬─────────────────────────────────────┘
                         │ consumed by
┌────────────────────────▼─────────────────────────────────────┐
│  src/engine/                                                 │
│  Browser glue — the only layer allowed to touch DOM,         │
│  performance.now, or Capacitor plugins.                      │
│                                                              │
│  rng.ts (mulberry32)  clock.ts (fixed-step)                  │
│  input/keyboard+touch+inputManager                           │
│  viewport/deviceProfile+scaler+responsive                    │
│  game.ts (rAF loop)                                          │
└──────┬───────────────────────┬────────────────────────┬──────┘
       │                       │                        │
┌──────▼──────┐  ┌─────────────▼──────────┐  ┌─────────▼──────┐
│ src/render/ │  │ src/ui/                │  │ src/audio/     │
│ canvas 2D   │  │ SolidJS HUD components │  │ Web Audio      │
│ drawFrame() │  │ App.tsx Hud.tsx        │  │ audioEngine    │
│             │  │ hudState.ts (signals)  │  │ sfxBank        │
└─────────────┘  └────────────────────────┘  └────────────────┘
```

Import direction: each box may only import from boxes above it in the diagram,
with one exception — `game.ts` in `engine/` imports `hudState.ts` from `ui/` to
write signals.

---

## Data flow per frame

The game loop in `src/engine/game.ts` runs on `requestAnimationFrame`:

```
1. clock.tick(performance.now())
   → { steps: N, dt: 0.01667, alpha: 0..1 }

2. input.poll()
   → PlayerIntent { moveX, moveY, jumpPressed, jumpHeld, whipPressed }
   (touch axes take priority; keyboard fills in when touch is inactive)

3. for i in 0..steps:
     prevPlayer = player
     player = stepPlayer(player, intent, tilemap, tuning, dt)

4. camera = followCamera(camera, player.x, player.y, levelBounds)

5. drawFrame(ctx, {
     map, camera, viewport,
     prevPlayer, player,
     tuning, alpha, palette
   })
   Renderer lerps player position between prevPlayer and player using alpha,
   projects world coordinates into canvas pixels via ViewportGeometry
   scale + offset (letterbox), draws tiles, player sprite, whip arc.

6. hudState.setScore / setLives / setPaused
   → SolidJS signals fire; only changed HUD nodes re-render (no VDOM diff)
```

The clock caps sub-steps at 5 to prevent the "spiral of death" under lag.

---

## Determinism model

The sim is a pure function:

```
(PlayerState, PlayerIntent, TileMap, PlayerTuning, dt: number) → PlayerState
```

Deterministic replay is achieved by:

- **Seeded RNG** — `createRng(seed)` (mulberry32). Seed is the only external
  randomness input; re-seeding with the same value produces identical output.
- **Fixed timestep** — `createClock()` outputs integer step counts with a
  constant `dt`. Floating-point arithmetic is identical across runs given the
  same inputs.
- **No hidden state** — `PlayerState`, `Camera`, and `TileMap` are plain data
  objects passed by value (spread-cloned on mutation).

Recording an intent stream and replaying it against the same seed produces
bit-identical `PlayerState` values at every step. This is verified by unit tests
in `tests/unit/player.test.ts`.

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
canvas.width  = cssW × dpr   (backing-store pixels)
canvas.height = cssH × dpr
canvas.style.width/height = cssW/cssH px   (display CSS pixels)
```

`deviceProfile.ts` and `scaler.ts` are pure — no DOM — and are fully unit-tested
in Node. `responsive.ts` wraps them with DOM + Capacitor calls and debounces
updates at 100 ms.

The `ViewportGeometry` is passed to `drawFrame()` each frame so the renderer
always projects with the current scale and letterbox offsets.

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

The Android WebView renders the canvas-based game fullscreen (`#17110b`
background, `androidScheme: https`).
