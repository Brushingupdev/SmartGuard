"use client";

import { useEffect, useState } from "react";

/**
 * Detecta si la app se está ejecutando como PWA instalada (standalone mode).
 * Funciona en Android (Chrome) y iOS (Safari).
 */
export function usePWA(): boolean {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsPWA(standalone);
  }, []);

  return isPWA;
}
