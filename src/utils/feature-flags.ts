import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";

/**
 * Feature Flags utility.
 *
 * Lee flags desde la tabla feature_flags en Supabase.
 * Soporta flags globales (company_id = null) y por empresa.
 * Los flags por empresa tienen prioridad sobre los globales.
 */

// Cache simple en memoria (resetea en cada request/serverless cold start)
const flagCache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minuto

/**
 * Verifica si un feature flag está habilitado.
 *
 * @param key - La clave del flag (ej: "whatsapp_alerts")
 * @returns true si el flag está habilitado, false por defecto
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const ctx = await getUserContext();
  const cacheKey = ctx?.companyId ? `${key}:${ctx.companyId}` : `${key}:global`;

  // Check cache
  const cached = flagCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const supabase = await createClient();

    // Buscar flag específico de la empresa primero
    let value = false;

    if (ctx?.companyId) {
      const { data: companyFlag } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("key", key)
        .eq("company_id", ctx.companyId)
        .maybeSingle();

      if (companyFlag) {
        value = companyFlag.enabled;
      }
    }

    // Si no hay flag específico de empresa, buscar global
    if (!value) {
      const { data: globalFlag } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("key", key)
        .is("company_id", null)
        .maybeSingle();

      value = globalFlag?.enabled ?? false;
    }

    // Cache the result
    flagCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });

    return value;
  } catch {
    return false; // Fail closed
  }
}

/**
 * Obtiene todos los feature flags habilitados para la empresa actual.
 * Útil para pasar al cliente en una sola llamada.
 */
export async function getEnabledFlags(): Promise<Record<string, boolean>> {
  const ctx = await getUserContext();

  try {
    const supabase = await createClient();

    let query = supabase.from("feature_flags").select("key, enabled");

    if (ctx?.companyId) {
      // Traer flags globales + de la empresa
      query = query.or(`company_id.is.null,company_id.eq.${ctx.companyId}`);
    } else {
      query = query.is("company_id", null);
    }

    const { data } = await query;
    if (!data) return {};

    // Deduplicar: flags de empresa tienen prioridad
    const flags: Record<string, boolean> = {};
    for (const row of data) {
      const existing = flags[row.key];
      // Si ya existe y es true (global), no sobreescribir con false (empresa)
      if (existing === undefined || row.enabled) {
        flags[row.key] = row.enabled;
      }
    }

    return flags;
  } catch {
    return {};
  }
}
