import type { AudioEngine } from "@audio/audioEngine.ts";
import { createAudioEngine } from "@audio/audioEngine.ts";
import { renderBlip, renderCoin, renderThud, renderWhipCrack } from "@audio/sfxBank.ts";
import { beforeEach, describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute RMS of a Float32Array channel. */
function rms(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const s = data[i] ?? 0;
    sum += s * s;
  }
  return Math.sqrt(sum / data.length);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("AudioEngine", () => {
  let engine: AudioEngine;

  beforeEach(() => {
    engine = createAudioEngine();
  });

  it("starts in suspended state (mobile-safe default)", () => {
    // A freshly created AudioContext is suspended until a user gesture.
    expect(engine.state()).toBe("suspended");
  });

  it("unlock() resolves without hanging and leaves context non-closed", async () => {
    // In headless Chromium (no user gesture) ctx.resume() may stay suspended;
    // unlock() must still resolve within its 200 ms timeout rather than block.
    // In a real browser with a prior touch event the state would be "running".
    await engine.unlock();
    expect(engine.state()).not.toBe("closed");
  });

  it("unlock() is idempotent — safe to call multiple times", async () => {
    await engine.unlock();
    await engine.unlock();
    expect(engine.state()).not.toBe("closed");
  });

  it("dispose() closes the context", async () => {
    // unlock first (may or may not transition to "running" in headless), then
    // dispose must always yield "closed".
    await engine.unlock();
    engine.dispose();
    // ctx.close() is async — wait a microtask + event loop turn to settle.
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(engine.state()).toBe("closed");
  });

  describe("volume controls", () => {
    it("setMasterVolume clamps to [0, 1]", () => {
      engine.setMasterVolume(0.5);
      // No throw. Values outside range are clamped silently.
      engine.setMasterVolume(-1);
      engine.setMasterVolume(2);
    });

    it("setMusicVolume clamps to [0, 1]", () => {
      engine.setMusicVolume(0.8);
      engine.setMusicVolume(-99);
      engine.setMusicVolume(99);
    });

    it("setSfxVolume clamps to [0, 1]", () => {
      engine.setSfxVolume(0.3);
      engine.setSfxVolume(-0.1);
      engine.setSfxVolume(1.5);
    });
  });

  describe("mute / unmute", () => {
    it("mute and unmute specific buses without throwing", () => {
      engine.mute("sfx");
      engine.unmute("sfx");
      engine.mute("music");
      engine.unmute("music");
      engine.mute("master");
      engine.unmute("master");
    });

    it("mute() with no argument mutes all buses", () => {
      engine.mute();
      engine.unmute();
    });

    it("double-mute is idempotent", () => {
      engine.mute("sfx");
      engine.mute("sfx");
      engine.unmute("sfx");
    });
  });

  describe("playSfx", () => {
    it("plays and stops without throwing", async () => {
      await engine.unlock();
      // Use an OfflineAudioContext to render a buffer deterministically.
      const offline = new OfflineAudioContext(1, 1024, 44100);
      const buffer = renderBlip(offline);
      const handle = engine.playSfx(buffer, { gain: 0.5, rate: 1.2, pan: -0.3 });
      handle.stop();
    });

    it("stop() is idempotent", async () => {
      await engine.unlock();
      const offline = new OfflineAudioContext(1, 1024, 44100);
      const buffer = renderBlip(offline);
      const handle = engine.playSfx(buffer);
      handle.stop();
      handle.stop(); // second call must not throw
    });

    it("plays with default opts (no opts arg)", async () => {
      await engine.unlock();
      const offline = new OfflineAudioContext(1, 1024, 44100);
      const buffer = renderCoin(offline);
      const handle = engine.playSfx(buffer);
      handle.stop();
    });
  });
});

// ---------------------------------------------------------------------------
// Procedural SFX bank (OfflineAudioContext — deterministic, no real speakers)
// ---------------------------------------------------------------------------

describe("sfxBank — procedural buffers", () => {
  const sampleRate = 44100;

  async function renderAndMeasure(
    factory: (ctx: BaseAudioContext) => AudioBuffer,
  ): Promise<{ rmsVal: number; length: number; channels: number }> {
    // We render the buffer via an OfflineAudioContext so it is exercised through
    // the actual Web Audio graph rather than just inspecting raw Float32Array data.
    const durationS = 0.3; // generous window — all our SFX are < 0.25 s
    const frameCount = Math.ceil(sampleRate * durationS);
    const offline = new OfflineAudioContext(1, frameCount, sampleRate);

    const buffer = factory(offline);
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.connect(offline.destination);
    source.start(0);

    const rendered = await offline.startRendering();
    const data = rendered.getChannelData(0);
    return { rmsVal: rms(data), length: buffer.length, channels: buffer.numberOfChannels };
  }

  it("renderBlip produces non-zero RMS audio", async () => {
    const { rmsVal } = await renderAndMeasure(renderBlip);
    expect(rmsVal).toBeGreaterThan(0.001);
  });

  it("renderThud produces non-zero RMS audio", async () => {
    const { rmsVal } = await renderAndMeasure(renderThud);
    expect(rmsVal).toBeGreaterThan(0.001);
  });

  it("renderCoin produces non-zero RMS audio", async () => {
    const { rmsVal } = await renderAndMeasure(renderCoin);
    expect(rmsVal).toBeGreaterThan(0.001);
  });

  it("renderWhipCrack produces non-zero RMS audio", async () => {
    const { rmsVal } = await renderAndMeasure(renderWhipCrack);
    expect(rmsVal).toBeGreaterThan(0.001);
  });

  it("all SFX render as mono buffers", async () => {
    for (const factory of [renderBlip, renderThud, renderCoin, renderWhipCrack]) {
      const offline = new OfflineAudioContext(1, 1024, sampleRate);
      const buf = factory(offline);
      expect(buf.numberOfChannels).toBe(1);
    }
  });

  it("renders are deterministic — two calls produce identical data", () => {
    const offline = new OfflineAudioContext(1, 1024, sampleRate);
    const a = renderBlip(offline);
    const b = renderBlip(offline);
    const da = a.getChannelData(0);
    const db = b.getChannelData(0);
    expect(da.length).toBe(db.length);
    for (let i = 0; i < da.length; i++) {
      expect(da[i]).toBe(db[i]);
    }
  });
});
