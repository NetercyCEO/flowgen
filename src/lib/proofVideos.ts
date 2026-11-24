/**
 * Singleton preloader for Proof section 24fps Animated WebP previews so all 4
 * load cleanly during PageLoader, start together on Proof entry, and append a
 * zero-copy RIFF JUNK chunk via Blob.slice() for instant Frame-0 hover restart.
 */

export const PROOF_GIF_URLS = [
  "/previews/gadget-centre.webp",
  "/previews/wijsdom-podcast.webp",
  "/previews/captain-autohandel.webp",
  "/previews/cardboard-webshop.webp",
] as const;

interface CachedWebpEntry {
  blob: Blob;
  riffSize: number | null;
}

let preloadPromise: Promise<Record<string, CachedWebpEntry>> | null = null;
let cachedEntries: Record<string, CachedWebpEntry> | null = null;
let instanceCounter = 0;

function extractRiffSize(headerBytes: ArrayBuffer): number | null {
  if (headerBytes.byteLength < 12) return null;
  const view = new DataView(headerBytes);
  const riff =
    view.getUint8(0) === 0x52 && // R
    view.getUint8(1) === 0x49 && // I
    view.getUint8(2) === 0x46 && // F
    view.getUint8(3) === 0x46; // F
  const webp =
    view.getUint8(8) === 0x57 && // W
    view.getUint8(9) === 0x45 && // E
    view.getUint8(10) === 0x42 && // B
    view.getUint8(11) === 0x50; // P
  if (!riff || !webp) return null;
  return view.getUint32(4, true);
}

/**
 * Fetches all Proof preview Animated WebPs in parallel and caches Blobs + RIFF sizes
 * for zero-copy per-restart Blob slicing across the lifetime of the SPA.
 */
export function preloadProofGifs(): Promise<Record<string, CachedWebpEntry>> {
  if (cachedEntries) {
    return Promise.resolve(cachedEntries);
  }
  if (preloadPromise) {
    return preloadPromise;
  }
  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return Promise.resolve({});
  }

  preloadPromise = Promise.all(
    PROOF_GIF_URLS.map(async (url): Promise<[string, CachedWebpEntry | null]> => {
      try {
        const res = await fetch(url, { cache: "force-cache" });
        if (!res.ok) return [url, null];
        const blob = await res.blob();
        const headerBytes = await blob.slice(0, 12).arrayBuffer();
        const riffSize = extractRiffSize(headerBytes);
        return [url, { blob, riffSize }];
      } catch {
        return [url, null];
      }
    })
  ).then((entries) => {
    const map: Record<string, CachedWebpEntry> = {};
    for (const [url, entry] of entries) {
      if (entry) {
        map[url] = entry;
      }
    }
    cachedEntries = map;
    return map;
  });

  return preloadPromise;
}

/**
 * Mints a unique byte-distinct Animated WebP Blob URL via zero-copy Blob.slice + RIFF JUNK
 * chunk so browsers always restart cleanly at Frame 0 without copying megabytes in JS.
 */
export function createFreshProofGifUrl(url: string): string {
  const entry = cachedEntries?.[url];
  if (entry && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    if (entry.riffSize !== null) {
      instanceCounter += 1;
      const tag = `fg${String(instanceCounter % 1_000_000).padStart(6, "0")}`;

      const header = new Uint8Array(8);
      header[0] = 0x52; // R
      header[1] = 0x49; // I
      header[2] = 0x46; // F
      header[3] = 0x46; // F
      new DataView(header.buffer).setUint32(4, entry.riffSize + 16, true);

      const junk = new Uint8Array(16);
      junk[0] = 0x4a; // J
      junk[1] = 0x55; // U
      junk[2] = 0x4e; // N
      junk[3] = 0x4b; // K
      new DataView(junk.buffer).setUint32(4, 8, true);
      for (let i = 0; i < 8; i++) {
        junk[8 + i] = tag.charCodeAt(i);
      }

      const blob = new Blob([header.buffer, entry.blob.slice(8), junk.buffer], {
        type: "image/webp",
      });
      return URL.createObjectURL(blob);
    }
    return URL.createObjectURL(entry.blob);
  }
  return `${url}?r=${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Returns true once the Proof preview Animated WebPs have finished preloading.
 */
export function hasCachedProofGifs(): boolean {
  return cachedEntries !== null;
}
