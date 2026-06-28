/**
 * Render-layer traits + scene compositor (koota, browser-only).
 *
 * The sim world (src/sim) is pure data — it does NOT know about Pixi. This is the
 * RENDER world: a parallel koota world whose entities describe how the scene is
 * composited out of Pixi display objects, ordered by depth and scrolled by
 * parallax. The renderer walks these traits each frame; it never branches on
 * concrete asset types because every layer exposes the same `Layer` shape.
 *
 * koota traits hold ONLY plain data (so the render graph stays inspectable and
 * matches the sim's "traits are data" rule). The heavyweight Pixi objects
 * (Containers, Sprites, parallax stacks, tilemaps) live in a `RenderStore` keyed
 * by entity — the traits carry the entity's depth, parallax factor, sim link,
 * and animation state; the store carries the thing being drawn.
 *
 * Trait vocabulary (the user-facing render-layer model):
 *   • Layer       — a depth band: z-order + parallax factor (0 = far/static,
 *                   1 = world-locked). Its Container lives in the store.
 *   • ParallaxBg  — tags a Layer whose content is a TilingSprite parallax stack.
 *   • TileLayerRef— tags a Layer whose content is a @pixi/tilemap CompositeTilemap.
 *   • SpriteRef   — an actor drawn as a Pixi Sprite/AnimatedSprite, positioned
 *                   from a sim entity's Position each frame. Its sprite is in the
 *                   store; `sim` links it to the sim entity id (-1 = manual).
 *   • Anim        — animation playback state for a SpriteRef (fps + tick accum).
 */
import type { Parallax } from "@render/parallax.ts";
import type { PlayerState } from "@render/playerSprite.ts";
import type { TileLayer } from "@render/tileLayer.ts";
import { type Entity, trait, type World } from "koota";
import type { AnimatedSprite, Container, Sprite } from "pixi.js";

/** A composited depth band. `z` orders back-to-front; `parallax` scales scroll. */
export const Layer = trait({ z: 0, parallax: 1 });

/** Tags a Layer driven by a parallax TilingSprite stack. */
export const ParallaxBg = trait();

/** Tags a Layer driven by a @pixi/tilemap CompositeTilemap. */
export const TileLayerRef = trait();

/**
 * An actor rendered as a Pixi sprite. `sim` is the entity id in the SIM world
 * whose Position drives this sprite each frame (-1 = positioned manually).
 */
export const SpriteRef = trait({ sim: -1 });

/** Animation playback state for a SpriteRef backed by an AnimatedSprite. */
export const Anim = trait({
  state: "idle" as PlayerState | string,
  fps: 12,
  /** Accumulated 60fps ticks, for deterministic frame advance. */
  ticks: 0,
});

/** The drawable Pixi object behind a render entity (one of these per kind). */
type Drawable =
  | { kind: "layer"; container: Container }
  | { kind: "parallax"; container: Container; stack: Parallax }
  | { kind: "tiles"; container: Container; layer: TileLayer }
  | {
      kind: "sprite";
      sprite: Sprite | AnimatedSprite;
      /** Optional owner-handle teardown (e.g. PlayerSprite.destroy) freeing its textures. */
      dispose?: () => void;
    };

/** Maps render entities to their heavyweight Pixi objects. */
export class RenderStore {
  private readonly items = new Map<Entity, Drawable>();

  set(entity: Entity, drawable: Drawable): void {
    this.items.set(entity, drawable);
  }
  get(entity: Entity): Drawable | undefined {
    return this.items.get(entity);
  }
  delete(entity: Entity): void {
    this.items.delete(entity);
  }
  /** The Pixi container/sprite to add to the scene for an entity, if any. */
  display(entity: Entity): Container | Sprite | AnimatedSprite | undefined {
    const d = this.items.get(entity);
    if (!d) return undefined;
    return d.kind === "sprite" ? d.sprite : d.container;
  }
  /** Run every sprite's dispose() (frees owner-held textures), then clear. */
  disposeAll(): void {
    for (const d of this.items.values()) {
      if (d.kind === "sprite") d.dispose?.();
    }
    this.items.clear();
  }
}

/** Add every Layer's container to `root` in ascending z-order. */
export function mountLayers(world: World, store: RenderStore, root: Container): void {
  const ordered: Array<{ z: number; entity: Entity }> = [];
  world.query(Layer).readEach(([l], entity) => ordered.push({ z: l.z, entity }));
  ordered.sort((a, b) => a.z - b.z);
  for (const { entity } of ordered) {
    const display = store.display(entity);
    if (display) root.addChild(display);
  }
}

/**
 * Scroll every layer by the camera, scaled by its parallax factor. ParallaxBg
 * layers delegate to their TilingSprite stack (which tiles infinitely); other
 * layers shift their container by `-camera * parallax`.
 */
export function scrollLayers(world: World, store: RenderStore, camX: number, camY: number): void {
  world.query(Layer).readEach(([l], entity) => {
    const d = store.get(entity);
    if (!d) return;
    if (d.kind === "parallax") {
      d.stack.update(camX, camY);
      return;
    }
    if (d.kind === "sprite") return;
    d.container.position.set(
      Math.round(-camX * l.parallax),
      Math.round(-camY * l.parallax),
    );
  });
}

/**
 * Advance animated sprites and sync sprite positions from the sim world.
 * `posOf` resolves a sim entity id to its interpolated world position.
 */
export function syncSprites(
  world: World,
  store: RenderStore,
  ticks: number,
  posOf: (simId: number) => { x: number; y: number } | undefined,
): void {
  world.query(SpriteRef, Anim).updateEach(([ref, anim], entity) => {
    const d = store.get(entity);
    if (d?.kind !== "sprite") return;
    if (ref.sim >= 0) {
      const p = posOf(ref.sim);
      if (p) d.sprite.position.set(p.x, p.y);
    }
    if ("textures" in d.sprite) {
      // Accumulate sub-frame progress in the trait (currentFrame floors, so
      // reading it back would stall sub-60fps clips). updateEach writes it back.
      anim.ticks += (anim.fps / 60) * ticks;
      advanceAnim(d.sprite as AnimatedSprite, anim.ticks);
    }
  });
}

/** Set the displayed frame from accumulated frame-progress (autoUpdate is off). */
function advanceAnim(sprite: AnimatedSprite, acc: number): void {
  const count = sprite.textures.length;
  if (count <= 1) return;
  sprite.currentFrame = sprite.loop
    ? Math.floor(((acc % count) + count) % count)
    : Math.min(count - 1, Math.floor(Math.max(0, acc)));
}
