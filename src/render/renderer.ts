/**
 * Canvas2D renderer. Browser-only (uses CanvasRenderingContext2D).
 *
 * Draws a sim snapshot through a camera + viewport geometry. The sim runs on a
 * fixed timestep; the renderer interpolates the player between the previous and
 * current sim position using `alpha` for smooth motion at any display rate.
 *
 * The renderer is deliberately dumb: it owns no game state, only how to paint a
 * frame. All world→screen mapping goes through the viewport (letterbox scale +
 * offset) and the camera (world scroll).
 */
import type { ViewportGeometry } from "@engine/viewport/scaler.ts";
import { lerp } from "@sim/math/vec2.ts";
import type { PlayerState } from "@sim/player/player.ts";
import type { PlayerTuning } from "@sim/player/tuning.ts";
import type { Camera } from "@sim/world/camera.ts";
import { TileKind, type TileMap } from "@sim/world/tilemap.ts";

export interface Palette {
  readonly sky: string;
  readonly solid: string;
  readonly platform: string;
  readonly hazard: string;
  readonly ladder: string;
  readonly rail: string;
  readonly player: string;
  readonly whip: string;
}

export const SHRINE_PALETTE: Palette = {
  sky: "#1a120b",
  solid: "#6b4a2b",
  platform: "#8a6534",
  hazard: "#c2402e",
  ladder: "#c9a35b",
  rail: "#9a9a9a",
  player: "#f3e9d2",
  whip: "#e8c66b",
};

function tileColor(kind: TileKind, p: Palette): string | null {
  switch (kind) {
    case TileKind.Solid:
      return p.solid;
    case TileKind.Platform:
      return p.platform;
    case TileKind.Hazard:
      return p.hazard;
    case TileKind.Ladder:
      return p.ladder;
    case TileKind.Rail:
      return p.rail;
    default:
      return null;
  }
}

export interface FrameInput {
  readonly map: TileMap;
  readonly camera: Camera;
  readonly viewport: ViewportGeometry;
  /** Previous + current player states for interpolation. */
  readonly prevPlayer: PlayerState;
  readonly player: PlayerState;
  readonly tuning: PlayerTuning;
  /** Interpolation factor [0,1) from the clock. */
  readonly alpha: number;
  readonly palette?: Palette;
}

export function drawFrame(ctx: CanvasRenderingContext2D, f: FrameInput): void {
  const pal = f.palette ?? SHRINE_PALETTE;
  const { camera: cam, viewport: vp, map } = f;
  const canvas = ctx.canvas;

  // Backdrop fills the whole canvas (letterbox bars use the sky colour too).
  ctx.fillStyle = pal.sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // Map the design-resolution view into the real canvas: letterbox offset + scale.
  ctx.translate(vp.offsetX, vp.offsetY);
  ctx.scale(vp.scale, vp.scale);
  // Clip to the design viewport so nothing spills into the letterbox bars.
  ctx.beginPath();
  ctx.rect(0, 0, vp.viewW, vp.viewH);
  ctx.clip();
  // Apply camera scroll (round to avoid sub-pixel shimmer on pixel art).
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

  drawTiles(ctx, map, cam, vp, pal);
  drawPlayer(ctx, f, pal);

  ctx.restore();
}

function drawTiles(
  ctx: CanvasRenderingContext2D,
  map: TileMap,
  cam: Camera,
  vp: ViewportGeometry,
  pal: Palette,
): void {
  const ts = map.tileSize;
  // Only iterate the tiles visible in the camera window (+1 margin).
  const col0 = Math.max(0, Math.floor(cam.x / ts));
  const row0 = Math.max(0, Math.floor(cam.y / ts));
  const col1 = Math.min(map.width - 1, Math.ceil((cam.x + vp.viewW) / ts));
  const row1 = Math.min(map.height - 1, Math.ceil((cam.y + vp.viewH) / ts));

  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      const kind = map.tiles[row * map.width + col] as TileKind;
      const color = tileColor(kind, pal);
      if (color === null) continue;
      ctx.fillStyle = color;
      ctx.fillRect(col * ts, row * ts, ts, ts);
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, f: FrameInput, pal: Palette): void {
  const t = f.tuning;
  const px = lerp(f.prevPlayer.x, f.player.x, f.alpha);
  const py = lerp(f.prevPlayer.y, f.player.y, f.alpha);

  ctx.fillStyle = pal.player;
  ctx.fillRect(Math.round(px), Math.round(py), t.width, t.height);

  // Whip flick in the facing direction while active.
  if (f.player.whip > 0) {
    const reach = t.whipReach * (f.player.whip / t.whipDuration);
    const originX = f.player.facing > 0 ? px + t.width : px;
    const tipX = originX + f.player.facing * reach;
    const midY = py + t.height * 0.4;
    ctx.strokeStyle = pal.whip;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.round(originX), Math.round(midY));
    ctx.lineTo(Math.round(tipX), Math.round(midY));
    ctx.stroke();
  }
}
