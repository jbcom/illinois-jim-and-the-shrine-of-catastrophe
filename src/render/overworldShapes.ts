/**
 * Overworld shape catalog — named organic stamps for painting the surface-world
 * levels (the village of Halward's Reach + the road to the mountain). Same role
 * as caveShapes.ts but for the `biomes/overworld` pack: there the brushes are
 * already DISCRETE transparent PNGs (each tree/tent/statue is its own file), so a
 * stamp covers the whole image (x:0,y:0 = full frame) — no connected-component
 * cutting needed. Dimensions are the measured PNG sizes (scripts/measure-actors
 * style alpha checks). NOT a tile grid — these are scenery brushes for
 * composition.ts, placed by z-order over the overworld parallax.
 *
 * Tonal families:
 *   • CANOPY greens — the forest fringe Jim travels through (back layer).
 *   • BUILT warm wood/stone — the village (houses, tents, cooking area, torches).
 *   • GROUND — grass tufts + the angel statue / garden flavor along the path.
 */
import type { ShapeStamp } from "@render/composition.ts";
import { assetUrl } from "@/assetUrl.ts";

const OW = assetUrl("assets/biomes/overworld");
/** A whole-image stamp (the common case here — each prop is its own PNG). */
const whole = (file: string, w: number, h: number): ShapeStamp => ({
  sheet: `${OW}/${file}`,
  x: 0,
  y: 0,
  w,
  h,
});

export const OVERWORLD = {
  // --- CANOPY: big leafy trees (the forest fringe, back/mid layers) ---
  oakA: whole("Tree1.png", 256, 208),
  oakB: whole("Tree2.png", 256, 208),
  oakC: whole("Tree3.png", 256, 208),
  pine: whole("Large Pine Tree.png", 128, 176),
  birchA: whole("Birch1.png", 80, 112),
  birchB: whole("Birch2.png", 80, 112),
  willow: whole("Weeping Willow1.png", 224, 192),
  blossom: whole("Flowering Tree.png", 96, 112),

  // --- VILLAGE BUILT: houses, tents, hearth, torches ---
  // House Tiles.png is TWO complete houses side by side (each ~224px: pitched red
  // roof, stone walls, door, windows, porch). Slice ONE — the left one.
  house: { sheet: `${OW}/House Tiles.png`, x: 0, y: 0, w: 224, h: 224 },
  tentLarge: whole("Large Tent.png", 96, 128),
  tentSmall: whole("Small Tent.png", 64, 64),
  // Cooking area.png is a REPEATING strip of cook-setups (cauldron + logs) — one
  // setup is ~62px wide; slice a SINGLE one, not the whole 768px row.
  cookfire: { sheet: `${OW}/Cooking area.png`, x: 1, y: 0, w: 62, h: 64 },
  // Torch.png is a 6×4 grid of 32×32 animation frames — slice ONE lit torch
  // (row 1, col 0), NOT the whole sheet (which renders a wall of torches).
  torch: { sheet: `${OW}/Torch.png`, x: 0, y: 32, w: 32, h: 32 },

  // --- GROUND FLAVOR: grass, statue, garden ---
  grass: whole("Tall Grass.png", 96, 32),
  statue: whole("Angel Statue.png", 64, 64),
  garden: whole("Garden Decorations.png", 224, 128),
  boat: whole("Boat.png", 800, 32),

  /**
   * GROUND BLOCK — a grass-topped solid dirt tile (top-left cell of the 3×6,
   * 96px-grid Floor Tiles1 sheet). Tile it across the level bottom to make the
   * walkable ground a real painted surface (matches the collision floor), not
   * sparse tufts over the sky parallax.
   */
  ground: { sheet: `${OW}/Floor Tiles1.png`, x: 0, y: 0, w: 96, h: 96 },
  /**
   * GRASS CAP — just the grass crown + a thin dirt lip from the top of the ground
   * tile (top ~34px). Tiled along the surface line it gives a THIN crafted earth
   * strip (the groundFill earth backs it just below), instead of the full 96px
   * dark-dirt block that read as a wasted brown void.
   */
  grassCap: { sheet: `${OW}/Floor Tiles1.png`, x: 0, y: 0, w: 96, h: 34 },
} as const;

/**
 * DECOR ATLAS slices (Decor.png, 416×544) — the village-life + scatter brushes,
 * each rect measured by connected-component analysis of the atlas then named by
 * eye. These are the pieces that turn a row of props into a crafted scene:
 * foreground rocks/bushes for depth, market clutter + a clothesline for village
 * life, a statue + gravestones for the road-to-the-shrine atmosphere.
 */
const DECOR = `${OW}/Decor.png`;
const decor = (x: number, y: number, w: number, h: number): ShapeStamp => ({ sheet: DECOR, x, y, w, h });

export const DECOR_SHAPES = {
  // Foreground scatter — rocks & boulders (grass-skirted) for depth layering.
  boulderBig: decor(2, 278, 92, 44),
  boulderBig2: decor(98, 278, 92, 44),
  // Single bushes (green / autumn) for midground + foreground filler.
  bushGreen: decor(1, 422, 42, 28),
  bushAutumn: decor(1, 454, 42, 28),
  // Village life.
  clothesline: decor(25, 352, 110, 66),
  basket: decor(326, 79, 21, 19),
  crate: decor(32, 0, 31, 34),
  butcherBlock: decor(197, 1, 22, 33), // chopping stump w/ cleaver
  // Road-to-the-shrine atmosphere (foreshadowing the dark). NOTE: in the atlas
  // the statue and brick-wall art sit at each other's "obvious" rects — verified
  // by eye, the classical statue is here and the masonry wall below it.
  statue: decor(375, 265, 38, 55),
  brickWall: decor(357, 139, 54, 55),
} as const;

export type DecorShapeName = keyof typeof DECOR_SHAPES;

export type OverworldShapeName = keyof typeof OVERWORLD;
