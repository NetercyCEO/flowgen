export type RenderBackend = "webgpu" | "webgl" | "none";
export type DeviceTier = "high" | "medium" | "low";

export interface GraphicsProfile {
  backend: RenderBackend;
  tier: DeviceTier;
  maxDpr: number;
  antialias: boolean;
}

interface NavigatorWithCapabilities extends Navigator {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
  };
}

let cachedProfilePromise: Promise<GraphicsProfile> | null = null;

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, ms);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        resolve(null);
      })
      .finally(() => {
        window.clearTimeout(timer);
      });
  });
}

function classifyDeviceTier(): DeviceTier {
  if (typeof window === "undefined") return "medium";

  const nav = navigator as NavigatorWithCapabilities;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  const saveData = nav.connection?.saveData === true;
  const isCoarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const isWide = window.innerWidth >= 768;

  if (
    saveData ||
    memory <= 2 ||
    (cores <= 4 && memory <= 4) ||
    (isCoarse && cores <= 4)
  ) {
    return "low";
  }

  if (!isCoarse && cores >= 6 && memory >= 8 && isWide) {
    return "high";
  }

  return "medium";
}

export function hasWebGL2(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof WebGL2RenderingContext !== "undefined"
  );
}

/**
 * Classifies the user's device strength and selects WebGPU (for capable stronger devices)
 * or WebGL2 (for weaker devices or browsers without hardware WebGPU), with zero Three.js import overhead.
 */
export function detectGraphicsProfile(): Promise<GraphicsProfile> {
  if (typeof window === "undefined") {
    return Promise.resolve({
      backend: "none",
      tier: "medium",
      maxDpr: 1.25,
      antialias: true,
    });
  }

  const forcedBackend = new URLSearchParams(window.location.search).get("backend");
  if (forcedBackend === "webgl") {
    const tier = classifyDeviceTier();
    const maxDpr = tier === "low" ? 1 : tier === "medium" ? 1.25 : 1.5;
    const antialias = tier !== "low";
    return Promise.resolve({
      backend: hasWebGL2() ? "webgl" : "none",
      tier,
      maxDpr,
      antialias,
    });
  }

  if (cachedProfilePromise) return cachedProfilePromise;

  cachedProfilePromise = (async (): Promise<GraphicsProfile> => {
    const tier = classifyDeviceTier();
    const maxDpr = tier === "low" ? 1 : tier === "medium" ? 1.25 : 1.5;
    const antialias = tier !== "low";

    if (tier !== "low" && "gpu" in navigator && navigator.gpu) {
      try {
        const adapter = await withTimeout(
          navigator.gpu.requestAdapter({
            powerPreference: "high-performance",
          }),
          500
        );
        const isFallback = (adapter as { isFallbackAdapter?: boolean } | null)
          ?.isFallbackAdapter;
        if (adapter && !isFallback) {
          return { backend: "webgpu", tier, maxDpr, antialias };
        }
      } catch {
        // Fall through cleanly to WebGL2
      }
    }

    if (hasWebGL2()) {
      return { backend: "webgl", tier, maxDpr, antialias };
    }

    return { backend: "none", tier, maxDpr, antialias };
  })();

  return cachedProfilePromise;
}
