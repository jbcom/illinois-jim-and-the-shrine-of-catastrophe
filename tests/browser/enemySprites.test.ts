import { createEnemySprite, type EnemyKind, enemySheetUrl } from "@render/enemySprites.ts";
import { page } from "vitest/browser";
import { Application } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("enemy sprites", () => {
  it("maps the still-strip enemies to a real sheet url + frame count", () => {
    // goblin + skeleton now bake (the strip catalog is no longer their source);
    // only mushroom + flyingEye still resolve through enemySheetUrl at runtime.
    expect(enemySheetUrl("mushroom", "move").url).toContain("Run.png");
    expect(enemySheetUrl("flyingEye", "move").url).toContain("Flight.png");
  });

  let app: Application | undefined;
  let canvas: HTMLCanvasElement | undefined;
  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 120;
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    app?.destroy({ removeView: false }, { children: true });
    app = undefined;
    canvas?.remove();
  });

  function opaque(a: Application): number {
    const { pixels } = a.renderer.extract.pixels(a.stage);
    let n = 0;
    for (let i = 3; i < pixels.length; i += 4) if ((pixels[i] ?? 0) > 16) n++;
    return n;
  }

  it("renders all four enemy kinds (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 400, height: 120, background: "#17110b" });

    const kinds: EnemyKind[] = ["goblin", "skeleton", "mushroom", "flyingEye"];
    let x = 10;
    for (const kind of kinds) {
      const sprite = await createEnemySprite(kind, "idle");
      sprite.currentFrame = 1;
      sprite.x = x;
      sprite.y = -10;
      sprite.width = 100;
      sprite.height = 100;
      app.stage.addChild(sprite);
      x += 100;
    }
    app.render();

    await page.screenshot({ path: "enemies-all.png" });
    expect(app.stage.children.length).toBe(4);
    expect(opaque(app)).toBeGreaterThan(2000);
  });

  const ENEMY_STATES = ["idle", "move", "attack", "hurt", "death"] as const;

  it.each(["goblin", "skeleton"] as const)(
    "renders all baked %s clips, each non-blank, then a composite row (visual proof)",
    async (kind) => {
      app = new Application();
      await app.init({ canvas: canvas!, width: 560, height: 120, background: "#17110b", resolution: 1 });

      // Render each clip ALONE and assert it has its own pixels — so a single blank
      // clip can't hide behind the others' pixels in an aggregate count.
      for (const state of ENEMY_STATES) {
        app.stage.removeChildren();
        const sprite = await createEnemySprite(kind, state);
        sprite.currentFrame = Math.floor(sprite.textures.length / 2);
        sprite.scale.set(0.42);
        sprite.x = 280;
        sprite.y = 116;
        app.stage.addChild(sprite);
        app.render();
        expect(opaque(app), `${kind} ${state} blank`).toBeGreaterThan(500);
      }

      // Composite row of all clips for the screenshot artifact.
      app.stage.removeChildren();
      let x = 56;
      for (const state of ENEMY_STATES) {
        const sprite = await createEnemySprite(kind, state);
        sprite.currentFrame = Math.floor(sprite.textures.length / 2);
        sprite.scale.set(0.42);
        sprite.x = x;
        sprite.y = 116;
        app.stage.addChild(sprite);
        x += 110;
      }
      app.render();
      await page.screenshot({ path: `${kind}-baked.png` });
      expect(app.stage.children.length).toBe(ENEMY_STATES.length);
    },
  );
});
