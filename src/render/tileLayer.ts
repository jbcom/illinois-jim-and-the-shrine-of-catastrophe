/**
 * Tile-layer renderer — paints a tile grid using @pixi/tilemap (efficient
 * batched tile rendering). Browser-only.
 *
 * A tileset is a uniform grid of `tileSize` cells; `tilesetTextures` slices it
 * into per-cell textures indexed left-to-right, top-to-bottom. `renderTileLayer`
 * places a tile texture for each non-empty cell of our TileMap, mapping each
 * TileKind to a cell index via the supplied `kindToIndex`.
 */
import { CompositeTilemap } from "@pixi/tilemap";
import { type TileKind, type TileMap, tileAt } from "@sim/world/tilemap.ts";
import { Assets, Rectangle, Texture } from "pixi.js";

/** Slice a tileset image into a flat array of cell textures (row-major). */
export function tilesetTextures(base: Texture, tileSize: number): Texture[] {
  const cols = Math.floor(base.width / tileSize);
  const rows = Math.floor(base.height / tileSize);
  const out: Texture[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push(
        new Texture({
          source: base.source,
          frame: new Rectangle(c * tileSize, r * tileSize, tileSize, tileSize),
        }),
      );
    }
  }
  return out;
}

export interface TileLayerSpec {
  readonly tilesetUrl: string;
  /** Source tileset cell size (px). */
  readonly tileSize: number;
  /** Map a TileKind to a tileset cell index (or -1 to skip). */
  readonly kindToIndex: (kind: TileKind) => number;
}

export interface TileLayer {
  readonly tilemap: CompositeTilemap;
  destroy(): void;
}

/** Build a tilemap from the level grid. `destW` is the on-screen tile size. */
export async function renderTileLayer(
  map: TileMap,
  spec: TileLayerSpec,
  destSize: number,
): Promise<TileLayer> {
  const base = await Assets.load<Texture>(spec.tilesetUrl);
  const cells = tilesetTextures(base, spec.tileSize);
  const tilemap = new CompositeTilemap();
  const scale = destSize / spec.tileSize;

  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const idx = spec.kindToIndex(tileAt(map, col, row));
      const tex = idx >= 0 ? cells[idx] : undefined;
      if (!tex) continue;
      tilemap.tile(tex, col * destSize, row * destSize, {
        tileWidth: spec.tileSize * scale,
        tileHeight: spec.tileSize * scale,
      });
    }
  }

  return {
    tilemap,
    destroy() {
      tilemap.destroy({ children: true });
    },
  };
}
