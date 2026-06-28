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
| **Illinois Jim (hero)** | itch.io adventure pack | `public/assets/classes/adventure/` | directional **strips**, 96×80 frames (8/clip) |

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

## The hero: a real transparent sprite pack

Illinois Jim is the `classes/adventure` itch pack — directional clips (IDLE, RUN,
ATTACK 1/2 in down/left/right/up), each a **96×80, 8-frame horizontal strip with
a real alpha channel** (no backdrop, no chromakey). `src/render/playerSprite.ts`
loads the right-facing strips via the frame-source `strip()` path, pre-loads all
states, and exposes a controller: `setState` (idle/run/attack), `setFacing`
(horizontal scale flip), deterministic `update(ticks)`, feet-anchored sprite.

Every shipped art pack under `public/assets/` is already fully transparent
(verified: 70–98 % clear pixels, alpha=0 at the corners). There is **no
background-removal step in the asset path** — sprites load straight through Pixi.

> GenAI (`scripts/genai-assets.mjs`, Imagen 4) is reserved for **story cutscene
> backplates and branding**, where a rendered background is wanted. The
> `scripts/prep-sprites.mjs` chromakey/trim helper exists only for that case (when
> a generated frame needs isolating); it is NOT in the gameplay sprite pipeline.

## Render component catalog (`src/render/`)

| Module | What it builds | Frame source | Proof screenshot |
|--------|----------------|--------------|------------------|
| `sprites.ts` | `sliceStrip`, `animatedFromStrip` | strip primitive | `sprites-*.png` |
| `parallax.ts` | depth-scrolled `TilingSprite` stack | — | `parallax-cave-*.png` |
| `tileLayer.ts` | `@pixi/tilemap` grid paint | tileset slice | `tilelayer-kenney.png` |
| `enemySprites.ts` | 4 enemy kinds × 5 states | strip | `enemies-all.png` |
| `frameSource.ts` | strip + single-image unifier | — | (via player test) |
| `playerSprite.ts` | Illinois Jim, idle/run/attack | strip | `player-states.png`, `player-run-cycle.png` |
| `layers.ts` | render-layer traits + compositor | — | (via scene test) |
| `scene.ts` | full layered scene builder | all | `scene-cave-composited.png` |

Every component has an isolated Vitest **browser** test (real Chromium) that
renders it in a PixiJS `Application` and captures a screenshot for visual review.
Screenshots are gitignored proof artifacts, not committed assets.

## NPC factory (`src/render/npc.ts`)

Story NPCs are **paper-doll composites**. The `classes/npcs` pack is a layered
kit — skin / clothing / hair / hand sheets that all share one grid (10 cols × 7
rows of **80×64** frames; rows = idle/walk/run/jump/cheer/attack/fall). An NPC is
an `NpcSpec` of named part slots; the factory paints present slots in a fixed
back→front order so layering is correct by construction:

`skin → underwear → legs → socks → feet → torso → hair → hand`

`composeNpcSheet(renderer, spec)` bakes the stack into one texture via a Pixi
`RenderTexture`; `npcAnimFrames(sheet, anim)` slices a chosen animation row. A few
part choices → a unique, animated, transparent NPC. Proven piece-by-piece
(`npc-layer-buildup.png` shows skin→+legs→+torso→+feet→+hair→+hand with a
monotonic opaque-pixel diagnostic) and per-NPC (`npc-townsfolk.png`, 3 distinct
townsfolk).

The narrative half lives in the sim: the `Npc` trait (`dialogueId`, `range`,
`talked`) + `src/sim/story/dialogue.ts` (the dialogue script registry, pure data)
+ `npcInteractionSystem` (nearest in-range NPC → talk prompt). This is how the
overworld→cave→shrine story is told between the platforming.

## Render-layer model (`src/render/layers.ts`)

The scene is composited through a **render koota world** — a world separate from
the pure sim, whose entities describe *how* to draw, ordered by depth. The sim
world stays DOM-free; the render world owns Pixi.

| Trait | Carries | Meaning |
|-------|---------|---------|
| `Layer` | `z`, `parallax` | a depth band; `z` orders back-to-front, `parallax` scales scroll (0 = far/static, 1 = world-locked) |
| `ParallaxBg` | — | tags a Layer backed by a `TilingSprite` parallax stack |
| `TileLayerRef` | — | tags a Layer backed by a `@pixi/tilemap` CompositeTilemap |
| `SpriteRef` | `sim` | an actor sprite; `sim` links it to the sim entity whose Position drives it (-1 = manual) |
| `Anim` | `state`, `fps`, `ticks` | animation playback for a SpriteRef (deterministic frame accumulator) |

Traits hold **plain data only**; the heavyweight Pixi objects live in a
`RenderStore` keyed by entity. Compositor functions walk the traits:
`mountLayers` (add containers in z-order), `scrollLayers` (parallax scroll),
`syncSprites` (position from sim + advance animation). `src/render/scene.ts`
`buildScene(spec)` is the composition root — parallax + tile layers + actors all
become render-world entities, so adding a layer is spawning an entity.
