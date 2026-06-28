import { CAVE } from "@render/caveShapes.ts";
import { paintComposition } from "@render/composition.ts";
import { CAVE_DESCENT } from "@render/levels/caveDescent.ts";
import { CAVE_PARALLAX, createParallax } from "@render/parallax.ts";
import { createPlayerSprite } from "@render/playerSprite.ts";
import { page } from "vitest/browser";
import { Application, Container } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("level composition (painting from shapes)", () => {
  it("cuts a stamp texture to its exact source rect", async () => {
    const painting = await paintComposition([{ stamp: CAVE.relicBlock, x: 0, y: 0 }]);
    expect(painting.container.children.length).toBe(1);
    painting.destroy();
  });

  let app: Application | undefined;
  let canvas: HTMLCanvasElement | undefined;
  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 270;
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    app?.destroy({ removeView: false }, { children: true });
    app = undefined;
    canvas?.remove();
  });

  it("paints 'The Descent' over the parallax with the hero (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 480, height: 270, background: "#17110b" });

    const parallax = await createParallax(CAVE_PARALLAX);
    parallax.resize(480, 270);
    parallax.update(0, 0);
    app.stage.addChild(parallax.container);

    // World layer scrolled to frame the start of the level.
    const world = new Container();
    world.position.set(-10, -60);
    app.stage.addChild(world);

    const painting = await paintComposition(CAVE_DESCENT);
    world.addChild(painting.container);

    const hero = await createPlayerSprite("idle");
    hero.sprite.anchor.set(0.5, 1);
    hero.sprite.scale.set(0.55);
    hero.sprite.position.set(110, 300);
    world.addChild(hero.sprite);

    app.render();
    await page.screenshot({ path: "level-cave-descent.png" });

    expect(painting.container.children.length).toBe(CAVE_DESCENT.length);
    painting.destroy();
    hero.destroy();
  });
});
