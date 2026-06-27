/**
 * Sprite atlas — maps named sprites to source rectangles in a packed
 * spritesheet (e.g. the Kenney Pixel Platformer tilemap). Browser-only loader;
 * the rect math is pure so it can be tested without the DOM.
 *
 * Kenney packed tilemaps are uniform grids; `gridAtlas` builds an atlas from a
 * tile size + named (col,row) cells. The renderer uses an atlas to blit sprites
 * instead of flat-colour rects once assets are wired in.
 */
export interface SpriteRect {
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
}

export interface Atlas {
  readonly image: HTMLImageElement | ImageBitmap;
  readonly tileSize: number;
  rect(name: string): SpriteRect | undefined;
  readonly names: readonly string[];
}

/** Pure: compute a sprite rect for a grid cell. */
export function cellRect(col: number, row: number, tileSize: number, gap = 0): SpriteRect {
  const step = tileSize + gap;
  return { sx: col * step, sy: row * step, sw: tileSize, sh: tileSize };
}

export interface GridAtlasSpec {
  readonly tileSize: number;
  /** Gap between tiles in the sheet (Kenney "packed" sheets have 0). */
  readonly gap?: number;
  /** name → [col, row] in the grid. */
  readonly cells: Readonly<Record<string, readonly [number, number]>>;
}

export function gridAtlas(image: HTMLImageElement | ImageBitmap, spec: GridAtlasSpec): Atlas {
  const gap = spec.gap ?? 0;
  const rects = new Map<string, SpriteRect>();
  for (const [name, [col, row]] of Object.entries(spec.cells)) {
    rects.set(name, cellRect(col, row, spec.tileSize, gap));
  }
  return {
    image,
    tileSize: spec.tileSize,
    rect: (name) => rects.get(name),
    names: [...rects.keys()],
  };
}

/** Load an image from a URL (resolves once decoded). Browser-only. */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load image: ${url}`));
    img.src = url;
  });
}

/** Blit a named sprite to the canvas at (dx, dy), scaled to dw×dh. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  atlas: Atlas,
  name: string,
  dx: number,
  dy: number,
  dw = atlas.tileSize,
  dh = atlas.tileSize,
): boolean {
  const r = atlas.rect(name);
  if (!r) return false;
  ctx.drawImage(atlas.image, r.sx, r.sy, r.sw, r.sh, dx, dy, dw, dh);
  return true;
}
