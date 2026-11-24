/**
 * Singleton preloader for Proof section site preview videos so all 4 animations
 * load into memory during PageLoader and start instantaneously together when
 * the visitor enters the Proof section.
 */

export const PROOF_VIDEO_URLS = [
  "/previews/gadget-centre.mp4",
  "/previews/wijsdom-podcast.mp4",
  "/previews/captain-autohandel.mp4",
  "/previews/cardboard-webshop.mp4",
] as const;

let preloadPromise: Promise<Record<string, string>> | null = null;
let cachedObjectUrls: Record<string, string> | null = null;

/**
 * Fetches all Proof preview MP4s in parallel and caches blob object URLs
 * for the lifetime of the SPA (never revoked on unmount so StrictMode
 * remounts reuse them cleanly).
 */
export function preloadProofVideos(): Promise<Record<string, string>> {
  if (cachedObjectUrls) {
    return Promise.resolve(cachedObjectUrls);
  }
  if (preloadPromise) {
    return preloadPromise;
  }
  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return Promise.resolve({});
  }

  preloadPromise = Promise.all(
    PROOF_VIDEO_URLS.map(async (url): Promise<[string, string]> => {
      try {
        const res = await fetch(url, { cache: "force-cache" });
        if (!res.ok) return [url, url];
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        return [url, objectUrl];
      } catch {
        return [url, url];
      }
    })
  ).then((entries) => {
    const map: Record<string, string> = {};
    for (const [url, resolved] of entries) {
      map[url] = resolved;
    }
    cachedObjectUrls = map;
    return map;
  });

  return preloadPromise;
}

/**
 * Returns the cached Proof video URL map if preloading has finished, or null.
 */
export function getCachedProofVideoUrls(): Record<string, string> | null {
  return cachedObjectUrls;
}
