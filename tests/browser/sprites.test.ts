import { animatedFromStrip, sliceStrip } from "@render/sprites.ts";
import { page } from "vitest/browser";
import { Application, Texture } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("sprite-sheet slicing + AnimatedSprite", () => {
  it("slices a horizontal strip into N equal frames", () => {
    // 1200x150 strip → 8 frames of 150x150 (the goblin run sheet shape).
    const src = document.createElement("canvas");
    src.width = 1200;
    src.height = 150;
    const base = Texture.from(src);
    const frames = sliceStrip(base, 8);
    expect(frames).toHaveLength(8);
    expect(frames[0]?.frame.width).toBe(150);
    expect(frames[0]?.frame.height).toBe(150);
    expect(frames[3]?.frame.x).toBe(450);
  });

  let app: Application | undefined;
  let canvas: HTMLCanvasElement | undefined;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    canvas.style.width = "200px";
    canvas.style.height = "200px";
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    app?.destroy({ removeView: false }, { children: true });
    app = undefined;
    canvas?.remove();
  });

  it("renders a goblin run frame to the canvas (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 200, height: 200, background: "#17110b", antialias: false });

    const sprite = await animatedFromStrip({
      url: "/assets/enemies/Goblin/Run.png",
      frames: 8,
      fps: 10,
    });
    sprite.currentFrame = 2; // a mid-stride frame
    sprite.x = 25;
    sprite.y = 25;
    sprite.width = 150;
    sprite.height = 150;
    app.stage.addChild(sprite);
    app.render();

    // The sprite has real texture frames sliced from the loaded sheet.
    expect(sprite.textures.length).toBe(8);
    expect(sprite.width).toBeGreaterThan(0);

    // Visual proof: save a screenshot to review.
    await page.screenshot({ path: "sprite-goblin-run.png" });
  });
});
