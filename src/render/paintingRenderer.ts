/**
 * Painting renderer — draws the game as a hand-painted level composition with
 * sim-driven sprite actors over the cave parallax. Browser-only; sim stays pure.
 * Replaces the placeholder-rect renderer; matches its interface for the loop.
 *
 * Layers (back→front): parallax backdrop → painted level composition (organic
 * shape stamps) → actors (hero, enemies, pots, relics). The world layer (painting
 * + actors) is camera-scrolled 1:1; parallax scrolls fractionally by depth.
 * Actor sprites are created when an entity first appears and destroyed when it
 * vanishes; positions sync (interpolated) from the sim each frame.
 */
import type { ViewportGeometry } from "@engine/viewport/scaler.ts";
import { paintComposition, type Painting, type Placement } from "@render/composition.ts";
import { createEnemySprite, type EnemyKind } from "@render/enemySprites.ts";
import { createParallax, type Parallax } from "@render/parallax.ts";
import { createPlayerSprite } from "@render/playerSprite.ts";
import { loadPotFrames } from "@render/pots.ts";
import { Collectible, Enemy, Facing, Player, Position, Pot, Size } from "@sim/ecs/traits.ts";
import { lerp } from "@sim/math/vec2.ts";
import type { Camera } from "@sim/world/camera.ts";
import type { ParallaxLayerSpec } from "@render/parallax.ts";
import type { Entity, World } from "koota";
import { AnimatedSprite, Application, Container, Graphics, Sprite, type Texture } from "pixi.js";

export interface PaintingRenderOpts {
  readonly world: World;
  readonly camera: Camera;
  readonly viewport: ViewportGeometry;
  readonly alpha: number;
  readonly prev: Map<number, { x: number; y: number }>;
}

export interface PaintingRenderer {
  render(opts: PaintingRenderOpts): void;
  destroy(): void;
  readonly app: Application;
}

export interface PaintingRendererSpec {
  readonly parallax: readonly ParallaxLayerSpec[];
  readonly painting: readonly Placement[];
}

/** Map sim patrol/chase kinds to a visual enemy kind. */
const ENEMY_VISUAL: Record<"patrol" | "chase", EnemyKind> = { patrol: "goblin", chase: "skeleton" };

interface ActorView {
  display: Sprite | AnimatedSprite | Graphics;
  anim?: AnimatedSprite;
  acc: number;
  fps: number;
  faceable?: boolean;
  dispose(): void;
}

export async function createPaintingRenderer(
  canvas: HTMLCanvasElement,
  spec: PaintingRendererSpec,
): Promise<PaintingRenderer> {
  const app = new Application();
  await app.init({
    canvas,
    background: "#17110b",
    antialias: false,
    resolution: Math.min(2, globalThis.devicePixelRatio || 1),
    autoDensity: true,
  });

  const root = new Container();
  app.stage.addChild(root);

  const parallax: Parallax = await createParallax(spec.parallax);
  const worldLayer = new Container();
  root.addChild(parallax.container, worldLayer);

  const painting: Painting = await paintComposition(spec.painting);
  worldLayer.addChild(painting.container);

  const actorsLayer = new Container();
  worldLayer.addChild(actorsLayer);

  const views = new Map<Entity, ActorView>();
  const relicTex = makeRelicTexture(app);
  const potCache = new Map<string, Texture[]>();

  function syncActors(o: PaintingRenderOpts): void {
    const seen = new Set<Entity>();

    o.world.query(Player, Position, Size, Facing).updateEach(([, pos, size, facing], e) => {
      seen.add(e);
      ensurePlayer(e, views, actorsLayer);
      place(views.get(e), e, o, pos, size);
      faceView(views.get(e), facing.dir);
    });
    o.world.query(Enemy, Position, Size, Facing).updateEach(([enemy, pos, size, facing], e) => {
      seen.add(e);
      ensureEnemy(e, enemy.kind, views, actorsLayer);
      place(views.get(e), e, o, pos, size);
      faceView(views.get(e), facing.dir);
    });
    o.world.query(Collectible, Position, Size).updateEach(([, pos, size], e) => {
      seen.add(e);
      ensureRelic(e, relicTex, views, actorsLayer);
      place(views.get(e), e, o, pos, size);
    });
    o.world.query(Pot, Position, Size).updateEach(([pot, pos, size], e) => {
      seen.add(e);
      ensurePot(e, pot.color, potCache, views, actorsLayer);
      place(views.get(e), e, o, pos, size);
    });

    for (const [e, v] of views) {
      if (!seen.has(e)) {
        v.dispose();
        views.delete(e);
      }
    }
  }

  function render(o: PaintingRenderOpts): void {
    const { camera: cam, viewport: vp } = o;
    root.position.set(vp.offsetX, vp.offsetY);
    root.scale.set(vp.scale);
    const camX = Math.round(cam.x);
    const camY = Math.round(cam.y);

    parallax.resize(vp.viewW, vp.viewH);
    parallax.update(camX, camY);
    worldLayer.position.set(-camX, -camY);

    syncActors(o);
    for (const v of views.values()) {
      if (v.anim) advanceAnim(v.anim, (v.acc += v.fps / 60));
    }
  }

  return {
    app,
    render,
    destroy() {
      for (const v of views.values()) v.dispose();
      views.clear();
      painting.destroy();
      parallax.destroy();
      app.destroy({ removeView: false }, { children: true, texture: true });
    },
  };
}

// --- view factories ---

function ensurePlayer(e: Entity, views: Map<Entity, ActorView>, layer: Container): void {
  if (views.has(e)) return;
  const ph = placeholder(0xf4e4c1);
  layer.addChild(ph);
  views.set(e, { display: ph, acc: 0, fps: 0, dispose: () => ph.destroy() });
  void createPlayerSprite("run").then((p) => {
    if (!views.has(e)) {
      p.destroy();
      return;
    }
    p.sprite.anchor.set(0.5, 1);
    p.sprite.scale.set(0.5);
    layer.addChild(p.sprite);
    ph.destroy();
    views.set(e, { display: p.sprite, anim: p.sprite, acc: 0, fps: 12, faceable: true, dispose: () => p.destroy() });
  });
}

function ensureEnemy(e: Entity, kind: "patrol" | "chase", views: Map<Entity, ActorView>, layer: Container): void {
  if (views.has(e)) return;
  const ph = placeholder(0xc2402e);
  layer.addChild(ph);
  views.set(e, { display: ph, acc: 0, fps: 0, dispose: () => ph.destroy() });
  void createEnemySprite(ENEMY_VISUAL[kind], "move").then((sprite) => {
    if (!views.has(e)) {
      sprite.destroy();
      return;
    }
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(0.28);
    layer.addChild(sprite);
    ph.destroy();
    views.set(e, { display: sprite, anim: sprite, acc: 0, fps: 10, faceable: true, dispose: () => sprite.destroy() });
  });
}

function ensureRelic(e: Entity, tex: Texture, views: Map<Entity, ActorView>, layer: Container): void {
  if (views.has(e)) return;
  const s = new Sprite(tex);
  s.anchor.set(0.5);
  layer.addChild(s);
  views.set(e, { display: s, acc: 0, fps: 0, dispose: () => s.destroy() });
}

function ensurePot(
  e: Entity,
  color: "gray" | "red" | "white" | "yellow",
  cache: Map<string, Texture[]>,
  views: Map<Entity, ActorView>,
  layer: Container,
): void {
  if (views.has(e)) return;
  const cached = cache.get(color);
  if (cached) {
    placePot(e, cached, views, layer);
    return;
  }
  const ph = placeholder(0x8a6d3b);
  layer.addChild(ph);
  views.set(e, { display: ph, acc: 0, fps: 0, dispose: () => ph.destroy() });
  void loadPotFrames(color).then((frames) => {
    cache.set(color, frames);
    if (!views.has(e)) return;
    ph.destroy();
    placePot(e, frames, views, layer);
  });
}

function placePot(e: Entity, frames: Texture[], views: Map<Entity, ActorView>, layer: Container): void {
  const sprite = new AnimatedSprite(frames);
  sprite.autoUpdate = false;
  sprite.anchor.set(0.5, 1);
  sprite.scale.set(0.7);
  layer.addChild(sprite);
  views.set(e, { display: sprite, acc: 0, fps: 0, dispose: () => sprite.destroy() });
}

// --- helpers ---

function placeholder(color: number): Graphics {
  return new Graphics().rect(-6, -12, 12, 12).fill(color);
}

function place(
  v: ActorView | undefined,
  e: Entity,
  o: PaintingRenderOpts,
  pos: { x: number; y: number },
  size: { w: number; h: number },
): void {
  if (!v) return;
  const p = o.prev.get(e);
  const x = (p ? lerp(p.x, pos.x, o.alpha) : pos.x) + size.w / 2;
  const y = (p ? lerp(p.y, pos.y, o.alpha) : pos.y) + size.h;
  v.display.position.set(x, y);
}

function faceView(v: ActorView | undefined, dir: -1 | 1): void {
  if (!v?.faceable) return;
  const sx = Math.abs(v.display.scale.x);
  v.display.scale.x = dir < 0 ? -sx : sx;
}

function advanceAnim(sprite: AnimatedSprite, acc: number): void {
  const count = sprite.textures.length;
  if (count <= 1) return;
  sprite.currentFrame = Math.floor(((acc % count) + count) % count);
}

function makeRelicTexture(app: Application): Texture {
  const g = new Graphics()
    .poly([0, -7, 7, 0, 0, 7, -7, 0])
    .fill(0xf6d36b)
    .stroke({ width: 1, color: 0x8a5a1a });
  const tex = app.renderer.generateTexture(g);
  g.destroy();
  return tex;
}
