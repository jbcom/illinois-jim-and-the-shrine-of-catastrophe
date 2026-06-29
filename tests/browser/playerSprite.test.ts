import { animatedFrom, frames, loadFrames, strip } from "@render/frameSource.ts";
import { createPlayerSprite, type PlayerState } from "@render/playerSprite.ts";
import { page } from "vitest/browser";
import { Application } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("frame source (strip + single images unified)", () => {
  it("loads single-image frames in declared order", async () => {
    // Distinct real PNGs (hp-bar variants) — the single-image path used by
    // cutscenes/props, where each frame is its own whole texture.
    const tex = await loadFrames(
      frames([
        "/assets/ux/hp_bar/Hp bar.png",
        "/assets/ux/hp_bar/red bar.png",
        "/assets/ux/hp_bar/yellow bar.png",
      ]),
    );
    expect(tex.length).toBe(3);
    // Distinct single images → distinct sources (not slices of one base).
    expect(tex[0]?.source).not.toBe(tex[1]?.source);
  });

  it("slices a strip into N frames sharing one base source", async () => {
    // The adventure RUN strip: 8 frames of 96×80 sharing one base texture.
    const tex = await loadFrames(strip("/assets/classes/adventure/RUN/run_right.png", 8));
    expect(tex.length).toBe(8);
    expect(tex[0]?.source).toBe(tex[7]?.source);
    expect(tex[0]?.frame.width).toBe(96);
    expect(tex[0]?.frame.height).toBe(80);
  });

  it("builds a deterministic AnimatedSprite from either source", async () => {
    const a = await animatedFrom(strip("/assets/classes/adventure/IDLE/idle_right.png", 8));
    expect(a.autoUpdate).toBe(false);
    a.destroy();
  });
});

/** Count stage pixels with alpha > 16 — proves a real (non-blank) sprite render. */
function opaquePixelCount(app: Application): number {
  const { pixels } = app.renderer.extract.pixels(app.stage);
  let n = 0;
  for (let i = 3; i < pixels.length; i += 4) if ((pixels[i] ?? 0) > 16) n++;
  return n;
}

describe("player sprite (Illinois Jim — baked 3D→WebP sheets)", () => {
  let app: Application | undefined;
  let canvas: HTMLCanvasElement | undefined;
  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 760;
    canvas.height = 200;
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    app?.destroy({ removeView: false }, { children: true });
    app = undefined;
    canvas?.remove();
  });

  it("renders all five animation states side by side (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 760, height: 200, background: "#17110b", resolution: 1, autoDensity: false });

    const states: PlayerState[] = ["idle", "run", "jump", "fall", "attack"];
    let x = 76;
    for (const state of states) {
      const player = await createPlayerSprite(state);
      // 256px tiles → scale to ~150px tall.
      player.sprite.scale.set(0.62);
      player.sprite.x = x;
      player.sprite.y = 194;
      app.stage.addChild(player.sprite);
      x += 150;
    }
    app.render();

    await page.screenshot({ path: "player-states.png" });
    expect(app.stage.children.length).toBe(5);
    // Prove the sprites actually rendered pixels (not a 404 placeholder / blank).
    expect(opaquePixelCount(app)).toBeGreaterThan(2000);
  });

  it("renders the run cycle in sequence (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 760, height: 200, background: "#17110b", resolution: 1, autoDensity: false });

    // Sample 5 evenly-spaced frames of the 16-frame run sheet by indexing currentFrame.
    const p0 = await createPlayerSprite("run");
    const count = p0.sprite.textures.length;
    p0.destroy();
    const picks = [0, 1, 2, 3, 4].map((i) => Math.round((i * (count - 1)) / 4));
    let x = 76;
    for (const f of picks) {
      const p = await createPlayerSprite("run");
      p.sprite.currentFrame = f;
      p.sprite.scale.set(0.62);
      p.sprite.x = x;
      p.sprite.y = 194;
      app.stage.addChild(p.sprite);
      x += 150;
    }
    app.render();

    await page.screenshot({ path: "player-run-cycle.png" });
    expect(app.stage.children.length).toBe(5);
    expect(opaquePixelCount(app)).toBeGreaterThan(2000);
    // The 16-frame run sheet must hold distinct frames: adjacent picks differ.
    expect(picks[0]).not.toBe(picks[1]);
    expect(count).toBeGreaterThanOrEqual(8);
  });
});
