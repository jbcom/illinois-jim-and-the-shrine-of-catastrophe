/**
 * PixiJS (WebGL/WebGPU) renderer — draws the deterministic ECS world as a view.
 * Browser-only. The sim stays pure; this only reads traits and paints.
 *
 * Architecture: a Pixi Application owns the canvas. A world container is scrolled
 * by the camera and scaled/letterboxed by the viewport. Tiles are drawn once per
 * frame into a single Graphics (cheap for our small grids); dynamic actors
 * (player, enemies, collectibles) are drawn into a second Graphics each frame.
 * Interpolation uses the clock alpha between previous and current positions.
 *
 * This replaces the hand-rolled canvas2d renderer (custom code → proper lib).
 */

import type { ViewportGeometry } from "@engine/viewport/scaler.ts";
import { Collectible, Enemy, Facing, Player, Position, Size } from "@sim/ecs/traits.ts";
import { lerp } from "@sim/math/vec2.ts";
import type { PlayerTuning } from "@sim/player/tuning.ts";
import type { Camera } from "@sim/world/camera.ts";
import { TileKind, type TileMap } from "@sim/world/tilemap.ts";
import type { World } from "koota";
import { Application, Container, Graphics } from "pixi.js";
import { BRAND } from "@/brand.ts";

const hex = (s: string): number => Number.parseInt(s.slice(1), 16);

const TILE_COLOR: Partial<Record<TileKind, number>> = {
  [TileKind.Solid]: hex(BRAND.stone),
  [TileKind.Platform]: hex(BRAND.sandstone),
  [TileKind.Hazard]: hex(BRAND.bloodRed),
  [TileKind.Ladder]: hex(BRAND.idolGold),
  [TileKind.Rail]: hex(BRAND.steel),
};

export interface PixiRenderer {
  /** Draw one frame from the ECS world + camera + viewport. */
  render(opts: RenderOpts): void;
  /** Tear down the Pixi app + canvas resources. */
  destroy(): void;
  readonly app: Application;
}

export interface RenderOpts {
  readonly world: World;
  readonly map: TileMap;
  readonly camera: Camera;
  readonly viewport: ViewportGeometry;
  readonly tuning: PlayerTuning;
  /** Interpolation factor [0,1) between the previous and current sim states. */
  readonly alpha: number;
  /** Previous-frame positions keyed by a stable id, for interpolation. */
  readonly prev: Map<number, { x: number; y: number }>;
}

export async function createPixiRenderer(canvas: HTMLCanvasElement): Promise<PixiRenderer> {
  const app = new Application();
  await app.init({
    canvas,
    background: BRAND.obsidian,
    antialias: false, // crisp pixel-art edges
    resolution: Math.min(2, globalThis.devicePixelRatio || 1),
    autoDensity: true,
  });

  const root = new Container();
  app.stage.addChild(root);
  const tileGfx = new Graphics();
  const actorGfx = new Graphics();
  root.addChild(tileGfx);
  root.addChild(actorGfx);

  function render(o: RenderOpts): void {
    const { camera: cam, viewport: vp, map } = o;
    // Letterbox/scale the design view into the canvas, then scroll by camera.
    root.position.set(vp.offsetX, vp.offsetY);
    root.scale.set(vp.scale);
    const camX = Math.round(cam.x);
    const camY = Math.round(cam.y);

    drawTiles(tileGfx, map, cam, vp, camX, camY);
    drawActors(actorGfx, o, camX, camY);
  }

  return {
    app,
    render,
    destroy() {
      // removeView:false — React owns the <canvas> element; tearing it out of
      // the DOM here (StrictMode cleanup) would leave the remounted app with no
      // canvas to render into. Only destroy Pixi's own resources.
      app.destroy({ removeView: false }, { children: true, texture: true });
    },
  };
}

function drawTiles(
  g: Graphics,
  map: TileMap,
  cam: Camera,
  vp: ViewportGeometry,
  camX: number,
  camY: number,
): void {
  g.clear();
  const ts = map.tileSize;
  const col0 = Math.max(0, Math.floor(cam.x / ts));
  const row0 = Math.max(0, Math.floor(cam.y / ts));
  const col1 = Math.min(map.width - 1, Math.ceil((cam.x + vp.viewW) / ts));
  const row1 = Math.min(map.height - 1, Math.ceil((cam.y + vp.viewH) / ts));

  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      const kind = map.tiles[row * map.width + col] as TileKind;
      const color = TILE_COLOR[kind];
      if (color === undefined) continue;
      g.rect(col * ts - camX, row * ts - camY, ts, ts).fill(color);
    }
  }
}

function drawActors(g: Graphics, o: RenderOpts, camX: number, camY: number): void {
  g.clear();
  const { world, alpha, prev, tuning } = o;

  // Read-only iteration (readEach) — the renderer never mutates the sim, and
  // updateEach's write-back/change-tracking must not run in the render path.

  // Collectibles (relic gold diamonds).
  world.query(Collectible, Position, Size).readEach(([, pos, size]) => {
    const cx = pos.x - camX + size.w / 2;
    const cy = pos.y - camY + size.h / 2;
    g.poly([
      cx,
      cy - size.h / 2,
      cx + size.w / 2,
      cy,
      cx,
      cy + size.h / 2,
      cx - size.w / 2,
      cy,
    ]).fill(hex(BRAND.relicGold));
  });

  // Enemies (blood-red blocks), interpolated.
  world.query(Enemy, Position, Size).readEach(([, pos, size], entity) => {
    const p = prev.get(entity);
    const x = (p ? lerp(p.x, pos.x, alpha) : pos.x) - camX;
    const y = (p ? lerp(p.y, pos.y, alpha) : pos.y) - camY;
    g.rect(Math.round(x), Math.round(y), size.w, size.h).fill(hex(BRAND.bloodRed));
  });

  // Player (parchment), interpolated, with whip flick.
  world.query(Player, Position, Size, Facing).readEach(([p, pos, size, facing], entity) => {
    const prevPos = prev.get(entity);
    const x = (prevPos ? lerp(prevPos.x, pos.x, alpha) : pos.x) - camX;
    const y = (prevPos ? lerp(prevPos.y, pos.y, alpha) : pos.y) - camY;
    g.rect(Math.round(x), Math.round(y), size.w, size.h).fill(hex(BRAND.parchment));

    if (p.whip > 0) {
      const reach = tuning.whipReach * (p.whip / tuning.whipDuration);
      const ox = facing.dir > 0 ? x + size.w : x;
      const tx = ox + facing.dir * reach;
      const my = y + size.h * 0.4;
      g.moveTo(Math.round(ox), Math.round(my))
        .lineTo(Math.round(tx), Math.round(my))
        .stroke({ width: 2, color: hex(BRAND.relicGold) });
    }
  });
}
