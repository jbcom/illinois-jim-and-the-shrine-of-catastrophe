import { animatedFrom, frames, loadFrames, strip } from "@render/frameSource.ts";
import { createPlayerSprite, type PlayerState } from "@render/playerSprite.ts";
import { page } from "vitest/browser";
import { Application } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("frame source (strip + single images unified)", () => {
  it("loads single-image frames in declared order", async () => {
    const tex = await loadFrames(
      frames([
        "/assets/player/illinois-jim-run-1.png",
        "/assets/player/illinois-jim-run-2.png",
        "/assets/player/illinois-jim-run-3.png",
      ]),
    );
    expect(tex.length).toBe(3);
    // Distinct single images → distinct sources (not slices of one base).
    expect(tex[0]?.source).not.toBe(tex[1]?.source);
  });

  it("slices a strip into N frames sharing one base source", async () => {
    const tex = await loadFrames(strip("/assets/enemies/Goblin/Run.png", 8));
    expect(tex.length).toBe(8);
    expect(tex[0]?.source).toBe(tex[7]?.source);
  });

  it("builds a deterministic AnimatedSprite from either source", async () => {
    const a = await animatedFrom(frames(["/assets/player/illinois-jim-idle-1.png"]));
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
      player.sprite.x = x;
      player.sprite.y = 112;
      app.stage.addChild(player.sprite);
      x += 110;
    }
    app.render();

    await page.screenshot({ path: "player-states.png" });
    expect(app.stage.children.length).toBe(5);
  });

  it("renders the run cycle frames in sequence (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 600, height: 120, background: "#17110b" });

    const player = await createPlayerSprite("run");
    player.sprite.y = 112;
    // Lay the 4 run frames across the canvas by advancing the animation.
    for (let i = 0; i < 4; i++) {
      const player2 = await createPlayerSprite("run");
      player2.sprite.currentFrame = i;
      player2.sprite.x = 70 + i * 130;
      player2.sprite.y = 112;
      app.stage.addChild(player2.sprite);
    }
    player.destroy();
    app.render();

    await page.screenshot({ path: "player-run-cycle.png" });
    expect(app.stage.children.length).toBe(4);
  });
});
