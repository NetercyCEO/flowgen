/** @type {(phase: string) => import('next').NextConfig} */
export default function nextConfig(phase) {
  return {
    // Keep dev artifacts separate from production `.next` so `next build` never wipes live dev chunks
    distDir: phase === "phase-development-server" ? ".next-dev" : ".next",
    transpilePackages: ["three"],
  };
}
