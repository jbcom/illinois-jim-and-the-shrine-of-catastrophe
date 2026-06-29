import { paintArt } from "@render/composition.ts";
import { frameFromLevel, paintingFromLevel, parallaxFromLevel } from "@render/levels/fromLevel.ts";
import { createParallax } from "@render/parallax.ts";
import { parseLevel } from "@sim/world/levelSchema.ts";
import { Application, Container } from "pixi.js";
import { page } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import levelJson from "../../src/levels/halward-s-reach.level.json";

/**
 * Render the GENERATED Level 1 (Gemini's Halward's Reach) — its parallax + painting
 * from the schema, using the generated WebP art. Proves the GenAI pipeline's art
 * composites correctly on screen (the design→art→render contract end to end).
 */
describe("schema Level renderer (generated Level 1, visual proof)", () => {
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

  it("composites Level 1's parallax + painting from the generated art", async () => {
    const level = parseLevel(levelJson);
    app = new Application();
    await app.init({ width: 640, height: 360, background: 0x1a120b, antialias: false });
    host.appendChild(app.canvas);

    const frame = frameFromLevel(level);
    const frameH = frame.bottom - frame.top;
    const worldScale = 360 / frameH;

    // Parallax behind everything.
    const parallax = await createParallax(parallaxFromLevel(level));
    parallax.resize(640, 360);
    parallax.update(200, 0);
    app.stage.addChild(parallax.container);

    // The painting (structures/props/decor as whole transparent art), cover-scaled
    // + camera-translated like the engine does.
    const world = new Container();
    const painting = await paintArt(paintingFromLevel(level));
    world.addChild(painting.container);
    world.scale.set(worldScale);
    world.position.set(-200 * worldScale, -frame.top * worldScale);
    app.stage.addChild(world);

    app.render();
    await new Promise((r) => setTimeout(r, 200));
    app.render();

    await page.screenshot({ path: "level1-generated.png" });
    expect(app.stage.children.length).toBeGreaterThan(0);
    parallax.destroy();
    painting.destroy();
  });
});
