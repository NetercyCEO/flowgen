"use client";

/**
 * Procedural Web Audio tactile sound effects + mobile haptic feedback.
 * All audio synthesis uses lightweight oscillators/noise with soft envelopes
 * and safe guards so restricted/headless browsers never throw or log errors.
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore vibration errors in restricted environments
  }
}

function playTone(
  ctx: AudioContext,
  type: OscillatorType,
  startFreq: number,
  endFreq: number,
  startTime: number,
  duration: number,
  peakGain: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, startFreq), startTime);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
  }
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peakGain), startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** Tactile feedback for clicking the Hero 3D obsidian ember sphere. */
export function triggerOrbFeedback(): void {
  vibrate([18, 22, 10]);
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    playTone(ctx, "sine", 130, 68, now, 0.28, 0.18);
    playTone(ctx, "triangle", 520, 390, now, 0.22, 0.08);
    playTone(ctx, "sine", 780, 780, now + 0.015, 0.24, 0.05);
  } catch {
    // Ignore audio synthesis errors
  }
}

/** Warm molten chime for clicking the FlowGen wordmark. */
export function triggerLogoFeedback(): void {
  vibrate(14);
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    playTone(ctx, "sine", 440, 440, now, 0.28, 0.1);
    playTone(ctx, "sine", 659.25, 659.25, now + 0.02, 0.3, 0.08);
    playTone(ctx, "triangle", 1318, 1318, now + 0.03, 0.22, 0.035);
  } catch {
    // Ignore audio synthesis errors
  }
}

/** Forged metallic strike + spark transient for clicking the 3D anvil/hammer or steps. */
export function triggerAnvilFeedback(): void {
  vibrate([24, 30, 14]);
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Low physical hammer impact
    playTone(ctx, "sine", 180, 55, now, 0.22, 0.2);
    // Metallic anvil ring partials
    playTone(ctx, "triangle", 880, 872, now, 0.32, 0.09);
    playTone(ctx, "sine", 1340, 1330, now, 0.28, 0.06);
    playTone(ctx, "sine", 2160, 2140, now, 0.18, 0.035);

    // Brief filtered spark noise burst
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * 0.06));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleCount * 0.28));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2800, now);
    filter.Q.setValueAtTime(1.4, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  } catch {
    // Ignore audio synthesis errors
  }
}

/** Crisp double-tick confirmation for Contact copy buttons. */
export function triggerCopyFeedback(): void {
  vibrate([12, 24, 12]);
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    playTone(ctx, "sine", 740, 740, now, 0.045, 0.11);
    playTone(ctx, "sine", 1046, 1046, now + 0.055, 0.085, 0.13);
  } catch {
    // Ignore audio synthesis errors
  }
}

/** Subtle mechanical detent + soft air brush for Proof card navigation. */
export function triggerSlideFeedback(): void {
  vibrate(10);
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    playTone(ctx, "sine", 320, 190, now, 0.07, 0.11);

    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * 0.055));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleCount * 0.35));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1900, now);
    filter.Q.setValueAtTime(1.1, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  } catch {
    // Ignore audio synthesis errors
  }
}
