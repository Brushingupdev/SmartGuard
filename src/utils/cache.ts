import { unstable_cache } from "next/cache";

/**
 * Cache wrapper para Server Actions del dashboard.
 *
 * Estrategia:
 * - Datos que cambian cada minuto: TTL 60s (dashboard stats, flow, events)
 * - Datos que cambian poco: TTL 300s (plantas disponibles, años, personal activo)
 * - Datos estáticos: TTL 3600s (configuración de empresa)
 *
 * Tags para invalidación manual:
 * - "dashboard" → invalidar cuando se crea/modifica/cierra una atención
 * - "company" → invalidar cuando se modifica la configuración de empresa
 * - "users" → invalidar cuando se modifica un usuario
 */

// TTL constants (seconds)
export const TTL_REALTIME = 60; // dashboard, flow, events
export const TTL_DYNAMIC = 300; // plants, years, personnel
export const TTL_STATIC = 3600; // company config

/**
 * Crea una función cacheada con TTL y tags.
 *
 * @example
 * const getCachedDashboardKpis = cachedFunction(
 *   async (companyId: string, from: string, to: string, plant: string) => {
 *     // ... fetch from Supabase
 *   },
 *   { ttl: TTL_REALTIME, tags: ["dashboard"] }
 * );
 */
export function cachedFunction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: {
    keyPrefix: string;
    ttl: number;
    tags: string[];
  }
) {
  return unstable_cache(
    async (...args: TArgs) => fn(...args),
    [options.keyPrefix],
    {
      revalidate: options.ttl,
      tags: options.tags,
    }
  );
}

/**
 * Helper para crear un cache key determinístico.
 */
export function cacheKey(...parts: (string | number | undefined | null)[]): string {
  return parts
    .map((p) => (p == null ? "null" : String(p)))
    .join(":");
}
