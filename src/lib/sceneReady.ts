/**
 * Lightweight readiness signals so PageLoader waits until the Hero 3D canvas
 * has actually compiled and painted Frame 1 (and AnvilForge3D can yield GPU
 * priority to Hero during startup before pre-warming offscreen).
 */

function createReadySignal() {
  let resolved = false;
  let resolveFn: (() => void) | null = null;
  const promise = new Promise<void>((resolve) => {
    resolveFn = resolve;
  });

  const mark = () => {
    if (resolved) return;
    resolved = true;
    resolveFn?.();
  };

  const wait = (timeoutMs?: number): Promise<void> => {
    if (resolved) return Promise.resolve();
    if (timeoutMs === undefined) return promise;

    return new Promise<void>((resolve) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve();
      }, timeoutMs);

      promise.then(() => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve();
      });
    });
  };

  return { mark, wait };
}

const heroSignal = createReadySignal();
const anvilSignal = createReadySignal();
const loaderRevealSignal = createReadySignal();
const proofVideosSignal = createReadySignal();

export const markHeroReady = heroSignal.mark;
export const waitForHeroReady = heroSignal.wait;

export const markAnvilReady = anvilSignal.mark;
export const waitForAnvilReady = anvilSignal.wait;

export const markLoaderReveal = loaderRevealSignal.mark;
export const waitForLoaderReveal = loaderRevealSignal.wait;

export const markProofVideosReady = proofVideosSignal.mark;
export const waitForProofVideosReady = proofVideosSignal.wait;
