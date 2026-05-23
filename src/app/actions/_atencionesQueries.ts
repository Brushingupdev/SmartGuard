"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { getUserPlants } from "./companies";
import { isMissingColumnError, logError, nowLima } from "./_helpers";
import {
  mapRecentRegistrationRow,
  mapSupervisorCitaRow,
  normalizePlantScope,
  type RecentRegistrationView,
} from "./_atencionesShared";

export async function getRecentRegistrations(
  plant: string | string[],
  limit = 20,
  offset = 0,
): Promise<{ records: RecentRegistrationView[]; total: number }> {
  const supabase = await createClient();
  const ctx = await getUserContext();
  const { date: dateStr, time: timeStr } = nowLima();
  const plants = normalizePlantScope(plant);

  if (plants.length === 0) {
    return { records: [], total: 0 };
  }

  const buildQueries = (includeDemoraCitaMin: boolean) => {
    const demoraField = includeDemoraCitaMin ? ", demora_cita_min" : "";
    let activeQuery = supabase
      .from("atenciones")
      .select(`id, razon_social, empresa, planta, h_registro, h_atencion, h_dev_docs, espera_min${demoraField}, tiempo_total_min, tipo_operacion, motivo_demora, responsable, agente, observacion, tipo, hora_cita, estado`, { count: "exact" })
      .in("planta", plants)
      .eq("fecha", dateStr)
      .not("h_registro", "is", null)
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    let overdueExpectedQuery = supabase
      .from("atenciones")
      .select(`id, razon_social, empresa, planta, h_registro, h_atencion, h_dev_docs, espera_min${demoraField}, tiempo_total_min, tipo_operacion, motivo_demora, responsable, agente, observacion, tipo, hora_cita, estado`, { count: "exact" })
      .in("planta", plants)
      .eq("fecha", dateStr)
      .eq("estado", "esperado")
      .not("hora_cita", "is", null)
      .lt("hora_cita", timeStr)
      .order("hora_cita", { ascending: true });

    if (!ctx?.isAdmin && ctx?.companyId) {
      activeQuery = activeQuery.eq("company_id", ctx.companyId);
      overdueExpectedQuery = overdueExpectedQuery.eq("company_id", ctx.companyId);
    }

    return Promise.all([activeQuery, overdueExpectedQuery]);
  };

  let [
    { data: activeData, error: activeError, count: activeCount },
    { data: overdueExpectedData, error: overdueExpectedError, count: overdueExpectedCount },
  ] = await buildQueries(true);

  if ((activeError && isMissingColumnError(activeError, "demora_cita_min")) || (overdueExpectedError && isMissingColumnError(overdueExpectedError, "demora_cita_min"))) {
    [
      { data: activeData, error: activeError, count: activeCount },
      { data: overdueExpectedData, error: overdueExpectedError, count: overdueExpectedCount },
    ] = await buildQueries(false);
  }

  if (activeError || overdueExpectedError) {
    logError("getRecentRegistrations", activeError || overdueExpectedError, { plants });
    return { records: [], total: 0 };
  }

  const merged = ([...(activeData ?? []), ...(overdueExpectedData ?? [])] as unknown) as Array<Parameters<typeof mapRecentRegistrationRow>[0]>;
  const records = merged.map(mapRecentRegistrationRow);
  records.sort((a, b) => b.id - a.id);

  return { records, total: (activeCount ?? 0) + (overdueExpectedCount ?? 0) };
}

export async function getSupervisorHoyData() {
  const supabase = await createClient();
  const ctx = await getUserContext();
  const { date: dateStr, time: timeStr } = nowLima();
  const configuredPlants = await getUserPlants();

  const selectFields = "id, razon_social, empresa, planta, h_registro, h_atencion, h_dev_docs, espera_min, tiempo_total_min, tipo_operacion, motivo_demora, responsable, agente, observacion, tipo, hora_cita, estado";

  let activeQuery = supabase
    .from("atenciones")
    .select(selectFields)
    .eq("fecha", dateStr)
    .not("h_registro", "is", null)
    .order("id", { ascending: false })
    .limit(500);

  let overdueQuery = supabase
    .from("atenciones")
    .select(selectFields)
    .eq("fecha", dateStr)
    .eq("estado", "esperado")
    .not("hora_cita", "is", null)
    .lt("hora_cita", timeStr)
    .order("hora_cita", { ascending: true });

  let citasQuery = supabase
    .from("atenciones")
    .select("id, razon_social, empresa, planta, fecha, hora_cita, h_registro, h_atencion, tipo, tipo_operacion, responsable, agente, observacion, estado, espera_min")
    .eq("fecha", dateStr)
    .not("hora_cita", "is", null)
    .in("estado", ["esperado", "activo"])
    .order("hora_cita", { ascending: true });

  if (!ctx?.isAdmin && ctx?.companyId) {
    activeQuery = activeQuery.eq("company_id", ctx.companyId);
    overdueQuery = overdueQuery.eq("company_id", ctx.companyId);
    citasQuery = citasQuery.eq("company_id", ctx.companyId);
  }

  const [{ data: activeData }, { data: overdueData }, { data: citasData }] = await Promise.all([
    activeQuery,
    overdueQuery,
    citasQuery,
  ]);

  const merged = ([...(activeData ?? []), ...(overdueData ?? [])]) as Array<Record<string, unknown>>;
  const seen = new Set<number>();
  const records = merged
    .filter((row) => {
      const id = row.id as number;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((row) => mapRecentRegistrationRow({
      id: row.id as number,
      razon_social: (row.razon_social as string | null | undefined) ?? null,
      empresa: (row.empresa as string | null | undefined) ?? null,
      planta: (row.planta as string | null | undefined) ?? null,
      tipo: (row.tipo as string | null | undefined) ?? null,
      h_registro: (row.h_registro as string | null | undefined) ?? null,
      hora_cita: (row.hora_cita as string | null | undefined) ?? null,
      tipo_operacion: (row.tipo_operacion as string | null | undefined) ?? null,
      motivo_demora: (row.motivo_demora as string | null | undefined) ?? null,
      responsable: (row.responsable as string | null | undefined) ?? null,
      agente: (row.agente as string | null | undefined) ?? null,
      observacion: (row.observacion as string | null | undefined) ?? null,
      h_atencion: (row.h_atencion as string | null | undefined) ?? null,
      espera_min: (row.espera_min as number | null | undefined) ?? null,
      demora_cita_min: null,
      h_dev_docs: (row.h_dev_docs as string | null | undefined) ?? null,
      tiempo_total_min: (row.tiempo_total_min as number | null | undefined) ?? null,
      estado: ((row.estado as string | null | undefined) ?? "activo") as "esperado" | "activo" | "atendido",
    }));

  records.sort((a, b) => b.id - a.id);

  const citas = (citasData ?? []).map((row) => mapSupervisorCitaRow({
    id: row.id as number,
    razon_social: (row.razon_social as string | null | undefined) ?? null,
    empresa: (row.empresa as string | null | undefined) ?? null,
    planta: (row.planta as string | null | undefined) ?? null,
    fecha: (row.fecha as string | null | undefined) ?? null,
    hora_cita: (row.hora_cita as string | null | undefined) ?? null,
    h_registro: (row.h_registro as string | null | undefined) ?? null,
    h_atencion: (row.h_atencion as string | null | undefined) ?? null,
    tipo: (row.tipo as string | null | undefined) ?? null,
    tipo_operacion: (row.tipo_operacion as string | null | undefined) ?? null,
    responsable: (row.responsable as string | null | undefined) ?? null,
    agente: (row.agente as string | null | undefined) ?? null,
    observacion: (row.observacion as string | null | undefined) ?? null,
    estado: (row.estado as "esperado" | "activo" | "atendido" | null | undefined) ?? "esperado",
    espera_min: (row.espera_min as number | null | undefined) ?? null,
  }));

  const plantas = [...new Set([
    ...configuredPlants,
    ...records.map((record) => record.planta).filter(Boolean),
    ...citas.map((cita) => cita.planta).filter(Boolean),
  ])].sort();

  return { records, citas, plantas };
}
