import { renderTileLayer, tilesetTextures } from "@render/tileLayer.ts";
import { createTileMap, setTile, TileKind } from "@sim/world/tilemap.ts";
import { page } from "@vitest/browser/context";
import { Application, Texture } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("tile layer (@pixi/tilemap)", () => {
  it("slices a tileset into row-major cells", () => {
    const c = document.createElement("canvas");
    c.width = 360;
    c.height = 162; // Kenney packed: 20×9 of 18px
    const tex = tilesetTextures(Texture.from(c), 18);
    expect(tex.length).toBe(20 * 9);
    expect(tex[0]?.frame.width).toBe(18);
    expect(tex[20]?.frame.y).toBe(18); // second row starts at y=18
  });

  let app: Application | undefined;
  let canvas: HTMLCanvasElement | undefined;
  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    app?.destroy({ removeView: false }, { children: true });
    app = undefined;
    canvas?.remove();
  });

  it("renders a small tiled level from the Kenney tileset (visual proof)", async () => {
    app = new Application();
    await app.init({ canvas, width: 320, height: 180, background: "#17110b" });

    // A floor with a couple of raised blocks.
    const map = createTileMap(20, 11, 16);
    for (let c = 0; c < 20; c++) setTile(map, c, 10, TileKind.Solid);
    for (let c = 0; c < 20; c++) setTile(map, c, 9, TileKind.Solid);
    setTile(map, 5, 8, TileKind.Solid);
    setTile(map, 6, 8, TileKind.Solid);
    setTile(map, 12, 7, TileKind.Platform);
    setTile(map, 13, 7, TileKind.Platform);

    const layer = await renderTileLayer(
      map,
      {
        tilesetUrl: "/assets/kenney/platformer/tilemap_packed.png",
        tileSize: 18,
        // Kenney 20-wide grid: index 1 = grass-top dirt (floor), 21 = dirt block.
        kindToIndex: (kind: TileKind) => {
          if (kind === TileKind.Solid) return 21;
          if (kind === TileKind.Platform) return 1;
          return -1;
        },
      },
      16,
    );
    app.stage.addChild(layer.tilemap);
    app.render();

    await page.screenshot({ path: "tilelayer-kenney.png" });
    expect(layer.tilemap.children.length).toBeGreaterThan(0);
  });
});
