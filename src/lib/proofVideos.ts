/**
 * Singleton preloader for Proof section site preview GIFs so all 4 animations
 * load into memory as Blobs during PageLoader, start instantaneously together
 * on section entry, and can mint fresh blob: URLs to restart from Frame 0 on hover.
 */

export const PROOF_GIF_URLS = [
  "/previews/gadget-centre.gif",
  "/previews/wijsdom-podcast.gif",
  "/previews/captain-autohandel.gif",
  "/previews/cardboard-webshop.gif",
] as const;

let preloadPromise: Promise<Record<string, Blob>> | null = null;
let cachedBlobs: Record<string, Blob> | null = null;

/**
 * Fetches all Proof preview GIFs in parallel and caches their in-memory Blobs
 * for the lifetime of the SPA.
 */
export function preloadProofGifs(): Promise<Record<string, Blob>> {
  if (cachedBlobs) {
    return Promise.resolve(cachedBlobs);
  }
  if (preloadPromise) {
    return preloadPromise;
  }
  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return Promise.resolve({});
  }

  preloadPromise = Promise.all(
    PROOF_GIF_URLS.map(async (url): Promise<[string, Blob | null]> => {
      try {
        const res = await fetch(url, { cache: "force-cache" });
        if (!res.ok) return [url, null];
        const blob = await res.blob();
        return [url, blob];
      } catch {
        return [url, null];
      }
    })
  ).then((entries) => {
    const map: Record<string, Blob> = {};
    for (const [url, blob] of entries) {
      if (blob) {
        map[url] = blob;
      }
    }
    cachedBlobs = map;
    return map;
  });

  return preloadPromise;
}

/**
 * Mints a fresh unique blob: URL from the preloaded Blob (zero network cost)
 * so the browser restarts the animated GIF from Frame 0, with cache-busted fallback.
 */
export function createFreshProofGifUrl(url: string): string {
  const blob = cachedBlobs?.[url];
  if (blob && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    return URL.createObjectURL(blob);
  }
  return `${url}?r=${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Returns true once the Proof preview GIF Blobs have finished preloading.
 */
export function hasCachedProofGifs(): boolean {
  return cachedBlobs !== null;
}
