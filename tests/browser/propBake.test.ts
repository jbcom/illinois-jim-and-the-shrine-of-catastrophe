import { createParallax } from "@render/parallax.ts";
import { parallaxFromLevel } from "@render/levels/fromLevel.ts";
import { parseLevel } from "@sim/world/levelSchema.ts";
import { Application, Assets, Container, Sprite, type Texture } from "pixi.js";
import { page } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import levelJson from "../../src/levels/halward-s-reach.level.json";

/**
 * Proof that the baked 3D PROP pipeline (scripts/bake/bake-prop.py + pack-prop.ts)
 * produces a TRANSPARENT building that composites cleanly over the Level 1 parallax —
 * the fix for the Gemini buildings being opaque with a baked-in checkerboard backdrop.
 */
describe("baked prop over parallax (transparent building proof)", () => {
  let host: HTMLDivElement;
  let app: Application | undefined;
  beforeEach(() => {
    host = document.createElement("div");
    host.style.width = "640px";
    host.style.height = "360px";
    document.body.appendChild(host);
  });
  afterEach(() => {
    app?.destroy({ removeView: true }, { children: true });
    app = undefined;
    host.remove();
  });

  it("composites the baked pitched-house onto the clifftop parallax", async () => {
    const level = parseLevel(levelJson);
    app = new Application();
    await app.init({ width: 640, height: 360, background: 0x1a120b, antialias: false, resolution: 1 });
    host.appendChild(app.canvas);

    const parallax = await createParallax(parallaxFromLevel(level));
    parallax.resize(640, 360);
    parallax.update(200, 0);
    app.stage.addChild(parallax.container);

    // The baked house — a real transparent WebP (no checkerboard), base-anchored.
    const tex = await Assets.load<Texture>("/assets/props/pitched-house.webp");
    expect(tex.width).toBeGreaterThan(0);
    const world = new Container();
    const house = new Sprite(tex);
    const targetH = 200;
    const s = targetH / tex.height;
    house.scale.set(s);
    house.anchor.set(0.5, 1); // ground-anchored
    house.position.set(320, 300);
    world.addChild(house);
    app.stage.addChild(world);

    app.render();
    await new Promise((r) => setTimeout(r, 150));
    app.render();

    await page.screenshot({ path: "prop-house-on-parallax.png" });

    // The house texture must carry real alpha (transparent corners), not a baked
    // checkerboard — sample a corner of the source texture's pixels.
    const px = app.renderer.extract.pixels(house);
    let transparentCorner = false;
    // top-left pixel alpha of the sprite's own render
    if ((px.pixels[3] ?? 255) < 16) transparentCorner = true;
    expect(transparentCorner, "house corner should be transparent").toBe(true);
  });
});
