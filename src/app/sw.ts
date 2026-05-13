import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, NetworkFirst } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Cache-first para assets estáticos (imágenes, fuentes)
    {
      matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [],
      }),
    },
    // Network-first para todo lo demás — siempre datos frescos
    {
      matcher: /^https:\/\//,
      handler: new NetworkFirst({
        cacheName: "pages-cache",
        networkTimeoutSeconds: 10,
        plugins: [],
      }),
    },
  ],
});

serwist.addEventListeners();
