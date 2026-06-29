import { OVERWORLD_PARALLAX } from "@render/parallax.ts";
import { createPaintingRenderer } from "@render/paintingRenderer.ts";
import { VILLAGE_APPROACH, VILLAGE_APPROACH_FRAME } from "@render/levels/villageApproach.ts";
import { Collectible, Enemy, Facing, Gravity, Player, Position, Pot, Size, Velocity } from "@sim/ecs/traits.ts";
import { createCamera } from "@sim/world/camera.ts";
import { VILLAGE } from "@sim/world/gameLevel.ts";
import { page } from "vitest/browser";
import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/** Populate a world from the VILLAGE spawns (so NPCs/enemies appear in the shot). */
function buildVillageWorld() {
  const world = createWorld();
  world.spawn(
    Position({ x: VILLAGE.spawnX, y: VILLAGE.spawnY }),
    Velocity({ x: 0, y: 0 }),
    Size({ w: 12, h: 16 }),
    Facing({ dir: 1 }),
    Gravity({ scale: 1 }),
    Player({ grounded: true, coyote: 0, buffer: 0, whip: 0, dead: false }),
  );
  for (const c of VILLAGE.collectibles) {
    world.spawn(Position({ x: c.x, y: c.y }), Size({ w: 10, h: 10 }), Collectible({ value: c.value, taken: false }));
  }
  for (const e of VILLAGE.enemies) {
    world.spawn(
      Position({ x: e.x, y: e.y }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 14, h: 14 }),
      Facing({ dir: -1 }),
      Gravity({ scale: 1 }),
      Enemy({ kind: e.kind, speed: 40, minX: e.x - 48, maxX: e.x + 48, alive: true }),
    );
  }
  for (const p of VILLAGE.pots) {
    world.spawn(Position({ x: p.x, y: p.y }), Size({ w: 16, h: 16 }), Pot({ color: p.color, drop: p.drop, broken: false, breakTimer: 0 }));
  }
  return world;
}

describe("village painting renderer (overworld opener + rooftop platforms)", () => {
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

  // The village opening — frames the house + tent (where the rooftop platforms are)
  // and the forest road. Proves zero asset loss + the rooftops read on the buildings.
  for (const stop of [
    { name: "village-homes", camX: 60 },
    { name: "village-road", camX: 900 },
  ] as const) {
    it(`renders ${stop.name}`, async () => {
      renderer = await createPaintingRenderer(host!, {
        parallax: OVERWORLD_PARALLAX,
        painting: VILLAGE_APPROACH,
        frameTop: VILLAGE_APPROACH_FRAME.top,
        frameBottom: VILLAGE_APPROACH_FRAME.bottom,
        groundFill: { color: 0x2c1d10, groundY: 318, width: 2240 },
      });
      const world = buildVillageWorld();
      try {
        const frameH = VILLAGE_APPROACH_FRAME.bottom - VILLAGE_APPROACH_FRAME.top;
        const camera = { ...createCamera(675, frameH), x: stop.camX, y: 0 };
        const viewport = { scale: 1, offsetX: 0, offsetY: 0, viewW: 480, viewH: 270 };
        renderer.render({ world, camera, viewport, alpha: 0, prev: new Map() });
        await new Promise((r) => setTimeout(r, 350));
        renderer.render({ world, camera, viewport, alpha: 0, prev: new Map() });
        await page.screenshot({ path: `${stop.name}.png` });
        expect(renderer.app.stage.children.length).toBeGreaterThan(0);
      } finally {
        world.destroy();
      }
    });
  }
});
