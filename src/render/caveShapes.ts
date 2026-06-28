/**
 * Cave shape catalog — named organic stamps cut from the cave biome sheet
 * (`biomes/caves/mainlev_build.png`), the BRUSHES for painting a cave level
 * (see composition.ts). Every rect was measured by connected-component analysis
 * of the full sheet (148 distinct shapes) and classified by tone/aspect, then the
 * useful staging pieces named here. NOT a tile grid.
 *
 * Two tonal families compose the cave:
 *   • COOL blue-grey — ceiling stalactites + icy ledge shelves (overhead).
 *   • WARM brown — floor rock shelves, wall pillars, rubble masses (underfoot).
 * Plus built elements: brick-wall panels, wooden beams/door, and the glowing
 * red-gem relic block (the goal marker).
 */
import type { ShapeStamp } from "@render/composition.ts";
import { assetUrl } from "@/assetUrl.ts";

const SHEET = assetUrl("assets/biomes/caves/mainlev_build.png");
const stamp = (x: number, y: number, w: number, h: number): ShapeStamp => ({ sheet: SHEET, x, y, w, h });

export const CAVE = {
  // --- GROUND: warm rock shelves to stand on (wide, ~2.5:1) ---
  ledgeA: stamp(512, 688, 80, 32),
  ledgeB: stamp(832, 688, 80, 32),

  // --- GROUND MASS: detailed rubble-fill panels (96×64) ---
  rubbleA: stamp(224, 736, 96, 64),
  rubbleB: stamp(224, 816, 96, 64),

  // --- WALL PILLARS: tall warm rock columns (32×~92) ---
  pillarA: stamp(832, 288, 32, 92),
  pillarB: stamp(976, 288, 32, 92),
  pillarC: stamp(880, 400, 32, 96),
  pillarShort: stamp(48, 592, 32, 80),

  // --- BUILT: masonry brick-wall panels (80×80) ---
  brickWallA: stamp(832, 512, 80, 80),
  brickWallB: stamp(924, 512, 84, 80),

  // --- BUILT: wooden crate / X-braced barricades (48×48) ---
  crateA: stamp(752, 96, 48, 48),
  crateB: stamp(816, 96, 48, 48),

  // --- BUILT: wooden beam planks (170×16) — platforms ---
  beamLong: stamp(755, 16, 170, 16),
  beamLong2: stamp(755, 48, 170, 16),

  // --- CEILING: cool blue-grey stalactite blocks (overhead) ---
  stalactiteA: stamp(544, 16, 48, 64),
  stalactiteWide: stamp(128, 496, 48, 48),

  /**
   * The glowing-relic rock block (64×64) — a red gem set in rock. The story's
   * idol/shrine marker; place it as the goal at a level's end.
   */
  relicBlock: stamp(624, 768, 64, 64),
} as const;

export type CaveShapeName = keyof typeof CAVE;

/**
 * CAVE PROP catalog — the big ORGANIC rock/flora brushes from the cave prop
 * sheets (props1.png 1280², props2.png 1024²), measured by connected-component
 * analysis + identified by eye. These give the cave real DEPTH and density: tall
 * stacked-rock masses to frame the chamber, jagged spires + stalagmite columns
 * for the ceiling and floor, gnarled cavern trees, and dark bushes. Composed
 * over the mainlev built elements (brick/beams/relic) and the parallax.
 */
const PROPS1 = assetUrl("assets/biomes/caves/props1.png");
const PROPS2 = assetUrl("assets/biomes/caves/props2.png");
const p1 = (x: number, y: number, w: number, h: number): ShapeStamp => ({ sheet: PROPS1, x, y, w, h });
const p2 = (x: number, y: number, w: number, h: number): ShapeStamp => ({ sheet: PROPS2, x, y, w, h });

export const CAVE_PROPS = {
  // --- BIG ROCK MASSES (props2): frame the chamber, build floor/wall bulk ---
  rockTall: p2(33, 500, 336, 271), // tall stacked-rock tower
  rockWide: p2(606, 518, 308, 189), // wide rock shoulder
  rockMass: p2(432, 740, 577, 271), // huge low rock mass (floor feature)
  rockLedge: p2(20, 861, 359, 150), // grass-topped rock ledge
  // --- JAGGED ROCK (props1): spires + columns + chunks for vertical drama ---
  spire: p1(829, 68, 64, 95), // sharp single spire (stalagmite/-tite)
  column: p1(717, 51, 102, 112), // thick rock column
  chunk: p1(13, 13, 150, 150), // big angular rock chunk
  rockMassSm: p1(909, 69, 124, 94), // smaller rock mass
  platW: p1(173, 96, 166, 67), // wide low rock platform
  // --- CAVE FLORA (props2): gnarled trees + bushes for life in the dark ---
  tree: p2(66, 3, 289, 176),
  tree2: p2(388, 35, 224, 144),
  bush: p2(687, 107, 100, 72),
  bushWide: p2(852, 98, 139, 81),
} as const;

export type CavePropName = keyof typeof CAVE_PROPS;
