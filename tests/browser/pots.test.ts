import { loadPotFrames, POT_FRAME, POT_SMASH_FRAMES, type PotColor } from "@render/pots.ts";
import { page } from "vitest/browser";
import { AnimatedSprite, Application, Sprite } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("breakable pots", () => {
  it("slices the smash row into 32px frames", async () => {
    const frames = await loadPotFrames("red");
    expect(frames.length).toBe(POT_SMASH_FRAMES);
    expect(frames[0]?.frame.width).toBe(POT_FRAME);
    expect(frames[0]?.frame.height).toBe(POT_FRAME);
    expect(frames[0]?.source).toBe(frames[3]?.source); // one grid, shared source
  });

  let app: Application | undefined;
  let canvas: HTMLCanvasElement | undefined;
  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 160;
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    app?.destroy({ removeView: false }, { children: true });
    app = undefined;
    canvas?.remove();
  });

  it("renders the four intact pot colors + a smash sequence (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 320, height: 160, background: "#17110b" });

    // Top row: the four intact pots (frame 0).
    const colors: PotColor[] = ["gray", "red", "white", "yellow"];
    let x = 30;
    for (const color of colors) {
      const frames = await loadPotFrames(color);
      const pot = new Sprite(frames[0]);
      pot.scale.set(2);
      pot.anchor.set(0.5, 1);
      pot.x = x;
      pot.y = 70;
      app.stage.addChild(pot);
      x += 70;
    }

    // Bottom row: the red pot's full smash sequence, frame by frame.
    const smash = await loadPotFrames("red");
    for (let i = 0; i < smash.length; i++) {
      const f = new Sprite(smash[i]);
      f.scale.set(2);
      f.anchor.set(0.5, 1);
      f.x = 40 + i * 70;
      f.y = 150;
      app.stage.addChild(f);
    }
    app.render();

    await page.screenshot({ path: "pots-colors-and-smash.png" });
    expect(app.stage.children.length).toBe(colors.length + smash.length);
  });

  it("plays the smash as a non-looping AnimatedSprite", async () => {
    const frames = await loadPotFrames("yellow");
    const anim = new AnimatedSprite(frames);
    anim.autoUpdate = false;
    anim.loop = false;
    expect(anim.totalFrames).toBe(POT_SMASH_FRAMES);
    anim.destroy();
  });
});
