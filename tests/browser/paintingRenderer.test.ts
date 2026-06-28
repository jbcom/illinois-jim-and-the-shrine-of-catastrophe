import { CAVE_PARALLAX } from "@render/parallax.ts";
import { createPaintingRenderer } from "@render/paintingRenderer.ts";
import { CAVE_DESCENT } from "@render/levels/caveDescent.ts";
import {
  Collectible,
  Enemy,
  Facing,
  Gravity,
  Player,
  Position,
  Pot,
  Size,
  Velocity,
} from "@sim/ecs/traits.ts";
import { createCamera } from "@sim/world/camera.ts";
import { DESCENT } from "@sim/world/gameLevel.ts";
import { page } from "vitest/browser";
import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/** Build a sim world populated from the DESCENT level's spawns. */
function buildDescentWorld() {
  const world = createWorld();
  world.spawn(
    Position({ x: DESCENT.spawnX, y: DESCENT.spawnY }),
    Velocity({ x: 0, y: 0 }),
    Size({ w: 12, h: 16 }),
    Facing({ dir: 1 }),
    Gravity({ scale: 1 }),
    Player({ grounded: true, coyote: 0, buffer: 0, whip: 0, dead: false }),
  );
  for (const c of DESCENT.collectibles) {
    world.spawn(Position({ x: c.x, y: c.y }), Size({ w: 10, h: 10 }), Collectible({ value: c.value, taken: false }));
  }
  for (const e of DESCENT.enemies) {
    world.spawn(
      Position({ x: e.x, y: e.y }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 14, h: 14 }),
      Facing({ dir: -1 }),
      Gravity({ scale: 1 }),
      Enemy({ kind: e.kind, speed: 40, minX: e.x - 48, maxX: e.x + 48, alive: true }),
    );
  }
  for (const p of DESCENT.pots) {
    world.spawn(Position({ x: p.x, y: p.y }), Size({ w: 16, h: 16 }), Pot({ color: p.color, drop: p.drop, broken: false, breakTimer: 0 }));
  }
  return world;
}

describe("painting renderer (in-game integration)", () => {
  let canvas: HTMLCanvasElement | undefined;
  let renderer: Awaited<ReturnType<typeof createPaintingRenderer>> | undefined;
  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 270;
    document.body.appendChild(canvas);
  });
  afterEach(() => {
    renderer?.destroy();
    renderer = undefined;
    canvas?.remove();
  });

  it("renders the real game (painting + sim sprites) (visual proof)", async () => {
    renderer = await createPaintingRenderer(canvas!, {
      parallax: CAVE_PARALLAX,
      painting: CAVE_DESCENT,
    });
    const world = buildDescentWorld();
    const camera = { ...createCamera(480, 270), x: 60, y: 40 };
    const viewport = { scale: 1, offsetX: 0, offsetY: 0, viewW: 480, viewH: 270 };

    // Two renders: first creates the async actor sprites, second shows them once loaded.
    renderer.render({ world, camera, viewport, alpha: 0, prev: new Map() });
    await new Promise((r) => setTimeout(r, 300)); // let hero/enemy/pot textures resolve
    renderer.render({ world, camera, viewport, alpha: 0, prev: new Map() });

    await page.screenshot({ path: "game-descent-live.png" });
    expect(renderer.app.stage.children.length).toBeGreaterThan(0);
    world.destroy();
  });
});
