/**
 * Game audio — wires gameplay EVENTS to sfx. Pre-renders the sfx bank once, then
 * exposes a tiny `play(event)` the game loop calls. Browser-only; the sim stays
 * pure (it returns event counts; this layer turns them into sound).
 *
 * Events → sounds:
 *   jump → blip · land/hurt → thud · pickup/score → coin · whip/pot-smash → crack
 */
import {
  type AudioEngine,
  createAudioEngine,
  renderBlip,
  renderCaveAmbience,
  renderCoin,
  renderThud,
  renderWhipCrack,
  type SfxHandle,
} from "@audio/index.ts";

export type GameSound = "jump" | "land" | "hurt" | "pickup" | "whip" | "potSmash" | "win";

export interface GameAudio {
  /** Resume the AudioContext (call from a user gesture — e.g. PLAY). */
  unlock(): Promise<void>;
  /** Play the sound for a gameplay event. */
  play(sound: GameSound): void;
  setMuted(muted: boolean): void;
  destroy(): void;
}

/** Build the game-audio layer, pre-rendering every sfx buffer. */
export function createGameAudio(engine: AudioEngine = createAudioEngine()): GameAudio {
  const ctx = engine.context;
  const blip = renderBlip(ctx);
  const thud = renderThud(ctx);
  const coin = renderCoin(ctx);
  const crack = renderWhipCrack(ctx);
  const ambience = renderCaveAmbience(ctx);
  let music: SfxHandle | undefined;

  // Map each event to a buffer + a touch of volume variety so repeats don't fatigue.
  const SOUND: Record<GameSound, { buffer: AudioBuffer; volume: number }> = {
    jump: { buffer: blip, volume: 0.5 },
    land: { buffer: thud, volume: 0.4 },
    hurt: { buffer: thud, volume: 0.8 },
    pickup: { buffer: coin, volume: 0.6 },
    whip: { buffer: crack, volume: 0.7 },
    potSmash: { buffer: crack, volume: 0.5 },
    win: { buffer: coin, volume: 0.9 },
  };

  return {
    async unlock() {
      await engine.unlock();
      // Start the looping ambient music bed once, after the gesture unlock.
      if (!music) music = engine.playMusic(ambience, { gain: 0.35, loop: true });
    },
    play(sound) {
      const s = SOUND[sound];
      engine.playSfx(s.buffer, { gain: s.volume });
    },
    setMuted(muted) {
      engine.setMasterVolume(muted ? 0 : 1);
    },
    destroy() {
      music?.stop();
      engine.dispose();
    },
  };
}
