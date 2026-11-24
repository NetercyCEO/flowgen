"use client";

/**
 * Procedural Web Audio tactile sound effects + cross-platform mobile haptics.
 * - Audio: Pure sine waves routed through a gentle 1500Hz low-pass filter with
 *   soft attack/release envelopes for a quiet, ElevenLabs-style velvety feel.
 * - Haptics: Uses `navigator.vibrate(...)` with ERM-friendly pulse durations on
 *   Android, and falls back to WebKit's native `<input type="checkbox" switch>`
 *   Taptic Engine trigger on iOS 17.4+ devices.
 */

let sharedAudioCtx: AudioContext | null = null;
let masterFilter: BiquadFilterNode | null = null;
let silentBuffer: AudioBuffer | null = null;
let keepAliveSource: ConstantSourceNode | null = null;
let keepAliveGain: GainNode | null = null;
let warmupInstalled = false;
let hasUnlockedOnce = false;
let iosHapticLabel: HTMLLabelElement | null = null;

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function triggerIOSHaptic(): void {
  if (typeof document === "undefined" || !document.body) return;
  try {
    if (!iosHapticLabel || !document.body.contains(iosHapticLabel)) {
      const wrap = document.createElement("span");
      wrap.setAttribute("aria-hidden", "true");
      wrap.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.001;pointer-events:none;overflow:hidden;";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = "fg-ios-haptic";
      input.tabIndex = -1;
      input.setAttribute("aria-hidden", "true");
      input.setAttribute("switch", "");
      input.addEventListener("click", (e) => e.stopPropagation());

      const label = document.createElement("label");
      label.htmlFor = "fg-ios-haptic";
      label.setAttribute("aria-hidden", "true");
      label.addEventListener("click", (e) => e.stopPropagation());

      wrap.appendChild(input);
      wrap.appendChild(label);
      document.body.appendChild(wrap);
      iosHapticLabel = label;
    }
    iosHapticLabel.click();
  } catch {
    // Ignore DOM/haptic errors in restricted environments
  }
}

function stopKeepAlive(): void {
  if (keepAliveSource) {
    try {
      keepAliveSource.stop();
    } catch {
      // Ignore already-stopped source
    }
    try {
      keepAliveSource.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    keepAliveSource = null;
  }
  if (keepAliveGain) {
    try {
      keepAliveGain.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    keepAliveGain = null;
  }
}

function startKeepAlive(ctx: AudioContext): void {
  if (typeof document !== "undefined" && document.hidden) return;
  if (ctx.state !== "running" || keepAliveSource) return;
  try {
    if (typeof ctx.createConstantSource !== "function") return;
    const src = ctx.createConstantSource();
    src.offset.value = 0;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    keepAliveSource = src;
    keepAliveGain = gain;
  } catch {
    stopKeepAlive();
  }
}

function primeHardware(ctx: AudioContext): void {
  try {
    if (!silentBuffer || silentBuffer.sampleRate !== ctx.sampleRate) {
      silentBuffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    }
    const src = ctx.createBufferSource();
    src.buffer = silentBuffer;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // Ignore hardware priming errors before unlock
  }
}

function ensureAudioGraph(): { ctx: AudioContext; out: AudioNode } | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (sharedAudioCtx && sharedAudioCtx.state === "closed") {
      stopKeepAlive();
      sharedAudioCtx = null;
      masterFilter = null;
      silentBuffer = null;
    }

    if (!sharedAudioCtx) {
      try {
        sharedAudioCtx = new AudioCtx({ latencyHint: "interactive" });
      } catch {
        sharedAudioCtx = new AudioCtx();
      }
      const filter = sharedAudioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1500, sharedAudioCtx.currentTime);
      filter.Q.setValueAtTime(0.7, sharedAudioCtx.currentTime);
      filter.connect(sharedAudioCtx.destination);
      masterFilter = filter;
      silentBuffer = sharedAudioCtx.createBuffer(1, 1, sharedAudioCtx.sampleRate);

      const boundCtx = sharedAudioCtx;
      boundCtx.onstatechange = () => {
        if (boundCtx !== sharedAudioCtx) return;
        if (boundCtx.state === "running") {
          hasUnlockedOnce = true;
          startKeepAlive(boundCtx);
        } else {
          stopKeepAlive();
        }
      };
    }

    return { ctx: sharedAudioCtx, out: masterFilter ?? sharedAudioCtx.destination };
  } catch {
    return null;
  }
}

function unlockAudio(): void {
  const graph = ensureAudioGraph();
  if (!graph) return;
  const { ctx } = graph;
  if (ctx.state !== "running") {
    ctx
      .resume()
      .then(() => {
        if (ctx.state === "running") {
          hasUnlockedOnce = true;
          primeHardware(ctx);
          startKeepAlive(ctx);
        }
      })
      .catch(() => {});
  }
  primeHardware(ctx);
  if (ctx.state === "running") {
    hasUnlockedOnce = true;
    startKeepAlive(ctx);
  }
}

/**
 * Pre-warms Web Audio and installs capture-phase gesture unlockers so first interaction
 * plays immediately without AudioContext resume or hardware spin-up delay.
 */
export function initAudioWarmup(): () => void {
  if (typeof window === "undefined" || warmupInstalled) return () => {};
  warmupInstalled = true;

  const graph = ensureAudioGraph();
  if (graph && graph.ctx.state === "running") {
    hasUnlockedOnce = true;
    primeHardware(graph.ctx);
    startKeepAlive(graph.ctx);
  }

  const onGesture = () => {
    unlockAudio();
  };

  const onVisibility = () => {
    if (typeof document === "undefined") return;
    if (document.hidden) {
      stopKeepAlive();
      if (sharedAudioCtx && sharedAudioCtx.state === "running") {
        sharedAudioCtx.suspend().catch(() => {});
      }
    } else if (hasUnlockedOnce) {
      unlockAudio();
    }
  };

  const gestureEvents = ["pointerdown", "touchstart", "mousedown", "keydown"] as const;
  gestureEvents.forEach((evt) => {
    window.addEventListener(evt, onGesture, { capture: true, passive: true });
  });
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    warmupInstalled = false;
    gestureEvents.forEach((evt) => {
      window.removeEventListener(evt, onGesture, { capture: true });
    });
    document.removeEventListener("visibilitychange", onVisibility);
    stopKeepAlive();
  };
}

function getAudioOutput(): { ctx: AudioContext; out: AudioNode } | null {
  const graph = ensureAudioGraph();
  if (!graph) return null;
  try {
    if (graph.ctx.state !== "running") {
      graph.ctx.resume().catch(() => {});
      primeHardware(graph.ctx);
    }
    return graph;
  } catch {
    return null;
  }
}

export function vibrate(pattern: number | number[]): void {
  const hasVibrate =
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  if (hasVibrate) {
    try {
      const ok = navigator.vibrate(pattern);
      if (ok) return;
    } catch {
      // Fall through to iOS fallback if applicable
    }
  }
  if (isIOSDevice()) {
    triggerIOSHaptic();
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
  const audio = getAudioOutput();
  if (audio) {
    try {
      const now = audio.ctx.currentTime;
      playSmoothSine(audio.ctx, audio.out, 280, 360, now, 0.09, 0.045, 0.015);
    } catch {
      // Ignore audio synthesis errors
    }
  }
  vibrate(18);
}

/** Silky muted water-drop detent for Work / Proof card navigation & swiping. */
export function triggerSlideFeedback(): void {
  const audio = getAudioOutput();
  if (audio) {
    try {
      const now = audio.ctx.currentTime;
      playSmoothSine(audio.ctx, audio.out, 240, 175, now, 0.1, 0.05, 0.016);
      playSmoothSine(audio.ctx, audio.out, 480, 480, now, 0.085, 0.018, 0.015);
    } catch {
      // Ignore audio synthesis errors
    }
  }
  vibrate(18);
}

/** Gentle two-note sine confirmation for Contact copy buttons. */
export function triggerCopyFeedback(): void {
  const audio = getAudioOutput();
  if (audio) {
    try {
      const now = audio.ctx.currentTime;
      playSmoothSine(audio.ctx, audio.out, 523.25, 523.25, now, 0.07, 0.045, 0.014);
      playSmoothSine(audio.ctx, audio.out, 659.25, 659.25, now + 0.06, 0.11, 0.05, 0.016);
    } catch {
      // Ignore audio synthesis errors
    }
  }
  vibrate([20, 28, 16]);
}

/** Warm mellow velvet shimmer for clicking the FlowGen wordmark. */
export function triggerLogoFeedback(): void {
  const audio = getAudioOutput();
  if (audio) {
    try {
      const now = audio.ctx.currentTime;
      playSmoothSine(audio.ctx, audio.out, 392, 392, now, 0.3, 0.048, 0.008);
      playSmoothSine(audio.ctx, audio.out, 587.33, 587.33, now + 0.018, 0.3, 0.038, 0.01);
    } catch {
      // Ignore audio synthesis errors
    }
  }
  vibrate(22);
}

/** Deep velvety obsidian sub-pulse + soft overtone for clicking the Hero 3D sphere. */
export function triggerOrbFeedback(): void {
  const audio = getAudioOutput();
  if (audio) {
    try {
      const now = audio.ctx.currentTime;
      playSmoothSine(audio.ctx, audio.out, 115, 72, now, 0.28, 0.075, 0.008);
      playSmoothSine(audio.ctx, audio.out, 345, 290, now, 0.22, 0.032, 0.01);
    } catch {
      // Ignore audio synthesis errors
    }
  }
  vibrate([24, 28, 18]);
}

/** Smooth muted forged bell strike for clicking the 3D Anvil / How It Works steps. */
export function triggerAnvilFeedback(): void {
  const audio = getAudioOutput();
  if (audio) {
    try {
      const now = audio.ctx.currentTime;
      playSmoothSine(audio.ctx, audio.out, 145, 62, now, 0.2, 0.07, 0.016);
      playSmoothSine(audio.ctx, audio.out, 520, 520, now, 0.26, 0.038, 0.016);
      playSmoothSine(audio.ctx, audio.out, 780, 780, now, 0.26, 0.022, 0.018);
    } catch {
      // Ignore audio synthesis errors
    }
  }
  vibrate([30, 34, 22]);
}
