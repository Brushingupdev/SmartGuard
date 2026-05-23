"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import {
  createAtencionSchema,
  updateAtencionSchema,
  searchSuggestionsSchema,
  atencionPaginationSchema,
  validated,
} from "@/lib/validations";
import { nowLima, calcSegmento, logError, checkWriteAccess } from "./_helpers";
import { sanitizeSearchTerm } from "@/lib/sanitize";
import {
  MANUAL_LONG_DURATION_LIMIT_MINUTES,
  applyAtencionFilters,
  calculateCloseAtencionFields,
  calculateManualAtencionFields,
  diffMinByDateTime,
  inferManualEndDate,
} from "./_atencionesShared";
import {
  importAtenciones as importAtencionesAction,
  previewImportAtenciones as previewImportAtencionesAction,
  type ImportPreview,
} from "./_atencionesImport";
import {
  getRecentRegistrations as getRecentRegistrationsQuery,
  getSupervisorHoyData as getSupervisorHoyDataQuery,
} from "./_atencionesQueries";

function guardAgentAliases(ctx: Awaited<ReturnType<typeof getUserContext>>): string[] {
  if (!ctx || ctx.role !== "guardia") return [];
  return [...new Set([ctx.displayName, ctx.email].map((value) => value?.trim()).filter(Boolean) as string[])];
}

export type { ImportPreview };

export async function previewImportAtenciones(
  rows: import("@/utils/excel-import").ImportedExcelRow[],
): Promise<{ preview: ImportPreview | null; error?: string }> {
  return previewImportAtencionesAction(rows);
}

export async function importAtenciones(
  rows: import("@/utils/excel-import").ImportedExcelRow[],
): Promise<{ success: boolean; imported: number; error?: string }> {
  return importAtencionesAction(rows);
}

export async function getRecentRegistrations(
  plant: string | string[],
  limit = 20,
  offset = 0,
) {
  return getRecentRegistrationsQuery(plant, limit, offset);
}

export async function getSupervisorHoyData() {
  return getSupervisorHoyDataQuery();
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

  // Push notification — fire-and-forget, no bloquea la respuesta
  if (ctx.companyId) {
    import("@/lib/push").then(({ sendPushToCompany }) => {
      sendPushToCompany(ctx.companyId!, data.plant, {
        title: "Nuevo vehículo en portería",
        body: `${data.razonSocial} · ${data.plant}`,
        tag: `vehicle-${data.plant}`,
        url: "/pwa/supervisor",
      }).catch(() => {/* silent */});
    }).catch(() => {/* silent */});
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
      const manualAtencion = calculateManualAtencionFields({
        fechaRegistro,
        hRegistro,
        horaCita: effectiveHoraCita,
        hAtencion: data.hAtencion,
      }, calcSegmento);
      if (!manualAtencion.ok) {
        return { success: false, error: manualAtencion.error };
      }
      Object.assign(update, manualAtencion.update);
      editedOperationalDelay = manualAtencion.operationalDelayMin;
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

  const { update, esperaMin, demoraCitaMin, operationalDelayMin } = calculateCloseAtencionFields({
    fechaRegistro,
    hRegistro: record.h_registro as string | null,
    horaCita: record.hora_cita as string | null,
    endDate: todayStr,
    endTime: timeStr,
    motivoDemora,
    hSalida: typeof rawHSalida === "string" ? rawHSalida : undefined,
  }, calcSegmento);

  let updQuery = supabase.from("atenciones").update(update).eq("id", id);
  if (!ctx?.isAdmin && ctx?.companyId) {
    updQuery = updQuery.eq("company_id", ctx.companyId);
  }
  const { error } = await updQuery;
  if (error) {
    logError("closeAtencion", error, { id });
    return { success: false, error: error.message };
  }

  const alertDelay = operationalDelayMin ?? demoraCitaMin ?? esperaMin;
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

  return { success: true, espera_min: esperaMin, demora_cita_min: demoraCitaMin };
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

  const aliases = guardAgentAliases(ctx);
  if (aliases.length > 0) {
    query = query.in("agente", aliases);
  }

  query = applyAtencionFilters(query, { search, plant, segment, dateFrom, dateTo });

  query = query.order(sortBy, { ascending: sortDir === "asc", nullsFirst: sortDir === "asc" });
  if (sortBy === "fecha") query = query.order("id", { ascending: sortDir === "asc" });
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
  sortBy: "id" | "espera_min" | "fecha" = "id",
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

  const aliases = guardAgentAliases(ctx);
  if (aliases.length > 0) {
    query = query.in("agente", aliases);
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

  const aliases = guardAgentAliases(ctx);
  if (aliases.length > 0) {
    query = query.in("agente", aliases);
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
    const aliases = guardAgentAliases(ctx);
    if (aliases.length > 0) q = q.in("agente", aliases);
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
