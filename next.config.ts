import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // framer-motion v12 separa motion-dom como paquete ESM independiente,
  // lo que rompe el chunking de Turbopack en SSR. transpilePackages lo resuelve.
  transpilePackages: ["framer-motion", "motion-dom"],
  experimental: {
    workerThreads: true,
    webpackBuildWorker: false,
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
