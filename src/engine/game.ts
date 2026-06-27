/**
 * Game loop — wires the deterministic sim to the browser (input, render, audio,
 * responsive viewport). Browser-only; the sim it drives stays pure.
 *
 * Fixed-timestep: the clock decides how many sim steps to run each animation
 * frame; the renderer interpolates between the last two sim states. Input is
 * sampled once per frame and fed to every sub-step (good enough at 60Hz).
 */
import { type Clock, createClock } from "@engine/clock.ts";
import { createInputManager, type InputManager } from "@engine/input/inputManager.ts";
import { createResponsiveViewport, type ResponsiveViewport } from "@engine/viewport/responsive.ts";
import { drawFrame } from "@render/renderer.ts";
import { NEUTRAL_INTENT } from "@sim/input/intent.ts";
import { createPlayer, type PlayerState, stepPlayer } from "@sim/player/player.ts";
import { DEFAULT_TUNING, type PlayerTuning } from "@sim/player/tuning.ts";
import { type Camera, createCamera, followCamera } from "@sim/world/camera.ts";
import { type Level, levelBounds, parseLevel } from "@sim/world/level.ts";
import { SHRINE_01 } from "@sim/world/levels/shrine01.ts";

export interface Game {
  start(): void;
  stop(): void;
  /** Pause/resume the sim without tearing down (Capacitor app lifecycle). */
  setPaused(paused: boolean): void;
  dispose(): void;
}

export interface GameDeps {
  /** Optional rAF scheduler injection for tests. */
  readonly raf?: (cb: (t: number) => void) => number;
  readonly cancelRaf?: (handle: number) => void;
  readonly now?: () => number;
}

export function createGame(canvas: HTMLCanvasElement, deps: GameDeps = {}): Game {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("createGame: no 2d context");

  const raf = deps.raf ?? globalThis.requestAnimationFrame.bind(globalThis);
  const cancelRaf = deps.cancelRaf ?? globalThis.cancelAnimationFrame.bind(globalThis);
  const now = deps.now ?? (() => performance.now());

  const tuning: PlayerTuning = DEFAULT_TUNING;
  const level: Level = parseLevel(SHRINE_01, 16);
  const bounds = levelBounds(level);

  const input: InputManager = createInputManager(canvas);
  const viewport: ResponsiveViewport = createResponsiveViewport(canvas);
  const clock: Clock = createClock();

  let player: PlayerState = createPlayer(level.spawnX, level.spawnY);
  let prevPlayer: PlayerState = player;
  let camera: Camera = createCamera(
    viewport.current().viewport.viewW,
    viewport.current().viewport.viewH,
  );

  let handle = 0;
  let running = false;
  let paused = false;

  viewport.onChange((state) => {
    // Keep the camera's view size in sync with the responsive design resolution.
    camera = { ...camera, viewW: state.viewport.viewW, viewH: state.viewport.viewH };
    input.resize(
      canvas.clientWidth || state.viewport.viewW,
      canvas.clientHeight || state.viewport.viewH,
    );
  });

  const respawnIfDead = () => {
    if (player.dead) {
      player = createPlayer(level.spawnX, level.spawnY);
      prevPlayer = player;
    }
  };

  const frame = (t: number) => {
    if (!running) return;
    const step = clock.tick(t);
    const vp = viewport.current().viewport;

    if (!paused) {
      const intent = input.poll();
      for (let i = 0; i < step.steps; i++) {
        prevPlayer = player;
        player = stepPlayer(player, intent, level.map, tuning, step.dt);
      }
      respawnIfDead();
      const cx = player.x + tuning.width / 2;
      const cy = player.y + tuning.height / 2;
      camera = followCamera(camera, cx, cy, bounds);
    }

    drawFrame(ctx, {
      map: level.map,
      camera,
      viewport: vp,
      prevPlayer,
      player,
      tuning,
      alpha: paused ? 0 : step.alpha,
    });

    handle = raf(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      clock.resync(now());
      handle = raf(frame);
    },
    stop() {
      running = false;
      cancelRaf(handle);
    },
    setPaused(next) {
      if (paused === next) return;
      paused = next;
      if (!paused) clock.resync(now()); // avoid a time spike on resume
    },
    dispose() {
      this.stop();
      input.dispose();
      viewport.dispose();
    },
  };
}

// Re-export so callers can build a neutral intent for tests/menus.
export { NEUTRAL_INTENT };
