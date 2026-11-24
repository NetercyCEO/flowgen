import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: { DEFAULT: "#212121", deep: "#181818" },
        surface: { DEFAULT: "#2a2a2a", raised: "#303030" },
        ink: { DEFAULT: "#ececec", muted: "#a3a3a3", faint: "#6e6e6e" },
        aqua: { DEFAULT: "#d95816", soft: "#ea7428", deep: "#8c340b" },
        line: "#ffffff",
        nav: "#1a1a1c",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          "system-ui",
          "sans-serif",
        ],
        serif: ['"Instrument Serif"', "Georgia", "serif"],
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
