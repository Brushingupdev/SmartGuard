"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[SW] Registrado:", reg.scope);
        })
        .catch((err) => {
          console.warn("[SW] Error al registrar:", err);
        });
    }
  }, []);

  return null;
}
