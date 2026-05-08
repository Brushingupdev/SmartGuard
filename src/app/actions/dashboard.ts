"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { normalizeGateAssignments, plantsForSite } from "@/lib/gates";
import { nowLima, daysAgoLima, logError, withRetry, dateRange } from "./_helpers";
import type {
  DashboardKpis,
  DashboardFlowRow,
  DashboardEvent,
  DashboardEventFull,
  DashboardAlert,
  DashboardBreakdownEntry,
  DashboardZone,
  DashboardStatsResult,
  HeatmapCell,
} from "@/types/dashboard";

function groupByMode(timeframe: string): "hour" | "day" | "month" {
  if (timeframe === "Día") return "hour";
  if (/^\d{4}$/.test(timeframe)) return "month";
  return "day";
}

async function resolveSitePlants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: Awaited<ReturnType<typeof getUserContext>>,
  plant: string
): Promise<string[] | null> {
  if (!plant.startsWith("site:")) return null;
  const site = plant.replace("site:", "");
  let plants: string[] = [];

  if (ctx?.gates.length) {
    plants = ctx.gates.map((gate) => gate.plant);
  } else if (ctx?.companyId) {
    const client = ctx.isAdmin
      ? (await import("@/utils/supabase/admin")).createAdminClient()
      : supabase;
    const { data: company } = await client
      .from("companies")
      .select("plantas")
      .eq("id", ctx.companyId)
      .maybeSingle();
    plants = Array.isArray(company?.plantas) ? company.plantas as string[] : [];
  } else if (ctx?.isAdmin) {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();
    const { data } = await admin
      .from("atenciones")
      .select("planta")
      .not("planta", "is", null)
      .limit(5000);
    plants = [...new Set((data ?? []).map((row: { planta: string }) => row.planta).filter(Boolean))];
  }

  return plantsForSite(site, normalizeGateAssignments(null, plants));
}

function mergeDashboardStats(results: DashboardStatsResult[]): DashboardStatsResult {
  const kpis = results.reduce<DashboardKpis>((acc, current) => ({
    ok: acc.ok + current.kpis.ok,
    deny: acc.deny + current.kpis.deny,
    warn: acc.warn + current.kpis.warn,
    pending: acc.pending + current.kpis.pending,
    total: acc.total + current.kpis.total,
    anticipado: (acc.anticipado ?? 0) + (current.kpis.anticipado ?? 0),
  }), { ok: 0, deny: 0, warn: 0, pending: 0, total: 0, anticipado: 0 });

  const flowMap: Record<string, DashboardFlowRow> = {};
  const delayReasonMap: Record<string, number> = {};
  const breakdown: Record<string, DashboardBreakdownEntry> = {};
  const zones: DashboardZone[] = [];

  for (const result of results) {
    for (const row of result.flowData) {
      if (!flowMap[row.h]) flowMap[row.h] = { h: row.h, ok: 0, warn: 0, deny: 0 };
      flowMap[row.h].ok += row.ok;
      flowMap[row.h].warn += row.warn;
      flowMap[row.h].deny += row.deny;
    }
    for (const [plant, value] of Object.entries(result.breakdown)) {
      if (!breakdown[plant]) breakdown[plant] = { total: 0, ok: 0 };
      breakdown[plant].total += value.total;
      breakdown[plant].ok += value.ok;
    }
    zones.push(...result.zones);
    for (const reason of result.delayReasons ?? []) {
      delayReasonMap[reason.motivo] = (delayReasonMap[reason.motivo] ?? 0) + reason.count;
    }
  }

  return {
    kpis,
    events: results.flatMap((result) => result.events).slice(0, 6),
    alerts: results.flatMap((result) => result.alerts).slice(0, 3),
    breakdown,
    zones: zones.sort((a, b) => b.count - a.count),
    flowData: Object.values(flowMap).sort((a, b) => a.h.localeCompare(b.h)),
    delayReasons: Object.entries(delayReasonMap)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count),
  };
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

async function _getDashboardDelayReasons(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string, from: string, to: string) {
  const { data } = await supabase
    .from("atenciones")
    .select("motivo_demora")
    .eq("company_id", companyId)
    .not("motivo_demora", "is", null)
    .gte("fecha", from)
    .lte("fecha", to)
    .limit(500);
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

  const sitePlants = await resolveSitePlants(supabase, ctx, plant);
  if (sitePlants) {
    if (sitePlants.length === 0) {
      return { events: [], kpis: { ok: 0, deny: 0, warn: 0, pending: 0, total: 0 }, breakdown: {}, flowData: [], zones: [], alerts: [], delayReasons: [] };
    }
    const results = await Promise.all(sitePlants.map((sitePlant) => getDashboardStats(sitePlant, timeframe)));
    return mergeDashboardStats(results);
  }

  if (ctx.isAdmin && !ctx.companyId) {
    return getDashboardStatsAdmin(plant, from, to);
  }

  const companyId = ctx.companyId!;
  const groupBy = groupByMode(timeframe);

  try {
    const [kpisData, flowData, breakdownRows, eventsData, reasonsRaw] = await withRetry(
      () => Promise.all([
        _getDashboardKpis(supabase, companyId, from, to, plant),
        _getDashboardFlow(supabase, companyId, from, to, plant, groupBy),
        _getDashboardBreakdown(supabase, companyId, from, to),
        _getDashboardEvents(supabase, companyId, from, to, 6),
        _getDashboardDelayReasons(supabase, companyId, from, to),
      ]),
      "getDashboardStats-direct"
    );

    // Conteo de anticipados (atendidos antes de su hora de cita)
    let anticipadoQ = supabase
      .from("atenciones")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("fecha", from)
      .lte("fecha", to)
      .eq("espera_min", 0)
      .not("hora_cita", "is", null)
      .not("h_atencion", "is", null);
    if (plant !== "Todos") anticipadoQ = anticipadoQ.eq("planta", plant);
    const { count: anticipadoCount } = await anticipadoQ;

    const kpiRow = kpisData?.[0] ?? null;
    const kpis: DashboardKpis = {
      ok:         Number(kpiRow?.ok ?? 0),
      deny:       Number(kpiRow?.deny ?? 0),
      warn:       Number(kpiRow?.warn ?? 0),
      pending:    Number(kpiRow?.pending ?? 0),
      total:      Number(kpiRow?.total ?? 0),
      anticipado: anticipadoCount ?? 0,
    };

    const bRows = (breakdownRows ?? []) as { planta: string; total: number; ok: number }[];
    const breakdown: Record<string, DashboardBreakdownEntry> = {};
    bRows.forEach(r => { breakdown[r.planta || "Sin planta"] = { total: Number(r.total), ok: Number(r.ok) }; });

    const zones: DashboardZone[] = bRows.map(r => {
      const total = Number(r.total);
      const ok    = Number(r.ok);
      const pct   = total > 0 ? Math.round((ok / total) * 100) : 0;
      return {
        name:  r.planta || "Sin planta",
        count: total,
        pct,
        tone: (total > 0 && pct >= 70 ? "ok" : "deny") as DashboardZone["tone"],
      };
    }).sort((a, b) => b.count - a.count);

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

    // Delay reasons for CausasTop — aggregated from parallel fetch
    const reasonMap: Record<string, number> = {};
    (reasonsRaw ?? []).forEach((r: { motivo_demora: string }) => {
      reasonMap[r.motivo_demora] = (reasonMap[r.motivo_demora] || 0) + 1;
    });
    const delayReasons = Object.entries(reasonMap)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count);

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
    ok:         data.filter((d) => d.espera_min != null && d.espera_min < 30).length,
    warn:       data.filter((d) => d.espera_min != null && d.espera_min >= 30 && d.espera_min < 45).length,
    deny:       data.filter((d) => d.espera_min != null && d.espera_min >= 45).length,
    pending:    data.filter((d) => d.espera_min == null).length,
    total:      data.length,
    anticipado: data.filter((d) => d.espera_min === 0 && d.hora_cita != null && d.h_atencion != null).length,
  };

  const breakdown: Record<string, DashboardBreakdownEntry> = {};
  data.forEach((d) => {
    const p = (d.planta as string) || "Sin planta";
    if (!breakdown[p]) breakdown[p] = { total: 0, ok: 0 };
    breakdown[p].total++;
    if (d.espera_min != null && d.espera_min < 30) breakdown[p].ok++;
  });

  const zones: DashboardZone[] = Object.entries(breakdown)
    .map(([name, v]) => {
      const pct = v.total > 0 ? Math.round((v.ok / v.total) * 100) : 0;
      return {
        name,
        count: v.total,
        pct,
        tone: v.total > 0 && pct >= 70 ? "ok" as const : "deny" as const,
      };
    })
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
    const sitePlants = await resolveSitePlants(supabase, ctx, plant);

    const fetchKpis = async (fromDate: string, toDate: string) => {
      if (!sitePlants) return _getDashboardKpis(supabase, companyId, fromDate, toDate, plant);
      const rows = await Promise.all(sitePlants.map((sitePlant) => _getDashboardKpis(supabase, companyId, fromDate, toDate, sitePlant)));
      const total = rows.flatMap((row) => row ?? []).reduce((acc, row) => ({
        ok: acc.ok + Number(row?.ok ?? 0),
        deny: acc.deny + Number(row?.deny ?? 0),
        warn: acc.warn + Number(row?.warn ?? 0),
        pending: acc.pending + Number(row?.pending ?? 0),
        total: acc.total + Number(row?.total ?? 0),
      }), { ok: 0, deny: 0, warn: 0, pending: 0, total: 0 });
      return [total];
    };

    const [currData, prevData] = await Promise.all([
      fetchKpis(from, to),
      fetchKpis(prevFrom, prevTo),
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
    const sitePlants = await resolveSitePlants(supabase, ctx, plant);
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

    if (sitePlants) {
      if (sitePlants.length === 0) return [];
      query = query.in("planta", sitePlants);
    } else if (plant !== "Todos") {
      query = query.eq("planta", plant);
    }

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
