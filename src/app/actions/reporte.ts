"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { dateRange } from "./_helpers";
import type { ReporteStatsRow } from "@/types/dashboard";
import { getPlantsForSite, plantsForSite, normalizeGateAssignments } from "@/lib/gates";
import { getUserPlants } from "./companies";

interface AtencionRaw {
  espera_min: number | null;
  demora_cita_min?: number | null;
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

function metricDelay(row: Pick<ReporteAtencionRow, "demora_cita_min" | "espera_min">): number | null {
  return row.demora_cita_min ?? row.espera_min ?? null;
}

const MO = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export async function getReporteData(
  plant: string = "Todos",
  timeframe: string = "Día",
  segments?: string[],
  soloDemoras?: boolean,
  site?: string,
) {
  const supabase = await createClient();
  const ctx = await getUserContext();
  const { from, to } = dateRange(timeframe);

  if (!ctx) return null;

  const cid = ctx.companyId;

  let baseStats: ReporteStatsRow | null = null;

  if (cid) {
    // Skip RPC when filtering by site (RPC only supports single plant or all)
    if (site && site !== "Todos") {
      baseStats = null;
    } else {
      const { data: rpcData } = await supabase.rpc("get_reporte_stats", { p_company_id: cid, p_date_from: from, p_date_to: to, p_planta: plant });
      baseStats = (rpcData?.[0] ?? null) as ReporteStatsRow | null;
    }
  }

  const dataDb = ctx.isAdmin && !cid
    ? (await import("@/utils/supabase/admin")).createAdminClient()
    : cid
      ? supabase
      : null;
  if (!dataDb) return null;

  let query = dataDb.from("atenciones").select("*");
  if (cid) query = query.eq("company_id", cid);

  // Site filter takes precedence over plant filter
  if (site && site !== "Todos") {
    // 1. Prefer company-specific gates (works for any company)
    const allPlants = await getUserPlants();
    const userGates = normalizeGateAssignments(null, allPlants);
    let sitePlants = plantsForSite(site, userGates);
    // 2. Fall back to static map for legacy clients (Cajamarquilla / Lomas)
    if (sitePlants.length === 0) sitePlants = getPlantsForSite(site);
    if (sitePlants.length > 0) {
      query = query.in("planta", sitePlants);
    }
  } else if (plant !== "Todos") {
    query = query.eq("planta", plant);
  }
  
  // Filtro por segmentos (selección múltiple)
  if (segments && segments.length > 0) {
    const conditions: string[] = [];
    for (const seg of segments) {
      if (seg === "Normal") conditions.push("or(demora_cita_min.lt.30,and(demora_cita_min.is.null,espera_min.lt.30))");
      else if (seg === "Moderado") conditions.push("or(and(demora_cita_min.gte.30,demora_cita_min.lt.45),and(demora_cita_min.is.null,and(espera_min.gte.30,espera_min.lt.45)))");
      else if (seg === "Alto") conditions.push("or(and(demora_cita_min.gte.45,demora_cita_min.lt.90),and(demora_cita_min.is.null,and(espera_min.gte.45,espera_min.lt.90)))");
      else if (seg === "Crítico") conditions.push("or(demora_cita_min.gte.90,and(demora_cita_min.is.null,espera_min.gte.90))");
      else if (seg === "Pendiente") conditions.push("and(demora_cita_min.is.null,espera_min.is.null)");
    }
    if (conditions.length > 0) {
      query = query.or(conditions.join(","));
    }
  }
  
  // Filtro "Solo demoras" — oculta Normal
  if (soloDemoras) {
    query = query.or("demora_cita_min.gte.30,and(demora_cita_min.is.null,espera_min.gte.30)");
  }
  
  query = query.gte("fecha", from).lte("fecha", to).order("fecha", { ascending: false }).limit(ctx.isAdmin && !cid ? 5000 : 2000);

  const { data, error } = await query;
  if (error || !data) return null;

  const rows = data as ReporteAtencionRow[];
  const withTime = rows.map((row) => ({ ...row, metric: metricDelay(row) })).filter((row): row is ReporteAtencionRow & { metric: number } => row.metric != null);
  const esperas = withTime.map((d) => d.metric).sort((a, b) => a - b);

  const total    = baseStats ? Number(baseStats.total)    : rows.length;
  const ok       = baseStats ? Number(baseStats.ok)       : withTime.filter((d) => d.metric < 30).length;
  const warn     = baseStats ? Number(baseStats.warn)     : withTime.filter((d) => d.metric >= 30 && d.metric < 45).length;
  const alto     = baseStats ? Number(baseStats.alto)     : withTime.filter((d) => d.metric >= 45 && d.metric < 90).length;
  const critico  = baseStats ? Number(baseStats.critico)  : withTime.filter((d) => d.metric >= 90).length;
  const pending  = baseStats ? Number(baseStats.pending)  : rows.filter((d) => metricDelay(d) == null).length;
  const avgEspera = baseStats ? Number(baseStats.avg_espera) : (esperas.length ? Math.round(esperas.reduce((s, v) => s + v, 0) / esperas.length) : 0);
  const maxEspera = baseStats ? Number(baseStats.max_espera) : (esperas.length ? esperas[esperas.length - 1] : 0);
  const p90Espera = esperas.length ? esperas[Math.min(Math.floor(esperas.length * 0.9), esperas.length - 1)] : 0;
  const pctOnTime = baseStats ? (baseStats.pct_on_time ?? null) : (withTime.length > 0 ? Math.round((ok / withTime.length) * 100) : null);

  // Plant breakdown
  const plantNames = [...new Set(rows.map((d) => d.planta).filter((value): value is string => Boolean(value)))];
  const plantStats = plantNames.map(p => {
    const pRows = rows.filter((d) => d.planta === p);
    const wt = pRows.map((row) => ({ ...row, metric: metricDelay(row) })).filter((row): row is ReporteAtencionRow & { metric: number } => row.metric != null);
    const pOk = wt.filter((d) => d.metric < 30).length;
    const pW = wt.filter((d) => d.metric >= 30 && d.metric < 45).length;
    const pA = wt.filter((d) => d.metric >= 45 && d.metric < 90).length;
    const pC = wt.filter((d) => d.metric >= 90).length;
    const pPnd = pRows.filter((d) => metricDelay(d) == null).length;
    const pEsp = wt.map((d) => d.metric);
    const pAvg = pEsp.length ? Math.round(pEsp.reduce((s, v) => s + v, 0) / pEsp.length) : 0;
    const pPct = wt.length > 0 ? Math.round((pOk / wt.length) * 100) : null;
    return { planta: p, total: pRows.length, ok: pOk, warn: pW, alto: pA, critico: pC, pending: pPnd, avg: pAvg, pctOnTime: pPct };
  });

  // Daily trend
  const trendMap: Record<string, { total: number; onTime: number; delayed: number }> = {};
  rows.forEach((d) => {
    const k = d.fecha ?? "";
    if (!trendMap[k]) trendMap[k] = { total: 0, onTime: 0, delayed: 0 };
    trendMap[k].total++;
    const delay = metricDelay(d);
    if (delay != null && delay < 30) trendMap[k].onTime++;
    else if (delay != null) trendMap[k].delayed++;
  });
  const trendData = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => {
      const pts = date.split("-");
      const label = pts.length === 3 ? `${parseInt(pts[2])} ${MO[parseInt(pts[1]) - 1]}` : date;
      return { date, label, ...v };
    });

  // Segments
  const segmentDistribution = [
    { name: "Normal",    range: "< 30 min",   count: ok,      color: "var(--sg-success)" },
    { name: "Moderado",  range: "30–45 min",  count: warn,    color: "var(--sg-warn)" },
    { name: "Alto",      range: "45–90 min",  count: alto,    color: "#e07b3a" },
    { name: "Crítico",   range: "> 90 min",   count: critico, color: "var(--sg-danger)" },
    { name: "Pendiente", range: "Sin cierre", count: pending, color: "var(--sg-info)" },
  ].map(s => ({ ...s, pct: total > 0 ? Math.round((s.count / total) * 100) : 0 }));

  // SLA per provider: total visits + delay count + rate
  const slaMap: Record<string, { total: number; delayed: number; esperas: number[] }> = {};
  rows.filter(d => d.empresa).forEach(d => {
    const k = d.empresa as string;
    if (!slaMap[k]) slaMap[k] = { total: 0, delayed: 0, esperas: [] };
    slaMap[k].total++;
    const delay = metricDelay(d);
    if (delay != null && delay >= 30) {
      slaMap[k].delayed++;
      slaMap[k].esperas.push(delay);
    }
  });

  // Top companies with delays
  const compMap: Record<string, { count: number; esperas: number[] }> = {};
  rows.filter((d) => {
    const delay = metricDelay(d);
    return delay != null && delay >= 30 && d.empresa;
  }).forEach((d) => {
    const k = d.empresa as string;
    if (!compMap[k]) compMap[k] = { count: 0, esperas: [] };
    compMap[k].count++;
    compMap[k].esperas.push(metricDelay(d) as number);
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
  rows.filter((d) => d.empresa && (metricDelay(d) ?? 0) >= 30).forEach((d) => {
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

  // SLA de proveedores: tasa de demora por empresa (mín. 3 visitas)
  const providerSLA = Object.entries(slaMap)
    .filter(([, v]) => v.total >= 3)
    .map(([empresa, v]) => {
      const onTime    = v.total - v.delayed;
      const rate      = Math.round((v.delayed / v.total) * 100);
      const avgEspera = v.esperas.length > 0
        ? Math.round(v.esperas.reduce((s, e) => s + e, 0) / v.esperas.length)
        : null;
      const grade = rate <= 10 ? "A" : rate <= 25 ? "B" : rate <= 50 ? "C" : rate <= 75 ? "D" : "F";
      const ct = compTrend[empresa];
      let trend: "up" | "down" | "stable" = "stable";
      if (ct && ct.first + ct.second >= 4) {
        const delta = ct.second - ct.first;
        if (delta >= 2) trend = "up";
        else if (delta <= -2) trend = "down";
      }
      return { empresa, total: v.total, onTime, delayed: v.delayed, rate, grade, avgEspera, trend };
    })
    .sort((a, b) => b.rate - a.rate);

  // Operation types
  const opMap: Record<string, { count: number; delayed: number; esperas: number[] }> = {};
  rows.forEach((d) => {
    const k = d.tipo_operacion || "Sin tipo";
    if (!opMap[k]) opMap[k] = { count: 0, delayed: 0, esperas: [] };
    opMap[k].count++;
    const delay = metricDelay(d);
    if (delay != null && delay >= 30) opMap[k].delayed++;
    if (delay != null) opMap[k].esperas.push(delay);
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
    const delay = metricDelay(d);
    if (delay == null)              { agentMap[k].pending++; }
    else if (delay < 30)            { agentMap[k].ok++;     agentMap[k].esperas.push(delay); }
    else                            { agentMap[k].delayed++; agentMap[k].esperas.push(delay); }
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
    const delay = metricDelay(d);
    if (delay != null && delay >= 45) flowMap[key].deny++;
    else if (delay != null && delay >= 30) flowMap[key].warn++;
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
    plantStats, segments: segmentDistribution, topCompanies, providerSLA, opTypes, delayReasons, agentStats,
    flowData, trendData, heatmap,
  };
}

// ─── Motivos de demora disponibles ───────────────────────────────────────────

export async function getMotivosDemora() {
  const supabase = await createClient();
  const ctx = await getUserContext();
  if (!ctx) return [];

  const client = ctx.isAdmin && !ctx.companyId
    ? (await import("@/utils/supabase/admin")).createAdminClient()
    : supabase;

  let query = client.from("atenciones").select("motivo_demora").not("motivo_demora", "is", null);
  if (ctx.companyId) query = query.eq("company_id", ctx.companyId);
  query = query.limit(5000);

  const { data, error } = await query;
  if (error || !data) return [];

  const motivos = [...new Set((data as { motivo_demora: string }[]).map((d) => d.motivo_demora))].sort();
  return motivos;
}
