/**
 * Level composition — a level's look is a PAINTING: hand-assembled placement of
 * organic SHAPE stamps cut from the biome sheets (NOT a tile grid). This module
 * is the painting toolkit: name a stamp (a rect in a biome sheet), then place
 * instances of it at authored world positions/scale/flip to build a scene that
 * tells the story. Browser-only.
 *
 * Collision is a SEPARATE concern (invisible authored geometry the physics
 * reads) — this module only paints; it never defines where the player can walk.
 */
import { Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";

/** A named cut-out shape from a biome sheet (pixel rect within the source). */
export interface ShapeStamp {
  readonly sheet: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A placed instance of a stamp in the level painting. */
export interface Placement {
  readonly stamp: ShapeStamp;
  /** World position of the stamp's top-left (px). */
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  /** Horizontal flip (mirror the shape). */
  readonly flipX?: boolean;
  /** Vertical flip (e.g. an upward spire becomes a downward stalactite). */
  readonly flipY?: boolean;
  /** Paint order within the composition (higher = front). */
  readonly z?: number;
}

export interface Painting {
  readonly container: Container;
  destroy(): void;
}

const cache = new Map<string, Texture>();

/**
 * Destroy every cached stamp texture + clear the cache. Call when the backing
 * biome sheets are unloaded (level transition / HMR) so stale slices don't hold
 * references to a destroyed TextureSource. Single-session play needn't call it.
 */
export function clearStampCache(): void {
  for (const tex of cache.values()) tex.destroy();
  cache.clear();
}

/** Resolve (and cache) the cut-out texture for a stamp. */
async function stampTexture(stamp: ShapeStamp): Promise<Texture> {
  const key = `${stamp.sheet}#${stamp.x},${stamp.y},${stamp.w},${stamp.h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = await Assets.load<Texture>(stamp.sheet);
  const tex = new Texture({
    source: base.source,
    frame: new Rectangle(stamp.x, stamp.y, stamp.w, stamp.h),
  });
  cache.set(key, tex);
  return tex;
}

/**
 * Paint a composition: place every stamp instance as a Sprite in z-order into one
 * container. Returns the container (add it to a world layer) + a destroy().
 */
export async function paintComposition(placements: readonly Placement[]): Promise<Painting> {
  const container = new Container();
  const ordered = [...placements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  for (const p of ordered) {
    const tex = await stampTexture(p.stamp);
    const sprite = new Sprite(tex);
    const scale = p.scale ?? 1;
    sprite.scale.set(p.flipX ? -scale : scale, p.flipY ? -scale : scale);
    // Keep the top-left anchored at (x,y) regardless of flip (a negative scale
    // mirrors about the anchor, so shift by the mirrored extent to compensate).
    sprite.position.set(
      p.flipX ? p.x + p.stamp.w * scale : p.x,
      p.flipY ? p.y + p.stamp.h * scale : p.y,
    );
    container.addChild(sprite);
  }
  return {
    container,
    destroy() {
      container.destroy({ children: true });
    },
  };
}

/** A whole-image art placement scaled so its on-screen height = worldHeight. */
export interface ArtPlacement {
  readonly url: string;
  readonly x: number;
  readonly y: number;
  readonly worldHeight: number;
  readonly z: number;
  readonly flipX: boolean;
  /** 'base' bottom-rests the image on (x,y); 'top' top-aligns it at (x,y). */
  readonly anchor: "base" | "top";
}

/**
 * Paint a GenAI-level composition: each entry is a WHOLE transparent PNG (loaded by
 * url), scaled so its height = worldHeight (aspect preserved), then anchored. Used
 * by the schema-Level renderer (render/levels/fromLevel.ts) — the art the design
 * referenced by key, placed on the same surfaces the collision derives from.
 */
export async function paintArt(placements: readonly ArtPlacement[]): Promise<Painting> {
  const container = new Container();
  const ordered = [...placements].sort((a, b) => a.z - b.z);
  for (const p of ordered) {
    const tex = await Assets.load<Texture>(p.url);
    const sprite = new Sprite(tex);
    const scale = p.worldHeight / (tex.height || p.worldHeight);
    const w = tex.width * scale;
    const h = tex.height * scale;
    sprite.scale.set(p.flipX ? -scale : scale, scale);
    // Top-left placement, flip-compensated; 'base' lifts the image so its BOTTOM
    // sits on y, 'top' places its TOP at y.
    const topY = p.anchor === "base" ? p.y - h : p.y;
    sprite.position.set(p.flipX ? p.x + w : p.x, topY);
    container.addChild(sprite);
  }
  return {
    container,
    destroy() {
      container.destroy({ children: true });
    },
  };
}
