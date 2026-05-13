import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  // framer-motion v12 separa motion-dom como paquete ESM independiente,
  // lo que rompe el chunking de Turbopack en SSR. transpilePackages lo resuelve.
  transpilePackages: ["framer-motion", "motion-dom"],
  experimental: {
    workerThreads: true,
    // Mantener webpack: Turbopack aún no soporta todos los loaders usados en este proyecto.
    webpackBuildWorker: false,
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack(config) {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /@opentelemetry\/instrumentation/,
        message: /Critical dependency/,
      },
    ];
    return config;
  },
};

export default withSerwist(nextConfig);
