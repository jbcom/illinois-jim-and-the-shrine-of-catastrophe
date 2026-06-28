import { Anim, Layer, RenderStore, scrollLayers, SpriteRef, syncSprites } from "@render/layers.ts";
import { buildScene } from "@render/scene.ts";
import { CAVE_PARALLAX } from "@render/parallax.ts";
import { createTileMap, setTile, TileKind } from "@sim/world/tilemap.ts";
import { page } from "vitest/browser";
import { Application, Container } from "pixi.js";
import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("render-layer traits + compositor", () => {
  it("orders layers back-to-front by z and scrolls by parallax", () => {
    const world = createWorld();
    const store = new RenderStore();
    // Two bare layers: far (parallax 0.2) and near (parallax 1).
    const far = new Container();
    const near = new Container();
    const eFar = world.spawn(Layer({ z: 0, parallax: 0.2 }));
    const eNear = world.spawn(Layer({ z: 10, parallax: 1 }));
    store.set(eFar, { kind: "layer", container: far });
    store.set(eNear, { kind: "layer", container: near });

    scrollLayers(world, store, 100, 0);
    expect(far.position.x).toBe(-20); // 100 * 0.2
    expect(near.position.x).toBe(-100); // 100 * 1
    world.destroy();
  });

  it("advances a sprite's animation frame deterministically via Anim", async () => {
    const { AnimatedSprite, Texture } = await import("pixi.js");
    const world = createWorld();
    const store = new RenderStore();
    const sprite = new AnimatedSprite([Texture.WHITE, Texture.EMPTY, Texture.WHITE]);
    sprite.autoUpdate = false;
    sprite.loop = true;
    const e = world.spawn(SpriteRef({ sim: -1 }), Anim({ state: "run", fps: 60, ticks: 0 }));
    store.set(e, { kind: "sprite", sprite });

    expect(sprite.currentFrame).toBe(0);
    syncSprites(world, store, 1, () => undefined); // fps 60 → 1 frame / tick
    expect(sprite.currentFrame).toBe(1);
    world.destroy();
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

  it("composites a full cave scene (parallax + tiles + actors) (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas: canvas!, width: 480, height: 270, background: "#17110b" });

    const map = createTileMap(30, 17, 16);
    for (let c = 0; c < 30; c++) {
      setTile(map, c, 16, TileKind.Solid);
      setTile(map, c, 15, TileKind.Solid);
    }
    setTile(map, 8, 14, TileKind.Solid);
    setTile(map, 9, 14, TileKind.Solid);
    setTile(map, 18, 12, TileKind.Platform);
    setTile(map, 19, 12, TileKind.Platform);

    const scene = await buildScene({
      parallax: CAVE_PARALLAX,
      tileLayers: [
        {
          map,
          spec: {
            tilesetUrl: "/assets/kenney/platformer/tilemap_packed.png",
            tileSize: 18,
            kindToIndex: (k: TileKind) =>
              k === TileKind.Solid ? 21 : k === TileKind.Platform ? 1 : -1,
          },
          destSize: 16,
          z: 100,
        },
      ],
      actors: [
        { kind: "player", state: "idle", x: 120, y: 240 },
        { kind: "enemy", enemy: "goblin", state: "idle", x: 220, y: 246 },
        { kind: "enemy", enemy: "flyingEye", state: "idle", x: 320, y: 180 },
      ],
    });
    // Size the parallax stack to the view, then scroll all layers to camera 0.
    scene.resize(480, 270);
    scrollLayers(scene.world, scene.store, 0, 0);
    app.stage.addChild(scene.root);
    app.render();

    await page.screenshot({ path: "scene-cave-composited.png" });
    expect(scene.root.children.length).toBeGreaterThanOrEqual(3);
    scene.destroy();
  });
});
