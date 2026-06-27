/**
 * Level definition + a parser for compact ASCII level art. Pure, no DOM.
 *
 * A level is authored as rows of characters so designers can sketch them by
 * hand; `parseLevel` turns the art into a TileMap plus the player spawn.
 *
 *   '.' empty   '#' solid   '=' one-way platform   '^' hazard
 *   'H' ladder  '~' rail     '@' player spawn (becomes empty)
 */
import { createTileMap, setTile, TileKind, type TileMap } from "@sim/world/tilemap.ts";

export interface Level {
  readonly map: TileMap;
  readonly spawnX: number;
  readonly spawnY: number;
}

const CHAR_TO_KIND: Record<string, TileKind> = {
  ".": TileKind.Empty,
  "#": TileKind.Solid,
  "=": TileKind.Platform,
  "^": TileKind.Hazard,
  H: TileKind.Ladder,
  "~": TileKind.Rail,
  "@": TileKind.Empty,
};

export function parseLevel(rows: readonly string[], tileSize = 16): Level {
  const height = rows.length;
  if (height === 0) throw new Error("parseLevel: empty level");
  const width = Math.max(...rows.map((r) => r.length));
  const map = createTileMap(width, height, tileSize);

  let spawnCol = 1;
  let spawnRow = 1;

  for (let row = 0; row < height; row++) {
    const line = rows[row] ?? "";
    for (let col = 0; col < width; col++) {
      const ch = line[col] ?? ".";
      if (ch === "@") {
        spawnCol = col;
        spawnRow = row;
      }
      const kind = CHAR_TO_KIND[ch];
      if (kind !== undefined && kind !== TileKind.Empty) {
        setTile(map, col, row, kind);
      }
    }
  }

  return {
    map,
    spawnX: spawnCol * tileSize,
    spawnY: spawnRow * tileSize,
  };
}

export const levelBounds = (level: Level) => ({
  width: level.map.width * level.map.tileSize,
  height: level.map.height * level.map.tileSize,
});
