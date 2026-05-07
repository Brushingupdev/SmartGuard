import { getUserContext } from "@/utils/supabase/user";
import { toZonedTime, format } from "date-fns-tz";

export const TZ = "America/Lima";

/**
 * Obtiene la fecha y hora actual en la timezone de Lima (Perú).
 * Usa date-fns-tz para mayor robustez que toLocaleDateString.
 */
export function nowLima() {
  const now = new Date();
  const zonedDate = toZonedTime(now, TZ);

  const year = zonedDate.getFullYear();
  const month = zonedDate.getMonth() + 1;
  const day = zonedDate.getDate();
  const hour = zonedDate.getHours();
  const minute = zonedDate.getMinutes();
  const second = zonedDate.getSeconds();

  const date = format(zonedDate, "yyyy-MM-dd", { timeZone: TZ });
  const time = format(zonedDate, "HH:mm:ss", { timeZone: TZ });

  return { date, time, hour, minute, second, year, month, day };
}

/**
 * Calcula la fecha de hace N días en la timezone de Lima.
 */
export function daysAgoLima(days: number): string {
  const now = new Date();
  const past = new Date(now.getTime() - days * 86_400_000);
  const zonedDate = toZonedTime(past, TZ);
  return format(zonedDate, "yyyy-MM-dd", { timeZone: TZ });
}

export async function requireAdmin(): Promise<boolean> {
  const ctx = await getUserContext();
  return ctx?.isAdmin ?? false;
}

export async function checkWriteAccess(): Promise<string | null> {
  const ctx = await getUserContext();
  if (!ctx) return "No autenticado";
  if (ctx.isReadOnly) return "Modo solo lectura — no se permite escritura durante impersonación";
  return null;
}

// ─── Segmentación de demoras (shared, reemplaza lógica duplicada) ──────────────

export interface Segmento {
  label: string;
  orden: number;
  esDemora: number;
}

export function calcSegmento(esperaMin: number): Segmento {
  if (esperaMin >= 90) return { label: "🔴 > 90 min",  orden: 4, esDemora: 1 };
  if (esperaMin >= 45) return { label: "🟠 45-90 min", orden: 3, esDemora: 1 };
  if (esperaMin >= 30) return { label: "🟡 30-45 min", orden: 2, esDemora: 1 };
  return { label: "🟢 < 30 min", orden: 1, esDemora: 0 };
}

// ─── Logger estructurado con persistencia a error_logs ───────────────────────

export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
  console.error(`[${ts}] [${context}] ${code ? `[${code}] ` : ""}${message}`, extra ? JSON.stringify(extra) : "");

  // Persistencia inmediata: fire-and-forget, seguro en entornos serverless
  Promise.all([
    getUserContext(),
    import("@/utils/supabase/admin"),
  ]).then(([ctx, { createAdminClient }]) => {
    const admin = createAdminClient();
    void admin.from("error_logs").insert({
      context,
      message: code ? `[${code}] ${message}` : message,
      user_id: ctx?.userId ?? null,
      company_id: ctx?.companyId ?? null,
      extra: extra ?? {},
    });
  }).catch(() => {});
}

// ─── Date range helper compartido (dashboard + reporte) ─────────────────────

export function dateRange(timeframe: string): { from: string; to: string } {
  const { date: today } = nowLima();
  if (timeframe === "Día")    return { from: today, to: today };
  if (timeframe === "Semana") return { from: daysAgoLima(7), to: today };
  if (timeframe === "Mes")    return { from: daysAgoLima(30), to: today };
  if (/^\d{4}$/.test(timeframe)) return { from: `${timeframe}-01-01`, to: `${timeframe}-12-31` };
  return { from: today, to: today };
}

// ─── Retry helper para errores transitorios de Supabase ─────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  maxRetries = 2
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isTransient =
        (err as NodeJS.ErrnoException).code === "ECONNRESET" ||
        (err as NodeJS.ErrnoException).code === "ETIMEDOUT" ||
        (err as Record<string, unknown>)?.status === 503 ||
        (err as Record<string, unknown>)?.status === 429 ||
        (err as Error)?.message?.includes("timeout");
      if (!isTransient || attempt === maxRetries) {
        logError(context, err);
        throw err;
      }
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
    }
  }
  throw lastError;
}
