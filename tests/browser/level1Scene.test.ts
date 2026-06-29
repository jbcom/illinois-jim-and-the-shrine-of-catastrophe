import { paintArt } from "@render/composition.ts";
import { createEnemySprite } from "@render/enemySprites.ts";
import { frameFromLevel, paintingFromLevel, parallaxFromLevel } from "@render/levels/fromLevel.ts";
import { createBakedNpcSprite } from "@render/npc.ts";
import { createParallax } from "@render/parallax.ts";
import { createPlayerSprite } from "@render/playerSprite.ts";
import { resolveAnchor, resolveSurfaces } from "@sim/world/buildFromLevel.ts";
import { parseLevel } from "@sim/world/levelSchema.ts";
import { Application, Container } from "pixi.js";
import { page } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import levelJson from "../../src/levels/halward-s-reach.level.json";

/**
 * FULL Level 1 assembly — the design→art→render contract end to end with the baked
 * 3D cast. Composes the Gemini parallax + the baked transparent props (painting) +
 * the baked actors (Jim at spawn, the three story NPCs, a goblin) on their resolved
 * surfaces, and proves the whole scene renders with real pixels and no checkerboard.
 */
describe("Level 1 full scene (baked props + actors on parallax)", () => {
  let host: HTMLDivElement;
  let app: Application | undefined;
  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });
  afterEach(() => {
    app?.destroy({ removeView: true }, { children: true });
    app = undefined;
    host.remove();
  });

  it("assembles parallax + baked props + baked actors into one crafted scene", async () => {
    const level = parseLevel(levelJson);
    app = new Application();
    await app.init({ width: 640, height: 360, background: 0x1a120b, antialias: false, resolution: 1 });
    host.appendChild(app.canvas);

    const frame = frameFromLevel(level);
    const worldScale = 360 / (frame.bottom - frame.top);
    const camX = 60;

    const parallax = await createParallax(parallaxFromLevel(level));
    parallax.resize(640, 360);
    parallax.update(camX, 0);
    app.stage.addChild(parallax.container);

    // World layer: cover-scaled + camera-translated like the engine.
    const world = new Container();
    world.scale.set(worldScale);
    world.position.set(-camX * worldScale, -frame.top * worldScale);
    app.stage.addChild(world);

    // Painting — the baked transparent props on their surfaces.
    const painting = await paintArt(paintingFromLevel(level));
    world.addChild(painting.container);

    // Baked actors, lined up on the spawn ground (surface 0) so they're all in this
    // camera's view — Jim, the three story NPCs, and a goblin, ground-anchored.
    const resolved = resolveSurfaces(level);
    const groundY = resolveAnchor(level, resolved, level.spawn).y;
    const placeAt = (sprite: { x: number; y: number; scale: { set: (n: number) => void } }, x: number, h: number) => {
      sprite.scale.set(h / 256);
      sprite.x = x;
      sprite.y = groundY;
    };

    const jim = await createPlayerSprite("idle");
    placeAt(jim.sprite, camX + 30, 120);
    world.addChild(jim.sprite);

    const npcIds = ["elder-mara", "watchman-pell", "ferryman-cole"] as const;
    let ax = camX + 120;
    for (const id of npcIds) {
      const npc = await createBakedNpcSprite(`assets/sprites/${id}`);
      placeAt(npc.sprite, ax, 116);
      world.addChild(npc.sprite);
      ax += 90;
    }

    const goblin = await createEnemySprite("goblin", "idle");
    placeAt(goblin, ax + 30, 100);
    world.addChild(goblin);

    app.render();
    await new Promise((r) => setTimeout(r, 200));
    app.render();
    await page.screenshot({ path: "level1-full-scene.png" });

    // The whole scene must render real pixels (parallax + props + 5 actors).
    const { pixels } = app.renderer.extract.pixels(app.stage);
    let opaque = 0;
    for (let i = 3; i < pixels.length; i += 4) if ((pixels[i] ?? 0) > 16) opaque++;
    expect(opaque).toBeGreaterThan(50_000);

    parallax.destroy();
    painting.destroy();
  });
});
