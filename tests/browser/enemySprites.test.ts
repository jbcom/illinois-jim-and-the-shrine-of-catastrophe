import { createEnemySprite, type EnemyKind, enemySheetUrl } from "@render/enemySprites.ts";
import { page } from "vitest/browser";
import { Application } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("enemy sprites", () => {
  it("maps each kind+state to a real sheet url + frame count", () => {
    expect(enemySheetUrl("goblin", "move")).toEqual({
      url: "/assets/enemies/Goblin/Run.png",
      frames: 8,
    });
    expect(enemySheetUrl("skeleton", "move").url).toContain("Walk.png");
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
  });

  function opaque(app: Application): number {
    const { pixels } = app.renderer.extract.pixels(app.stage);
    let n = 0;
    for (let i = 3; i < pixels.length; i += 4) if ((pixels[i] ?? 0) > 16) n++;
    return n;
  }

  it.each(["goblin", "skeleton"] as const)(
    "renders the baked %s's idle/move/attack clips (visual proof)",
    async (kind) => {
      app = new Application();
      await app.init({ canvas: canvas!, width: 400, height: 120, background: "#17110b", resolution: 1 });

      const states = ["idle", "move", "attack"] as const;
      let x = 50;
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
      expect(opaque(app)).toBeGreaterThan(1500);
    },
  );
});
