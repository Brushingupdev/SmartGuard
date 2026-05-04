"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { nowLima, daysAgoLima } from "./_helpers";

export async function getAlertsData() {
  const ctx = await getUserContext();
  const db = ctx?.isAdmin
    ? (await import("@/utils/supabase/admin")).createAdminClient()
    : await createClient();
  const { date: todayStr, hour, minute, second } = nowLima();
  const sevenStr = daysAgoLima(7);
  const nowMinutes = hour * 60 + minute + second / 60;

  let closedQuery = db
    .from("atenciones")
    .select("id, razon_social, empresa, company_id, planta, h_registro, h_atencion, espera_min, segmento_espera, tipo_operacion")
    .eq("fecha", todayStr)
    .gte("espera_min", 30)
    .order("espera_min", { ascending: false })
    .limit(50);
  if (!ctx?.isAdmin && ctx?.companyId) closedQuery = closedQuery.eq("company_id", ctx.companyId);
  const { data: closed } = await closedQuery;

  let pendingQuery = db
    .from("atenciones")
    .select("id, razon_social, empresa, company_id, planta, h_registro, tipo_operacion")
    .eq("fecha", todayStr)
    .is("h_atencion", null)
    .not("h_registro", "is", null);
  if (!ctx?.isAdmin && ctx?.companyId) pendingQuery = pendingQuery.eq("company_id", ctx.companyId);
  const { data: pending } = await pendingQuery;

  const pendingAlerts = (pending || [])
    .map(d => {
      const parts = (d.h_registro as string).split(":").map(Number);
      const startMin = parts[0] * 60 + parts[1] + (parts[2] || 0) / 60;
      let implicitMin = Math.round(nowMinutes - startMin);
      if (implicitMin < 0) implicitMin += 24 * 60;
      return { ...d, espera_min: implicitMin, h_atencion: null, segmento_espera: null, isLive: true };
    })
    .filter(d => d.espera_min >= 30);

  const pendingIds = new Set(pendingAlerts.map(d => d.id));
  const closedFiltered = (closed || []).filter(d => !pendingIds.has(d.id)).map(d => ({ ...d, isLive: false as const }));
  const alerts = [...pendingAlerts, ...closedFiltered].slice(0, 50);

  let todayAllQuery = db
    .from("atenciones")
    .select("espera_min, planta, h_atencion, h_registro")
    .eq("fecha", todayStr);
  if (!ctx?.isAdmin && ctx?.companyId) todayAllQuery = todayAllQuery.eq("company_id", ctx.companyId);
  const { data: todayAll } = await todayAllQuery;

  let historyQuery = db
    .from("atenciones")
    .select("fecha, espera_min")
    .gte("fecha", sevenStr)
    .gte("espera_min", 30)
    .order("fecha", { ascending: true });
  if (!ctx?.isAdmin && ctx?.companyId) historyQuery = historyQuery.eq("company_id", ctx.companyId);
  const { data: history } = await historyQuery;

  const histMap: Record<string, { n: number; fullDate: string }> = {};
  (history || []).forEach(d => {
    const day = d.fecha?.substring(5) ?? "";
    if (!histMap[day]) histMap[day] = { n: 0, fullDate: d.fecha ?? "" };
    histMap[day].n++;
  });
  const histChart = Object.entries(histMap)
    .map(([d, v]) => ({ d, n: v.n, fullDate: v.fullDate }))
    .slice(-7);

  const allToday = todayAll || [];
  const kpis = {
    total: allToday.length,
    enEspera: pendingAlerts.length,
    criticos: allToday.filter(d => d.espera_min != null && d.espera_min >= 90).length,
    altos: allToday.filter(d => d.espera_min != null && d.espera_min >= 45 && d.espera_min < 90).length,
    moderados: allToday.filter(d => d.espera_min != null && d.espera_min >= 30 && d.espera_min < 45).length,
  };

  return { alerts, kpis, histChart };
}

export async function getIncidentsByDate(date: string) {
  const ctx = await getUserContext();
  const db = ctx?.isAdmin
    ? (await import("@/utils/supabase/admin")).createAdminClient()
    : await createClient();

  let query = db
    .from("atenciones")
    .select("id, razon_social, empresa, company_id, planta, h_registro, h_atencion, espera_min, segmento_espera, tipo_operacion, motivo_demora, responsable, agente")
    .eq("fecha", date)
    .gte("espera_min", 30)
    .order("espera_min", { ascending: false });

  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }

  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

export async function getAlertLogs() {
  const ctx = await getUserContext();
  const db = ctx?.isAdmin
    ? (await import("@/utils/supabase/admin")).createAdminClient()
    : await createClient();

  let query = db
    .from("alert_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }

  const { data } = await query;
  return data ?? [];
}
