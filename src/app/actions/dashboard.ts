"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { nowLima, daysAgoLima, logError, withRetry } from "./_helpers";
import type {
  DashboardKpis,
  DashboardFlowRow,
  DashboardEvent,
  DashboardEventFull,
  DashboardAlert,
  DashboardBreakdownEntry,
  DashboardZone,
  DashboardStatsResult,
  ActivePersonnelRow,
  HistorialStats,
  ReporteStatsRow,
  HeatmapCell,
} from "@/types/dashboard";

interface AtencionRaw {
  espera_min: number | null;
  h_registro: string | null;
  fecha: string | null;
  planta: string | null;
  razon_social: string | null;
  empresa: string | null;
}

interface ReporteAtencionRow extends AtencionRaw {
  h_atencion: string | null;
  tipo_operacion: string | null;
  motivo_demora: string | null;
  agente: string | null;
}

function hasEspera(row: ReporteAtencionRow): row is ReporteAtencionRow & { espera_min: number } {
  return row.espera_min != null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateRange(timeframe: string): { from: string; to: string } {
  const { date: today } = nowLima();
  if (timeframe === "Día")    return { from: today, to: today };
  if (timeframe === "Semana") return { from: daysAgoLima(7), to: today };
  if (timeframe === "Mes")    return { from: daysAgoLima(30), to: today };
  if (/^\d{4}$/.test(timeframe)) return { from: `${timeframe}-01-01`, to: `${timeframe}-12-31` };
  return { from: today, to: today };
}

function groupByMode(timeframe: string): "hour" | "day" | "month" {
  if (timeframe === "Día") return "hour";
  if (/^\d{4}$/.test(timeframe)) return "month";
  return "day";
}

// ─── DASHBOARD STATS (SQL-powered, direct RPC calls) ────────────────────────
// NOTE: unstable_cache was removed because it calls createClient() (which uses
// cookies()) inside the cached callback — Next.js 15 does not allow cookies()
// outside the request lifecycle, which caused production errors.

async function _getDashboardKpis(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string, from: string, to: string, plant: string) {
  const { data } = await supabase.rpc("get_dashboard_kpis", {
    p_company_id: companyId,
    p_date_from: from,
    p_date_to: to,
    p_planta: plant,
  });
  return data;
}

async function _getDashboardFlow(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string, from: string, to: string, plant: string, groupBy: string) {
  const { data } = await supabase.rpc("get_dashboard_flow", {
    p_company_id: companyId,
    p_date_from: from,
    p_date_to: to,
    p_planta: plant,
    p_group_by: groupBy,
  });
  return data;
}

async function _getDashboardBreakdown(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string, from: string, to: string) {
  const { data } = await supabase.rpc("get_dashboard_breakdown", {
    p_company_id: companyId,
    p_date_from: from,
    p_date_to: to,
  });
  return data;
}

async function _getDashboardEvents(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string, from: string, to: string, limit: number) {
  const { data } = await supabase.rpc("get_dashboard_events", {
    p_company_id: companyId,
    p_date_from: from,
    p_date_to: to,
    p_limit: limit,
  });
  return data;
}

export async function getDashboardStats(plant: string = "Todos", timeframe: string = "Día"): Promise<DashboardStatsResult> {
  const supabase = await createClient();
  const ctx = await getUserContext();
  const { from, to } = dateRange(timeframe);

  if (!ctx) {
    return {
      events: [], kpis: { ok: 0, deny: 0, warn: 0, pending: 0, total: 0 },
      breakdown: {}, flowData: [], zones: [], alerts: [], delayReasons: [],
    };
  }

  if (ctx.isAdmin && !ctx.companyId) {
    return getDashboardStatsAdmin(plant, from, to);
  }

  const companyId = ctx.companyId!;
  const groupBy = groupByMode(timeframe);

  try {
    const [kpisData, flowData, breakdownRows, eventsData] = await withRetry(
      () => Promise.all([
        _getDashboardKpis(supabase, companyId, from, to, plant),
        _getDashboardFlow(supabase, companyId, from, to, plant, groupBy),
        _getDashboardBreakdown(supabase, companyId, from, to),
        _getDashboardEvents(supabase, companyId, from, to, 6),
      ]),
      "getDashboardStats-direct"
    );

    const kpiRow = kpisData?.[0] ?? null;
    const kpis: DashboardKpis = {
      ok:      Number(kpiRow?.ok ?? 0),
      deny:    Number(kpiRow?.deny ?? 0),
      warn:    Number(kpiRow?.warn ?? 0),
      pending: Number(kpiRow?.pending ?? 0),
      total:   Number(kpiRow?.total ?? 0),
    };

    const bRows = (breakdownRows ?? []) as { planta: string; total: number; ok: number }[];
    const breakdown: Record<string, DashboardBreakdownEntry> = {};
    bRows.forEach(r => { breakdown[r.planta || "Sin planta"] = { total: Number(r.total), ok: Number(r.ok) }; });

    const zones: DashboardZone[] = bRows.map(r => ({
      name: r.planta || "Sin planta",
      count: Number(r.total),
      pct: Math.min(100, (Number(r.total) / 50) * 100),
      tone: (Number(r.total) > 40 ? "deny" : "ok") as DashboardZone["tone"],
    })).sort((a, b) => b.count - a.count);

    const eventsFull = (eventsData ?? []) as DashboardEventFull[];
    const events: DashboardEvent[] = eventsFull;
    const delayEvents = eventsFull.filter(e => e.status === "deny");

    let alerts: DashboardAlert[];
    if (delayEvents.length > 0) {
      alerts = delayEvents.slice(0, 3).map(e => ({
        title: "Alerta de Demora",
        sub: `${e.plate} · ${e.espera_min ?? "?"} min · ${e.gate}`,
        tone: "deny" as const,
      }));
    } else {
      let q2 = supabase.from("atenciones")
        .select("razon_social, espera_min, planta")
        .gte("espera_min", 45)
        .eq("company_id", companyId);
      if (plant !== "Todos") q2 = q2.eq("planta", plant);
      q2 = q2.gte("fecha", from).lte("fecha", to).order("espera_min", { ascending: false }).limit(3);
      const { data: delayRows } = await q2;
      alerts = (delayRows ?? []).map((d: Record<string, unknown>) => ({
        title: "Alerta de Demora",
        sub: `${d.razon_social ?? "N/A"} · ${d.espera_min} min · ${d.planta}`,
        tone: "deny" as const,
      }));
    }

    const safeFlowData: DashboardFlowRow[] = (flowData ?? []).map((d: Record<string, unknown>) => ({
      h: d.h,
      ok: Number(d.ok),
      warn: Number(d.warn),
      deny: Number(d.deny),
    }));

    // Delay reasons for CausasTop
    let delayReasons: { motivo: string; count: number }[] = [];
    const { data: reasonsData } = await supabase.from("atenciones")
      .select("motivo_demora")
      .eq("company_id", companyId)
      .not("motivo_demora", "is", null)
      .gte("fecha", from).lte("fecha", to);
    if (reasonsData) {
      const reasonMap: Record<string, number> = {};
      (reasonsData as { motivo_demora: string }[]).forEach(r => {
        reasonMap[r.motivo_demora] = (reasonMap[r.motivo_demora] || 0) + 1;
      });
      delayReasons = Object.entries(reasonMap)
        .map(([motivo, count]) => ({ motivo, count }))
        .sort((a, b) => b.count - a.count);
    }

    return { events, kpis, breakdown, flowData: safeFlowData, zones, alerts, delayReasons };
  } catch (err) {
    logError("getDashboardStats", err);
    return { events: [], kpis: { ok: 0, deny: 0, warn: 0, pending: 0, total: 0 }, breakdown: {}, flowData: [], zones: [], alerts: [], delayReasons: [] };
  }
}

// ─── ADMIN OVERVIEW (cross-company, usa service_role) ──────────────────────────

async function getDashboardStatsAdmin(
  plant: string,
  from: string,
  to: string
): Promise<DashboardStatsResult> {
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  let query = admin.from("atenciones").select("*")
    .gte("fecha", from).lte("fecha", to)
    .limit(5000);
  if (plant !== "Todos") query = query.eq("planta", plant);

  const { data, error } = await query;

  if (error || !data) {
    return { events: [], kpis: { ok: 0, deny: 0, warn: 0, pending: 0, total: 0 }, breakdown: {}, flowData: [], zones: [], alerts: [], delayReasons: [] };
  }

  const kpis: DashboardKpis = {
    ok:      data.filter((d) => d.espera_min != null && d.espera_min < 30).length,
    warn:    data.filter((d) => d.espera_min != null && d.espera_min >= 30 && d.espera_min < 45).length,
    deny:    data.filter((d) => d.espera_min != null && d.espera_min >= 45).length,
    pending: data.filter((d) => d.espera_min == null).length,
    total:   data.length,
  };

  const breakdown: Record<string, DashboardBreakdownEntry> = {};
  data.forEach((d) => {
    const p = (d.planta as string) || "Sin planta";
    if (!breakdown[p]) breakdown[p] = { total: 0, ok: 0 };
    breakdown[p].total++;
    if (d.espera_min != null && d.espera_min < 30) breakdown[p].ok++;
  });

  const zones: DashboardZone[] = Object.entries(breakdown)
    .map(([name, v]) => ({ name, count: v.total, pct: Math.min(100, (v.total / 50) * 100), tone: v.total > 40 ? "deny" as const : "ok" as const }))
    .sort((a, b) => b.count - a.count);

    const events: DashboardEvent[] = data.slice(0, 6).map((d) => {
    let status: DashboardEvent["status"] = "ok";
    let label = "Autorizado";
    if (d.espera_min == null) { status = "pending"; label = "En proceso"; }
    else if (d.espera_min >= 45) { status = "deny"; label = "Con demora"; }
    else if (d.espera_min >= 30) { status = "warn"; label = "Revisión"; }
    return { plate: d.razon_social || "N/A", status, label, info: d.empresa || "Sin empresa", gate: d.planta, time: d.h_registro ? d.h_registro.substring(0, 5) : "--:--" };
  });

    const alerts: DashboardAlert[] = data
    .filter((d) => d.espera_min && d.espera_min >= 45)
    .slice(0, 3)
    .map((d) => ({ title: "Alerta de Demora", sub: `${d.razon_social ?? "N/A"} · ${d.espera_min} min · ${d.planta}`, tone: "deny" }));

  const groupingMap: Record<string, DashboardFlowRow> = {};
  data.forEach((d) => {
    const key = d.h_registro ? d.h_registro.substring(0, 2) : "00";
    if (!groupingMap[key]) groupingMap[key] = { h: key, ok: 0, warn: 0, deny: 0 };
    if (d.espera_min != null && d.espera_min >= 45) groupingMap[key].deny++;
    else if (d.espera_min != null && d.espera_min >= 30) groupingMap[key].warn++;
    else groupingMap[key].ok++;
  });
  const flowData = Object.values(groupingMap).sort((a, b) => a.h.localeCompare(b.h));

  // Delay reasons from loaded data
  const reasonMap: Record<string, number> = {};
  data.filter(d => d.motivo_demora).forEach(d => {
    const k = d.motivo_demora as string;
    reasonMap[k] = (reasonMap[k] || 0) + 1;
  });
  const delayReasons = Object.entries(reasonMap)
    .map(([motivo, count]) => ({ motivo, count }))
    .sort((a, b) => b.count - a.count);

  return { events, kpis, breakdown, flowData, zones, alerts, delayReasons };
}

// ─── PERSONAL ACTIVO ─────────────────────────────────────────────────────────

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
    return (data ?? []) as ActivePersonnelRow[];
  } catch (err) {
    logError("getActivePersonnel", err);
    return [];
  }
}

// ─── HISTORIAL STATS ─────────────────────────────────────────────────────────

export async function getHistorialStats(): Promise<HistorialStats> {
  const ctx = await getUserContext();
  if (!ctx?.companyId && !ctx?.isAdmin) return { total: 0, avg: 0, max: 0, plants: 0 };
  if (ctx?.isAdmin && !ctx.companyId) return getHistorialStatsUncached();
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_historial_stats", {
      p_company_id: ctx.isAdmin ? (ctx.companyId ?? null) : ctx.companyId,
    });
    const row = data?.[0] ?? null;
    if (row) return { total: Number(row.total ?? 0), avg: Number(row.avg ?? 0), max: Number(row.max ?? 0), plants: Number(row.plants ?? 0) };
    return { total: 0, avg: 0, max: 0, plants: 0 };
  } catch (err) {
    logError("getHistorialStats", err);
    return { total: 0, avg: 0, max: 0, plants: 0 };
  }
}

// ─── HISTORIAL STATS FALLBACK (uncached, for errors) ─────────────────────────

export async function getHistorialStatsUncached(): Promise<HistorialStats> {
  const ctx = await getUserContext();

  if (!ctx?.companyId && !ctx?.isAdmin) return { total: 0, avg: 0, max: 0, plants: 0 };

  if (ctx?.isAdmin && !ctx.companyId) {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("atenciones")
      .select("espera_min, planta")
      .not("company_id", "is", null)
      .limit(5000);
    if (error || !data) return { total: 0, avg: 0, max: 0, plants: 0 };
    const withTime = data.filter(d => d.espera_min != null && d.espera_min >= 0);
    return {
      total: data.length,
      avg: withTime.length ? Math.round(withTime.reduce((s, d) => s + (d.espera_min ?? 0), 0) / withTime.length) : 0,
      max: withTime.length ? Math.max(...withTime.map((d) => d.espera_min ?? 0)) : 0,
      plants: new Set(data.map((d) => d.planta as string).filter(Boolean)).size,
    };
  }

  const supabase = await createClient();

  try {
    const { data } = await supabase.rpc("get_historial_stats", {
      p_company_id: ctx.isAdmin ? (ctx.companyId ?? null) : ctx.companyId!,
    });
    const row = data?.[0] ?? null;
    if (row) return { total: Number(row.total ?? 0), avg: Number(row.avg ?? 0), max: Number(row.max ?? 0), plants: Number(row.plants ?? 0) };
    return { total: 0, avg: 0, max: 0, plants: 0 };
  } catch (err) {
    logError("getHistorialStats", err);
    let query = supabase.from("atenciones").select("espera_min, planta");
    if (!ctx?.isAdmin && ctx?.companyId) query = query.eq("company_id", ctx.companyId);
  const { data: rawData, error } = await query;
  const data = (rawData ?? []) as AtencionRaw[];
    if (error || !data) return { total: 0, avg: 0, max: 0, plants: 0 };
    const withTime = data.filter(d => d.espera_min != null && d.espera_min >= 0);
    return {
      total: data.length,
      avg: withTime.length ? Math.round(withTime.reduce((s, d) => s + d.espera_min!, 0) / withTime.length) : 0,
      max: withTime.length ? Math.max(...withTime.map((d) => d.espera_min!)) : 0,
      plants: new Set(data.map((d) => d.planta as string).filter(Boolean)).size,
    };
  }
}

// ─── REPORTE DETALLADO ────────────────────────────────────────────────────────

export async function getReporteData(plant: string = "Todos", timeframe: string = "Día") {
  const supabase = await createClient();
  const ctx = await getUserContext();
  const { from, to } = dateRange(timeframe);

  if (!ctx) return null;

  const cid = ctx.companyId;

  let baseStats: ReporteStatsRow | null = null;

  // RPC solo disponible para queries con company_id
  if (cid) {
    const { data: rpcData } = await supabase.rpc("get_reporte_stats", { p_company_id: cid, p_date_from: from, p_date_to: to, p_planta: plant });
    baseStats = (rpcData?.[0] ?? null) as ReporteStatsRow | null;
  }

  // Admin sin empresa: usa service_role para vista cross-company
  // Usuario regular: requiere company_id
  const dataDb = ctx.isAdmin && !cid
    ? (await import("@/utils/supabase/admin")).createAdminClient()
    : cid
      ? supabase
      : null;
  if (!dataDb) {
    return null;
  }

  let query = dataDb.from("atenciones").select("*");
  if (cid) query = query.eq("company_id", cid);
  if (plant !== "Todos") query = query.eq("planta", plant);
  query = query.gte("fecha", from).lte("fecha", to).order("fecha", { ascending: false }).limit(ctx.isAdmin && !cid ? 5000 : 2000);

  const { data, error } = await query;
  if (error || !data) return null;

  const rows = data as ReporteAtencionRow[];

  const withTime = rows.filter(hasEspera);
  const esperas = withTime.map((d) => d.espera_min).sort((a, b) => a - b);

  // Use baseStats from SQL when available, else compute in JS
  const total    = baseStats ? Number(baseStats.total)    : rows.length;
  const ok       = baseStats ? Number(baseStats.ok)       : withTime.filter((d) => d.espera_min < 30).length;
  const warn     = baseStats ? Number(baseStats.warn)     : withTime.filter((d) => d.espera_min >= 30 && d.espera_min < 45).length;
  const alto     = baseStats ? Number(baseStats.alto)     : withTime.filter((d) => d.espera_min >= 45 && d.espera_min < 90).length;
  const critico  = baseStats ? Number(baseStats.critico)  : withTime.filter((d) => d.espera_min >= 90).length;
  const pending  = baseStats ? Number(baseStats.pending)  : rows.filter((d) => d.espera_min == null).length;
  const avgEspera = baseStats ? Number(baseStats.avg_espera) : (esperas.length ? Math.round(esperas.reduce((s, v) => s + v, 0) / esperas.length) : 0);
  const maxEspera = baseStats ? Number(baseStats.max_espera) : (esperas.length ? esperas[esperas.length - 1] : 0);
  const p90Espera = esperas.length ? esperas[Math.min(Math.floor(esperas.length * 0.9), esperas.length - 1)] : 0;
  const pctOnTime = baseStats ? (baseStats.pct_on_time ?? null) : (withTime.length > 0 ? Math.round((ok / withTime.length) * 100) : null);

  // Plant breakdown
  const plantNames = [...new Set(rows.map((d) => d.planta).filter((value): value is string => Boolean(value)))];
  const plantStats = plantNames.map(p => {
    const pRows = rows.filter((d) => d.planta === p);
    const wt = pRows.filter(hasEspera);
    const pOk = wt.filter((d) => d.espera_min < 30).length;
    const pW = wt.filter((d) => d.espera_min >= 30 && d.espera_min < 45).length;
    const pA = wt.filter((d) => d.espera_min >= 45 && d.espera_min < 90).length;
    const pC = wt.filter((d) => d.espera_min >= 90).length;
    const pPnd = pRows.filter((d) => d.espera_min == null).length;
    const pEsp = wt.map((d) => d.espera_min);
    const pAvg = pEsp.length ? Math.round(pEsp.reduce((s, v) => s + v, 0) / pEsp.length) : 0;
    const pPct = wt.length > 0 ? Math.round((pOk / wt.length) * 100) : null;
    return { planta: p, total: pRows.length, ok: pOk, warn: pW, alto: pA, critico: pC, pending: pPnd, avg: pAvg, pctOnTime: pPct };
  });

  // Daily trend
  const MO = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const trendMap: Record<string, { total: number; onTime: number; delayed: number }> = {};
  rows.forEach((d) => {
    const k = d.fecha ?? "";
    if (!trendMap[k]) trendMap[k] = { total: 0, onTime: 0, delayed: 0 };
    trendMap[k].total++;
    if (d.espera_min != null && d.espera_min < 30) trendMap[k].onTime++;
    else if (d.espera_min != null) trendMap[k].delayed++;
  });
  const trendData = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => {
      const pts = date.split("-");
      const label = pts.length === 3 ? `${parseInt(pts[2])} ${MO[parseInt(pts[1]) - 1]}` : date;
      return { date, label, ...v };
    });

  // Segments
  const segments = [
    { name: "Normal",    range: "< 30 min",   count: ok,      color: "var(--sg-success)" },
    { name: "Moderado",  range: "30–45 min",  count: warn,    color: "var(--sg-warn)" },
    { name: "Alto",      range: "45–90 min",  count: alto,    color: "#e07b3a" },
    { name: "Crítico",   range: "> 90 min",   count: critico, color: "var(--sg-danger)" },
    { name: "Pendiente", range: "Sin cierre", count: pending, color: "var(--sg-info)" },
  ].map(s => ({ ...s, pct: total > 0 ? Math.round((s.count / total) * 100) : 0 }));

  // Top companies with delays
  const compMap: Record<string, { count: number; esperas: number[] }> = {};
  rows.filter((d) => d.espera_min != null && d.espera_min >= 30 && d.empresa).forEach((d) => {
    const k = d.empresa as string;
    if (!compMap[k]) compMap[k] = { count: 0, esperas: [] };
    compMap[k].count++;
    compMap[k].esperas.push(d.espera_min as number);
  });
  const topCompaniesSorted = Object.entries(compMap)
    .map(([empresa, v]) => ({
      empresa,
      count:     v.count,
      avgEspera: Math.round(v.esperas.reduce((s, e) => s + e, 0) / v.esperas.length),
      maxEspera: Math.max(...v.esperas),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Trend comparison
  const midIdx = Math.floor(trendData.length / 2);
  const firstDates = new Set(trendData.slice(0, midIdx).map(t => t.date));
  const secondDates = new Set(trendData.slice(midIdx).map(t => t.date));
  const compTrend: Record<string, { first: number; second: number }> = {};
  rows.filter((d) => d.empresa && d.espera_min != null && d.espera_min >= 30).forEach((d) => {
    const k = d.empresa as string;
    if (!compTrend[k]) compTrend[k] = { first: 0, second: 0 };
    if (d.fecha && firstDates.has(d.fecha)) compTrend[k].first++;
    else if (d.fecha && secondDates.has(d.fecha)) compTrend[k].second++;
  });
  const topCompanies = topCompaniesSorted.map(c => {
    const ct = compTrend[c.empresa];
    let trend: "up" | "down" | "stable" = "stable";
    if (ct && ct.first + ct.second >= 4) {
      const delta = ct.second - ct.first;
      if (delta >= 2) trend = "up";
      else if (delta <= -2) trend = "down";
    }
    return { ...c, trend };
  });

  // Operation types
  const opMap: Record<string, { count: number; delayed: number; esperas: number[] }> = {};
  rows.forEach((d) => {
    const k = d.tipo_operacion || "Sin tipo";
    if (!opMap[k]) opMap[k] = { count: 0, delayed: 0, esperas: [] };
    opMap[k].count++;
    if (d.espera_min != null && d.espera_min >= 30) opMap[k].delayed++;
    if (d.espera_min != null) opMap[k].esperas.push(d.espera_min);
  });
  const opTypes = Object.entries(opMap)
    .map(([tipo, v]) => ({
      tipo,
      count:      v.count,
      delayed:    v.delayed,
      pctDelayed: v.count > 0 ? Math.round((v.delayed / v.count) * 100) : 0,
      avgEspera:  v.esperas.length ? Math.round(v.esperas.reduce((s, e) => s + e, 0) / v.esperas.length) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Delay reasons
  const reasonMap: Record<string, number> = {};
  rows.filter((d) => d.motivo_demora).forEach((d) => {
    const k = d.motivo_demora as string;
    reasonMap[k] = (reasonMap[k] || 0) + 1;
  });
  const delayReasons = Object.entries(reasonMap)
    .map(([motivo, count]) => ({ motivo, count }))
    .sort((a, b) => b.count - a.count);

  // Agent stats
  const agentMap: Record<string, { total: number; ok: number; delayed: number; pending: number; esperas: number[] }> = {};
  rows.filter((d) => d.agente).forEach((d) => {
    const k = d.agente as string;
    if (!agentMap[k]) agentMap[k] = { total: 0, ok: 0, delayed: 0, pending: 0, esperas: [] };
    agentMap[k].total++;
    if (d.espera_min == null)                        { agentMap[k].pending++; }
    else if (d.espera_min < 30)                      { agentMap[k].ok++;      agentMap[k].esperas.push(d.espera_min); }
    else                                             { agentMap[k].delayed++;  agentMap[k].esperas.push(d.espera_min); }
  });
  const agentStats = Object.entries(agentMap)
    .map(([agente, v]) => ({
      agente,
      total:     v.total,
      ok:        v.ok,
      delayed:   v.delayed,
      pending:   v.pending,
      pctOnTime: v.total - v.pending > 0 ? Math.round((v.ok / (v.total - v.pending)) * 100) : null,
      avgEspera: v.esperas.length ? Math.round(v.esperas.reduce((s, e) => s + e, 0) / v.esperas.length) : null,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Flow data (chart)
  const flowMap: Record<string, { h: string; ok: number; warn: number; deny: number }> = {};
  rows.forEach((d) => {
    let key = "00";
    if (timeframe === "Día") key = d.h_registro ? d.h_registro.substring(0, 2) : "00";
    else if (timeframe === "Semana" || timeframe === "Mes") key = d.fecha ? d.fecha.substring(8, 10) : "01";
    else if (/^\d{4}$/.test(timeframe)) key = d.fecha ? d.fecha.substring(5, 7) : "01";
    if (!flowMap[key]) flowMap[key] = { h: key, ok: 0, warn: 0, deny: 0 };
    if (d.espera_min != null && d.espera_min >= 45) flowMap[key].deny++;
    else if (d.espera_min != null && d.espera_min >= 30) flowMap[key].warn++;
    else flowMap[key].ok++;
  });
  const flowData = Object.values(flowMap).sort((a, b) => a.h.localeCompare(b.h));

  // Heatmap
  const hmMap: Record<string, { total: number; delayed: number }> = {};
  rows.forEach((d) => {
    if (!d.h_registro || !d.fecha) return;
    const hour = parseInt(d.h_registro.substring(0, 2));
    if (isNaN(hour)) return;
    const [y, m, day] = d.fecha.split("-").map(Number);
    const dow = new Date(y, m - 1, day).getDay();
    const key = `${dow}-${hour}`;
    if (!hmMap[key]) hmMap[key] = { total: 0, delayed: 0 };
    hmMap[key].total++;
    if (d.espera_min != null && d.espera_min >= 30) hmMap[key].delayed++;
  });
  const heatmap = Object.entries(hmMap).map(([key, v]) => {
    const [dow, hour] = key.split("-").map(Number);
    return { dow, hour, total: v.total, delayed: v.delayed, rate: v.total >= 3 ? Math.round((v.delayed / v.total) * 100) : null };
  });

  return {
    total, ok, warn, alto, critico, pending,
    avgEspera, maxEspera, p90Espera, pctOnTime,
    plantStats, segments, topCompanies, opTypes, delayReasons, agentStats,
    flowData, trendData, heatmap,
  };
}

// ─── TREND COMPARISON ─────────────────────────────────────────────────────────

export interface TrendResult {
  kpis: DashboardKpis;
  trend: {
    ok: number | null;
    deny: number | null;
    total: number | null;
    puntualidad: number | null;
  };
  prevPuntualidad: number | null;
}

export async function getDashboardTrends(plant: string = "Todos", timeframe: string = "Día"): Promise<TrendResult> {
  const empty: TrendResult = {
    kpis: { ok: 0, deny: 0, warn: 0, pending: 0, total: 0 },
    trend: { ok: null, deny: null, total: null, puntualidad: null },
    prevPuntualidad: null,
  };

  try {
    const ctx = await getUserContext();
    if (!ctx?.companyId) return empty;

    const supabase = await createClient();
    const { from, to } = dateRange(timeframe);
    const companyId = ctx.companyId;

    const days = timeframe === "Día" ? 1
      : timeframe === "Semana" ? 7
      : timeframe === "Mes" ? 30
      : /^\d{4}$/.test(timeframe) ? 365
      : 30;
    const prevFrom = daysAgoLima(days * 2);
    const prevTo   = daysAgoLima(days + 1);

    const [currData, prevData] = await Promise.all([
      _getDashboardKpis(supabase, companyId, from, to, plant),
      _getDashboardKpis(supabase, companyId, prevFrom, prevTo, plant),
    ]);

    const currRow = currData?.[0] ?? null;
    const prevRow = prevData?.[0] ?? null;

    const kpis: DashboardKpis = {
      ok:      Number(currRow?.ok      ?? 0),
      deny:    Number(currRow?.deny    ?? 0),
      warn:    Number(currRow?.warn    ?? 0),
      pending: Number(currRow?.pending ?? 0),
      total:   Number(currRow?.total   ?? 0),
    };

    const prevTotal = Number(prevRow?.total ?? 0);
    const prevOk    = Number(prevRow?.ok    ?? 0);
    const prevDeny  = Number(prevRow?.deny  ?? 0);

    const trend: TrendResult["trend"] = {
      ok:         prevTotal > 0 ? Math.round(((kpis.ok   - prevOk)   / Math.max(1, prevOk))   * 100) : null,
      deny:       prevTotal > 0 ? Math.round(((kpis.deny - prevDeny) / Math.max(1, prevDeny)) * 100) : null,
      total:      prevTotal > 0 ? Math.round(((kpis.total - prevTotal) / Math.max(1, prevTotal)) * 100) : null,
      puntualidad: null,
    };

    const currPuntualidad = kpis.total > 0 ? Math.round((kpis.ok / kpis.total) * 100) : null;
    const prevPuntualidad = prevTotal > 0 ? Math.round((prevOk / prevTotal) * 100) : null;
    if (currPuntualidad !== null && prevPuntualidad !== null) {
      trend.puntualidad = currPuntualidad - prevPuntualidad;
    }

    return { kpis, trend, prevPuntualidad };
  } catch (err) {
    logError("getDashboardTrends", err);
    return empty;
  }
}

// ─── HEATMAP DE DEMORAS ───────────────────────────────────────────────────────
// Agrega atenciones de los últimos 180 días por día-de-semana × hora.

export async function getDashboardHeatmap(plant: string = "Todos"): Promise<HeatmapCell[]> {
  try {
    const ctx = await getUserContext();
    if (!ctx?.companyId) return [];

    const supabase = await createClient();
    const sixMonthsAgo = daysAgoLima(180);
    const { date: today } = nowLima();

    let query = supabase
      .from("atenciones")
      .select("h_registro, fecha, espera_min")
      .eq("company_id", ctx.companyId)
      .gte("fecha", sixMonthsAgo)
      .lte("fecha", today)
      .not("h_registro", "is", null)
      .not("fecha", "is", null);

    if (plant !== "Todos") query = query.eq("planta", plant);

    const { data } = await query.limit(5000);
    if (!data?.length) return [];

    const hmMap: Record<string, { total: number; delayed: number }> = {};
    (data as { h_registro: string; fecha: string; espera_min: number | null }[]).forEach((d) => {
      const hour = parseInt(d.h_registro.substring(0, 2));
      if (isNaN(hour)) return;
      const parts = d.fecha.split("-").map(Number);
      const dow = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
      const key = `${dow}-${hour}`;
      if (!hmMap[key]) hmMap[key] = { total: 0, delayed: 0 };
      hmMap[key].total++;
      if (d.espera_min != null && d.espera_min >= 30) hmMap[key].delayed++;
    });

    return Object.entries(hmMap).map(([key, v]) => {
      const [dow, hour] = key.split("-").map(Number);
      return {
        dow,
        hour,
        total:   v.total,
        delayed: v.delayed,
        rate:    v.total >= 3 ? Math.round((v.delayed / v.total) * 100) : null,
      };
    });
  } catch (err) {
    logError("getDashboardHeatmap", err);
    return [];
  }
}
