"use client";

import { PWAThemeProvider } from "@/contexts/PWAThemeContext";
import { useEffect } from "react";

export default function PWALayout({ children }: { children: React.ReactNode }) {
  // Aplicar tema guardado antes del primer render
  useEffect(() => {
    const stored = localStorage.getItem("sg-pwa-theme") ?? "dark";
    document.documentElement.setAttribute("data-pwa-theme", stored);
  }, []);

  return (
    <PWAThemeProvider>
      <div
        className="min-h-screen min-h-[100dvh] flex flex-col"
        style={{ background: "var(--pwa-bg)", color: "var(--pwa-ink)" }}
      >
        {children}
      </div>
    </PWAThemeProvider>
  );
}
