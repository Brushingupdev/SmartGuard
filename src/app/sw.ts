import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

function isCacheableAsset(request: Request, url: URL, sameOrigin: boolean): boolean {
  if (!sameOrigin || request.method !== "GET") return false;

  if (url.pathname.startsWith("/api/")) return false;

  return (
    request.destination === "image" ||
    request.destination === "font" ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i.test(url.pathname)
  );
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    navigateFallback: "/pwa/offline",
    navigateFallbackAllowlist: [/^\/pwa(?:\/.*)?$/],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Cachear solo assets no sensibles del mismo origen.
    // Evitamos HTML, RSC y APIs para no mezclar contenido autenticado entre sesiones.
    {
      matcher: ({ request, url, sameOrigin }) =>
        isCacheableAsset(request, url, sameOrigin),
      handler: new CacheFirst({
        cacheName: "static-assets",
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
    icon:  data.icon  ?? "/icon-192.png",
    badge: "/apple-touch-icon.png",
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
