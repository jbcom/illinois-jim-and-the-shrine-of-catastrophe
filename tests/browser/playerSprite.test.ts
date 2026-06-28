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

describe("player sprite (Illinois Jim)", () => {
  let app: Application | undefined;
  let canvas: HTMLCanvasElement | undefined;
  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 120;
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    app?.destroy({ removeView: false }, { children: true });
    app = undefined;
    canvas?.remove();
  });

  it("renders all five animation states side by side (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 600, height: 120, background: "#17110b" });

    const states: PlayerState[] = ["idle", "run", "jump", "fall", "attack"];
    let x = 60;
    for (const state of states) {
      const player = await createPlayerSprite(state);
      player.sprite.scale.set(1.2);
      player.sprite.x = x;
      player.sprite.y = 116;
      app.stage.addChild(player.sprite);
      x += 116;
    }
    app.render();

    await page.screenshot({ path: "player-states.png" });
    expect(app.stage.children.length).toBe(5);
  });

  it("renders the 4-frame run cycle in sequence (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 600, height: 120, background: "#17110b" });

    // Lay all 4 run frames across the canvas by indexing currentFrame.
    for (let i = 0; i < 4; i++) {
      const p = await createPlayerSprite("run");
      p.sprite.currentFrame = i;
      p.sprite.scale.set(1.4);
      p.sprite.x = 80 + i * 140;
      p.sprite.y = 116;
      app.stage.addChild(p.sprite);
    }
    app.render();

    await page.screenshot({ path: "player-run-cycle.png" });
    expect(app.stage.children.length).toBe(4);
  });
});
