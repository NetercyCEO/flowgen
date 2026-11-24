"use client";

/**
 * Procedural Web Audio tactile sound effects + mobile haptic feedback.
 * All tones pass through a gentle 1500Hz low-pass filter using pure sine waves
 * with soft attack/release envelopes for a quiet, ElevenLabs-style velvety feel.
 */

let sharedAudioCtx: AudioContext | null = null;
let masterFilter: BiquadFilterNode | null = null;

function getAudioOutput(): { ctx: AudioContext; out: AudioNode } | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
      const filter = sharedAudioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1500, sharedAudioCtx.currentTime);
      filter.Q.setValueAtTime(0.7, sharedAudioCtx.currentTime);
      filter.connect(sharedAudioCtx.destination);
      masterFilter = filter;
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return { ctx: sharedAudioCtx, out: masterFilter ?? sharedAudioCtx.destination };
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

function playSmoothSine(
  ctx: AudioContext,
  out: AudioNode,
  startFreq: number,
  endFreq: number,
  startTime: number,
  duration: number,
  peakGain: number,
  attackSec = 0.016
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(Math.max(20, startFreq), startTime);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
  }
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(Math.max(0.0002, peakGain), startTime + attackSec);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(out);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** Velvety muted glass/marimba pop for desktop and mobile navigation clicks. */
export function triggerNavFeedback(): void {
  vibrate(8);
  const audio = getAudioOutput();
  if (!audio) return;
  try {
    const now = audio.ctx.currentTime;
    playSmoothSine(audio.ctx, audio.out, 280, 360, now, 0.09, 0.045, 0.015);
  } catch {
    // Ignore audio synthesis errors
  }
}

/** Silky muted water-drop detent for Work / Proof card navigation & swiping. */
export function triggerSlideFeedback(): void {
  vibrate(8);
  const audio = getAudioOutput();
  if (!audio) return;
  try {
    const now = audio.ctx.currentTime;
    playSmoothSine(audio.ctx, audio.out, 240, 175, now, 0.1, 0.05, 0.016);
    playSmoothSine(audio.ctx, audio.out, 480, 480, now, 0.085, 0.018, 0.015);
  } catch {
    // Ignore audio synthesis errors
  }
}

/** Gentle two-note sine confirmation for Contact copy buttons. */
export function triggerCopyFeedback(): void {
  vibrate([10, 20, 10]);
  const audio = getAudioOutput();
  if (!audio) return;
  try {
    const now = audio.ctx.currentTime;
    playSmoothSine(audio.ctx, audio.out, 523.25, 523.25, now, 0.07, 0.045, 0.014);
    playSmoothSine(audio.ctx, audio.out, 659.25, 659.25, now + 0.06, 0.11, 0.05, 0.016);
  } catch {
    // Ignore audio synthesis errors
  }
}

/** Warm mellow velvet shimmer for clicking the FlowGen wordmark. */
export function triggerLogoFeedback(): void {
  vibrate(10);
  const audio = getAudioOutput();
  if (!audio) return;
  try {
    const now = audio.ctx.currentTime;
    playSmoothSine(audio.ctx, audio.out, 392, 392, now, 0.3, 0.048, 0.02);
    playSmoothSine(audio.ctx, audio.out, 587.33, 587.33, now + 0.025, 0.3, 0.038, 0.022);
  } catch {
    // Ignore audio synthesis errors
  }
}

/** Deep velvety obsidian sub-pulse + soft overtone for clicking the Hero 3D sphere. */
export function triggerOrbFeedback(): void {
  vibrate([14, 18, 8]);
  const audio = getAudioOutput();
  if (!audio) return;
  try {
    const now = audio.ctx.currentTime;
    playSmoothSine(audio.ctx, audio.out, 115, 72, now, 0.28, 0.075, 0.018);
    playSmoothSine(audio.ctx, audio.out, 345, 290, now, 0.22, 0.032, 0.02);
  } catch {
    // Ignore audio synthesis errors
  }
}

/** Smooth muted forged bell strike for clicking the 3D Anvil / How It Works steps. */
export function triggerAnvilFeedback(): void {
  vibrate([18, 24, 10]);
  const audio = getAudioOutput();
  if (!audio) return;
  try {
    const now = audio.ctx.currentTime;
    playSmoothSine(audio.ctx, audio.out, 145, 62, now, 0.2, 0.07, 0.016);
    playSmoothSine(audio.ctx, audio.out, 520, 520, now, 0.26, 0.038, 0.016);
    playSmoothSine(audio.ctx, audio.out, 780, 780, now, 0.26, 0.022, 0.018);
  } catch {
    // Ignore audio synthesis errors
  }
}
