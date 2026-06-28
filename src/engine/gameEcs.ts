/**
 * ECS game loop — drives the koota world through all fixed-step systems and
 * paints it with the PixiJS renderer. Browser-only; the sim stays pure.
 *
 * Fixed-timestep: the clock decides how many sim steps run per animation frame;
 * the renderer interpolates actors between the previous and current step using
 * the clock alpha. The HUD store is updated from the Score entity each frame.
 *
 * On player death the world is rebuilt — and the old world is destroyed (koota
 * caps live worlds at 16, so leaking a world per death would crash the game).
 */
import { type Clock, createClock } from "@engine/clock.ts";
import { createInputManager, type InputManager } from "@engine/input/inputManager.ts";
import { createRngPair, type Rng } from "@engine/rng.ts";
import { createResponsiveViewport, type ResponsiveViewport } from "@engine/viewport/responsive.ts";
import { createPixiRenderer, type PixiRenderer } from "@render/pixiRenderer.ts";
import {
  collectibleSystem,
  combatSystem,
  enemySystem,
  lifetimeSystem,
  mineCartSystem,
  particleSystem,
  physicsSystem,
  playerSystem,
  scoreSystem,
  spawnBurst,
} from "@sim/ecs/systems.ts";
import { Enemy, Player, Position, Score } from "@sim/ecs/traits.ts";
import { createSimWorld, type SimWorld } from "@sim/ecs/world.ts";
import { type Camera, createCamera, followCamera } from "@sim/world/camera.ts";
import { type Level, levelBounds, parseLevel } from "@sim/world/level.ts";
import { SHRINE_01 } from "@sim/world/levels/shrine01.ts";

export interface Game {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  /** Rebuild the world from scratch and resume (used by the FSM RESTART). */
  restart(): void;
  dispose(): void;
}

export interface GameDeps {
  readonly raf?: (cb: (t: number) => void) => number;
  readonly cancelRaf?: (handle: number) => void;
  readonly now?: () => number;
  /** Inject a HUD sink (score/lives) — defaults to a no-op for tests. */
  readonly onHud?: (hud: { score: number; lives: number; combo: number }) => void;
  /** Fired when the player runs out of lives (final score). */
  readonly onGameOver?: (finalScore: number) => void;
}

export async function createGame(canvas: HTMLCanvasElement, deps: GameDeps = {}): Promise<Game> {
  const raf = deps.raf ?? globalThis.requestAnimationFrame.bind(globalThis);
  const cancelRaf = deps.cancelRaf ?? globalThis.cancelAnimationFrame.bind(globalThis);
  const now = deps.now ?? (() => performance.now());
  const onGameOver = deps.onGameOver ?? (() => {});
  const onHud = deps.onHud ?? (() => {});

  const level: Level = parseLevel(SHRINE_01, 16);
  const bounds = levelBounds(level);

  const input: InputManager = createInputManager(canvas);
  const viewport: ResponsiveViewport = createResponsiveViewport(canvas);
  const renderer: PixiRenderer = await createPixiRenderer(canvas);
  const clock: Clock = createClock();
  // FX (cosmetic) PRNG stream — independent of the sim stream so particle
  // randomness never desyncs a gameplay replay.
  const fx: Rng = createRngPair("shrine-run").fx;

  let sim: SimWorld = createSimWorld(level);
  let camera: Camera = createCamera(
    viewport.current().viewport.viewW,
    viewport.current().viewport.viewH,
  );
  // Previous-frame positions per entity id, for render interpolation.
  let prev = new Map<number, { x: number; y: number }>();

  let handle = 0;
  let running = false;
  let paused = false;

  viewport.onChange((state) => {
    camera = { ...camera, viewW: state.viewport.viewW, viewH: state.viewport.viewH };
    input.resize(
      canvas.clientWidth || state.viewport.viewW,
      canvas.clientHeight || state.viewport.viewH,
    );
  });

  /** Snapshot current actor positions so the next frame can interpolate from them. */
  function snapshotPositions(): Map<number, { x: number; y: number }> {
    const m = new Map<number, { x: number; y: number }>();
    for (const e of sim.world.query(Position)) {
      const p = e.get(Position);
      if (p) m.set(e, { x: p.x, y: p.y });
    }
    return m;
  }

  function rebuildWorld(): void {
    sim.world.destroy(); // free the koota world slot (16-world cap)
    sim = createSimWorld(level);
    prev = new Map();
  }

  function playerCenter(): { x: number; y: number } | null {
    const pl = sim.world.query(Player, Position)[0];
    const pos = pl?.get(Position);
    return pos ? { x: pos.x + sim.tuning.width / 2, y: pos.y + sim.tuning.height / 2 } : null;
  }

  function step(dt: number): void {
    prev = snapshotPositions();
    const intent = input.poll();
    // Mine-cart sets the player's rail velocity before playerSystem integrates,
    // so a rider is carried along the rail rather than fighting the run accel.
    mineCartSystem(sim.world, intent, level.map);
    playerSystem(sim.world, intent, level.map, sim.tuning, dt);
    enemySystem(sim.world, dt);
    physicsSystem(sim.world, level.map, sim.tuning, dt);
    const combat = combatSystem(sim.world, sim.tuning);
    const gained = collectibleSystem(sim.world);
    scoreSystem(sim.world, dt);
    particleSystem(sim.world, dt, sim.tuning.gravity);
    lifetimeSystem(sim.world, dt);

    // Cosmetic bursts on kills/pickups — FX stream, never touches the sim stream.
    const c = playerCenter();
    if (c && combat.kills > 0) {
      spawnBurst(sim.world, fx, c.x, c.y, { count: 8, color: 0xc2402e, speed: 90, gravity: 0.4 });
    }
    if (c && gained > 0) {
      spawnBurst(sim.world, fx, c.x, c.y, { count: 6, color: 0xf6d36b, speed: 70, size: 2 });
    }
  }

  function followPlayer(): void {
    const pos = sim.world.query(Player, Position)[0]?.get(Position);
    if (!pos) return;
    camera = followCamera(
      camera,
      pos.x + sim.tuning.width / 2,
      pos.y + sim.tuning.height / 2,
      bounds,
    );
  }

  /** Handle player death: lose a life + rebuild, or end the run at zero lives. */
  function handleDeath(): void {
    const dead = sim.world.query(Player)[0]?.get(Player)?.dead;
    if (!dead) return;
    const score = sim.score.get(Score);
    const points = score?.points ?? 0;
    const lives = Math.max(0, (score?.lives ?? 1) - 1);
    if (lives <= 0) {
      stop();
      onGameOver(points);
      return;
    }
    rebuildWorld();
    const ns = sim.score.get(Score);
    if (ns) sim.score.set(Score, { ...ns, lives, points });
  }

  function updateCameraAndHud(): void {
    followPlayer();
    const s = sim.score.get(Score);
    if (s) onHud({ score: s.points, lives: s.lives, combo: s.combo });
    handleDeath();
  }

  const frame = (t: number) => {
    if (!running) return;
    const stepInfo = clock.tick(t);
    const vp = viewport.current().viewport;

    if (!paused) {
      for (let i = 0; i < stepInfo.steps; i++) step(stepInfo.dt);
      if (stepInfo.steps > 0) updateCameraAndHud();
    }

    renderer.render({
      world: sim.world,
      map: level.map,
      camera,
      viewport: vp,
      tuning: sim.tuning,
      alpha: paused ? 0 : stepInfo.alpha,
      prev,
    });

    handle = raf(frame);
  };

  // Reference Enemy so tree-shaking keeps the trait registered for queries.
  void Enemy;

  const stop = () => {
    running = false;
    cancelRaf(handle);
  };

  return {
    start() {
      if (running) return;
      running = true;
      clock.resync(now());
      handle = raf(frame);
    },
    stop,
    setPaused(next) {
      if (paused === next) return;
      paused = next;
      if (!paused) clock.resync(now());
    },
    restart() {
      rebuildWorld();
      paused = false;
      if (!running) {
        running = true;
        handle = raf(frame);
      }
      clock.resync(now());
    },
    dispose() {
      stop();
      input.dispose();
      viewport.dispose();
      renderer.destroy();
      sim.world.destroy();
    },
  };
}
