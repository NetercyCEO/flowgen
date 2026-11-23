import { Color, WebGPURenderer } from "three/webgpu";

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

function hasWebGL2(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof WebGL2RenderingContext !== "undefined"
  );
}

/**
 * Classifies the user's device strength and selects WebGPU (for capable stronger devices)
 * or WebGL2 (for weaker devices or browsers without hardware WebGPU), with zero context-probe warnings.
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

  if (cachedProfilePromise) return cachedProfilePromise;

  cachedProfilePromise = (async (): Promise<GraphicsProfile> => {
    const tier = classifyDeviceTier();
    const maxDpr = tier === "low" ? 1 : tier === "medium" ? 1.25 : 1.5;
    const antialias = tier !== "low";

    if (tier !== "low" && "gpu" in navigator && navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter({
          powerPreference: "high-performance",
        });
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

/**
 * Initializes a Three.js WebGPURenderer using WebGPU when selected, automatically
 * falling back to WebGL2 on weaker devices or if WebGPU device creation fails.
 */
export async function createSmartRenderer(
  canvas: HTMLCanvasElement,
  profile: GraphicsProfile
): Promise<{ renderer: WebGPURenderer; backend: "webgpu" | "webgl" } | null> {
  if (profile.backend === "none") return null;

  const powerPreference: GPUPowerPreference | undefined =
    profile.tier === "high"
      ? "high-performance"
      : profile.tier === "low"
        ? "low-power"
        : undefined;
  const clearBlack = new Color(0x000000);

  if (profile.backend === "webgpu") {
    const webgpuRenderer = new WebGPURenderer({
      canvas,
      antialias: profile.antialias,
      alpha: true,
      powerPreference,
      forceWebGL: false,
    });
    webgpuRenderer.setClearColor(clearBlack, 0);

    try {
      await webgpuRenderer.init();
      return { renderer: webgpuRenderer, backend: "webgpu" };
    } catch {
      try {
        webgpuRenderer.dispose();
      } catch {
        // Ignore cleanup errors on failed init
      }
    }
  }

  if (!hasWebGL2()) return null;

  const webglRenderer = new WebGPURenderer({
    canvas,
    antialias: profile.antialias,
    alpha: true,
    powerPreference,
    forceWebGL: true,
  });
  webglRenderer.setClearColor(clearBlack, 0);

  try {
    await webglRenderer.init();
    return { renderer: webglRenderer, backend: "webgl" };
  } catch {
    try {
      webglRenderer.dispose();
    } catch {
      // Ignore cleanup errors on failed init
    }
    return null;
  }
}
