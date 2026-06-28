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
  house: { sheet: `${OW}/House Tiles.png`, x: 20, y: 0, w: 408, h: 224 }, // the main house, cut from the tile sheet
  tentLarge: whole("Large Tent.png", 96, 128),
  tentSmall: whole("Small Tent.png", 64, 64),
  cookfire: whole("Cooking area.png", 768, 64),
  torch: whole("Torch.png", 192, 128),

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
} as const;

export type OverworldShapeName = keyof typeof OVERWORLD;
