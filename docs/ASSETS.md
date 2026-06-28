---
title: Assets & Render Components
updated: 2026-06-27
status: current
domain: technical
---

# Assets & Render Components

How art enters the game and how the renderer consumes it. The renderer is
framework-agnostic PixiJS 8; every visual is a small, independently
screenshot-tested component under `src/render/`.

## Asset provenance

| Asset class | Source | Location | Format |
|-------------|--------|----------|--------|
| Enemies (goblin, skeleton, mushroom, flying-eye) | itch.io packs | `public/assets/enemies/<Name>/` | horizontal **strips**, 150² frames |
| Cave biome (tileset + parallax bg + props) | itch.io packs | `public/assets/biomes/caves/` | tileset (32px grid), bg layers 960×480 |
| Kenney platformer tileset | Kenney | `public/assets/kenney/platformer/` | packed grid, 18px cells |
| Breakable pots | itch.io packs | `public/assets/breakables/pots/` | strips |
| HP bar | itch.io packs | `public/assets/ux/hp_bar/` | single images |
| **Illinois Jim (hero)** | **GenAI (Imagen 4)** | `public/assets/player/` | **single transparent PNG per pose** |

Raw downloads and raw GenAI output live in gitignored `raw-assets/`; only
curated, prepped art lands in `public/assets/`.

## Frame sources — the unifying abstraction

`src/render/frameSource.ts` is the one type the renderer uses to get an ordered
list of frame `Texture`s, regardless of how the art was authored:

- **`strip(url, frames)`** — N equal-width frames packed in one image (enemies,
  Kenney). Sliced with `sliceStrip`; all frames share one base `source`.
- **`frames([url, …])`** — one transparent PNG per pose, in play order (the
  hero). Each file is its own whole texture, loaded independently.

`loadFrames(source)` resolves either kind to `Texture[]`; `animatedFrom(source)`
wraps it in a deterministic (`autoUpdate = false`) `AnimatedSprite`. **The
renderer never branches on asset format** — a strip and a list of single images
are interchangeable inputs.

## The hero: GenAI → prep → frames

Illinois Jim is an original side-view hero (teal explorer vest, brass-goggle
flat cap, amber relic-lantern, coiled grappling hook) — deliberately distinct
from any pulp franchise. He is generated, never hand-drawn:

1. **Generate** — `scripts/genai-assets.mjs` (Imagen 4, `GEMINI_API_KEY` from the
   gitignored `.env`). Each pose is one prompt, framed **airborne / off-ground**
   on a **flat solid magenta (#FF00FF) backdrop**. Both choices are deliberate:
   - magenta keys out deterministically downstream;
   - airborne framing removes Imagen's urge to bake a floor under the feet (the
     root cause of earlier scenery contamination — a floor connected to the
     boots can't be flood-filled away cleanly).
   Output → `raw-assets/generated/` (gitignored).

2. **Prep** — `scripts/prep-sprites.mjs` (offline, `sharp`):
   - **flood-fill** transparency inward from the four corners over magenta-keyed,
     connected pixels (never eats the dark-outlined character);
   - **despill** the magenta fringe on anti-aliased edges (pull r/b toward g,
     fade alpha by the spill removed);
   - **trim** to the character bbox, **height-normalize** so every pose shares
     one character height, **bottom-anchor** (feet on the frame floor) so the
     walk cycle doesn't pulse or hover.
   Output → `public/assets/player/` (committed).

3. **Consume** — `src/render/playerSprite.ts` maps named states
   (`idle`/`run`/`jump`/`fall`/`attack`) to `frames([...])` sources, pre-loads
   all states, and exposes a controller: `setState`, `setFacing` (horizontal
   flip; art faces right), deterministic `update(ticks)`, feet-anchored sprite.

Regenerate end to end:

```sh
node scripts/genai-assets.mjs --only illinois-jim          # gen → raw-assets/
node scripts/prep-sprites.mjs --in illinois-jim --out public/assets/player --threshold 170
```

## Render component catalog (`src/render/`)

| Module | What it builds | Frame source | Proof screenshot |
|--------|----------------|--------------|------------------|
| `sprites.ts` | `sliceStrip`, `animatedFromStrip` | strip primitive | `sprites-*.png` |
| `parallax.ts` | depth-scrolled `TilingSprite` stack | — | `parallax-cave-*.png` |
| `tileLayer.ts` | `@pixi/tilemap` grid paint | tileset slice | `tilelayer-kenney.png` |
| `enemySprites.ts` | 4 enemy kinds × 5 states | strip | `enemies-all.png` |
| `frameSource.ts` | strip + single-image unifier | — | (via player test) |
| `playerSprite.ts` | Illinois Jim, 5 states | single-image frames | `player-states.png`, `player-run-cycle.png` |

Every component has an isolated Vitest **browser** test (real Chromium) that
renders it in a PixiJS `Application` and captures a screenshot for visual review.
Screenshots are gitignored proof artifacts, not committed assets.
