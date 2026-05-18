"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { nowLima, daysAgoLima, logError } from "./_helpers";

export async function getAlertsData(plant?: string) {
  const ctx = await getUserContext();
  const db = ctx?.isAdmin
    ? (await import("@/utils/supabase/admin")).createAdminClient()
    : await createClient();
  const { date: todayStr, hour, minute, second } = nowLima();
  const sevenStr = daysAgoLima(7);
  const nowMinutes = hour * 60 + minute + second / 60;

  let closedQuery = db
    .from("atenciones")
    .select("id, razon_social, empresa, company_id, planta, h_registro, h_atencion, espera_min, demora_cita_min, segmento_espera, tipo_operacion")
    .eq("fecha", todayStr)
    .not("h_atencion", "is", null)
    .order("h_atencion", { ascending: false })
    .limit(50);
  if (!ctx?.isAdmin && ctx?.companyId) closedQuery = closedQuery.eq("company_id", ctx.companyId);
  if (plant && plant !== "Todas") closedQuery = closedQuery.eq("planta", plant);
  const { data: closed } = await closedQuery;

  let pendingQuery = db
    .from("atenciones")
    .select("id, razon_social, empresa, company_id, planta, h_registro, hora_cita, tipo_operacion")
    .eq("fecha", todayStr)
    .is("h_atencion", null)
    .not("h_registro", "is", null);
  if (!ctx?.isAdmin && ctx?.companyId) pendingQuery = pendingQuery.eq("company_id", ctx.companyId);
  if (plant && plant !== "Todas") pendingQuery = pendingQuery.eq("planta", plant);
  const { data: pending } = await pendingQuery;

  const pendingAlerts = (pending || [])
    .map(d => {
      const horaCita = d.hora_cita as string | null;
      const base = horaCita
        ? horaCita.split(":").map(Number)
        : (d.h_registro as string).split(":").map(Number);
      const startMin = base[0] * 60 + base[1] + (base[2] || 0) / 60;
      let implicitMin = Math.round(nowMinutes - startMin);
      if (implicitMin < 0) implicitMin += 24 * 60;
      if (horaCita && nowMinutes < startMin) implicitMin = 0;
      return { ...d, espera_min: implicitMin, h_atencion: null, segmento_espera: null, isLive: true };
    })
    .filter(d => d.espera_min >= 30);

  const pendingIds = new Set(pendingAlerts.map(d => d.id));
  const closedFiltered = (closed || [])
    .map(d => ({
      ...d,
      espera_min: (d.demora_cita_min as number | null) ?? (d.espera_min as number | null),
      isLive: false as const,
    }))
    .filter(d => !pendingIds.has(d.id) && (d.espera_min ?? 0) >= 30);
  const alerts = [...pendingAlerts, ...closedFiltered]
    .sort((a, b) => (b.espera_min ?? 0) - (a.espera_min ?? 0))
    .slice(0, 50);

  let todayAllQuery = db
    .from("atenciones")
    .select("id, espera_min, demora_cita_min, planta, h_atencion, h_registro")
    .eq("fecha", todayStr);
  if (!ctx?.isAdmin && ctx?.companyId) todayAllQuery = todayAllQuery.eq("company_id", ctx.companyId);
  const { data: todayAll } = await todayAllQuery;

  let historyQuery = db
    .from("atenciones")
    .select("fecha, espera_min, demora_cita_min")
    .gte("fecha", sevenStr)
    .order("fecha", { ascending: true });
  if (!ctx?.isAdmin && ctx?.companyId) historyQuery = historyQuery.eq("company_id", ctx.companyId);
  if (plant && plant !== "Todas") historyQuery = historyQuery.eq("planta", plant);
  const { data: history } = await historyQuery;

  const histMap: Record<string, { n: number; fullDate: string }> = {};
  (history || [])
    .filter(d => ((d.demora_cita_min as number | null) ?? (d.espera_min as number | null) ?? 0) >= 30)
    .forEach(d => {
    const day = d.fecha?.substring(5) ?? "";
    if (!histMap[day]) histMap[day] = { n: 0, fullDate: d.fecha ?? "" };
    histMap[day].n++;
  });
  const histChart = Object.entries(histMap)
    .map(([d, v]) => ({ d, n: v.n, fullDate: v.fullDate }))
    .slice(-7);

  const allToday = todayAll || [];
  const liveWaitById = new Map(pendingAlerts.map(d => [d.id, d.espera_min]));
  const severityWaits = allToday
    .map(d => liveWaitById.get(d.id) ?? ((d.demora_cita_min as number | null) ?? (d.espera_min as number | null)))
    .filter((wait): wait is number => wait != null);
  const kpis = {
    total: allToday.length,
    enEspera: pendingAlerts.length,
    criticos: severityWaits.filter(wait => wait >= 90).length,
    altos: severityWaits.filter(wait => wait >= 45 && wait < 90).length,
    moderados: severityWaits.filter(wait => wait >= 30 && wait < 45).length,
  };

  return { alerts, kpis, histChart };
}

export async function getIncidentsByDate(date: string, plant?: string) {
  const ctx = await getUserContext();
  const db = ctx?.isAdmin
    ? (await import("@/utils/supabase/admin")).createAdminClient()
    : await createClient();

  let query = db
    .from("atenciones")
    .select("id, razon_social, empresa, company_id, planta, h_registro, h_atencion, espera_min, demora_cita_min, segmento_espera, tipo_operacion, motivo_demora, responsable, agente")
    .eq("fecha", date)
    .order("h_atencion", { ascending: false });

  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }
  if (plant && plant !== "Todas") {
    query = query.eq("planta", plant);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? [])
    .map((row) => ({
      ...row,
      espera_min: (row.demora_cita_min as number | null) ?? (row.espera_min as number | null),
    }))
    .filter((row) => (row.espera_min ?? 0) >= 30);
}

export async function getAlertLogs(plant?: string) {
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
  if (plant && plant !== "Todas") {
    query = query.eq("planta", plant);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getGuardiaEventosAlertas(plant?: string) {
  const ctx = await getUserContext();
  const db = ctx?.isAdmin
    ? (await import("@/utils/supabase/admin")).createAdminClient()
    : await createClient();
  const { date: todayStr } = nowLima();

  let query = db
    .from("guardia_eventos")
    .select("id, tipo, descripcion, foto_url, urgente, agente, planta, created_at, company_id")
    .gte("created_at", `${todayStr}T00:00:00`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }
  if (plant && plant !== "Todas") {
    query = query.eq("planta", plant);
  }

  const { data, error } = await query;
  if (error) {
    logError("getGuardiaEventosAlertas", error);
    return {
      summary: { total: 0, urgentes: 0, incidentes: 0, novedades: 0 },
      events: [] as Array<{
        id: number;
        tipo: "incidente" | "emergencia" | "novedad";
        descripcion: string;
        foto_url: string | null;
        urgente: boolean;
        agente: string;
        planta: string;
        created_at: string;
        company_id?: string | null;
      }>,
    };
  }

  const events = (data ?? []) as Array<{
    id: number;
    tipo: "incidente" | "emergencia" | "novedad";
    descripcion: string;
    foto_url: string | null;
    urgente: boolean;
    agente: string;
    planta: string;
    created_at: string;
    company_id?: string | null;
  }>;

  return {
    summary: {
      total: events.length,
      urgentes: events.filter((event) => event.urgente || event.tipo === "emergencia").length,
      incidentes: events.filter((event) => event.tipo === "incidente").length,
      novedades: events.filter((event) => event.tipo === "novedad").length,
    },
    events,
  };
}

// ─── Alertas proactivas (llamado por el cron /api/alertas/proactive) ──────────
export async function checkProactiveAlerts(
  companyId: string
): Promise<{ checked: number; alerted: number }> {
  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const supabase = createAdminClient();

    const { date: dateStr, hour, minute, second } = nowLima();
    const nowMinutes = hour * 60 + minute + second / 60;
    const nowIso = new Date().toISOString();

    const { data: company } = await supabase
      .from("companies")
      .select("alerta_minutos")
      .eq("id", companyId)
      .single();
    const alertaMinutos: number = (company?.alerta_minutos as number | null) ?? 45;

    const { data: pending } = await supabase
      .from("atenciones")
      .select("id, h_registro, hora_cita, razon_social, empresa, planta, ultima_alerta_proactiva_at")
      .eq("company_id", companyId)
      .eq("fecha", dateStr)
      .is("h_atencion", null)
      .not("h_registro", "is", null);

    if (!pending?.length) return { checked: 0, alerted: 0 };

    const { enqueueAlert } = await import("@/utils/alert-queue");
    let alerted = 0;

    for (const rec of pending) {
      let baseMinutes: number;
      const horaCita = rec.hora_cita as string | null;

      if (horaCita) {
        const parts = horaCita.split(":").map(Number);
        const citaMin = parts[0] * 60 + parts[1] + (parts[2] ?? 0) / 60;
        if (nowMinutes < citaMin) continue;
        baseMinutes = citaMin;
      } else {
        const parts = (rec.h_registro as string).split(":").map(Number);
        baseMinutes = parts[0] * 60 + parts[1] + (parts[2] ?? 0) / 60;
      }

      let waitMin = Math.round(nowMinutes - baseMinutes);
      if (waitMin < 0) waitMin += 24 * 60;

      if (waitMin < alertaMinutos) continue;

      const lastAt = rec.ultima_alerta_proactiva_at as string | null;
      if (lastAt) {
        const minutesSinceLast = (Date.now() - new Date(lastAt).getTime()) / 60_000;
        if (minutesSinceLast < alertaMinutos) continue;
      }

      await enqueueAlert({
        companyId,
        atencionId: rec.id as number,
        razonSocial: (rec.razon_social as string) ?? "Vehículo",
        empresa:     (rec.empresa as string) ?? "—",
        planta:      (rec.planta as string) ?? "—",
        hRegistro:   rec.h_registro as string,
        esperaMin:   waitMin,
      });

      await supabase
        .from("atenciones")
        .update({ ultima_alerta_proactiva_at: nowIso })
        .eq("id", rec.id as number);

      alerted++;
    }

    return { checked: pending.length, alerted };
  } catch (err) {
    logError("checkProactiveAlerts", err, { companyId });
    return { checked: 0, alerted: 0 };
  }
}

export type AlertQueueRow = {
  id: string;
  razonSocial: string;
  empresa: string;
  planta: string;
  esperaMin: number;
  status: "sent" | "pending" | "failed" | "processing";
  createdAt: string | null;
  processedAt: string | null;
};

export async function getAlertasRecientes(plant?: string) {
  const ctx = await getUserContext();
  if (!ctx) return { alertas: [] as AlertQueueRow[] };
  const supabase = await createClient();
  const { date: today } = nowLima();

  let query = supabase
    .from("alert_queue")
    .select("id, razon_social, empresa, planta, espera_min, status, created_at, processed_at")
    .eq("company_id", ctx.companyId!)
    .gte("created_at", `${today}T00:00:00`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (plant && plant !== "Todas") {
    query = query.eq("planta", plant);
  }

  const { data, error } = await query;
  if (error) {
    logError("getAlertasRecientes", error);
    return { alertas: [] as AlertQueueRow[] };
  }

  return {
    alertas: (data ?? []).map((d) => ({
      id: d.id,
      razonSocial: d.razon_social || "",
      empresa: d.empresa || "",
      planta: d.planta || "",
      esperaMin: d.espera_min,
      status: d.status as "sent" | "pending" | "failed" | "processing",
      createdAt: d.created_at ? new Date(d.created_at).toISOString() : null,
      processedAt: d.processed_at ? new Date(d.processed_at).toISOString() : null,
    })),
  };
}
