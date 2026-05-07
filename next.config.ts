import type { NextConfig } from "next";

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
    // @opentelemetry/instrumentation usa require() dinámico para detección de plataforma.
    // Es ruido del bundler — funciona bien en runtime. Sentry+Prisma lo arrastran indirectamente.
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

export default nextConfig;
