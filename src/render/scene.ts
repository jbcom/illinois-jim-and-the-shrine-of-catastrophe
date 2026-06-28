/**
 * Scene builder — assembles a render world (Layer/ParallaxBg/TileLayerRef/
 * SpriteRef/Anim entities + a RenderStore) from a declarative scene spec, then
 * mounts it under a root Container. Browser-only.
 *
 * This is the composition root the user asked for: parallax background, tile
 * layers, and sprite actors all become render-world entities ordered by z, so
 * the renderer just walks the traits. Adding a layer = spawning an entity.
 */
import { Container } from "pixi.js";
import { createWorld, type World } from "koota";
import { createParallax, type ParallaxLayerSpec } from "@render/parallax.ts";
import { renderTileLayer, type TileLayerSpec } from "@render/tileLayer.ts";
import { createPlayerSprite, type PlayerState } from "@render/playerSprite.ts";
import { createEnemySprite, type EnemyKind } from "@render/enemySprites.ts";
import { Anim, Layer, mountLayers, ParallaxBg, RenderStore, SpriteRef, TileLayerRef } from "@render/layers.ts";
import type { TileMap } from "@sim/world/tilemap.ts";

export interface SceneSpec {
  /** Parallax backdrop (deepest → nearest), placed at the back (low z). */
  readonly parallax?: readonly ParallaxLayerSpec[];
  /** Tile layers painted over the backdrop. */
  readonly tileLayers?: readonly { map: TileMap; spec: TileLayerSpec; destSize: number; z: number }[];
  /** Sprite actors (player + enemies) placed in front. */
  readonly actors?: readonly SceneActor[];
}

export type SceneActor =
  | { kind: "player"; state?: PlayerState; x: number; y: number; sim?: number }
  | { kind: "enemy"; enemy: EnemyKind; state?: string; x: number; y: number; sim?: number };

export interface Scene {
  readonly world: World;
  readonly store: RenderStore;
  readonly root: Container;
  /** Fit view-sized layers (parallax) to the viewport; call on resize. */
  resize(viewW: number, viewH: number): void;
  destroy(): void;
}

const Z_PARALLAX = 0;
const Z_ACTORS = 1000;

/** Build + mount a scene from its spec. */
export async function buildScene(spec: SceneSpec): Promise<Scene> {
  const world = createWorld();
  const store = new RenderStore();
  const root = new Container();

  if (spec.parallax?.length) {
    const stack = await createParallax(spec.parallax);
    const e = world.spawn(Layer({ z: Z_PARALLAX, parallax: 0 }), ParallaxBg());
    store.set(e, { kind: "parallax", container: stack.container, stack });
  }

  for (const tl of spec.tileLayers ?? []) {
    const layer = await renderTileLayer(tl.map, tl.spec, tl.destSize);
    const container = new Container();
    container.addChild(layer.tilemap);
    const e = world.spawn(Layer({ z: tl.z, parallax: 1 }), TileLayerRef());
    store.set(e, { kind: "tiles", container, layer });
  }

  for (const actor of spec.actors ?? []) {
    await spawnActor(world, store, actor);
  }

  mountLayers(world, store, root);
  const scene: Scene = {
    world,
    store,
    root,
    resize(viewW, viewH) {
      world.query(ParallaxBg).readEach((_t, entity) => {
        const d = store.get(entity);
        if (d?.kind === "parallax") d.stack.resize(viewW, viewH);
      });
    },
    destroy() {
      root.destroy({ children: true });
      world.destroy();
    },
  };
  return scene;
}

async function spawnActor(world: World, store: RenderStore, actor: SceneActor): Promise<void> {
  if (actor.kind === "player") {
    const player = await createPlayerSprite(actor.state ?? "idle");
    player.sprite.position.set(actor.x, actor.y);
    const e = world.spawn(
      Layer({ z: Z_ACTORS, parallax: 1 }),
      SpriteRef({ sim: actor.sim ?? -1 }),
      Anim({ state: actor.state ?? "idle", fps: 12, ticks: 0 }),
    );
    store.set(e, { kind: "sprite", sprite: player.sprite });
    return;
  }
  const sprite = await createEnemySprite(actor.enemy, (actor.state as never) ?? "idle");
  sprite.position.set(actor.x, actor.y);
  sprite.width = 64;
  sprite.height = 64;
  const e = world.spawn(
    Layer({ z: Z_ACTORS, parallax: 1 }),
    SpriteRef({ sim: actor.sim ?? -1 }),
    Anim({ state: actor.state ?? "idle", fps: 10, ticks: 0 }),
  );
  store.set(e, { kind: "sprite", sprite });
}
