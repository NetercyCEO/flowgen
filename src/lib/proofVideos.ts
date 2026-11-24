/**
 * Singleton preloader for Proof section site preview GIFs so all 4 animations
 * load into memory as raw GIF89a bytes during PageLoader, start instantaneously
 * together on section entry, and append a unique RFC GIF comment extension per
 * minted Blob URL to force deterministic Frame-0 restart on hover.
 */

export const PROOF_GIF_URLS = [
  "/previews/gadget-centre.gif",
  "/previews/wijsdom-podcast.gif",
  "/previews/captain-autohandel.gif",
  "/previews/cardboard-webshop.gif",
] as const;

let preloadPromise: Promise<Record<string, Uint8Array>> | null = null;
let cachedBytes: Record<string, Uint8Array> | null = null;
let instanceCounter = 0;

/**
 * Fetches all Proof preview GIFs in parallel and caches their raw byte arrays
 * for the lifetime of the SPA.
 */
export function preloadProofGifs(): Promise<Record<string, Uint8Array>> {
  if (cachedBytes) {
    return Promise.resolve(cachedBytes);
  }
  if (preloadPromise) {
    return preloadPromise;
  }
  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return Promise.resolve({});
  }

  preloadPromise = Promise.all(
    PROOF_GIF_URLS.map(async (url): Promise<[string, Uint8Array | null]> => {
      try {
        const res = await fetch(url, { cache: "force-cache" });
        if (!res.ok) return [url, null];
        const buf = await res.arrayBuffer();
        return [url, new Uint8Array(buf)];
      } catch {
        return [url, null];
      }
    })
  ).then((entries) => {
    const map: Record<string, Uint8Array> = {};
    for (const [url, bytes] of entries) {
      if (bytes) {
        map[url] = bytes;
      }
    }
    cachedBytes = map;
    return map;
  });

  return preloadPromise;
}

/**
 * Mints a unique byte-distinct GIF89a Blob URL from cached bytes so browsers
 * cannot share a cached animation timeline and always restart cleanly at Frame 0.
 */
export function createFreshProofGifUrl(url: string): string {
  const bytes = cachedBytes?.[url];
  if (bytes && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    instanceCounter += 1;
    const tag = `fg-${instanceCounter}`;
    const hasTrailer = bytes.length > 0 && bytes[bytes.length - 1] === 0x3b;
    const prefix = hasTrailer ? bytes.subarray(0, bytes.length - 1) : bytes;

    const comment = new Uint8Array(4 + tag.length);
    comment[0] = 0x21; // GIF Extension Introducer
    comment[1] = 0xfe; // Comment Label
    comment[2] = tag.length;
    for (let i = 0; i < tag.length; i++) {
      comment[3 + i] = tag.charCodeAt(i);
    }
    comment[3 + tag.length] = 0x00; // Block Terminator

    const trailer = new Uint8Array([0x3b]);
    const parts: BlobPart[] = [
      prefix.slice().buffer,
      comment.buffer,
      trailer.buffer,
    ];
    const blob = new Blob(parts, { type: "image/gif" });
    return URL.createObjectURL(blob);
  }
  return `${url}?r=${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Returns true once the Proof preview GIF bytes have finished preloading.
 */
export function hasCachedProofGifs(): boolean {
  return cachedBytes !== null;
}
