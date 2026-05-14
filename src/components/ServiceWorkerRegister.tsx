"use client";

import { useEffect } from "react";

const SW_URL = "/sw.js";
const PWA_SCOPE = "/pwa/";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    void (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const legacyRegistration = registrations.find(
          (registration) =>
            registration.active?.scriptURL.endsWith(SW_URL) &&
            new URL(registration.scope).pathname === "/",
        );

        if (legacyRegistration) {
          await legacyRegistration.unregister();
          console.log("[SW] Registro legado eliminado:", legacyRegistration.scope);
        }

        const reg = await navigator.serviceWorker.register(SW_URL, { scope: PWA_SCOPE });
        console.log("[SW] Registrado:", reg.scope);
      } catch (err) {
        console.warn("[SW] Error al registrar:", err);
      }
    })();
  }, []);

  return null;
}
