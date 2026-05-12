"use server";

import { differenceInMinutes } from "date-fns";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import {
  createAtencionSchema,
  updateAtencionSchema,
  searchSuggestionsSchema,
  atencionPaginationSchema,
  validated,
} from "@/lib/validations";
import { nowLima, calcSegmento, logError, checkWriteAccess, isMissingColumnError } from "./_helpers";
import { sanitizeSearchTerm } from "@/lib/sanitize";
import { getCompanyPlants } from "./companies";
import { upsertResponsables, upsertAgentes } from "./responsables";

const MANUAL_LONG_DURATION_LIMIT_MINUTES = 16 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateTime(date: string | null | undefined, time: string | null | undefined): Date | null {
  if (!date || !time) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) return null;
  return new Date(year, month - 1, day, hour, minute, second);
}

function diffMinByDateTime(
  startDate: string | null | undefined,
  startTime: string | null | undefined,
  endDate: string | null | undefined,
  endTime: string | null | undefined,
): number | null {
  const start = parseDateTime(startDate, startTime);
  const end = parseDateTime(endDate, endTime);
  if (!start || !end) return null;
  return Math.max(0, differenceInMinutes(end, start));
}

function maxDateTime(
  aDate: string | null | undefined,
  aTime: string | null | undefined,
  bDate: string | null | undefined,
  bTime: string | null | undefined,
): { date: string; time: string } | null {
  const a = parseDateTime(aDate, aTime);
  const b = parseDateTime(bDate, bTime);
  if (!a && !b) return null;
  if (!a) return bDate && bTime ? { date: bDate, time: bTime } : null;
  if (!b) return aDate && aTime ? { date: aDate, time: aTime } : null;
  return a >= b
    ? { date: aDate as string, time: aTime as string }
    : { date: bDate as string, time: bTime as string };
}

function inferManualEndDate(startDate: string | null, startTime: string | null, endTime: string): string | null {
  if (!startDate || !startTime) return null;
  const start = parseDateTime(startDate, startTime);
  let end = parseDateTime(startDate, endTime);
  if (!start || !end) return startDate;
  while (end < start) end = new Date(end.getTime() + DAY_MS);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
}

// ─── Dispatch de alertas (async via queue) ───────────────────────────────────
// Inserta la alerta en alert_queue para procesamiento asíncrono.
// La Edge Function process_alert_queue se encarga del envío real.
async function dispatchDelayAlerts(
  companyId: string,
  opts: {
    atencionId?: number;
    razonSocial: string;
    empresa: string;
    planta: string;
    hRegistro: string;
    esperaMin: number;
  }
) {
  try {
    const { enqueueAlert } = await import("@/utils/alert-queue");
    await enqueueAlert({
      companyId,
      atencionId: opts.atencionId,
      razonSocial: opts.razonSocial,
      empresa: opts.empresa,
      planta: opts.planta,
      hRegistro: opts.hRegistro,
      esperaMin: opts.esperaMin,
    });
  } catch (err) {
    logError("dispatchDelayAlerts", err, { companyId, ...opts });
  }
}

export async function createAtencion(rawData: unknown) {
  const v = validated(createAtencionSchema, rawData);
  if (!v.ok) return { success: false, error: v.error };
  const data = v.data;

  const supabase = await createClient();
  const ctx = await getUserContext();

  // Impersonation guard — no writes in read-only mode
  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, error: writeError };

  // Bloquear creación sin empresa asignada: evita registros company_id=null visibles cross-tenant
  if (!ctx?.companyId) {
    return { success: false, error: "Debe tener una empresa asignada para crear registros" };
  }

  const { date: dateStr, time: timeStr, year, month } = nowLima();

  // Check de duplicado: mismo vehículo pendiente hoy misma planta
  const { data: existing } = await supabase
    .from("atenciones")
    .select("id")
    .eq("razon_social", data.razonSocial)
    .eq("planta", data.plant)
    .eq("fecha", dateStr)
    .eq("company_id", ctx.companyId)
    .eq("estado", "activo")
    .limit(1)
    .maybeSingle();

  if (existing && !data.forceDuplicate) {
    return { success: false, error: "Ya existe un registro pendiente para este vehículo hoy en esta puerta." };
  }

  // Si no especificó hora_cita, verificar si hay una cita programada para este vehículo
  if (!data.horaCita) {
    const { data: citaMatch } = await supabase
      .from("atenciones")
      .select("id, hora_cita")
      .eq("razon_social", data.razonSocial)
      .eq("planta", data.plant)
      .eq("company_id", ctx.companyId)
      .eq("estado", "esperado")
      .maybeSingle();

    if (citaMatch) {
      const hora = (citaMatch.hora_cita as string)?.substring(0, 5) ?? "?";
      return {
        success: false,
        error: `Hay una cita pendiente para este vehículo a las ${hora}. Usa el botón "Llegó" en Citas del Día para activarla, o especifica la hora de cita si es otra.`,
      };
    }
  }

  const payload = {
    fecha: dateStr,
    h_registro: timeStr,
    razon_social: data.razonSocial,
    empresa: data.empresa,
    planta: data.plant,
    tipo: data.type,
    tipo_operacion: data.tipoOperacion,
    motivo_demora: null,
    observacion: data.note,
    responsable: data.responsable || null,
    agente: data.agente || null,
    espera_min: null,
    demora_cita_min: null,
    es_demora: 0,
    segmento_orden: 0,
    anio: year,
    mes_num: month,
    company_id: ctx.companyId,
    estado: "activo",
    hora_cita: data.horaCita ? data.horaCita + ":00" : null,
  };

  const { error } = await supabase.from("atenciones").insert(payload);
  if (error) {
    logError("createAtencion", error);
    return { success: false, error: error.message };
  }
  return { success: true, time: timeStr };
}

// Edita los campos de un registro existente (incluyendo horas opcionales)
export async function updateAtencion(rawId: unknown, rawData: unknown) {
  const id = typeof rawId === "number" ? rawId : Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "ID inválido" };

  const v = validated(updateAtencionSchema, rawData);
  if (!v.ok) return { success: false, error: v.error };
  const data = v.data;
  const supabase = await createClient();
  const ctx = await getUserContext();

  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, error: writeError };

  const needsTimes = data.hAtencion !== undefined || data.hDevDocs !== undefined;
  let fechaRegistro: string | null = null;
  let hRegistro: string | null = null;
  let alertPlanta: string = "";
  let editedOperationalDelay: number | null = null;

  let dbHoraCita: string | null = null;

  if (needsTimes) {
    let selQuery = supabase
      .from("atenciones")
      .select("fecha, h_registro, planta, hora_cita")
      .eq("id", id);
    if (!ctx?.isAdmin && ctx?.companyId) {
      selQuery = selQuery.eq("company_id", ctx.companyId);
    }
    const { data: rec } = await selQuery.single();
    fechaRegistro = (rec?.fecha as string | null) ?? null;
    hRegistro = rec?.h_registro ?? null;
    alertPlanta = (rec?.planta as string) ?? "";
    dbHoraCita = (rec?.hora_cita as string | null) ?? null;
  }

  const update: Record<string, unknown> = {
    razon_social: data.razonSocial,
    empresa: data.empresa,
    tipo: data.type,
    tipo_operacion: data.tipoOperacion,
    responsable: data.responsable || null,
    agente: data.agente || null,
    observacion: data.note,
  };

  // Actualizar hora_cita si viene en el payload
  if (data.horaCita !== undefined) {
    update.hora_cita = data.horaCita ? data.horaCita + ":00" : null;
  }

  // Hora de cita efectiva: la nueva si se está cambiando, si no la que está en BD
  const effectiveHoraCita: string | null =
    data.horaCita !== undefined
      ? (data.horaCita ? data.horaCita + ":00" : null)
      : dbHoraCita;

  // Actualizar h_atencion y recalcular espera_min / segmento
  if (data.hAtencion !== undefined) {
    if (data.hAtencion) {
      const hAtencionFull = data.hAtencion + ":00";
      const manualBaseTime = hRegistro ?? effectiveHoraCita;
      const hAtencionDate = inferManualEndDate(fechaRegistro, manualBaseTime, hAtencionFull);
      const esperaMin = diffMinByDateTime(fechaRegistro, hRegistro, hAtencionDate, hAtencionFull);
      const demoraCitaMin = effectiveHoraCita
        ? diffMinByDateTime(fechaRegistro, effectiveHoraCita, hAtencionDate, hAtencionFull)
        : null;
      const operationalBase = effectiveHoraCita
        ? maxDateTime(fechaRegistro, effectiveHoraCita, fechaRegistro, hRegistro)
        : null;
      const operationalDelayMin = operationalBase
        ? diffMinByDateTime(operationalBase.date, operationalBase.time, hAtencionDate, hAtencionFull)
        : esperaMin;
      editedOperationalDelay = operationalDelayMin;
      const atencionDateTime = parseDateTime(hAtencionDate, hAtencionFull);
      const citaDateTime = parseDateTime(fechaRegistro, effectiveHoraCita);
      const isAnticipado = !!effectiveHoraCita
        && !!atencionDateTime
        && !!citaDateTime
        && atencionDateTime < citaDateTime
        && demoraCitaMin === 0;

      if (esperaMin !== null && esperaMin > MANUAL_LONG_DURATION_LIMIT_MINUTES) {
        return { success: false, error: "La hora de atención parece incorrecta — verifica que sea posterior a la llegada (máx. 16 h de diferencia)" };
      }

      update.h_atencion = hAtencionFull;
      update.espera_min = esperaMin;
      update.demora_cita_min = demoraCitaMin;

      const segmentBase = operationalDelayMin ?? demoraCitaMin ?? esperaMin;
      if (isAnticipado) {
        update.segmento_espera = "🔵 Anticipado";
        update.segmento_orden = 0;
        update.es_demora = 0;
      } else if (segmentBase != null) {
        const seg = calcSegmento(segmentBase);
        update.segmento_espera = seg.label;
        update.segmento_orden = seg.orden;
        update.es_demora = seg.esDemora;
      } else {
        // Sin base temporal conocida — solo guardamos la hora
        update.h_atencion = hAtencionFull;
      }
    } else {
      update.h_atencion       = null;
      update.espera_min       = null;
      update.demora_cita_min  = null;
      update.segmento_espera  = null;
      update.segmento_orden   = 0;
      update.es_demora        = 0;
      update.ultima_alerta_proactiva_at = null;
      update.motivo_demora    = null;
    }
  }

  // Actualizar h_dev_docs y recalcular tiempo_total_min
  if (data.hDevDocs !== undefined) {
    if (data.hDevDocs && hRegistro) {
      const hDevDocsFull = data.hDevDocs + ":00";
      const hDevDocsDate = inferManualEndDate(fechaRegistro, hRegistro, hDevDocsFull);
      const tiempo_total_min = diffMinByDateTime(fechaRegistro, hRegistro, hDevDocsDate, hDevDocsFull);
      if (tiempo_total_min !== null && tiempo_total_min > MANUAL_LONG_DURATION_LIMIT_MINUTES) {
        return { success: false, error: "La hora de devolución de documentos parece incorrecta (máx. 16 h de diferencia)" };
      }
      update.h_dev_docs       = hDevDocsFull;
      update.tiempo_total_min = tiempo_total_min;
    } else {
      update.h_dev_docs       = null;
      update.tiempo_total_min = null;
    }
  }

  let updQuery = supabase.from("atenciones").update(update).eq("id", id);
  if (!ctx?.isAdmin && ctx?.companyId) {
    updQuery = updQuery.eq("company_id", ctx.companyId);
  }

  const { error } = await updQuery;
  if (error) {
    logError("updateAtencion", error, { id });
    return { success: false, error: error.message };
  }

  const editedDelay = editedOperationalDelay
    ?? (typeof update.espera_min === "number"
      ? update.espera_min
      : (typeof update.demora_cita_min === "number" ? update.demora_cita_min : null));
  if (editedDelay !== null && editedDelay >= 45 && ctx?.companyId) {
    dispatchDelayAlerts(ctx.companyId, {
      razonSocial: data.razonSocial,
      empresa:     data.empresa,
      planta:      alertPlanta,
      hRegistro:   hRegistro ?? "",
      esperaMin:   editedDelay,
    }).catch(e => logError("dispatchDelayAlerts(update)", e));
  }

  return { success: true };
}

// Elimina un registro
export async function deleteAtencion(rawId: unknown) {
  const id = typeof rawId === "number" ? rawId : Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "ID inválido" };
  const supabase = await createClient();
  const ctx = await getUserContext();

  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, error: writeError };

  if (ctx?.role === "guardia") return { success: false, error: "Sin permisos para eliminar" };

  let delQuery = supabase.from("atenciones").delete().eq("id", id);
  if (!ctx?.isAdmin && ctx?.companyId) {
    delQuery = delQuery.eq("company_id", ctx.companyId);
  }

  const { error } = await delQuery;
  if (error) {
    logError("deleteAtencion", error, { id });
    return { success: false, error: error.message };
  }
  return { success: true };
}

// Cierra una atención: captura h_atencion, calcula espera_min y guarda motivo_demora
export async function closeAtencion(rawId: unknown, rawMotivo?: unknown, rawHSalida?: unknown) {
  const id = typeof rawId === "number" ? rawId : Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "ID inválido" };

  const motivoDemora = typeof rawMotivo === "string" ? rawMotivo : undefined;
  const supabase = await createClient();
  const ctx = await getUserContext();

  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, error: writeError };

  let selQuery = supabase
    .from("atenciones")
    .select("fecha, h_registro, hora_cita, razon_social, empresa, planta")
    .eq("id", id);
  if (!ctx?.isAdmin && ctx?.companyId) {
    selQuery = selQuery.eq("company_id", ctx.companyId);
  }
  const { data: record, error: fetchError } = await selQuery.single();

  if (fetchError || !record) {
    return { success: false, error: "Registro no encontrado" };
  }

  const { date: todayStr, time: timeStr } = nowLima();
  const fechaRegistro = record.fecha as string | null;

  const espera_min = diffMinByDateTime(fechaRegistro, record.h_registro as string | null, todayStr, timeStr) ?? 0;

  const horaCita = record.hora_cita as string | null;
  let demora_cita_min: number | null = null;
  let isAnticipado = false;
  let operationalDelayMin: number | null = espera_min;
  if (horaCita) {
    const citaDateTime = parseDateTime(fechaRegistro, horaCita);
    const endDateTime = parseDateTime(todayStr, timeStr);
    if (citaDateTime && endDateTime && endDateTime < citaDateTime) {
      demora_cita_min = 0;
      isAnticipado = true;
    } else {
      demora_cita_min = diffMinByDateTime(fechaRegistro, horaCita, todayStr, timeStr) ?? 0;
    }
    const operationalBase = maxDateTime(fechaRegistro, horaCita, fechaRegistro, record.h_registro as string | null);
    operationalDelayMin = operationalBase
      ? diffMinByDateTime(operationalBase.date, operationalBase.time, todayStr, timeStr)
      : espera_min;
  }

  const segmentBase = operationalDelayMin ?? demora_cita_min ?? espera_min;
  const seg = isAnticipado
    ? { label: "🔵 Anticipado", orden: 0, esDemora: 0 }
    : calcSegmento(segmentBase);

  const update: Record<string, unknown> = {
    h_atencion: timeStr, espera_min, demora_cita_min,
    segmento_espera: seg.label, segmento_orden: seg.orden, es_demora: seg.esDemora,
  };
  if (motivoDemora) {
    update.motivo_demora = motivoDemora;
  } else if (isAnticipado) {
    update.observacion = `Atendido antes de la hora de cita (${horaCita!.substring(0, 5)})`;
  }
  if (rawHSalida && typeof rawHSalida === "string" && /^\d{2}:\d{2}$/.test(rawHSalida)) {
    update.h_salida = rawHSalida + ":00";
  }

  let updQuery = supabase.from("atenciones").update(update).eq("id", id);
  if (!ctx?.isAdmin && ctx?.companyId) {
    updQuery = updQuery.eq("company_id", ctx.companyId);
  }
  const { error } = await updQuery;
  if (error) {
    logError("closeAtencion", error, { id });
    return { success: false, error: error.message };
  }

  const alertDelay = operationalDelayMin ?? demora_cita_min ?? espera_min;
  if (alertDelay >= 45 && ctx?.companyId) {
    dispatchDelayAlerts(ctx.companyId, {
      atencionId:  id,
      razonSocial: (record.razon_social as string) ?? "Vehículo",
      empresa:     (record.empresa as string) ?? "—",
      planta:      (record.planta as string) ?? "—",
      hRegistro:   record.h_registro as string,
      esperaMin:   alertDelay,
    }).catch(e => logError("dispatchDelayAlerts(close)", e));
  }

  return { success: true, espera_min, demora_cita_min };
}

// Registra devolución de documentos: captura h_dev_docs y calcula tiempo_total_min
export async function closeAtencionDocs(rawId: unknown) {
  const id = typeof rawId === "number" ? rawId : Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "ID inválido" };
  const supabase = await createClient();
  const ctx = await getUserContext();

  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, error: writeError };

  let selQuery = supabase
    .from("atenciones")
    .select("fecha, h_registro")
    .eq("id", id);
  if (!ctx?.isAdmin && ctx?.companyId) {
    selQuery = selQuery.eq("company_id", ctx.companyId);
  }
  const { data: record, error: fetchError } = await selQuery.single();

  if (fetchError || !record) {
    return { success: false, error: "Registro no encontrado" };
  }

  const { date: todayStr, time: timeStr } = nowLima();

  const tiempo_total_min = diffMinByDateTime(
    record.fecha as string | null,
    record.h_registro as string | null,
    todayStr,
    timeStr,
  ) ?? 0;

  let updQuery = supabase
    .from("atenciones")
    .update({ h_dev_docs: timeStr, tiempo_total_min })
    .eq("id", id);
  if (!ctx?.isAdmin && ctx?.companyId) {
    updQuery = updQuery.eq("company_id", ctx.companyId);
  }

  const { error } = await updQuery;
  if (error) {
    logError("closeAtencionDocs", error, { id });
    return { success: false, error: error.message };
  }
  return { success: true, tiempo_total_min };
}

export async function closeAbandonedBatch(ids: number[]): Promise<{ count: number }> {
  if (!ids.length) return { count: 0 };
  const supabase = await createClient();
  const ctx = await getUserContext();

  const writeError = await checkWriteAccess();
  if (writeError) return { count: 0 };

  const { time: timeStr } = nowLima();

  const { data: records } = await supabase
    .from("atenciones")
    .select("id")
    .in("id", ids);

  if (!records?.length) return { count: 0 };

  // Cierre operativo por abandono: sale de la cola activa sin inyectar horas extremas a KPIs.
  let count = 0;
  for (const rec of records) {
    let q = supabase.from("atenciones").update({
      h_atencion: timeStr,
      h_dev_docs: timeStr,
      espera_min: null,
      demora_cita_min: null,
      tiempo_total_min: null,
      segmento_espera: "Sin atención registrada",
      segmento_orden: 0,
      es_demora: 0,
      motivo_demora: "Sin atención registrada",
    }).eq("id", rec.id as number);
    if (!ctx?.isAdmin && ctx?.companyId) q = q.eq("company_id", ctx.companyId);
    const { error } = await q;
    if (!error) count++;
  }

  if (count === 0) {
    logError("closeAbandonedBatch", new Error("No se actualizó ningún registro"), { ids });
    return { count: 0 };
  }

  return { count };
}

// ─── Helper compartido para filtros de atenciones ────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyAtencionFilters(query: any, { search, plant, segment, dateFrom, dateTo }: {
  search: string; plant: string; segment: string; dateFrom: string; dateTo: string;
}) {
  if (search) {
    const safeSearch = sanitizeSearchTerm(search);
    if (safeSearch) {
      query = query.or(`razon_social.ilike.%${safeSearch}%,empresa.ilike.%${safeSearch}%`);
    }
  }
  if (plant && plant !== "Todos") query = query.eq("planta", plant);
  if (dateFrom) query = query.gte("fecha", dateFrom);
  if (dateTo)   query = query.lte("fecha", dateTo);
  if (segment && segment !== "Todos") {
    if (segment === "Normal")        query = query.lt("espera_min", 30).gt("espera_min", 0);
    else if (segment === "Moderado") query = query.gte("espera_min", 30).lt("espera_min", 45);
    else if (segment === "Alto")     query = query.gte("espera_min", 45).lt("espera_min", 90);
    else if (segment === "Crítico")  query = query.gte("espera_min", 90);
    else if (segment === "Pendiente") query = query.is("espera_min", null);
  }
  return query;
}

export async function getAtenciones(rawParams: unknown) {
  const v = validated(atencionPaginationSchema, rawParams);
  if (!v.ok) return { data: [], count: 0, error: v.error };
  const { page, search, perPage, plant, segment, dateFrom, dateTo, sortBy, sortDir, filterCompanyId } = v.data;
  const ctx = await getUserContext();
  const db = ctx?.isAdmin
    ? (await import("@/utils/supabase/admin")).createAdminClient()
    : await createClient();

  let query = db.from("atenciones").select("*", { count: "exact" });

  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  } else if (ctx?.isAdmin && filterCompanyId) {
    query = query.eq("company_id", filterCompanyId);
  }

  query = applyAtencionFilters(query, { search, plant, segment, dateFrom, dateTo });

  query = query.order(sortBy, { ascending: sortDir === "asc", nullsFirst: sortDir === "asc" });
  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data, count, error } = await query;
  if (error) {
    logError("getAtenciones", error);
    return { data: [], count: 0 };
  }
  return { data, count };
}

export async function getAtencionesForExport(
  search = "",
  plant = "Todos",
  segment = "Todos",
  dateFrom = "",
  dateTo = "",
  sortBy: "id" | "espera_min" = "id",
  sortDir: "asc" | "desc" = "desc",
) {
  const ctx = await getUserContext();
  const db = ctx?.isAdmin
    ? (await import("@/utils/supabase/admin")).createAdminClient()
    : await createClient();

  let query = db.from("atenciones").select(
    "id, fecha, h_registro, h_atencion, h_dev_docs, razon_social, empresa, company_id, planta, tipo, tipo_operacion, motivo_demora, espera_min, demora_cita_min, tiempo_total_min, segmento_espera, responsable, agente, observacion, es_demora"
  );

  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }

  query = applyAtencionFilters(query, { search, plant, segment, dateFrom, dateTo });

  query = query.order(sortBy, { ascending: sortDir === "asc", nullsFirst: sortDir === "asc" }).limit(5000);
  const { data, error } = await query;
  if (error) return [];
  return data;
}

export async function searchSuggestions(rawData: unknown): Promise<string[]> {
  const v = validated(searchSuggestionsSchema, rawData);
  if (!v.ok) return [];
  const { field, term } = v.data;
  if (term.length < 2) return [];

  // Sanitizar el término de búsqueda para evitar caracteres especiales de LIKE
  const safeTerm = sanitizeSearchTerm(term);
  if (!safeTerm) return [];

  const supabase = await createClient();
  const ctx = await getUserContext();

  let query = supabase
    .from("atenciones")
    .select(field)
    .ilike(field, `%${safeTerm}%`)
    .not(field, "is", null);

  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }

  const { data } = await query.limit(500);
  if (!data) return [];

  const freq: Record<string, number> = {};
  data.forEach((r: Record<string, unknown>) => {
    const v = r[field] as string;
    if (v) freq[v] = (freq[v] || 0) + 1;
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([v]) => v);
}

// ─── Vehicle profile — smart auto-fill ───────────────────────────────────────
// Dado un razon_social, devuelve la empresa, tipo y tipo_operacion mas frecuentes
// en el historial de esa empresa. Usado para pre-rellenar el formulario de ingreso.
export async function getVehicleProfile(razonSocial: string): Promise<{
  empresa: string | null;
  tipo: string | null;
  tipoOperacion: string | null;
} | null> {
  if (!razonSocial || razonSocial.trim().length < 3) return null;
  try {
    const supabase = await createClient();
    const ctx = await getUserContext();
    const safeTerm = sanitizeSearchTerm(razonSocial.trim());
    if (!safeTerm) return null;

    let query = supabase
      .from("atenciones")
      .select("empresa, tipo, tipo_operacion")
      .ilike("razon_social", `%${safeTerm}%`)
      .limit(50);

    if (!ctx?.isAdmin && ctx?.companyId) {
      query = query.eq("company_id", ctx.companyId);
    }

    const { data } = await query;
    if (!data?.length) return null;

    const empresaFreq: Record<string, number> = {};
    const tipoFreq: Record<string, number> = {};
    const tipoOpFreq: Record<string, number> = {};

    for (const r of data as { empresa: string | null; tipo: string | null; tipo_operacion: string | null }[]) {
      if (r.empresa) empresaFreq[r.empresa] = (empresaFreq[r.empresa] ?? 0) + 1;
      if (r.tipo) tipoFreq[r.tipo] = (tipoFreq[r.tipo] ?? 0) + 1;
      if (r.tipo_operacion) tipoOpFreq[r.tipo_operacion] = (tipoOpFreq[r.tipo_operacion] ?? 0) + 1;
    }

    const top = (freq: Record<string, number>) =>
      Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      empresa: top(empresaFreq),
      tipo: top(tipoFreq),
      tipoOperacion: top(tipoOpFreq),
    };
  } catch (err) {
    logError("getVehicleProfile", err);
    return null;
  }
}

export async function getAvailableYears(): Promise<string[]> {
  const supabase = await createClient();
  const ctx = await getUserContext();
  const filterCompany = !ctx?.isAdmin && ctx?.companyId ? ctx.companyId : null;

  const makeQuery = () => {
    let q = supabase.from("atenciones").select("anio").not("anio", "is", null);
    if (filterCompany) q = q.eq("company_id", filterCompany);
    return q;
  };

  const [{ data: minData }, { data: maxData }] = await Promise.all([
    makeQuery().order("anio", { ascending: true }).limit(1),
    makeQuery().order("anio", { ascending: false }).limit(1),
  ]);

  const minYear = minData?.[0]?.anio as number | undefined;
  const maxYear = maxData?.[0]?.anio as number | undefined;
  if (!minYear || !maxYear) return [];

  return Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(minYear + i));
}

export async function getRecentRegistrations(plant: string, limit = 20, offset = 0) {
  const supabase = await createClient();
  const ctx = await getUserContext();
  const { date: dateStr, time: timeStr } = nowLima();

  const buildQueries = (includeDemoraCitaMin: boolean) => {
    const demoraField = includeDemoraCitaMin ? ", demora_cita_min" : "";
    let activeQuery = supabase
      .from("atenciones")
      .select(`id, razon_social, empresa, h_registro, h_atencion, h_dev_docs, espera_min${demoraField}, tiempo_total_min, tipo_operacion, motivo_demora, responsable, agente, observacion, tipo, hora_cita, estado`, { count: "exact" })
      .eq("planta", plant)
      .eq("fecha", dateStr)
      .not("h_registro", "is", null)
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    let overdueExpectedQuery = supabase
      .from("atenciones")
      .select(`id, razon_social, empresa, h_registro, h_atencion, h_dev_docs, espera_min${demoraField}, tiempo_total_min, tipo_operacion, motivo_demora, responsable, agente, observacion, tipo, hora_cita, estado`, { count: "exact" })
      .eq("planta", plant)
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
    logError("getRecentRegistrations", activeError || overdueExpectedError, { plant });
    return { records: [], total: 0 };
  }

  const merged = ([...(activeData ?? []), ...(overdueExpectedData ?? [])] as unknown) as Array<Record<string, unknown>>;
  const records = merged.map((d) => {
    const row = d as {
      id: number;
      razon_social?: string | null;
      empresa?: string | null;
      tipo?: string | null;
      h_registro?: string | null;
      hora_cita?: string | null;
      tipo_operacion?: string | null;
      motivo_demora?: string | null;
      responsable?: string | null;
      agente?: string | null;
      observacion?: string | null;
      h_atencion?: string | null;
      espera_min?: number | null;
      demora_cita_min?: number | null;
      h_dev_docs?: string | null;
      tiempo_total_min?: number | null;
      estado?: "esperado" | "activo" | "atendido" | null;
    };

    return {
      id: row.id,
      razonSocial: row.razon_social || "",
      empresa: row.empresa || "",
      type: row.tipo || "Proveedor",
      time: row.h_registro ? row.h_registro.substring(0, 5) : (row.hora_cita ? row.hora_cita.substring(0, 5) : "--:--"),
      reason: row.h_registro ? (row.tipo_operacion || row.motivo_demora || "Ingreso") : "Cita pendiente",
      tipoOperacion: row.tipo_operacion || null,
      responsable: row.responsable || "",
      agente: row.agente || "",
      observacion: row.observacion || "",
      attended: !!row.h_atencion,
      h_atencion: row.h_atencion ? row.h_atencion.substring(0, 5) : null,
      espera_min: row.espera_min ?? null,
      demora_cita_min: row.demora_cita_min ?? null,
      docsDelivered: !!row.h_dev_docs,
      h_dev_docs: row.h_dev_docs ? row.h_dev_docs.substring(0, 5) : null,
      tiempo_total_min: row.tiempo_total_min ?? null,
      hora_cita: row.hora_cita ? row.hora_cita.substring(0, 5) : null,
      estado: row.estado ?? "activo",
      hasArrived: !!row.h_registro,
      scheduledOnly: !row.h_registro && row.estado === "esperado",
    };
  });

  records.sort((a, b) => b.id - a.id);

  return { records, total: (activeCount ?? 0) + (overdueExpectedCount ?? 0) };
}

// ─── Importación histórica desde Excel ───────────────────────────────────────

export interface ImportPreview {
  validCount: number;
  duplicateCount: number;
  invalidPlants: string[];
  newResponsables: string[];
  newAgentes: string[];
  existingResponsables: string[];
  existingAgentes: string[];
  companyPlants: string[];
}

export async function previewImportAtenciones(
  rows: import("@/utils/excel-import").ImportedExcelRow[]
): Promise<{ preview: ImportPreview | null; error?: string }> {
  const ctx = await getUserContext();
  if (!ctx?.companyId) return { preview: null, error: "Sin empresa asociada" };

  if (!rows || rows.length === 0) return { preview: null, error: "Sin filas válidas" };

  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();

    // 1. Plantas de la empresa
    const companyPlants = await getCompanyPlants(ctx.companyId);
    const plantSet = new Set(companyPlants.map(p => p.trim().toLowerCase()));

    // 2. Detectar plantas inválidas
    const invalidPlants = Array.from(
      new Set(
        rows
          .filter(r => r.planta && !plantSet.has(r.planta.trim().toLowerCase()))
          .map(r => r.planta as string)
      )
    );

    // 3. Extraer responsables/agentes únicos del Excel
    const excelResponsables = Array.from(new Set(rows.map(r => r.responsable).filter(Boolean) as string[]));
    const excelAgentes = Array.from(new Set(rows.map(r => r.agente).filter(Boolean) as string[]));

    // 4. Consultar existentes en BD
    const { data: existingRespData } = await admin
      .from("responsables")
      .select("nombre")
      .eq("company_id", ctx.companyId)
      .in("nombre", excelResponsables);

    const { data: existingAgentData } = await admin
      .from("agentes")
      .select("nombre")
      .eq("company_id", ctx.companyId)
      .in("nombre", excelAgentes);

    const existingRespSet = new Set((existingRespData ?? []).map(r => r.nombre));
    const existingAgentSet = new Set((existingAgentData ?? []).map(r => r.nombre));

    const newResponsables = excelResponsables.filter(r => !existingRespSet.has(r));
    const newAgentes = excelAgentes.filter(a => !existingAgentSet.has(a));
    const existingResponsables = excelResponsables.filter(r => existingRespSet.has(r));
    const existingAgentes = excelAgentes.filter(a => existingAgentSet.has(a));

    // 5. Detectar duplicados (misma fecha + razon_social + h_registro)
    const dateRazonTimePairs = rows
      .filter(r => r.fecha && r.razon_social)
      .map(r => ({ fecha: r.fecha, razon_social: r.razon_social, h_registro: r.h_registro }));

    let duplicateCount = 0;
    if (dateRazonTimePairs.length > 0) {
      // Agrupar para no hacer una query enorme
      const batches = [];
      for (let i = 0; i < dateRazonTimePairs.length; i += 100) {
        batches.push(dateRazonTimePairs.slice(i, i + 100));
      }

      for (const batch of batches) {
        const fechas = Array.from(new Set(batch.map(b => b.fecha)));
        let query = admin
          .from("atenciones")
          .select("fecha, razon_social, h_registro")
          .eq("company_id", ctx.companyId)
          .in("fecha", fechas);

        const { data: existing } = await query;
        if (existing && existing.length > 0) {
          const existingSet = new Set(
            existing.map(e => `${e.fecha}|${e.razon_social}|${e.h_registro ?? ""}`)
          );
          for (const b of batch) {
            const key = `${b.fecha}|${b.razon_social}|${b.h_registro ?? ""}`;
            if (existingSet.has(key)) duplicateCount++;
          }
        }
      }
    }

    return {
      preview: {
        validCount: rows.length,
        duplicateCount,
        invalidPlants,
        newResponsables,
        newAgentes,
        existingResponsables,
        existingAgentes,
        companyPlants,
      },
    };
  } catch (err) {
    logError("previewImportAtenciones", err);
    return { preview: null, error: "Error al generar vista previa" };
  }
}

export async function importAtenciones(
  rows: import("@/utils/excel-import").ImportedExcelRow[]
): Promise<{ success: boolean; imported: number; error?: string }> {
  const ctx = await getUserContext();
  if (!ctx?.companyId) return { success: false, imported: 0, error: "Sin empresa asociada" };
  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, imported: 0, error: writeError };

  if (!rows || rows.length === 0) return { success: false, imported: 0, error: "Sin filas válidas" };
  if (rows.length > 10_000) return { success: false, imported: 0, error: "Máximo 10.000 filas por importación" };

  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();

    // 1. Sincronizar responsables y agentes únicos automáticamente
    const responsables = Array.from(new Set(rows.map(r => r.responsable).filter(Boolean) as string[]));
    const agentes = Array.from(new Set(rows.map(r => r.agente).filter(Boolean) as string[]));

    if (responsables.length > 0) {
      await upsertResponsables(responsables, ctx.companyId);
    }
    if (agentes.length > 0) {
      await upsertAgentes(agentes, ctx.companyId);
    }

    // 2. Insertar atenciones
    const mapped = rows.map(r => ({ ...r, company_id: ctx.companyId, estado: "atendido" }));
    let imported = 0;

    for (let i = 0; i < mapped.length; i += 500) {
      const batch = mapped.slice(i, i + 500);
      const { error } = await admin.from("atenciones").insert(batch);
      if (error) {
        logError("importAtenciones", error, { batch: i });
        return { success: false, imported, error: "Error al insertar filas. Verifica el formato." };
      }
      imported += batch.length;
    }

    return { success: true, imported };
  } catch (err) {
    logError("importAtenciones", err);
    return { success: false, imported: 0, error: "Error inesperado al importar" };
  }
}
