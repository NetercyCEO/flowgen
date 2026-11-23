import { Color, WebGPURenderer } from "three/webgpu";
import {
  detectGraphicsProfile,
  hasWebGL2,
  withTimeout,
  type DeviceTier,
  type GraphicsProfile,
  type RenderBackend,
} from "./gpuProfile";

export { detectGraphicsProfile, type DeviceTier, type GraphicsProfile, type RenderBackend };

/**
 * Initializes a Three.js WebGPURenderer using WebGPU when selected, automatically
 * falling back to WebGL2 on weaker devices or if WebGPU device creation fails.
 */
export async function createSmartRenderer(
  canvas: HTMLCanvasElement,
  profile: GraphicsProfile
): Promise<{ renderer: WebGPURenderer; backend: "webgpu" | "webgl" } | null> {
  if (profile.backend === "none") return null;

  const clearBlack = new Color(0x000000);

  if (profile.backend === "webgpu") {
    const webgpuRenderer = new WebGPURenderer({
      canvas,
      antialias: profile.antialias,
      alpha: true,
      forceWebGL: false,
    });
    webgpuRenderer.setClearColor(clearBlack, 0);

    try {
      const initialized = await withTimeout(
        webgpuRenderer.init().then(() => true as const),
        1500
      );
      if (initialized) {
        return { renderer: webgpuRenderer, backend: "webgpu" };
      }
      try {
        webgpuRenderer.dispose();
      } catch {
        // Ignore cleanup errors on timed-out init
      }
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
