import { computeViewport } from "@engine/viewport/scaler.ts";
import { drawFrame, SHRINE_PALETTE } from "@render/renderer.ts";
import { createPlayer } from "@sim/player/player.ts";
import { DEFAULT_TUNING } from "@sim/player/tuning.ts";
import { createCamera } from "@sim/world/camera.ts";
import { createTileMap, setTile, TileKind } from "@sim/world/tilemap.ts";
import { describe, expect, it } from "vitest";

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  return { canvas, ctx };
}

function pixel(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const d = ctx.getImageData(x, y, 1, 1).data;
  return { r: d[0]!, g: d[1]!, b: d[2]!, a: d[3]! };
}

const profile = {
  deviceClass: "desktop" as const,
  designResolution: { width: 320, height: 180 },
  uiScale: 1,
};

describe("drawFrame", () => {
  it("fills the backdrop with the sky colour", () => {
    const { canvas, ctx } = makeCanvas(320, 180);
    const map = createTileMap(40, 20, 16);
    const vp = computeViewport(profile, canvas.width, canvas.height);
    const player = createPlayer(50, 50);
    drawFrame(ctx, {
      map,
      camera: createCamera(vp.viewW, vp.viewH),
      viewport: vp,
      prevPlayer: player,
      player,
      tuning: DEFAULT_TUNING,
      alpha: 0,
    });
    // Sky #1a120b = (26, 18, 11)
    const p = pixel(ctx, 5, 5);
    expect(p.r).toBe(26);
    expect(p.g).toBe(18);
    expect(p.b).toBe(11);
  });

  it("draws a solid tile in the solid colour", () => {
    const { canvas, ctx } = makeCanvas(320, 180);
    const map = createTileMap(40, 20, 16);
    setTile(map, 0, 0, TileKind.Solid); // top-left tile, on screen at (0,0)
    const vp = computeViewport(profile, canvas.width, canvas.height);
    const player = createPlayer(200, 200);
    drawFrame(ctx, {
      map,
      camera: createCamera(vp.viewW, vp.viewH),
      viewport: vp,
      prevPlayer: player,
      player,
      tuning: DEFAULT_TUNING,
      alpha: 0,
    });
    // Center of the first tile should be the solid colour, not sky.
    const p = pixel(ctx, 8, 8);
    expect(p).not.toEqual({ r: 26, g: 18, b: 11, a: 255 });
  });

  it("renders the player rectangle in the player colour", () => {
    const { canvas, ctx } = makeCanvas(320, 180);
    const map = createTileMap(40, 20, 16);
    const vp = computeViewport(profile, canvas.width, canvas.height);
    const player = createPlayer(20, 20); // near top-left, in view
    drawFrame(ctx, {
      map,
      camera: createCamera(vp.viewW, vp.viewH),
      viewport: vp,
      prevPlayer: player,
      player,
      tuning: DEFAULT_TUNING,
      alpha: 0,
    });
    // Player #f3e9d2 = (243, 233, 210). Sample inside the player box.
    const p = pixel(ctx, 24, 24);
    expect(p.r).toBeGreaterThan(200);
    expect(p.g).toBeGreaterThan(200);
    expect(p.b).toBeGreaterThan(150);
  });

  it("interpolates the player position with alpha", () => {
    const { canvas, ctx } = makeCanvas(320, 180);
    const map = createTileMap(40, 20, 16);
    const vp = computeViewport(profile, canvas.width, canvas.height);
    const prev = createPlayer(20, 20);
    const cur = { ...createPlayer(60, 20) };
    drawFrame(ctx, {
      map,
      camera: createCamera(vp.viewW, vp.viewH),
      viewport: vp,
      prevPlayer: prev,
      player: cur,
      tuning: DEFAULT_TUNING,
      alpha: 0.5, // halfway → player drawn around x=40
      palette: SHRINE_PALETTE,
    });
    const atMid = pixel(ctx, 44, 24);
    expect(atMid.r).toBeGreaterThan(200); // player is at the interpolated midpoint
  });
});
