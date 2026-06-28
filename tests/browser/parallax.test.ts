import { CAVE_PARALLAX, createParallax } from "@render/parallax.ts";
import { page } from "vitest/browser";
import { Application } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("parallax background", () => {
  let app: Application | undefined;
  let canvas: HTMLCanvasElement | undefined;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 270;
    canvas.style.width = "480px";
    canvas.style.height = "270px";
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    app?.destroy({ removeView: false }, { children: true });
    app = undefined;
    canvas?.remove();
  });

  it("renders the cave parallax stack and scrolls layers by depth (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 480, height: 270, background: "#17110b" });

    const parallax = await createParallax(CAVE_PARALLAX);
    parallax.resize(480, 270);
    app.stage.addChild(parallax.container);

    parallax.update(0, 0);
    app.render();
    await page.screenshot({ path: "parallax-cave-0.png" });

    // Scroll right — near layers should shift more than far layers.
    parallax.update(600, 0);
    app.render();
    await page.screenshot({ path: "parallax-cave-scrolled.png" });

    expect(parallax.container.children.length).toBe(CAVE_PARALLAX.length);
  });
});
