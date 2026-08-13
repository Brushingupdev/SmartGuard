"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { normalizeGateAssignments, plantsForSite, formatGateLabelFromPlant } from "@/lib/gates";
import { nowLima, daysAgoLima, logError, dateRange } from "./_helpers";
import { fetchPagedRows } from "./_pagination";
import {
  getDashboardIntervalExpression,
  normalizeDashboardFilters,
  refineDashboardDateRange,
  type DashboardFilters,
} from "@/lib/dashboardFilters";
import type {
  DashboardKpis,
  DashboardFlowDetail,
  DashboardFlowDetailRecord,
  DashboardFlowRow,
  DashboardEvent,
  DashboardAlert,
  DashboardBreakdownEntry,
  DashboardZone,
  DashboardStatsResult,
  HeatmapCell,
} from "@/types/dashboard";

type DashboardMetricRow = {
  id?: number | null;
  fecha: string | null;
  razon_social: string | null;
  empresa: string | null;
  planta: string | null;
  tipo?: string | null;
  h_registro: string | null;
  h_atencion: string | null;
  h_dev_docs?: string | null;
  hora_cita: string | null;
  espera_min: number | null;
  demora_cita_min: number | null;
  tiempo_total_min?: number | null;
  motivo_demora: string | null;
  tipo_operacion?: string | null;
  observacion?: string | null;
};

function effectiveDelay(row: Pick<DashboardMetricRow, "demora_cita_min" | "espera_min">): number | null {
  return row.demora_cita_min ?? row.espera_min ?? null;
}

function getDashboardDateRange(timeframe: string, filters?: DashboardFilters) {
  return refineDashboardDateRange(timeframe, filters, dateRange(timeframe));
}

// The concrete Supabase builder generic differs between authenticated and
// service-role clients, while both expose the same filter methods.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyDashboardDataFilters<T extends { or: (value: string) => any; eq: (column: string, value: unknown) => any }>(
  query: T,
  filters?: DashboardFilters,
): T {
  const normalized = normalizeDashboardFilters(filters);
  const intervalExpression = getDashboardIntervalExpression(normalized.intervals);
  let filtered = query;
  if (intervalExpression) filtered = filtered.or(intervalExpression);
  if (normalized.observation) filtered = filtered.eq("motivo_demora", normalized.observation);
  return filtered;
}

function previousDashboardRange(range: { from: string; to: string }): { from: string; to: string } {
  const from = new Date(`${range.from}T12:00:00Z`);
  const to = new Date(`${range.to}T12:00:00Z`);
  const durationDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
  const previousTo = new Date(from.getTime() - 86_400_000);
  const previousFrom = new Date(previousTo.getTime() - (durationDays - 1) * 86_400_000);
  return {
    from: previousFrom.toISOString().slice(0, 10),
    to: previousTo.toISOString().slice(0, 10),
  };
}

function flowBucketKey(row: DashboardMetricRow, timeframe: string): string {
  if (timeframe === "Día") return row.h_registro ? row.h_registro.substring(0, 2) : "00";
  if (!row.fecha) return "1";
  const d = new Date(row.fecha + "T12:00:00");
  if (timeframe === "Semana") return String(d.getDay()); // 0=Dom … 6=Sáb
  if (timeframe === "Mes") return String(Math.min(4, Math.ceil(d.getDate() / 7)));
  if (/^\d{4}$/.test(timeframe)) return String(d.getMonth() + 1).padStart(2, "0");
  return row.h_registro ? row.h_registro.substring(0, 2) : "00";
}

function classifyDashboardStatus(delay: number | null): DashboardEvent["status"] {
  if (delay == null) return "pending";
  if (delay >= 45) return "deny";
  if (delay >= 30) return "warn";
  return "ok";
}

function formatFlowBucketLabel(bucket: string, timeframe: string): string {
  if (timeframe === "Día") return `${bucket}:00 - ${bucket}:59`;
  if (timeframe === "Semana") {
    const DAYS_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return DAYS_LONG[Number(bucket)] ?? bucket;
  }
  if (timeframe === "Mes") return `Semana ${bucket}`;
  if (/^\d{4}$/.test(timeframe)) {
    const MONTHS = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];
    return MONTHS[Number(bucket) - 1] ?? bucket;
  }
  return bucket;
}

function formatFlowBucketSubtitle(bucket: string, timeframe: string): string {
  if (timeframe === "Mes") {
    const week = Number(bucket);
    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(week * 7, 31);
    return `Vehículos registrados entre los días ${startDay} y ${endDay} del período mensual actual.`;
  }
  if (timeframe === "Semana") return `Vehículos registrados durante ${formatFlowBucketLabel(bucket, timeframe).toLowerCase()} dentro de la semana activa.`;
  if (timeframe === "Día") return `Vehículos registrados durante la franja ${formatFlowBucketLabel(bucket, timeframe)}.`;
  if (/^\d{4}$/.test(timeframe)) return `Vehículos registrados durante ${formatFlowBucketLabel(bucket, timeframe)} del año ${timeframe}.`;
  return "Detalle operativo del segmento seleccionado.";
}

function createDashboardFlowRow(h: string): DashboardFlowRow {
  return {
    h,
    ok: 0,
    warn: 0,
    deny: 0,
    pending: 0,
    delayTotal: 0,
    delaySamples: 0,
    avgWait: 0,
  };
}

function finalizeDashboardFlowRows(
  flowMap: Record<string, DashboardFlowRow>,
): DashboardFlowRow[] {
  return Object.values(flowMap)
    .map((row) => ({
      ...row,
      avgWait: row.delaySamples > 0 ? Math.round((row.delayTotal / row.delaySamples) * 10) / 10 : 0,
    }))
    .sort((a, b) => a.h.localeCompare(b.h));
}

function padFlowData(
  flowMap: Record<string, DashboardFlowRow>,
  timeframe: string,
): Record<string, DashboardFlowRow> {
  const padded = { ...flowMap };
  if (timeframe === "Semana") {
    for (let i = 0; i < 7; i++) {
      const k = String(i);
      if (!padded[k]) padded[k] = createDashboardFlowRow(k);
    }
  } else if (timeframe === "Mes") {
    for (let i = 1; i <= 4; i++) {
      const k = String(i);
      if (!padded[k]) padded[k] = createDashboardFlowRow(k);
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
    .sort((a, b) =>
      `${b.fecha ?? ""}T${b.h_registro ?? ""}`.localeCompare(
        `${a.fecha ?? ""}T${a.h_registro ?? ""}`,
      ))
    .slice(0, 12)
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
        date: row.fecha,
        observation: row.motivo_demora,
        detail: row.observacion ?? row.tipo_operacion,
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
    if (!flowMap[key]) flowMap[key] = createDashboardFlowRow(key);
    const delay = effectiveDelay(row);
    const status = classifyDashboardStatus(delay);
    flowMap[key][status] += 1;
    if (delay != null) {
      flowMap[key].delayTotal += delay;
      flowMap[key].delaySamples++;
    }
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
    flowData: finalizeDashboardFlowRows(paddedFlowMap),
    delayReasons: Object.entries(reasonMap)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count),
  };
}

function buildFlowSegmentDetail(rows: DashboardMetricRow[], timeframe: string, bucket: string): DashboardFlowDetail {
  const scopedRows = rows.filter((row) => flowBucketKey(row, timeframe) === bucket);
  const stats = buildDashboardStatsFromRows(scopedRows, timeframe);
  const records: DashboardFlowDetailRecord[] = scopedRows
    .slice()
    .sort((a, b) => {
      const dateCompare = (b.fecha ?? "").localeCompare(a.fecha ?? "");
      if (dateCompare !== 0) return dateCompare;
      return (b.h_registro ?? "").localeCompare(a.h_registro ?? "");
    })
    .slice(0, 12)
    .map((row) => {
      const delay = effectiveDelay(row);
      return {
        id: row.id ?? null,
        fecha: row.fecha ?? "",
        time: row.h_registro ? row.h_registro.substring(0, 5) : "--:--",
        h_registro: row.h_registro ?? null,
        h_atencion: row.h_atencion ?? null,
        h_dev_docs: row.h_dev_docs ?? null,
        hora_cita: row.hora_cita ?? null,
        razon_social: row.razon_social ?? "N/A",
        empresa: row.empresa ?? "Sin empresa",
        gate: row.planta ?? "Sin planta",
        tipo: row.tipo ?? null,
        delay,
        demora_cita_min: row.demora_cita_min ?? null,
        tiempo_total_min: row.tiempo_total_min ?? null,
        status: classifyDashboardStatus(delay),
        motivo_demora: row.motivo_demora ?? null,
        tipo_operacion: row.tipo_operacion ?? null,
        observacion: row.observacion ?? null,
      };
    });

  return {
    timeframe,
    bucket,
    label: formatFlowBucketLabel(bucket, timeframe),
    subtitle: formatFlowBucketSubtitle(bucket, timeframe),
    total: scopedRows.length,
    kpis: stats.kpis,
    topGates: stats.zones.slice(0, 3),
    records,
  };
}

function guardAgentAliases(ctx: Awaited<ReturnType<typeof getUserContext>>): string[] {
  if (!ctx || ctx.role !== "guardia") return [];
  return [...new Set([ctx.displayName, ctx.email].map((value) => value?.trim()).filter(Boolean) as string[])];
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
      if (!flowMap[row.h]) flowMap[row.h] = createDashboardFlowRow(row.h);
      flowMap[row.h].ok += row.ok;
      flowMap[row.h].warn += row.warn;
      flowMap[row.h].pending += row.pending;
      flowMap[row.h].delayTotal += row.delayTotal;
      flowMap[row.h].delaySamples += row.delaySamples;
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
    events: results
      .flatMap((result) => result.events)
      .sort((a, b) =>
        `${b.date ?? ""}T${b.time}`.localeCompare(`${a.date ?? ""}T${a.time}`),
      )
      .slice(0, 12),
    alerts: results.flatMap((result) => result.alerts).slice(0, 3),
    breakdown,
    zones,
    topProvider,
    flowData: finalizeDashboardFlowRows(flowMap),
    delayReasons: Object.entries(delayReasonMap)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getDashboardStats(
  plant: string = "Todos",
  timeframe: string = "Día",
  filters?: DashboardFilters,
): Promise<DashboardStatsResult> {
  const supabase = await createClient();
  const ctx = await getUserContext();
  const { from, to } = getDashboardDateRange(timeframe, filters);

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
    const results = await Promise.all(sitePlants.map((sitePlant) => getDashboardStats(sitePlant, timeframe, filters)));
    return mergeDashboardStats(results);
  }

  if (ctx.isAdmin && !ctx.companyId) {
    return getDashboardStatsAdmin(plant, from, to, timeframe, filters);
  }

  const companyId = ctx.companyId!;

  try {
    let query = supabase
      .from("atenciones")
      .select("fecha, razon_social, empresa, planta, h_registro, h_atencion, hora_cita, espera_min, demora_cita_min, motivo_demora")
      .eq("company_id", companyId)
      .gte("fecha", from)
      .lte("fecha", to);
    if (plant !== "Todos") query = query.eq("planta", plant);
    const aliases = guardAgentAliases(ctx);
    if (aliases.length > 0) query = query.in("agente", aliases);
    query = applyDashboardDataFilters(query, filters);
    const data = await fetchPagedRows<DashboardMetricRow>(query);
    return buildDashboardStatsFromRows(data, timeframe);
  } catch (err) {
    logError("getDashboardStats", err);
    return { events: [], kpis: { ok: 0, deny: 0, warn: 0, pending: 0, total: 0 }, breakdown: {}, flowData: [], zones: [], alerts: [], delayReasons: [] };
  }
}

export async function getDashboardFlowSegmentDetail(
  plant: string = "Todos",
  timeframe: string = "Mes",
  bucket: string,
  filters?: DashboardFilters,
): Promise<DashboardFlowDetail | null> {
  const ctx = await getUserContext();
  if (!ctx) return null;

  const { from, to } = getDashboardDateRange(timeframe, filters);

  try {
    if (ctx.isAdmin && !ctx.companyId) {
      const { createAdminClient } = await import("@/utils/supabase/admin");
      const admin = createAdminClient();
      const supabase = await createClient();
      const sitePlants = await resolveSitePlants(supabase, ctx, plant);
      let query = admin
        .from("atenciones")
        .select("id, fecha, razon_social, empresa, planta, tipo, h_registro, h_atencion, h_dev_docs, hora_cita, espera_min, demora_cita_min, tiempo_total_min, motivo_demora, tipo_operacion, observacion")
        .gte("fecha", from)
        .lte("fecha", to);
      if (sitePlants) {
        if (sitePlants.length === 0) return buildFlowSegmentDetail([], timeframe, bucket);
        query = query.in("planta", sitePlants);
      } else if (plant !== "Todos") {
        query = query.eq("planta", plant);
      }
      query = applyDashboardDataFilters(query, filters);
      const data = await fetchPagedRows<DashboardMetricRow>(query);
      return buildFlowSegmentDetail(data, timeframe, bucket);
    }

    const supabase = await createClient();
    const companyId = ctx.companyId!;
    const sitePlants = await resolveSitePlants(supabase, ctx, plant);

    let query = supabase
      .from("atenciones")
      .select("id, fecha, razon_social, empresa, planta, tipo, h_registro, h_atencion, h_dev_docs, hora_cita, espera_min, demora_cita_min, tiempo_total_min, motivo_demora, tipo_operacion, observacion")
      .eq("company_id", companyId)
      .gte("fecha", from)
      .lte("fecha", to);

    if (sitePlants) {
      if (sitePlants.length === 0) return buildFlowSegmentDetail([], timeframe, bucket);
      query = query.in("planta", sitePlants);
    } else if (plant !== "Todos") {
      query = query.eq("planta", plant);
    }

    const aliases = guardAgentAliases(ctx);
    if (aliases.length > 0) query = query.in("agente", aliases);
    query = applyDashboardDataFilters(query, filters);

    const data = await fetchPagedRows<DashboardMetricRow>(query);
    return buildFlowSegmentDetail(data, timeframe, bucket);
  } catch (err) {
    logError("getDashboardFlowSegmentDetail", err, { plant, timeframe, bucket });
    return null;
  }
}

// ─── ADMIN OVERVIEW (cross-company, usa service_role) ──────────────────────────

async function getDashboardStatsAdmin(
  plant: string,
  from: string,
  to: string,
  timeframe = "Día",
  filters?: DashboardFilters,
): Promise<DashboardStatsResult> {
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  let query = admin.from("atenciones").select("*")
    .gte("fecha", from).lte("fecha", to);
  if (plant !== "Todos") query = query.eq("planta", plant);
  query = applyDashboardDataFilters(query, filters);

  let data: DashboardMetricRow[];
  try {
    data = await fetchPagedRows<DashboardMetricRow>(query);
  } catch {
    return { events: [], kpis: { ok: 0, deny: 0, warn: 0, pending: 0, total: 0 }, breakdown: {}, flowData: [], zones: [], alerts: [], delayReasons: [] };
  }

  return buildDashboardStatsFromRows(data, timeframe);
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

export async function getDashboardTrends(
  plant: string = "Todos",
  timeframe: string = "Día",
  filters?: DashboardFilters,
): Promise<TrendResult> {
  const empty: TrendResult = {
    kpis: { ok: 0, deny: 0, warn: 0, pending: 0, total: 0 },
    trend: { ok: null, deny: null, total: null, puntualidad: null },
    prevPuntualidad: null,
  };

  try {
    const ctx = await getUserContext();
    if (!ctx?.companyId) return empty;

    const supabase = await createClient();
    const { from, to } = getDashboardDateRange(timeframe, filters);
    const companyId = ctx.companyId;
    const { from: prevFrom, to: prevTo } = previousDashboardRange({ from, to });
    const sitePlants = await resolveSitePlants(supabase, ctx, plant);

    const fetchKpis = async (fromDate: string, toDate: string) => {
      let query = supabase
        .from("atenciones")
        .select("espera_min, demora_cita_min")
        .eq("company_id", companyId)
        .gte("fecha", fromDate)
        .lte("fecha", toDate);
      if (sitePlants) query = query.in("planta", sitePlants);
      else if (plant !== "Todos") query = query.eq("planta", plant);
      const aliases = guardAgentAliases(ctx);
      if (aliases.length > 0) query = query.in("agente", aliases);
      query = applyDashboardDataFilters(query, filters);
      const rows = await fetchPagedRows<{
        espera_min: number | null;
        demora_cita_min: number | null;
      }>(query);
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

export async function getDashboardHeatmap(
  plant: string = "Todos",
  timeframe: string = "Mes",
  filters?: DashboardFilters,
): Promise<HeatmapCell[]> {
  try {
    const ctx = await getUserContext();
    if (!ctx?.companyId) return [];

    const supabase = await createClient();
    const sitePlants = await resolveSitePlants(supabase, ctx, plant);
    const normalizedFilters = normalizeDashboardFilters(filters);
    const hasHistoricalDateFilter = /^\d{4}$/.test(timeframe) && normalizedFilters.month !== null;
    const range = hasHistoricalDateFilter
      ? getDashboardDateRange(timeframe, filters)
      : { from: daysAgoLima(180), to: nowLima().date };

    let query = supabase
      .from("atenciones")
      .select("h_registro, fecha, espera_min, demora_cita_min")
      .eq("company_id", ctx.companyId)
      .gte("fecha", range.from)
      .lte("fecha", range.to)
      .not("h_registro", "is", null)
      .not("fecha", "is", null);

    if (sitePlants) {
      if (sitePlants.length === 0) return [];
      query = query.in("planta", sitePlants);
    } else if (plant !== "Todos") {
      query = query.eq("planta", plant);
    }
    const aliases = guardAgentAliases(ctx);
    if (aliases.length > 0) query = query.in("agente", aliases);
    query = applyDashboardDataFilters(query, filters);

    const data = await fetchPagedRows<{
      h_registro: string;
      fecha: string;
      espera_min: number | null;
      demora_cita_min: number | null;
    }>(query);
    if (!data.length) return [];

    const hmMap: Record<string, { total: number; delayed: number }> = {};
    data.forEach((d) => {
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
