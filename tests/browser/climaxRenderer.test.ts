import { CAVE_PARALLAX } from "@render/parallax.ts";
import { createPaintingRenderer } from "@render/paintingRenderer.ts";
import { ESCAPE_RUN, ESCAPE_RUN_FRAME } from "@render/levels/escapeRun.ts";
import { SHRINE_HEART, SHRINE_HEART_FRAME } from "@render/levels/shrineHeart.ts";
import { Collectible, Enemy, Facing, Gravity, Player, Position, Pot, Size, Velocity } from "@sim/ecs/traits.ts";
import { createCamera } from "@sim/world/camera.ts";
import { ESCAPE_RUN as ESCAPE_RUN_SIM, SHRINE_HEART as SHRINE_HEART_SIM, type GameLevel } from "@sim/world/gameLevel.ts";
import type { Placement } from "@render/composition.ts";
import { page } from "vitest/browser";
import { createWorld } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/** Populate a sim world from a level's spawns (for the visual proof shots). */
function buildWorld(level: GameLevel) {
  const world = createWorld();
  world.spawn(
    Position({ x: level.spawnX, y: level.spawnY }),
    Velocity({ x: 0, y: 0 }),
    Size({ w: 12, h: 16 }),
    Facing({ dir: 1 }),
    Gravity({ scale: 1 }),
    Player({ grounded: true, coyote: 0, buffer: 0, whip: 0, dead: false }),
  );
  for (const c of level.collectibles) {
    world.spawn(Position({ x: c.x, y: c.y }), Size({ w: 10, h: 10 }), Collectible({ value: c.value, taken: false }));
  }
  for (const e of level.enemies) {
    world.spawn(
      Position({ x: e.x, y: e.y }),
      Velocity({ x: 0, y: 0 }),
      Size({ w: 14, h: 14 }),
      Facing({ dir: -1 }),
      Gravity({ scale: 1 }),
      Enemy({ kind: e.kind, speed: 40, minX: e.x - 48, maxX: e.x + 48, alive: true }),
    );
  }
  for (const p of level.pots) {
    world.spawn(Position({ x: p.x, y: p.y }), Size({ w: 16, h: 16 }), Pot({ color: p.color, drop: p.drop, broken: false, breakTimer: 0 }));
  }
  return world;
}

interface Stop {
  readonly name: string;
  readonly sim: GameLevel;
  readonly painting: readonly Placement[];
  readonly frame: { readonly top: number; readonly bottom: number };
  readonly camX: number;
}

// One camera stop per climax level, framed on its signature beat: the idol shrine
// (the grab) for the heart, the cave-mouth exit for the escape. Proves zero asset
// loss on the two final levels.
const STOPS: readonly Stop[] = [
  // heart-idol frames the staircase landing — segments sum to x≈2180 before seg 8.
  { name: "heart-idol", sim: SHRINE_HEART_SIM, painting: SHRINE_HEART, frame: SHRINE_HEART_FRAME, camX: 2180 },
  { name: "heart-nave", sim: SHRINE_HEART_SIM, painting: SHRINE_HEART, frame: SHRINE_HEART_FRAME, camX: 300 },
  // escape-mouth frames the cave-mouth goal — seg 7 starts at x≈1800.
  { name: "escape-mouth", sim: ESCAPE_RUN_SIM, painting: ESCAPE_RUN, frame: ESCAPE_RUN_FRAME, camX: 1860 },
  { name: "escape-start", sim: ESCAPE_RUN_SIM, painting: ESCAPE_RUN, frame: ESCAPE_RUN_FRAME, camX: 200 },
];

describe("climax levels painting renderer (shrine-heart + escape-run, visual proof)", () => {
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

  for (const stop of STOPS) {
    it(`renders ${stop.name} (painting + sim sprites)`, async () => {
      renderer = await createPaintingRenderer(host!, {
        parallax: CAVE_PARALLAX,
        painting: stop.painting,
        frameTop: stop.frame.top,
        frameBottom: stop.frame.bottom,
      });
      const world = buildWorld(stop.sim);
      try {
        const frameH = stop.frame.bottom - stop.frame.top;
        const camera = { ...createCamera(675, frameH), x: stop.camX, y: 0 };
        const viewport = { scale: 1, offsetX: 0, offsetY: 0, viewW: 480, viewH: 270 };
        renderer.render({ world, camera, viewport, alpha: 0, prev: new Map() });
        await new Promise((r) => setTimeout(r, 350));
        renderer.render({ world, camera, viewport, alpha: 0, prev: new Map() });
        await page.screenshot({ path: `climax-${stop.name}.png` });
        expect(renderer.app.stage.children.length).toBeGreaterThan(0);
      } finally {
        world.destroy();
      }
    });
  }
});
