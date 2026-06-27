/**
 * Web Audio engine for Illinois Jim.
 *
 * Bus topology:
 *   sfx sources → sfxBus (GainNode)
 *         music sources → musicBus (GainNode)
 *   sfxBus + musicBus → masterBus (GainNode) → destination
 *
 * Mobile note: AudioContext starts suspended; call unlock() on first user gesture.
 */

export type AudioBus = "master" | "music" | "sfx";

export interface SfxHandle {
  stop(): void;
}

export interface SfxOptions {
  gain?: number;
  rate?: number;
  pan?: number;
}

export interface AudioEngine {
  unlock(): Promise<void>;
  setMasterVolume(v: number): void;
  setMusicVolume(v: number): void;
  setSfxVolume(v: number): void;
  mute(bus?: AudioBus): void;
  unmute(bus?: AudioBus): void;
  playSfx(buffer: AudioBuffer, opts?: SfxOptions): SfxHandle;
  state(): "suspended" | "running" | "closed";
  dispose(): void;
  /** Expose the underlying AudioContext for tests / OfflineAudioContext users. */
  readonly context: AudioContext;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function createAudioEngine(): AudioEngine {
  const ctx = new AudioContext();

  // Master bus
  const masterBus = ctx.createGain();
  masterBus.gain.value = 1;
  masterBus.connect(ctx.destination);

  // Sub-buses
  const musicBus = ctx.createGain();
  musicBus.gain.value = 1;
  musicBus.connect(masterBus);

  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 1;
  sfxBus.connect(masterBus);

  // Mute state (we store pre-mute values so unmute restores them)
  const preMuteGain: Record<AudioBus, number> = {
    master: 1,
    music: 1,
    sfx: 1,
  };
  const muted: Record<AudioBus, boolean> = {
    master: false,
    music: false,
    sfx: false,
  };

  function busNode(bus: AudioBus): GainNode {
    switch (bus) {
      case "master":
        return masterBus;
      case "music":
        return musicBus;
      case "sfx":
        return sfxBus;
    }
  }

  function setVolume(bus: AudioBus, v: number): void {
    const clamped = clamp01(v);
    preMuteGain[bus] = clamped;
    if (!muted[bus]) {
      busNode(bus).gain.value = clamped;
    }
  }

  function muteAll(): void {
    for (const bus of ["master", "music", "sfx"] as AudioBus[]) {
      if (!muted[bus]) {
        preMuteGain[bus] = busNode(bus).gain.value;
        busNode(bus).gain.value = 0;
        muted[bus] = true;
      }
    }
  }

  function unmuteAll(): void {
    for (const bus of ["master", "music", "sfx"] as AudioBus[]) {
      if (muted[bus]) {
        busNode(bus).gain.value = preMuteGain[bus];
        muted[bus] = false;
      }
    }
  }

  return {
    context: ctx,

    async unlock(): Promise<void> {
      if (ctx.state !== "suspended") return;
      // ctx.resume() may never resolve in headless / unit-test environments
      // (no user gesture) — race it against a 200 ms timeout so unlock() always
      // settles. In a real browser with a prior touch event it resolves instantly.
      await Promise.race([ctx.resume(), new Promise<void>((resolve) => setTimeout(resolve, 200))]);
    },

    setMasterVolume(v: number): void {
      setVolume("master", v);
    },

    setMusicVolume(v: number): void {
      setVolume("music", v);
    },

    setSfxVolume(v: number): void {
      setVolume("sfx", v);
    },

    mute(bus?: AudioBus): void {
      if (bus === undefined) {
        muteAll();
        return;
      }
      if (!muted[bus]) {
        preMuteGain[bus] = busNode(bus).gain.value;
        busNode(bus).gain.value = 0;
        muted[bus] = true;
      }
    },

    unmute(bus?: AudioBus): void {
      if (bus === undefined) {
        unmuteAll();
        return;
      }
      if (muted[bus]) {
        busNode(bus).gain.value = preMuteGain[bus];
        muted[bus] = false;
      }
    },

    playSfx(buffer: AudioBuffer, opts?: SfxOptions): SfxHandle {
      const gainNode = ctx.createGain();
      gainNode.gain.value = clamp01(opts?.gain ?? 1);

      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, opts?.pan ?? 0));

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = Math.max(0.01, opts?.rate ?? 1);

      // routing: source → gainNode → panner → sfxBus
      source.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(sfxBus);

      source.start();

      let stopped = false;
      return {
        stop(): void {
          if (!stopped) {
            stopped = true;
            try {
              source.stop();
            } catch {
              // Already stopped (e.g. buffer finished) — ignore.
            }
          }
        },
      };
    },

    state(): "suspended" | "running" | "closed" {
      return ctx.state as "suspended" | "running" | "closed";
    },

    dispose(): void {
      void ctx.close();
    },
  };
}
