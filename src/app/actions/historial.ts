"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { nowLima, logError } from "./_helpers";
import type { ActivePersonnelRow, HistorialStats } from "@/types/dashboard";

function guardAgentAliases(ctx: Awaited<ReturnType<typeof getUserContext>>): string[] {
  if (!ctx || ctx.role !== "guardia") return [];
  return [...new Set([ctx.displayName, ctx.email].map((value) => value?.trim()).filter(Boolean) as string[])];
}

export async function getActivePersonnel(): Promise<ActivePersonnelRow[]> {
  try {
    const ctx = await getUserContext();
    const { date: today } = nowLima();
    if (!ctx?.companyId && !ctx?.isAdmin) return [];
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_active_personnel", {
      p_company_id: ctx.isAdmin ? (ctx.companyId ?? null) : ctx.companyId,
      p_fecha: today,
    });
    const rows = (data ?? []) as ActivePersonnelRow[];
    const aliases = guardAgentAliases(ctx);
    if (aliases.length === 0) return rows;
    return rows.filter((row) => aliases.includes(String(row.name ?? "").trim()));
  } catch (err) {
    logError("getActivePersonnel", err);
    return [];
  }
}

export async function getHistorialStats(): Promise<HistorialStats> {
  const ctx = await getUserContext();
  if (!ctx?.companyId && !ctx?.isAdmin) return { total: 0, avg: 0, max: 0, plants: 0 };
  return getHistorialStatsUncached();
}

export async function getHistorialStatsUncached(): Promise<HistorialStats> {
  const ctx = await getUserContext();

  if (!ctx?.companyId && !ctx?.isAdmin) return { total: 0, avg: 0, max: 0, plants: 0 };

  if (ctx?.isAdmin && !ctx.companyId) {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("atenciones")
      .select("espera_min, demora_cita_min, planta")
      .not("company_id", "is", null)
      .limit(5000);
    if (error || !data) return { total: 0, avg: 0, max: 0, plants: 0 };
    const withTime = data
      .map((d) => ({ metric: d.demora_cita_min ?? d.espera_min, planta: d.planta }))
      .filter((d) => d.metric != null && d.metric >= 0);
    return {
      total: data.length,
      avg: withTime.length ? Math.round(withTime.reduce((s, d) => s + (d.metric ?? 0), 0) / withTime.length) : 0,
      max: withTime.length ? Math.max(...withTime.map((d) => d.metric ?? 0)) : 0,
      plants: new Set(data.map((d) => d.planta as string).filter(Boolean)).size,
    };
  }

  const supabase = await createClient();
  const aliases = guardAgentAliases(ctx);

  if (aliases.length > 0) {
    let query = supabase
      .from("atenciones")
      .select("espera_min, demora_cita_min, planta")
      .eq("company_id", ctx.companyId!)
      .in("agente", aliases)
      .limit(5000);
    const { data, error } = await query;
    if (error || !data) return { total: 0, avg: 0, max: 0, plants: 0 };
    const withTime = data
      .map((d) => ({ metric: d.demora_cita_min ?? d.espera_min, planta: d.planta }))
      .filter((d) => d.metric != null && d.metric >= 0);
    return {
      total: data.length,
      avg: withTime.length ? Math.round(withTime.reduce((s, d) => s + d.metric!, 0) / withTime.length) : 0,
      max: withTime.length ? Math.max(...withTime.map((d) => d.metric!)) : 0,
      plants: new Set(data.map((d) => d.planta as string).filter(Boolean)).size,
    };
  }

  try {
    const { data } = await supabase.rpc("get_historial_stats", {
      p_company_id: ctx.isAdmin ? (ctx.companyId ?? null) : ctx.companyId!,
    });
    const row = data?.[0] ?? null;
    if (row) return { total: Number(row.total ?? 0), avg: Number(row.avg ?? 0), max: Number(row.max ?? 0), plants: Number(row.plants ?? 0) };
    return { total: 0, avg: 0, max: 0, plants: 0 };
  } catch (err) {
    logError("getHistorialStats", err);
    let query = supabase.from("atenciones").select("espera_min, demora_cita_min, planta");
    if (!ctx?.isAdmin && ctx?.companyId) query = query.eq("company_id", ctx.companyId);
    const { data: rawData, error } = await query;
    const data = (rawData ?? []) as { espera_min: number | null; demora_cita_min: number | null; planta: string | null }[];
    if (error || !data) return { total: 0, avg: 0, max: 0, plants: 0 };
    const withTime = data
      .map((d) => ({ metric: d.demora_cita_min ?? d.espera_min, planta: d.planta }))
      .filter((d) => d.metric != null && d.metric >= 0);
    return {
      total: data.length,
      avg: withTime.length ? Math.round(withTime.reduce((s, d) => s + d.metric!, 0) / withTime.length) : 0,
      max: withTime.length ? Math.max(...withTime.map((d) => d.metric!)) : 0,
      plants: new Set(data.map((d) => d.planta as string).filter(Boolean)).size,
    };
  }
}
