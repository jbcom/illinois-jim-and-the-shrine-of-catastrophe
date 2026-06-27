/**
 * Tile grid for a level. Pure data + queries, no DOM.
 *
 * Tiles are a flat array indexed row-major. The platformer cares mainly about
 * which tiles are solid; richer behavior (hazards, rails, ladders) is layered
 * on via the TileKind enum so the collision resolver can branch on it.
 */
export enum TileKind {
  Empty = 0,
  Solid = 1,
  /** One-way platform: solid only when falling onto it from above. */
  Platform = 2,
  /** Mine-cart rail — drives the cart segment; not solid to walking. */
  Rail = 3,
  /** Instant-hazard (spikes, lava); sim treats contact as a death trigger. */
  Hazard = 4,
  /** Climbable ladder/rope. */
  Ladder = 5,
}

export interface TileMap {
  readonly width: number;
  readonly height: number;
  /** Edge length of a tile in world units (pixels at scale 1). */
  readonly tileSize: number;
  readonly tiles: Readonly<Uint8Array>;
}

export function createTileMap(
  width: number,
  height: number,
  tileSize: number,
  tiles?: Uint8Array,
): TileMap {
  const data = tiles ?? new Uint8Array(width * height);
  if (data.length !== width * height) {
    throw new Error(`tile data length ${data.length} != ${width * height}`);
  }
  return { width, height, tileSize, tiles: data };
}

const idx = (map: TileMap, col: number, row: number): number => row * map.width + col;

export const inBounds = (map: TileMap, col: number, row: number): boolean =>
  col >= 0 && col < map.width && row >= 0 && row < map.height;

/** Tile kind at a grid cell; out-of-bounds reads as Solid (closed world). */
export function tileAt(map: TileMap, col: number, row: number): TileKind {
  if (!inBounds(map, col, row)) return TileKind.Solid;
  return map.tiles[idx(map, col, row)] as TileKind;
}

/** Tile kind at a world position. */
export function tileAtWorld(map: TileMap, x: number, y: number): TileKind {
  return tileAt(map, Math.floor(x / map.tileSize), Math.floor(y / map.tileSize));
}

export const isSolidKind = (kind: TileKind): boolean => kind === TileKind.Solid;

export function setTile(map: TileMap, col: number, row: number, kind: TileKind): void {
  if (!inBounds(map, col, row)) return;
  (map.tiles as Uint8Array)[idx(map, col, row)] = kind;
}
