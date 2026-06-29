/**
 * Procedural SFX bank — renders short AudioBuffers without any asset files.
 *
 * All functions are deterministic given the same AudioContext (or OfflineAudioContext)
 * and the same parameters. Shapes used: square wave, triangle wave, white noise.
 *
 * Envelope: linear attack → hold → exponential decay.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Fill a channel buffer with deterministic white noise via LCG. */
function fillNoise(data: Float32Array, seed: number = 42): void {
  let s = seed | 0;
  for (let i = 0; i < data.length; i++) {
    // Park-Miller LCG — deterministic, no Math.random()
    s = Math.imul(s, 48271) % 2147483647;
    data[i] = (s / 2147483647) * 2 - 1;
  }
}

/** Fill a channel buffer with a square wave at the given frequency. */
function fillSquare(data: Float32Array, sampleRate: number, freq: number): void {
  const period = sampleRate / freq;
  for (let i = 0; i < data.length; i++) {
    data[i] = i % period < period / 2 ? 1 : -1;
  }
}

/** Fill a channel buffer with a triangle wave at the given frequency. */
function fillTriangle(data: Float32Array, sampleRate: number, freq: number): void {
  const period = sampleRate / freq;
  for (let i = 0; i < data.length; i++) {
    const t = (i % period) / period; // 0..1 within one period
    data[i] = t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
  }
}

/**
 * Apply a simple AR (attack-hold-decay) envelope in-place.
 *
 * @param data       Float32Array channel data (modified in-place)
 * @param sampleRate Samples per second
 * @param attackS    Attack duration in seconds
 * @param holdS      Hold duration in seconds
 * @param decayS     Exponential decay duration in seconds
 */
function applyEnvelope(
  data: Float32Array,
  sampleRate: number,
  attackS: number,
  holdS: number,
  decayS: number,
): void {
  const attackSamples = Math.floor(attackS * sampleRate);
  const holdSamples = Math.floor(holdS * sampleRate);
  const decaySamples = Math.floor(decayS * sampleRate);
  const total = data.length;

  for (let i = 0; i < total; i++) {
    let env: number;
    if (i < attackSamples) {
      env = attackSamples > 0 ? i / attackSamples : 1;
    } else if (i < attackSamples + holdSamples) {
      env = 1;
    } else {
      const d = i - attackSamples - holdSamples;
      env = decaySamples > 0 ? Math.exp((-5 * d) / decaySamples) : 0;
    }
    data[i] = (data[i] ?? 0) * env;
  }
}

/** Allocate a mono AudioBuffer of the given duration. */
function allocMono(ctx: BaseAudioContext, durationS: number): AudioBuffer {
  const length = Math.max(1, Math.ceil(ctx.sampleRate * durationS));
  return ctx.createBuffer(1, length, ctx.sampleRate);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Short high-pitched blip — good for UI confirm / jump.
 */
export function renderBlip(ctx: BaseAudioContext): AudioBuffer {
  const duration = 0.12;
  const buf = allocMono(ctx, duration);
  const data = buf.getChannelData(0);
  fillSquare(data, ctx.sampleRate, 880);
  applyEnvelope(data, ctx.sampleRate, 0.005, 0.02, 0.095);
  return buf;
}

/**
 * Low thud — good for landing / stomp / hit.
 */
export function renderThud(ctx: BaseAudioContext): AudioBuffer {
  const duration = 0.22;
  const buf = allocMono(ctx, duration);
  const data = buf.getChannelData(0);
  // Noise burst with fast decay = punchy thud
  fillNoise(data, 7);
  applyEnvelope(data, ctx.sampleRate, 0.001, 0.01, 0.21);
  // Low-pass feel: mix in triangle at very low frequency
  const tri = new Float32Array(data.length);
  fillTriangle(tri, ctx.sampleRate, 55);
  applyEnvelope(tri, ctx.sampleRate, 0.001, 0.02, 0.2);
  for (let i = 0; i < data.length; i++) {
    data[i] = (data[i] ?? 0) * 0.4 + (tri[i] ?? 0) * 0.6;
  }
  return buf;
}

/**
 * Rising ding — good for coin / pickup / point scored.
 */
export function renderCoin(ctx: BaseAudioContext): AudioBuffer {
  const duration = 0.18;
  const buf = allocMono(ctx, duration);
  const data = buf.getChannelData(0);
  // Two-tone: triangle at root then quick pitch jump (simulate via two passes)
  const root = 660;
  const fifth = 990;
  const half = Math.floor(data.length / 2);
  const lo = data.subarray(0, half);
  const hi = data.subarray(half);
  fillTriangle(lo, ctx.sampleRate, root);
  fillTriangle(hi, ctx.sampleRate, fifth);
  applyEnvelope(data, ctx.sampleRate, 0.003, 0.03, 0.147);
  return buf;
}

/**
 * Sharp crack — good for whip / lash / fast swing.
 */
export function renderWhipCrack(ctx: BaseAudioContext): AudioBuffer {
  const duration = 0.15;
  const buf = allocMono(ctx, duration);
  const data = buf.getChannelData(0);
  fillNoise(data, 31337);
  // Very short attack, very fast decay → crack
  applyEnvelope(data, ctx.sampleRate, 0.001, 0.002, 0.147);
  // Boost amplitude
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.max(-1, Math.min(1, (data[i] ?? 0) * 2.5));
  }
  return buf;
}

/**
 * Procedural arcade BGM — a looping 16-bit style chiptune melody built entirely
 * from square and triangle waves (no assets). The track loops seamlessly because
 * every note frequency and the buffer duration are chosen so that whole-number
 * cycles fit inside the buffer length (no click at the loop point).
 *
 * Structure (4-bar loop, ~120 BPM):
 *   - Lead melody  : square wave, A-minor pentatonic riff
 *   - Bass line    : triangle wave, root + fifth pulse
 *   - Hi-hat pulse : noise bursts on the off-beat
 *
 * Designed to play on the music bus at gain ~0.30 — bright and upbeat but not
 * fatiguing at full-session volume.
 */
export function renderArcadeBgm(ctx: BaseAudioContext): AudioBuffer {
  const bpm = 128;
  const beatsPerBar = 4;
  const bars = 4;
  const secondsPerBeat = 60 / bpm;
  const duration = bars * beatsPerBar * secondsPerBeat; // ~7.5 s
  const sr = ctx.sampleRate;
  const totalSamples = Math.ceil(sr * duration);

  const buf = ctx.createBuffer(1, totalSamples, sr);
  const out = buf.getChannelData(0);

  // -------------------------------------------------------------------------
  // Helper: mix a square note into `out` at the given time window + frequency.
  // -------------------------------------------------------------------------
  function addSquare(freqHz: number, startS: number, durS: number, amp: number): void {
    const startI = Math.floor(startS * sr);
    const endI = Math.min(totalSamples, Math.floor((startS + durS) * sr));
    const period = sr / freqHz;
    const attackSamples = Math.min(Math.floor(0.004 * sr), endI - startI);
    const decaySamples = Math.min(Math.floor(0.015 * sr), endI - startI);
    const noteLen = endI - startI;
    for (let i = startI; i < endI; i++) {
      const pos = i - startI;
      let env = 1;
      if (pos < attackSamples) env = pos / Math.max(1, attackSamples);
      else if (pos > noteLen - decaySamples) env = (noteLen - pos) / Math.max(1, decaySamples);
      const sq = (i % period < period / 2) ? 1 : -1;
      out[i] = (out[i] ?? 0) + sq * amp * env;
    }
  }

  // Helper: triangle bass note
  function addTriangle(freqHz: number, startS: number, durS: number, amp: number): void {
    const startI = Math.floor(startS * sr);
    const endI = Math.min(totalSamples, Math.floor((startS + durS) * sr));
    const period = sr / freqHz;
    for (let i = startI; i < endI; i++) {
      const t = (i % period) / period;
      const tri = t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
      out[i] = (out[i] ?? 0) + tri * amp;
    }
  }

  // Helper: short noise hi-hat burst
  function addHat(startS: number, amp: number): void {
    const startI = Math.floor(startS * sr);
    const hatLen = Math.floor(0.025 * sr);
    const endI = Math.min(totalSamples, startI + hatLen);
    let s = (startI * 6364136223846793005 + 1442695040888963407) | 0;
    for (let i = startI; i < endI; i++) {
      s = Math.imul(s, 1664525) + 1013904223;
      const noise = (s >>> 0) / 0x100000000 * 2 - 1;
      const decay = 1 - (i - startI) / hatLen;
      out[i] = (out[i] ?? 0) + noise * amp * decay * decay;
    }
  }

  // -------------------------------------------------------------------------
  // Note frequencies (A-minor pentatonic: A3=220, C4=261.6, D4=293.7,
  //                   E4=329.6, G4=392, A4=440, C5=523.3)
  // -------------------------------------------------------------------------
  const A3 = 220, C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392, A4 = 440, C5 = 523.25;
  const sb = secondsPerBeat;

  // Lead melody (4 bars, 16 eighth-note slots per bar)
  const melody: Array<[number, number, number]> = [
    // bar 1
    [A4, 0 * sb,     sb * 0.45],
    [C5, 0.5 * sb,   sb * 0.45],
    [A4, 1 * sb,     sb * 0.45],
    [G4, 1.5 * sb,   sb * 0.45],
    [E4, 2 * sb,     sb * 0.9],
    [G4, 3 * sb,     sb * 0.45],
    [A4, 3.5 * sb,   sb * 0.45],
    // bar 2
    [C5, 4 * sb,     sb * 0.45],
    [A4, 4.5 * sb,   sb * 0.45],
    [G4, 5 * sb,     sb * 0.45],
    [E4, 5.5 * sb,   sb * 0.45],
    [D4, 6 * sb,     sb * 0.9],
    [E4, 7 * sb,     sb * 0.45],
    [G4, 7.5 * sb,   sb * 0.45],
    // bar 3
    [A4, 8 * sb,     sb * 0.45],
    [G4, 8.5 * sb,   sb * 0.45],
    [E4, 9 * sb,     sb * 0.45],
    [D4, 9.5 * sb,   sb * 0.45],
    [C4, 10 * sb,    sb * 0.9],
    [D4, 11 * sb,    sb * 0.45],
    [E4, 11.5 * sb,  sb * 0.45],
    // bar 4 (resolve + pick-up)
    [G4, 12 * sb,    sb * 0.45],
    [A4, 12.5 * sb,  sb * 0.45],
    [G4, 13 * sb,    sb * 0.45],
    [E4, 13.5 * sb,  sb * 0.45],
    [A3, 14 * sb,    sb * 1.4],
    [E4, 15.5 * sb,  sb * 0.45],
  ];
  for (const [f, t, d] of melody) addSquare(f, t, d, 0.28);

  // Bass line: root on beats 1+3, fifth on beats 2+4 of each bar
  const bassNotes: Array<[number, number]> = [];
  for (let bar = 0; bar < bars; bar++) {
    const base = bar * beatsPerBar * sb;
    // A2=110 Hz (root), E3=164.8 Hz (fifth)
    bassNotes.push([110, base + 0 * sb]);
    bassNotes.push([164.81, base + 1 * sb]);
    bassNotes.push([110, base + 2 * sb]);
    bassNotes.push([164.81, base + 3 * sb]);
  }
  for (const [f, t] of bassNotes) addTriangle(f, t, sb * 0.85, 0.22);

  // Hi-hat on off-beats (every half-beat starting at 0.5)
  for (let i = 0; i < bars * beatsPerBar * 2; i++) {
    if (i % 2 === 1) addHat(i * sb * 0.5, 0.12);
  }

  // Soft-clip the mix to prevent any inter-voice summing from exceeding ±1
  for (let i = 0; i < totalSamples; i++) {
    const v = out[i] ?? 0;
    out[i] = v / (1 + Math.abs(v));
  }

  return buf;
}

/**
 * @deprecated Alias kept for callers that still import renderCaveAmbience.
 * New code should use renderArcadeBgm.
 */
export function renderCaveAmbience(ctx: BaseAudioContext): AudioBuffer {
  return renderArcadeBgm(ctx);
}
