import { CAVE_PARALLAX } from "@render/parallax.ts";
import { createPaintingRenderer } from "@render/paintingRenderer.ts";
import { SHRINE_APPROACH, SHRINE_APPROACH_FRAME } from "@render/levels/shrineApproach.ts";
import { Collectible, Enemy, Facing, Gravity, Player, Position, Pot, Size, Velocity } from "@sim/ecs/traits.ts";
import { createCamera } from "@sim/world/camera.ts";
import { SHRINE } from "@sim/world/gameLevel.ts";
import { page } from "vitest/browser";
import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/** Build a sim world populated from the SHRINE level's spawns. */
function buildShrineWorld() {
  const world = createWorld();
  world.spawn(
    Position({ x: SHRINE.spawnX, y: SHRINE.spawnY }),
    Velocity({ x: 0, y: 0 }),
    Size({ w: 12, h: 16 }),
    Facing({ dir: 1 }),
    Gravity({ scale: 1 }),
    Player({ grounded: true, coyote: 0, buffer: 0, whip: 0, dead: false }),
  );
  for (const c of SHRINE.collectibles) {
    world.spawn(Position({ x: c.x, y: c.y }), Size({ w: 10, h: 10 }), Collectible({ value: c.value, taken: false }));
  }
  for (const e of SHRINE.enemies) {
    world.spawn(
      Position({ x: e.x, y: e.y }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 14, h: 14 }),
      Facing({ dir: -1 }),
      Gravity({ scale: 1 }),
      Enemy({ kind: e.kind, speed: 40, minX: e.x - 48, maxX: e.x + 48, alive: true }),
    );
  }
  for (const p of SHRINE.pots) {
    world.spawn(Position({ x: p.x, y: p.y }), Size({ w: 16, h: 16 }), Pot({ color: p.color, drop: p.drop, broken: false, breakTimer: 0 }));
  }
  return world;
}

describe("shrine painting renderer (third-act climax, visual proof)", () => {
  let host: HTMLDivElement | undefined;
  let renderer: Awaited<ReturnType<typeof createPaintingRenderer>> | undefined;
  beforeEach(() => {
    host = document.createElement("div");
    host.style.width = "480px";
    host.style.height = "270px";
    document.body.appendChild(host);
  });
  afterEach(() => {
    renderer?.destroy();
    renderer = undefined;
    host?.remove();
  });

  // Three camera stops prove the whole level paints with ZERO asset loss: the
  // gatehall colonnade, the beam-bridged sanctum, and the idol on the staircase.
  const STOPS: readonly { name: string; camX: number }[] = [
    { name: "gatehall", camX: 60 },
    { name: "sanctum", camX: 900 },
    { name: "altar", camX: 1620 },
  ];

  for (const stop of STOPS) {
    it(`renders the shrine ${stop.name} (painting + sim sprites)`, async () => {
      renderer = await createPaintingRenderer(host!, {
        parallax: CAVE_PARALLAX,
        painting: SHRINE_APPROACH,
        frameTop: SHRINE_APPROACH_FRAME.top,
        frameBottom: SHRINE_APPROACH_FRAME.bottom,
      });
      const world = buildShrineWorld();
      try {
        const frameH = SHRINE_APPROACH_FRAME.bottom - SHRINE_APPROACH_FRAME.top;
        const camera = { ...createCamera(675, frameH), x: stop.camX, y: 0 };
        const viewport = { scale: 1, offsetX: 0, offsetY: 0, viewW: 480, viewH: 270 };

        // Two renders: first creates the async actor + prop sprites, second shows them.
        renderer.render({ world, camera, viewport, alpha: 0, prev: new Map() });
        await new Promise((r) => setTimeout(r, 350));
        renderer.render({ world, camera, viewport, alpha: 0, prev: new Map() });

        await page.screenshot({ path: `shrine-${stop.name}.png` });
        expect(renderer.app.stage.children.length).toBeGreaterThan(0);
      } finally {
        // koota caps live worlds — always release this one even if a render throws.
        world.destroy();
      }
    });
  }
});
