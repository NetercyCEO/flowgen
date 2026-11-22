/**
 * FlowGen design tokens — graphite base (#212121) + warm ember accent (#e56b2a).
 * Every DOM surface, 2D banner, and hero WebGL shader reads from here.
 */
export const THEME = {
  canvas: "#212121",
  canvasDeep: "#181818",
  surface: "#2a2a2a",
  surfaceRaised: "#303030",
  nav: "#1a1a1c",
  ink: "#ececec",
  inkMuted: "#a3a3a3",
  inkFaint: "#6e6e6e",
  aqua: "#e56b2a",
  aquaSoft: "#f7ad80",
  aquaDeep: "#963c12",
  gradFrom: "#ffd4b8",
  gradMid: "#e56b2a",
  gradTo: "#b84a16",
  bannerFill: "#2c1d16",
  orbShell: "#181615",
} as const;

export type ThemeTokens = typeof THEME;

/**
 * Converts a CSS hex string into 0..1 sRGB components for raw WebGL ShaderMaterials.
 */
export function hexToSrgbVec3(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const num = parseInt(full, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}
