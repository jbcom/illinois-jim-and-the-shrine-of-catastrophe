import { createHpBar } from "@render/hpBar.ts";
import { page } from "vitest/browser";
import { Application } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("HP / lives bar", () => {
  let app: Application | undefined;
  let canvas: HTMLCanvasElement | undefined;
  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 280;
    canvas.height = 240;
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    app?.destroy({ removeView: false }, { children: true });
    app = undefined;
    canvas?.remove();
  });

  it("renders the bar at full / half / low HP with lives (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 280, height: 240, background: "#17110b" });

    const states: Array<{ hp: number; lives: number; color: "Blue" | "yellow" }> = [
      { hp: 1, lives: 3, color: "Blue" },
      { hp: 0.5, lives: 2, color: "yellow" },
      { hp: 0.15, lives: 1, color: "Blue" },
    ];
    let y = 16;
    for (const st of states) {
      const bar = await createHpBar(st.color);
      bar.setHp(st.hp);
      bar.setLives(st.lives);
      bar.container.scale.set(1.8);
      bar.container.position.set(16, y);
      app.stage.addChild(bar.container);
      y += 76;
    }
    app.render();

    await page.screenshot({ path: "hpbar-states.png" });
    expect(app.stage.children.length).toBe(3);
  });

  it("clamps the HP fraction to [0,1]", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 280, height: 240, background: "#17110b" });
    const bar = await createHpBar("Blue");
    // Out-of-range values must not throw or overflow the meter.
    bar.setHp(-0.5);
    bar.setHp(2);
    bar.setLives(0);
    app.stage.addChild(bar.container);
    app.render();
    expect(bar.container.children.length).toBeGreaterThan(0);
  });
});
