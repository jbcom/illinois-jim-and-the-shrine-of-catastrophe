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

  const PROPS = ["pitched-house", "pitched-house-2", "market-stall", "cliff-ledge", "pot"] as const;

  it("composites all baked props onto the clifftop parallax, each transparent", async () => {
    const level = parseLevel(levelJson);
    app = new Application();
    await app.init({ width: 640, height: 360, background: 0x1a120b, antialias: false, resolution: 1 });
    host.appendChild(app.canvas);

    const parallax = await createParallax(parallaxFromLevel(level));
    parallax.resize(640, 360);
    parallax.update(200, 0);
    app.stage.addChild(parallax.container);

    const world = new Container();
    let x = 120;
    for (const name of PROPS) {
      // Each baked prop is a real transparent WebP (no checkerboard), base-anchored.
      const tex = await Assets.load<Texture>(`/assets/props/${name}.webp`);
      expect(tex.width, `${name} texture`).toBeGreaterThan(0);
      const sprite = new Sprite(tex);
      const s = 170 / tex.height;
      sprite.scale.set(s);
      sprite.anchor.set(0.5, 1);
      sprite.position.set(x, 300);
      world.addChild(sprite);
      // Real alpha: a corner pixel of the sprite's own render must be transparent.
      const { pixels } = app.renderer.extract.pixels(sprite);
      expect((pixels[3] ?? 255) < 16, `${name} corner should be transparent`).toBe(true);
      x += 200;
    }
    app.stage.addChild(world);

    app.render();
    await new Promise((r) => setTimeout(r, 150));
    app.render();
    await page.screenshot({ path: "prop-house-on-parallax.png" });
    expect(world.children.length).toBe(PROPS.length);
  });
});
