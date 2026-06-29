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

  it.each(["goblin", "skeleton"] as const)(
    "renders the baked %s's idle/move/attack clips, each non-blank (visual proof)",
    async (kind) => {
      app = new Application();
      await app.init({ canvas: canvas!, width: 400, height: 120, background: "#17110b", resolution: 1 });

      // Render each clip ALONE and assert it has its own pixels — so a single blank
      // clip can't hide behind the others' pixels in an aggregate count.
      const states = ["idle", "move", "attack"] as const;
      let x = 50;
      for (const state of states) {
        app.stage.removeChildren();
        const sprite = await createEnemySprite(kind, state);
        sprite.currentFrame = Math.floor(sprite.textures.length / 2);
        sprite.scale.set(0.42);
        sprite.x = 200;
        sprite.y = 116;
        app.stage.addChild(sprite);
        app.render();
        expect(opaque(app), `${kind} ${state} blank`).toBeGreaterThan(500);
        // Re-add to a row for the screenshot.
        sprite.x = x;
        x += 130;
      }
      // Final composite frame for the screenshot artifact.
      app.stage.removeChildren();
      x = 50;
      for (const state of states) {
        const sprite = await createEnemySprite(kind, state);
        sprite.currentFrame = Math.floor(sprite.textures.length / 2);
        sprite.scale.set(0.42);
        sprite.x = x;
        sprite.y = 116;
        app.stage.addChild(sprite);
        x += 130;
      }
      app.render();
      await page.screenshot({ path: `${kind}-baked.png` });
      expect(app.stage.children.length).toBe(3);
    },
  );
});
