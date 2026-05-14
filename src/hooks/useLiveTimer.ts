"use client";

import { useEffect, useState } from "react";

/**
 * Devuelve la hora actual actualizada cada segundo.
 * Úsalo para calcular tiempos de espera en vivo.
 */
export function useLiveNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}

/**
 * Formatea minutos y segundos de forma compacta.
 * < 60 min → "31m 42s"
 * ≥ 60 min → "1h 31m"
 */
export function fmtLiveWait(totalSeconds: number): string {
  if (totalSeconds < 0) return "0s";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/**
 * Calcula segundos de espera desde h_registro hasta ahora.
 */
export function getWaitSeconds(time: string | null | undefined, now: Date): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  const arrival = new Date(now);
  arrival.setHours(h, m, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - arrival.getTime()) / 1000));
}
