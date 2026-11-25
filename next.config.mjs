import path from "path";

/** @type {(phase: string) => import('next').NextConfig} */
export default function nextConfig(phase) {
  return {
    // Keep dev artifacts separate from production `.next` so `next build` never wipes live dev chunks
    distDir: phase === "phase-development-server" ? ".next-dev" : ".next",
    transpilePackages: ["three"],
    async headers() {
      if (process.env.VERCEL !== "1") return [];
      return [
        {
          source: "/:path*",
          headers: [
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
            {
              key: "Content-Security-Policy",
              value: "upgrade-insecure-requests",
            },
          ],
        },
      ];
    },
    webpack(config) {
      // Unify `three` onto the WebGPU/TSL build so jsm loaders (e.g. GLTFLoader)
      // and `three/webgpu` / `three/tsl` share a single Three.js instance and bundle.
      config.resolve.alias = {
        ...config.resolve.alias,
        three$: path.resolve(process.cwd(), "node_modules/three/build/three.webgpu.js"),
      };
      return config;
    },
  };
}
