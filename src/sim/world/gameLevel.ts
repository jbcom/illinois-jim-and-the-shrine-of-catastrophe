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

export interface GameLevel {
  readonly id: string;
  readonly map: TileMap;
  readonly spawnX: number;
  readonly spawnY: number;
  readonly collectibles: readonly (GameLevelSpawn & { value: number })[];
  readonly enemies: readonly EnemySpawn[];
  readonly pots: readonly PotSpawn[];
  /** World-x past which the level is "won" (reaching the relic block). */
  readonly goalX: number;
}

const TS = 16;

/**
 * "The Descent" collision — a solid floor across the bottom with a jump gap that
 * the painted beam platforms bridge. Matches caveDescent.ts (FLOOR_Y 300).
 */
function descentMap(): TileMap {
  const cols = 64; // ~1024px
  const rows = 22; // ~352px
  const map = createTileMap(cols, rows, TS);
  const floorRow = 19; // 19*16 = 304 ≈ painted FLOOR_Y 300

  for (let c = 0; c < cols; c++) {
    // Ground floor, except a gap (cols 22–35) the beam platforms bridge.
    if (c < 22 || c > 35) {
      setTile(map, c, floorRow, TileKind.Solid);
      setTile(map, c, floorRow + 1, TileKind.Solid);
      setTile(map, c, floorRow + 2, TileKind.Solid);
    }
  }
  // Beam platforms over the gap (one-way), matching the painted beams.
  for (let c = 22; c <= 28; c++) setTile(map, c, 14, TileKind.Platform); // lower beam
  for (let c = 29; c <= 35; c++) setTile(map, c, 11, TileKind.Platform); // upper beam
  // Side walls close the chamber.
  for (let r = 0; r < rows; r++) {
    setTile(map, 0, r, TileKind.Solid);
    setTile(map, cols - 1, r, TileKind.Solid);
  }
  return map;
}

/** The first cave level. Its painting is render/levels/caveDescent.ts (same id). */
export const DESCENT: GameLevel = {
  id: "cave-descent",
  map: descentMap(),
  spawnX: 96,
  spawnY: 260,
  collectibles: [
    { x: 400, y: 200, value: 100 },
    { x: 520, y: 140, value: 100 },
  ],
  enemies: [
    // Placed by design across the chamber, each a real animated enemy:
    { x: 240, y: 280, kind: "patrol", visual: "goblin" }, // ground patrol near the ruins
    { x: 470, y: 150, kind: "patrol", visual: "flyingEye" }, // floats over the chasm
    { x: 700, y: 280, kind: "patrol", visual: "mushroom" }, // guards the far ground
    { x: 840, y: 280, kind: "chase", visual: "skeleton" }, // chases near the relic goal
  ],
  pots: [
    { x: 180, y: 288, color: "red", drop: "relic" },
    { x: 620, y: 288, color: "yellow", drop: "health" },
    { x: 820, y: 288, color: "white", drop: "secret" },
  ],
  goalX: 900,
};
