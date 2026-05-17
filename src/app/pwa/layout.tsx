"use client";

import { PWAThemeProvider } from "@/contexts/PWAThemeContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { useEffect } from "react";

export default function PWALayout({ children }: { children: React.ReactNode }) {
  // Aplicar tema guardado antes del primer render
  useEffect(() => {
    const stored = localStorage.getItem("sg-pwa-theme") ?? "dark";
    document.documentElement.setAttribute("data-pwa-theme", stored);
    document.body.classList.add("pwa-mode");
    return () => {
      document.body.classList.remove("pwa-mode");
    };
  }, []);

  return (
    <PWAThemeProvider>
      <div
        className="min-h-screen min-h-[100dvh] flex flex-col"
        style={{ background: "var(--pwa-bg)", color: "var(--pwa-ink)" }}
      >
        <ServiceWorkerRegister />
        <PWAInstallPrompt />
        {children}
      </div>
    </PWAThemeProvider>
  );
}
