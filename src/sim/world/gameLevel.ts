/**
 * Game level — pairs a level's PAINTING (render-side composition) reference with
 * its INVISIBLE COLLISION (a tilemap the physics reads) and its spawns. The
 * painting and the collision are authored separately but designed to match: the
 * collision's solid ground sits under the painted ground, platforms under the
 * painted beams. Pure data; the renderer paints, the sim collides.
 *
 * This is the sim-side half of a "level as a painting": the renderer imports the
 * matching Placement[] painting by the same id.
 */
import { createTileMap, setTile, TileKind, type TileMap } from "@sim/world/tilemap.ts";

export interface GameLevelSpawn {
  readonly x: number;
  readonly y: number;
}
export interface PotSpawn extends GameLevelSpawn {
  readonly color: "gray" | "red" | "white" | "yellow";
  readonly drop: "relic" | "health" | "secret";
}

/** An enemy placed by design: AI `kind` + which real animated `visual` sprite. */
export interface EnemySpawn extends GameLevelSpawn {
  readonly kind: "patrol" | "chase";
  readonly visual: "goblin" | "skeleton" | "mushroom" | "flyingEye";
}

/** A story NPC placed by design; `dialogueId` keys src/sim/story/dialogue.ts. */
export interface NpcSpawn extends GameLevelSpawn {
  readonly dialogueId: string;
}

export interface GameLevel {
  readonly id: string;
  readonly map: TileMap;
  readonly spawnX: number;
  readonly spawnY: number;
  readonly collectibles: readonly (GameLevelSpawn & { value: number })[];
  readonly enemies: readonly EnemySpawn[];
  readonly pots: readonly PotSpawn[];
  /** Story NPCs the player can talk to (empty on levels with none). */
  readonly npcs: readonly NpcSpawn[];
  /** World-x past which the level is "won" (reaching the relic block). */
  readonly goalX: number;
}

const TS = 16;

/**
 * "The Descent" collision — a solid floor across the bottom with a chasm gap that
 * the painted beam platforms bridge. Matches caveDescent.ts (FLOOR_Y 300, ~2600px
 * ≈ 5 screens). The chasm is at painted x≈1080–1320 (cols 67–82).
 */
function descentMap(): TileMap {
  const cols = 163; // ~2608px
  const rows = 22; // ~352px
  const map = createTileMap(cols, rows, TS);
  const floorRow = 19; // 19*16 = 304 ≈ painted FLOOR_Y 300
  const gapStart = 68; // ~1088px
  const gapEnd = 82; // ~1312px

  for (let c = 0; c < cols; c++) {
    // Ground floor, except the chasm gap the beam platforms bridge.
    if (c < gapStart || c > gapEnd) {
      setTile(map, c, floorRow, TileKind.Solid);
      setTile(map, c, floorRow + 1, TileKind.Solid);
      setTile(map, c, floorRow + 2, TileKind.Solid);
    }
  }
  // Beam platforms over the gap (one-way), matching the painted beams at
  // FLOOR_Y-70 (row ~14) and FLOOR_Y-134 (row ~10).
  for (let c = 67; c <= 78; c++) setTile(map, c, 14, TileKind.Platform); // lower beam (x≈1080)
  for (let c = 74; c <= 86; c++) setTile(map, c, 10, TileKind.Platform); // upper beam (x≈1200)
  // Side walls close the chamber.
  for (let r = 0; r < rows; r++) {
    setTile(map, 0, r, TileKind.Solid);
    setTile(map, cols - 1, r, TileKind.Solid);
  }
  return map;
}

/** The cave level. Its painting is render/levels/caveDescent.ts (same id). */
export const DESCENT: GameLevel = {
  id: "cave-descent",
  map: descentMap(),
  spawnX: 96,
  spawnY: 260,
  collectibles: [
    { x: 470, y: 250, value: 100 },
    { x: 1140, y: 180, value: 100 }, // on the beam bridge
    { x: 1240, y: 120, value: 100 }, // on the upper beam
    { x: 2160, y: 250, value: 100 },
  ],
  enemies: [
    // Placed by design across the 5-screen descent, difficulty ramping →:
    { x: 520, y: 280, kind: "patrol", visual: "goblin" }, // entrance runway
    { x: 1000, y: 280, kind: "patrol", visual: "mushroom" }, // left of the chasm
    { x: 1200, y: 150, kind: "patrol", visual: "flyingEye" }, // floats over the chasm
    { x: 1700, y: 280, kind: "patrol", visual: "goblin" }, // deep chamber
    { x: 2040, y: 280, kind: "patrol", visual: "mushroom" }, // guards the ruins
    { x: 2360, y: 280, kind: "chase", visual: "skeleton" }, // chases at the relic goal
  ],
  pots: [
    { x: 200, y: 288, color: "red", drop: "relic" },
    { x: 560, y: 288, color: "white", drop: "secret" },
    { x: 1480, y: 288, color: "yellow", drop: "health" },
    { x: 2200, y: 288, color: "red", drop: "relic" },
  ],
  npcs: [],
  goalX: 2480,
};

/**
 * "Halward's Reach" collision — a continuous solid road across the bottom (the
 * overworld is a walkable surface, no chasm), side walls at the ends. Matches the
 * painting in render/levels/villageApproach.ts (GROUND_Y 300, ~2240px wide).
 */
function villageMap(): TileMap {
  const cols = 140; // ~2240px
  const rows = 22; // ~352px
  const map = createTileMap(cols, rows, TS);
  const floorRow = 19; // 19*16 = 304 ≈ painted GROUND_Y 300
  for (let c = 0; c < cols; c++) {
    setTile(map, c, floorRow, TileKind.Solid);
    setTile(map, c, floorRow + 1, TileKind.Solid);
    setTile(map, c, floorRow + 2, TileKind.Solid);
  }
  // Left wall closes the village edge; the right edge is open onto the trail end.
  for (let r = 0; r < rows; r++) setTile(map, 0, r, TileKind.Solid);
  return map;
}

/**
 * "Halward's Reach" — the OPENING overworld level. The story starts here: Jim
 * talks to the villagers (Elder Mara, the ferryman, the watchman), then walks the
 * forest road east to the cave-mouth trailhead (goal) — reaching it triggers the
 * descent cutscene into the cave. Its painting is render/levels/villageApproach.ts.
 */
export const VILLAGE: GameLevel = {
  id: "village-approach",
  map: villageMap(),
  spawnX: 80,
  spawnY: 260,
  collectibles: [
    { x: 980, y: 250, value: 100 },
    { x: 1520, y: 250, value: 100 },
  ],
  enemies: [
    // The forest road is where the first threats appear — easing in (1–2/screen).
    { x: 1080, y: 280, kind: "patrol", visual: "goblin" },
    { x: 1620, y: 280, kind: "patrol", visual: "mushroom" },
    { x: 1980, y: 280, kind: "chase", visual: "goblin" },
  ],
  pots: [
    { x: 360, y: 288, color: "white", drop: "secret" }, // by the cooking fire
    { x: 1240, y: 288, color: "yellow", drop: "health" }, // mid-road
  ],
  npcs: [
    // The villagers of Halward's Reach — the story's opening voices.
    { x: 160, y: 276, dialogueId: "elder-mara" }, // by the house
    { x: 430, y: 276, dialogueId: "watchman-pell" }, // by the small tent
    { x: 620, y: 276, dialogueId: "ferryman-cole" }, // by the statue / water's edge
  ],
  goalX: 2120,
};
