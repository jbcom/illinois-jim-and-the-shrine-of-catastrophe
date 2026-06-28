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
 * Seamless looping cave ambience — a low drone (stacked detuned triangles) under
 * faint filtered noise, with whole-number cycles across the buffer so it loops
 * without a click. Quiet by design; meant to play on the music bus under gameplay.
 */
export function renderCaveAmbience(ctx: BaseAudioContext): AudioBuffer {
  const duration = 4; // 4s loop
  const buf = allocMono(ctx, duration);
  const data = buf.getChannelData(0);
  const sr = ctx.sampleRate;
  // Drone tones — frequencies chosen so an integer number of cycles fits `duration`
  // (freq × duration ∈ ℤ) for a click-free loop point.
  const tones = [55, 82.5, 110]; // A1, ~E2, A2 (all × 4s = integer cycles)
  for (let i = 0; i < data.length; i++) {
    const t = i / sr;
    let s = 0;
    for (const f of tones) s += Math.sin(2 * Math.PI * f * t);
    data[i] = (s / tones.length) * 0.18;
  }
  // Faint noise shimmer, low-passed by a simple moving average.
  const noise = new Float32Array(data.length);
  fillNoise(noise, 9001);
  let acc = 0;
  const win = 32;
  for (let i = 0; i < data.length; i++) {
    acc += (noise[i] ?? 0) - (noise[i - win] ?? 0);
    data[i] = (data[i] ?? 0) + (acc / win) * 0.04;
  }
  return buf;
}
