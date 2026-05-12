"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { normalizeGateAssignments, plantsForSite, formatGateLabelFromPlant } from "@/lib/gates";
import { nowLima, daysAgoLima, logError, dateRange } from "./_helpers";
import type {
  DashboardKpis,
  DashboardFlowRow,
  DashboardEvent,
  DashboardAlert,
  DashboardBreakdownEntry,
  DashboardZone,
  DashboardStatsResult,
  HeatmapCell,
} from "@/types/dashboard";

type DashboardMetricRow = {
  fecha: string | null;
  razon_social: string | null;
  empresa: string | null;
  planta: string | null;
  h_registro: string | null;
  h_atencion: string | null;
  hora_cita: string | null;
  espera_min: number | null;
  demora_cita_min: number | null;
  motivo_demora: string | null;
};

function effectiveDelay(row: Pick<DashboardMetricRow, "demora_cita_min" | "espera_min">): number | null {
  return row.demora_cita_min ?? row.espera_min ?? null;
}

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function flowBucketKey(row: DashboardMetricRow, timeframe: string): string {
  if (timeframe === "Día") return row.h_registro ? row.h_registro.substring(0, 2) : "00";
  if (!row.fecha) return "1";
  const d = new Date(row.fecha + "T12:00:00");
  if (timeframe === "Semana") return String(d.getDay()); // 0=Dom … 6=Sáb
  if (timeframe === "Mes") return String(Math.min(4, Math.ceil(d.getDate() / 7)));
  if (/^\d{4}$/.test(timeframe)) return String(d.getMonth() + 1).padStart(2, "0");
  return row.h_registro ? row.h_registro.substring(0, 2) : "00";
}

function padFlowData(
  flowMap: Record<string, DashboardFlowRow>,
  timeframe: string,
): Record<string, DashboardFlowRow> {
  const padded = { ...flowMap };
  if (timeframe === "Semana") {
    for (let i = 0; i < 7; i++) {
      const k = String(i);
      if (!padded[k]) padded[k] = { h: k, ok: 0, warn: 0, deny: 0 };
    }
  } else if (timeframe === "Mes") {
    for (let i = 1; i <= 4; i++) {
      const k = String(i);
      if (!padded[k]) padded[k] = { h: k, ok: 0, warn: 0, deny: 0 };
    }
  }
  return padded;
}

function buildDashboardStatsFromRows(rows: DashboardMetricRow[], timeframe = "Día"): Omit<DashboardStatsResult, "delayReasons"> & { delayReasons: { motivo: string; count: number }[] } {
  const kpis: DashboardKpis = {
    ok: rows.filter((row) => {
      const delay = effectiveDelay(row);
      return delay != null && delay < 30;
    }).length,
    warn: rows.filter((row) => {
      const delay = effectiveDelay(row);
      return delay != null && delay >= 30 && delay < 45;
    }).length,
    deny: rows.filter((row) => {
      const delay = effectiveDelay(row);
      return delay != null && delay >= 45;
    }).length,
    pending: rows.filter((row) => effectiveDelay(row) == null).length,
    total: rows.length,
    anticipado: rows.filter((row) => row.hora_cita != null && row.h_atencion != null && (row.demora_cita_min ?? null) === 0).length,
  };

  const breakdown: Record<string, DashboardBreakdownEntry> = {};
  rows.forEach((row) => {
    const plantName = row.planta || "Sin planta";
    if (!breakdown[plantName]) breakdown[plantName] = { total: 0, ok: 0 };
    breakdown[plantName].total++;
    const delay = effectiveDelay(row);
    if (delay != null && delay < 30) breakdown[plantName].ok++;
  });

  const zones: DashboardZone[] = Object.entries(breakdown)
    .map(([name, value]) => {
      const pct = value.total > 0 ? Math.round((value.ok / value.total) * 100) : 0;
      return {
        name,
        count: value.total,
        pct,
        tone: value.total > 0 && pct >= 70 ? "ok" as const : "deny" as const,
      };
    })
    .sort((a, b) => b.count - a.count);

  const events: DashboardEvent[] = rows
    .slice()
    .sort((a, b) => (b.h_registro ?? "").localeCompare(a.h_registro ?? ""))
    .slice(0, 6)
    .map((row) => {
      const delay = effectiveDelay(row);
      let status: DashboardEvent["status"] = "ok";
      let label = "Autorizado";
      if (delay == null) {
        status = "pending";
        label = "En proceso";
      } else if (delay >= 45) {
        status = "deny";
        label = "Con demora";
      } else if (delay >= 30) {
        status = "warn";
        label = "Revisión";
      }
      return {
        plate: row.razon_social || "N/A",
        status,
        label,
        info: row.empresa || "Sin empresa",
        gate: row.planta || "Sin planta",
        time: row.h_registro ? row.h_registro.substring(0, 5) : "--:--",
        espera_min: delay,
      };
    });

  const alerts: DashboardAlert[] = rows
    .map((row) => ({ row, delay: effectiveDelay(row) }))
    .filter((entry) => entry.delay != null && entry.delay >= 45)
    .sort((a, b) => (b.delay ?? 0) - (a.delay ?? 0))
    .slice(0, 3)
    .map(({ row, delay }) => ({
      title: row.hora_cita ? "Alerta de Demora sobre Cita" : "Alerta de Espera",
      sub: `${row.razon_social ?? "N/A"} · ${delay} min · ${formatGateLabelFromPlant(row.planta || "Sin planta")}`,
      tone: "deny" as const,
    }));

  const flowMap: Record<string, DashboardFlowRow> = {};
  rows.forEach((row) => {
    const key = flowBucketKey(row, timeframe);
    if (!flowMap[key]) flowMap[key] = { h: key, ok: 0, warn: 0, deny: 0 };
    const delay = effectiveDelay(row);
    if (delay != null && delay >= 45) flowMap[key].deny++;
    else if (delay != null && delay >= 30) flowMap[key].warn++;
    else flowMap[key].ok++;
  });
  const paddedFlowMap = padFlowData(flowMap, timeframe);

  const reasonMap: Record<string, number> = {};
  rows.filter((row) => row.motivo_demora).forEach((row) => {
    const reason = row.motivo_demora as string;
    reasonMap[reason] = (reasonMap[reason] || 0) + 1;
  });

  // Top provider by delay rate (min 3 visits)
  const provMap: Record<string, { total: number; delayed: number }> = {};
  rows.filter(r => r.empresa).forEach(r => {
    const k = r.empresa as string;
    if (!provMap[k]) provMap[k] = { total: 0, delayed: 0 };
    provMap[k].total++;
    const delay = effectiveDelay(r);
    if (delay != null && delay >= 30) provMap[k].delayed++;
  });
  const topProvider = Object.entries(provMap)
    .filter(([, v]) => v.total >= 3)
    .map(([empresa, v]) => ({ empresa, total: v.total, delayed: v.delayed, rate: Math.round((v.delayed / v.total) * 100) }))
    .sort((a, b) => b.rate - a.rate)[0] ?? null;

  return {
    kpis,
    breakdown,
    zones,
    events,
    alerts,
    topProvider,
    flowData: Object.values(paddedFlowMap).sort((a, b) => a.h.localeCompare(b.h)),
    delayReasons: Object.entries(reasonMap)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count),
  };
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

  for (const result of results) {
    for (const row of result.flowData) {
      if (!flowMap[row.h]) flowMap[row.h] = { h: row.h, ok: 0, warn: 0, deny: 0 };
      flowMap[row.h].ok += row.ok;
      flowMap[row.h].warn += row.warn;
      flowMap[row.h].deny += row.deny;
    }
    for (const [plant, value] of Object.entries(result.breakdown)) {
      // Site aggregation may merge per-gate stats whose breakdown already contains
      // the same company-wide rows. Keep the largest row per plant to avoid duplicates.
      if (!breakdown[plant]) {
        breakdown[plant] = { total: value.total, ok: value.ok };
        continue;
      }
      breakdown[plant].total = Math.max(breakdown[plant].total, value.total);
      breakdown[plant].ok = Math.max(breakdown[plant].ok, value.ok);
    }
    for (const reason of result.delayReasons ?? []) {
      delayReasonMap[reason.motivo] = (delayReasonMap[reason.motivo] ?? 0) + reason.count;
    }
  }

  const zones: DashboardZone[] = Object.entries(breakdown)
    .map(([name, value]) => {
      const pct = value.total > 0 ? Math.round((value.ok / value.total) * 100) : 0;
      return {
        name,
        count: value.total,
        pct,
        tone: (value.total > 0 && pct >= 70 ? "ok" : "deny") as DashboardZone["tone"],
      };
    })
    .sort((a, b) => b.count - a.count);

  const topProvider = results
    .map(r => r.topProvider ?? null)
    .filter((p): p is NonNullable<typeof p> => p != null)
    .sort((a, b) => b.rate - a.rate)[0] ?? null;

  return {
    kpis,
    events: results.flatMap((result) => result.events).slice(0, 6),
    alerts: results.flatMap((result) => result.alerts).slice(0, 3),
    breakdown,
    zones,
    topProvider,
    flowData: Object.values(flowMap).sort((a, b) => a.h.localeCompare(b.h)),
    delayReasons: Object.entries(delayReasonMap)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count),
  };
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
    return getDashboardStatsAdmin(plant, from, to, timeframe);
  }

  const companyId = ctx.companyId!;

  try {
    let query = supabase
      .from("atenciones")
      .select("fecha, razon_social, empresa, planta, h_registro, h_atencion, hora_cita, espera_min, demora_cita_min, motivo_demora")
      .eq("company_id", companyId)
      .gte("fecha", from)
      .lte("fecha", to)
      .limit(5000);
    if (plant !== "Todos") query = query.eq("planta", plant);
    const { data, error } = await query;
    if (error || !data) throw error ?? new Error("Sin datos de dashboard");
    return buildDashboardStatsFromRows(data as DashboardMetricRow[], timeframe);
  } catch (err) {
    logError("getDashboardStats", err);
    return { events: [], kpis: { ok: 0, deny: 0, warn: 0, pending: 0, total: 0 }, breakdown: {}, flowData: [], zones: [], alerts: [], delayReasons: [] };
  }
}

// ─── ADMIN OVERVIEW (cross-company, usa service_role) ──────────────────────────

async function getDashboardStatsAdmin(
  plant: string,
  from: string,
  to: string,
  timeframe = "Día",
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

  return buildDashboardStatsFromRows(data as DashboardMetricRow[], timeframe);
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
      let query = supabase
        .from("atenciones")
        .select("espera_min, demora_cita_min")
        .eq("company_id", companyId)
        .gte("fecha", fromDate)
        .lte("fecha", toDate)
        .limit(5000);
      if (sitePlants) query = query.in("planta", sitePlants);
      else if (plant !== "Todos") query = query.eq("planta", plant);
      const { data } = await query;
      const rows = (data ?? []) as Array<{ espera_min: number | null; demora_cita_min: number | null }>;
      return [{
        ok: rows.filter((row) => {
          const delay = row.demora_cita_min ?? row.espera_min;
          return delay != null && delay < 30;
        }).length,
        deny: rows.filter((row) => {
          const delay = row.demora_cita_min ?? row.espera_min;
          return delay != null && delay >= 45;
        }).length,
        warn: rows.filter((row) => {
          const delay = row.demora_cita_min ?? row.espera_min;
          return delay != null && delay >= 30 && delay < 45;
        }).length,
        pending: rows.filter((row) => (row.demora_cita_min ?? row.espera_min) == null).length,
        total: rows.length,
      }];
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
      .select("h_registro, fecha, espera_min, demora_cita_min")
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
    (data as { h_registro: string; fecha: string; espera_min: number | null; demora_cita_min: number | null }[]).forEach((d) => {
      const hour = parseInt(d.h_registro.substring(0, 2));
      if (isNaN(hour)) return;
      const parts = d.fecha.split("-").map(Number);
      const dow = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
      const key = `${dow}-${hour}`;
      if (!hmMap[key]) hmMap[key] = { total: 0, delayed: 0 };
      hmMap[key].total++;
      const delay = d.demora_cita_min ?? d.espera_min;
      if (delay != null && delay >= 30) hmMap[key].delayed++;
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
