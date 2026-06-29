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
import { scaleFor } from "@render/actorScale.ts";
import type { ViewportGeometry } from "@engine/viewport/scaler.ts";
import { type ArtPlacement, paintArt, paintComposition, type Painting, type Placement } from "@render/composition.ts";
import { createEnemySprite, type EnemyKind } from "@render/enemySprites.ts";
import { createBakedNpcSprite, createNpcSprite } from "@render/npc.ts";
import { bakedNpcBase, npcSpecFor } from "@render/npcRoster.ts";
import { createParallax, type Parallax } from "@render/parallax.ts";
import { createPlayerSprite } from "@render/playerSprite.ts";
import { loadPotFrames } from "@render/pots.ts";
import { Collectible, Enemy, Facing, Gate, Npc, Player, Position, Pot, Size, Switch } from "@sim/ecs/traits.ts";
import { lerp } from "@sim/math/vec2.ts";
import type { Camera } from "@sim/world/camera.ts";
import type { ParallaxLayerSpec } from "@render/parallax.ts";
import type { Entity, World } from "koota";
import {
  AnimatedSprite,
  Application,
  Container,
  Graphics,
  type Renderer,
  Sprite,
  type Texture,
} from "pixi.js";

export interface PaintingRenderOpts {
  readonly world: World;
  readonly camera: Camera;
  readonly viewport: ViewportGeometry;
  readonly alpha: number;
  readonly prev: Map<number, { x: number; y: number }>;
}

export interface PaintingRenderer {
  render(opts: PaintingRenderOpts): void;
  /**
   * Dispose + clear all actor views. MUST be called when the sim world is
   * rebuilt (player death): koota recycles worldId 0, so the new world's entity
   * ids numerically alias the destroyed world's — without flushing, the stale
   * `views` entries make `ensure*` think the actors already exist and the new
   * player/enemies never get sprites (invisible after a death with lives left).
   */
  flushViews(): void;
  destroy(): void;
  readonly app: Application;
  /** The canvas this renderer created and owns (a child of the host container). */
  readonly canvas: HTMLCanvasElement;
}

export interface PaintingRendererSpec {
  readonly parallax: readonly ParallaxLayerSpec[];
  readonly painting: readonly Placement[];
  /**
   * GenAI-level painting: whole transparent art images (baked props + decor) placed
   * on the level's surfaces. When present, this is used INSTEAD of `painting` (the
   * shape-stamp composition) — the schema-Level render path. `painting` stays []`.
   */
  readonly artPainting?: readonly ArtPlacement[];
  /**
   * The authored vertical band of the level, in world px (top → bottom). The
   * world is cover-scaled so this band exactly fills the canvas height — the
   * cave reaches the top and bottom edges with no letterbox bands. The level is
   * a horizontal side-scroller, so width is whatever the canvas aspect allows
   * (the camera scrolls across it). `frameTop` is usually slightly negative
   * (ceiling stalactites) and `frameBottom` past the floor so solid ground
   * fills to the bottom edge.
   */
  readonly frameTop: number;
  readonly frameBottom: number;
  /**
   * Optional solid ground fill — a colored band painted BEHIND the composition,
   * from `groundY` down past `frameBottom`, spanning the level width. Biomes
   * whose ground brushes are partly transparent (the overworld grass-topped
   * dirt tiles) need this so the sky parallax doesn't show through the floor;
   * the cave's opaque rock masses don't (omit it there).
   */
  readonly groundFill?: { readonly color: number; readonly groundY: number; readonly width: number };
}


interface ActorView {
  display: Sprite | AnimatedSprite | Graphics;
  anim?: AnimatedSprite;
  acc: number;
  fps: number;
  faceable?: boolean;
  dispose(): void;
}

/**
 * Each renderer creates and owns its OWN `<canvas>`, appended to the host
 * container `<div>`. A WebGL context is bound to a canvas ELEMENT for its
 * lifetime: when Pixi's `app.destroy()` tears down the GL context it loses it
 * (`WEBGL_lose_context.loseContext()`), and `getContext('webgl2')` on that same
 * element thereafter returns the *lost* context forever — `gl.createShader()`
 * then returns null and `gl.shaderSource(null, …)` throws inside Pixi's
 * `checkMaxIfStatementsInShader`. React StrictMode's mount→cleanup→mount cycle
 * destroyed app #1 and re-initialised app #2 on the SAME element, so #2 always
 * booted onto a dead context. Serialising init never helped — the element was
 * already poisoned. Fresh element per Application = virgin context every time.
 */
export async function createPaintingRenderer(
  container: HTMLElement,
  spec: PaintingRendererSpec,
): Promise<PaintingRenderer> {
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  const app = new Application();
  try {
    await app.init({
      canvas,
      // Pixi owns canvas sizing: it tracks the host container's CSS box and keeps
      // the backing store + `app.screen` in sync (resolution handles dpr). This
      // is what makes the canvas fill the host and `app.screen` authoritative for
      // the cover transform — no second party mutating canvas.width behind Pixi.
      resizeTo: container,
      background: "#17110b",
      antialias: false,
      resolution: Math.min(2, globalThis.devicePixelRatio || 1),
      autoDensity: true,
    });
  } catch (err) {
    canvas.remove();
    throw err;
  }

  // Layer tree: parallax fills the WHOLE canvas (no world transform), the world
  // sits on top under a cover-by-height transform so the authored cave frame
  // exactly fills the canvas height. Parallax is a sibling of (and behind) the
  // world so its full-bleed fill is never clipped to the world rect.
  const parallax: Parallax = await createParallax(spec.parallax);
  const worldLayer = new Container();
  app.stage.addChild(parallax.container, worldLayer);

  // Solid ground fill behind the painting (biomes with transparent ground
  // brushes). Drawn from groundY down to JUST past the authored frame bottom — a
  // thin under-soil seam beneath the grass, NOT a giant void. The contiguous
  // grass brushes are sized to cover above it, so no fill shows through.
  if (spec.groundFill) {
    const { color, groundY, width } = spec.groundFill;
    const depth = Math.max(40, spec.frameBottom - groundY + 24);
    const fill = new Graphics()
      .rect(-200, groundY, width + 400, depth)
      .fill(color);
    worldLayer.addChild(fill);
  }

  // GenAI levels paint whole transparent art (baked props); legacy levels paint
  // organic shape stamps. Pick the matching painter.
  const painting: Painting = spec.artPainting
    ? await paintArt(spec.artPainting)
    : await paintComposition(spec.painting);
  worldLayer.addChild(painting.container);

  const actorsLayer = new Container();
  worldLayer.addChild(actorsLayer);

  const views = new Map<Entity, ActorView>();
  const relicTex = makeRelicTexture(app);
  const potCache = new Map<string, Texture[]>();

  function syncActors(o: PaintingRenderOpts): void {
    const seen = new Set<Entity>();

    o.world.query(Player, Position, Size, Facing).readEach(([player, pos, size, facing], e) => {
      seen.add(e);
      ensurePlayer(e, views, actorsLayer);
      const v = views.get(e);
      place(v, e, o, pos, size);
      faceView(v, facing.dir);
      // Blink while invulnerable (post-hit mercy window) — flicker the sprite so
      // the player can read "I just took a hit and I'm briefly safe".
      if (v) v.display.alpha = player.invuln > 0 ? (Math.floor(player.invuln * 12) % 2 === 0 ? 0.35 : 1) : 1;
    });
    o.world.query(Enemy, Position, Size, Facing).readEach(([enemy, pos, size, facing], e) => {
      seen.add(e);
      ensureEnemy(e, enemy.visual, views, actorsLayer);
      place(views.get(e), e, o, pos, size);
      faceView(views.get(e), facing.dir);
    });
    o.world.query(Npc, Position, Size, Facing).readEach(([npc, pos, size, facing], e) => {
      seen.add(e);
      ensureNpc(e, npc.dialogueId, app.renderer, views, actorsLayer);
      place(views.get(e), e, o, pos, size);
      faceView(views.get(e), facing.dir);
    });
    o.world.query(Collectible, Position, Size).readEach(([, pos, size], e) => {
      seen.add(e);
      ensureRelic(e, relicTex, views, actorsLayer);
      place(views.get(e), e, o, pos, size);
    });
    o.world.query(Pot, Position, Size).readEach(([pot, pos, size], e) => {
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

    // Reflect gate state on the painted gate art: an OPEN gate fades out (it's now
    // passable). Gate entities spawn in the level's gate order, so the Nth gate maps
    // to the `gate:N` painting sprite tagged in paintingFromLevel.
    const gateSprites = painting.byKey;
    if (gateSprites) {
      let gi = 0;
      o.world.query(Gate).readEach(([gate]) => {
        const sprite = gateSprites.get(`gate:${gi}`);
        gi++;
        if (sprite) sprite.alpha = gate.open ? 0.15 : 1;
      });
    }

    // Reflect switch state on the painted lever art: a latched (ON) switch lights up
    // white-hot so the player can read "this is thrown"; an idle switch stays its base
    // tint. Switch entities spawn in level order → the Nth maps to `switch:N`.
    if (gateSprites) {
      let si = 0;
      o.world.query(Switch).readEach(([sw]) => {
        const sprite = gateSprites.get(`switch:${si}`);
        si++;
        if (sprite) sprite.tint = sw.on ? 0xffffff : 0x9aa0b0;
      });
    }
  }

  const frameH = Math.max(1, spec.frameBottom - spec.frameTop);

  function render(o: PaintingRenderOpts): void {
    const { camera: cam } = o;
    // app.screen is the logical (CSS-px) drawing surface; autoDensity maps it to
    // the dpr-scaled backing store. We work entirely in these logical units.
    const screenW = app.screen.width;
    const screenH = app.screen.height;

    // Cover by HEIGHT: the authored band fills the canvas top-to-bottom with no
    // letterbox. Gameplay is landscape-locked on phones (see App orientation
    // guard), so the canvas is always wide enough that this reads correctly.
    const worldScale = screenH / frameH;
    const camX = Math.round(cam.x);
    const camY = Math.round(cam.y);

    // Parallax fills the entire canvas (its own un-cover-scaled space).
    parallax.resize(screenW, screenH);
    parallax.update(camX, camY);

    // World: scale by cover factor, then translate so the camera's top-left world
    // point lands at the canvas origin. frameTop is pinned to the screen top.
    worldLayer.scale.set(worldScale);
    worldLayer.position.set(-camX * worldScale, (-camY - spec.frameTop) * worldScale);

    syncActors(o);
    for (const v of views.values()) {
      if (!v.anim) continue;
      v.acc += v.fps / 60;
      advanceAnim(v.anim, v.acc);
    }
  }

  function flushViews(): void {
    for (const v of views.values()) v.dispose();
    views.clear();
  }

  return {
    app,
    canvas,
    render,
    flushViews,
    destroy() {
      flushViews();
      // Pot frames are standalone Texture slices sharing an Assets-owned source;
      // destroy the slice wrappers (false = keep the shared source for Assets).
      for (const frames of potCache.values()) for (const t of frames) t.destroy(false);
      potCache.clear();
      relicTex.destroy(true); // standalone RenderTexture — not in the Assets cache
      painting.destroy();
      parallax.destroy();
      // removeView:true so Pixi drops the canvas; we also detach it from the DOM.
      // The element's GL context is now lost and unusable — it must never be
      // re-mounted (a fresh renderer always makes a fresh canvas).
      app.destroy({ removeView: true }, { children: true, texture: true });
      canvas.remove();
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
    // Anchor is set from the baked clip manifest inside createPlayerSprite (feet
    // contact, horizontal centre of mass) — don't override it here.
    p.sprite.scale.set(scaleFor("player"));
    layer.addChild(p.sprite);
    ph.parent?.removeChild(ph);
    ph.destroy();
    views.set(e, { display: p.sprite, anim: p.sprite, acc: 0, fps: 12, faceable: true, dispose: () => p.destroy() });
  }).catch((err) => {
    // A missing/404 hero asset must not crash the game — keep the placeholder.
    console.error("[render] player sprite failed to load:", err);
  });
}

function ensureEnemy(e: Entity, visual: EnemyKind, views: Map<Entity, ActorView>, layer: Container): void {
  if (views.has(e)) return;
  const ph = placeholder(0xc2402e);
  layer.addChild(ph);
  views.set(e, { display: ph, acc: 0, fps: 0, dispose: () => ph.destroy() });
  void createEnemySprite(visual, "move").then((sprite) => {
    if (!views.has(e)) {
      sprite.destroy();
      return;
    }
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(scaleFor(visual));
    layer.addChild(sprite);
    ph.parent?.removeChild(ph);
    ph.destroy();
    views.set(e, { display: sprite, anim: sprite, acc: 0, fps: 10, faceable: true, dispose: () => sprite.destroy() });
  }).catch((err) => {
    console.error("[render] enemy sprite failed to load:", err);
  });
}

function ensureNpc(
  e: Entity,
  dialogueId: string,
  renderer: Renderer,
  views: Map<Entity, ActorView>,
  layer: Container,
): void {
  if (views.has(e)) return;
  const ph = placeholder(0x6f9a4a);
  layer.addChild(ph);
  views.set(e, { display: ph, acc: 0, fps: 0, dispose: () => ph.destroy() });
  const bakedBase = bakedNpcBase(dialogueId);
  // Baked NPC first; if its sheet fails to load, fall back to the paper-doll so a
  // missing bake leaves a real NPC, not a permanent placeholder.
  const built = bakedBase
    ? createBakedNpcSprite(bakedBase).catch((err) => {
        console.error(`[render] baked npc ${dialogueId} failed; using paper-doll:`, err);
        return createNpcSprite(renderer, npcSpecFor(dialogueId));
      })
    : createNpcSprite(renderer, npcSpecFor(dialogueId));
  void built
    .then((npc) => {
      if (!views.has(e)) {
        npc.destroy();
        return;
      }
      npc.sprite.scale.set(scaleFor("npc"));
      layer.addChild(npc.sprite);
      ph.parent?.removeChild(ph);
      ph.destroy();
      views.set(e, {
        display: npc.sprite,
        anim: npc.sprite,
        acc: 0,
        fps: 5,
        faceable: true,
        dispose: () => npc.destroy(),
      });
    })
    .catch((err) => {
      console.error("[render] npc sprite failed to compose:", err);
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
  void loadPotFrames(color)
    .then((frames) => {
      cache.set(color, frames);
      if (!views.has(e)) return;
      ph.parent?.removeChild(ph);
      ph.destroy();
      placePot(e, frames, views, layer);
    })
    .catch((err) => {
      console.error("[render] pot frames failed to load:", err);
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
