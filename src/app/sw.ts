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

// ── Push notifications ────────────────────────────────────────────────────────
// Usamos cast a any porque el archivo re-declara self con tipo customizado de Serwist,
// lo que interfiere con los tipos de ServiceWorkerGlobalScope del DOM lib.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sw = self as any;

sw.addEventListener("push", (event: { data: { json: () => unknown } | null; waitUntil: (p: Promise<unknown>) => void }) => {
  let data: { title?: string; body?: string; tag?: string; url?: string; icon?: string } = {};
  try { data = (event.data?.json() as typeof data) ?? {}; } catch { /* silent */ }

  const title   = data.title ?? "SmartGuard";
  const options = {
    body:  data.body  ?? "Nuevo vehículo en portería",
    tag:   data.tag   ?? "sg-vehicle",
    icon:  data.icon  ?? "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    data:  { url: data.url ?? "/pwa/home" },
  };

  event.waitUntil(sw.registration.showNotification(title, options) as Promise<unknown>);
});

sw.addEventListener("notificationclick", (event: {
  notification: { close: () => void; data: { url?: string } };
  waitUntil: (p: Promise<unknown>) => void;
}) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? "/pwa/home";

  event.waitUntil(
    (sw.clients.matchAll({ type: "window", includeUncontrolled: true }) as Promise<{ url: string; focus: () => Promise<unknown> }[]>)
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(url)) return client.focus();
        }
        return sw.clients.openWindow(url) as Promise<unknown>;
      })
  );
});
