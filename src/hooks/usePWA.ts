"use client";

import { useState } from "react";

function detectStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Detecta si la app se está ejecutando como PWA instalada (standalone mode).
 * Funciona en Android (Chrome) y iOS (Safari).
 */
export function usePWA(): boolean {
  return useState(detectStandaloneMode)[0];
}
