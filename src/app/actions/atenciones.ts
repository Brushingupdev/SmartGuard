"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import {
  createAtencionSchema,
  updateAtencionSchema,
  preRegisterCitaSchema,
  activateCitaSchema,
  searchSuggestionsSchema,
  atencionPaginationSchema,
  validated,
} from "@/lib/validations";
import { nowLima, calcSegmento, logError, checkWriteAccess } from "./_helpers";
import { sanitizeSearchTerm } from "@/lib/sanitize";

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
    es_demora: 0,
    segmento_orden: 0,
    anio: year,
    mes_num: month,
    company_id: ctx.companyId,
    hora_cita: data.horaCita ? data.horaCita + ":00" : null,
  };

  const { error } = await supabase.from("atenciones").insert(payload);
  if (error) {
    logError("createAtencion", error);
    return { success: false, error: error.message };
  }
  return { success: true };
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
  let hRegistro: string | null = null;
  let alertPlanta: string = "";

  let dbHoraCita: string | null = null;

  if (needsTimes) {
    let selQuery = supabase
      .from("atenciones")
      .select("h_registro, planta, hora_cita")
      .eq("id", id);
    if (!ctx?.isAdmin && ctx?.companyId) {
      selQuery = selQuery.eq("company_id", ctx.companyId);
    }
    const { data: rec } = await selQuery.single();
    hRegistro = rec?.h_registro ?? null;
    alertPlanta = (rec?.planta as string) ?? "";
    dbHoraCita = (rec?.hora_cita as string | null) ?? null;
  }

  // Helper: calcula minutos entre dos "HH:MM[:SS]" strings
  function diffMin(from: string, to: string): number {
    const [fh, fm] = from.split(":").map(Number);
    const [th, tm] = to.split(":").map(Number);
    let diff = (th * 60 + tm) - (fh * 60 + fm);
    if (diff < 0) diff += 24 * 60;
    return Math.round(diff);
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
      // Base para calcular espera: hora_cita si existe, si no h_registro
      const baseTime = effectiveHoraCita ?? hRegistro;
      if (baseTime) {
        const [bh, bm] = baseTime.split(":").map(Number);
        const [ah, am] = data.hAtencion.split(":").map(Number);
        const baseMin = bh * 60 + bm;
        const atenMin = ah * 60 + am;

        if (effectiveHoraCita && atenMin < baseMin) {
          // Anticipado: atendido antes de la hora de cita
          update.h_atencion      = data.hAtencion + ":00";
          update.espera_min      = 0;
          update.segmento_espera = "🔵 Anticipado";
          update.segmento_orden  = 0;
          update.es_demora       = 0;
        } else {
          let espera_min = atenMin - baseMin;
          if (espera_min < 0) espera_min += 24 * 60;
          if (espera_min > 720) {
            return { success: false, error: "La hora de atención parece incorrecta — verifica que sea posterior a la hora base (máx. 12 h de diferencia)" };
          }
          const seg = calcSegmento(espera_min);
          update.h_atencion      = data.hAtencion + ":00";
          update.espera_min      = espera_min;
          update.segmento_espera = seg.label;
          update.segmento_orden  = seg.orden;
          update.es_demora       = seg.esDemora;
        }
      } else {
        // Sin base temporal conocida — solo guardamos la hora
        update.h_atencion = data.hAtencion + ":00";
      }
    } else {
      update.h_atencion       = null;
      update.espera_min       = null;
      update.segmento_espera  = null;
      update.segmento_orden   = 0;
      update.es_demora        = 0;
    }
  }

  // Actualizar h_dev_docs y recalcular tiempo_total_min
  if (data.hDevDocs !== undefined) {
    if (data.hDevDocs && hRegistro) {
      const tiempo_total_min = diffMin(hRegistro, data.hDevDocs);
      if (tiempo_total_min > 720) {
        return { success: false, error: "La hora de devolución de documentos parece incorrecta (máx. 12 h de diferencia)" };
      }
      update.h_dev_docs       = data.hDevDocs + ":00";
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

  const editedEspera = typeof update.espera_min === "number" ? update.espera_min : null;
  if (editedEspera !== null && editedEspera >= 45 && ctx?.companyId) {
    dispatchDelayAlerts(ctx.companyId, {
      razonSocial: data.razonSocial,
      empresa:     data.empresa,
      planta:      alertPlanta,
      hRegistro:   hRegistro ?? "",
      esperaMin:   editedEspera,
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
export async function closeAtencion(rawId: unknown, rawMotivo?: unknown) {
  const id = typeof rawId === "number" ? rawId : Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "ID inválido" };

  const motivoDemora = typeof rawMotivo === "string" ? rawMotivo : undefined;
  const supabase = await createClient();
  const ctx = await getUserContext();

  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, error: writeError };

  let selQuery = supabase
    .from("atenciones")
    .select("h_registro, hora_cita, razon_social, empresa, planta")
    .eq("id", id);
  if (!ctx?.isAdmin && ctx?.companyId) {
    selQuery = selQuery.eq("company_id", ctx.companyId);
  }
  const { data: record, error: fetchError } = await selQuery.single();

  if (fetchError || !record) {
    return { success: false, error: "Registro no encontrado" };
  }

  const { time: timeStr, hour, minute, second } = nowLima();
  const endMinutes = hour * 60 + minute + second / 60;

  let espera_min = 0;
  let isAnticipado = false;

  const horaCita = record.hora_cita as string | null;
  if (horaCita) {
    // Calcular desde hora de cita, no desde h_registro
    const parts = horaCita.split(":").map(Number);
    const citaMinutes = parts[0] * 60 + parts[1] + (parts[2] || 0) / 60;
    if (endMinutes < citaMinutes) {
      // Llegó antes de la cita → Anticipado
      espera_min = 0;
      isAnticipado = true;
    } else {
      espera_min = Math.round(endMinutes - citaMinutes);
      if (espera_min < 0) espera_min += 24 * 60;
    }
  } else if (record.h_registro) {
    const parts = (record.h_registro as string).split(":").map(Number);
    const startMinutes = parts[0] * 60 + parts[1] + (parts[2] || 0) / 60;
    espera_min = Math.round(endMinutes - startMinutes);
    if (espera_min < 0) espera_min += 24 * 60;
  }

  const seg = isAnticipado
    ? { label: "🔵 Anticipado", orden: 0, esDemora: 0 }
    : calcSegmento(espera_min);

  const update: Record<string, unknown> = {
    h_atencion: timeStr, espera_min,
    segmento_espera: seg.label, segmento_orden: seg.orden, es_demora: seg.esDemora,
  };
  if (motivoDemora) {
    update.motivo_demora = motivoDemora;
  } else if (isAnticipado) {
    update.observacion = `Atendido antes de la hora de cita (${horaCita!.substring(0, 5)})`;
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

  if (espera_min >= 45 && ctx?.companyId) {
    dispatchDelayAlerts(ctx.companyId, {
      atencionId:  id,
      razonSocial: (record.razon_social as string) ?? "Vehículo",
      empresa:     (record.empresa as string) ?? "—",
      planta:      (record.planta as string) ?? "—",
      hRegistro:   record.h_registro as string,
      esperaMin:   espera_min,
    }).catch(e => logError("dispatchDelayAlerts(close)", e));
  }

  return { success: true, espera_min };
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
    .select("h_registro")
    .eq("id", id);
  if (!ctx?.isAdmin && ctx?.companyId) {
    selQuery = selQuery.eq("company_id", ctx.companyId);
  }
  const { data: record, error: fetchError } = await selQuery.single();

  if (fetchError || !record) {
    return { success: false, error: "Registro no encontrado" };
  }

  const { time: timeStr, hour, minute, second } = nowLima();

  let tiempo_total_min = 0;
  if (record.h_registro) {
    const parts = record.h_registro.split(":").map(Number);
    const startMinutes = parts[0] * 60 + parts[1] + (parts[2] || 0) / 60;
    const endMinutes = hour * 60 + minute + second / 60;
    tiempo_total_min = Math.round(endMinutes - startMinutes);
    if (tiempo_total_min < 0) tiempo_total_min += 24 * 60;
  }

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

  const { hour, minute, second } = nowLima();
  const nowMinutes = hour * 60 + minute + second / 60;

  const { data: records } = await supabase
    .from("atenciones")
    .select("id, h_registro")
    .in("id", ids);

  if (!records?.length) return { count: 0 };

  // Cada registro recibe su espera_min real y el segmento correcto
  let count = 0;
  for (const rec of records) {
    let espera_min = 0;
    if (rec.h_registro) {
      const parts = (rec.h_registro as string).split(":").map(Number);
      const startMinutes = parts[0] * 60 + parts[1] + (parts[2] ?? 0) / 60;
      espera_min = Math.round(nowMinutes - startMinutes);
      if (espera_min < 0) espera_min += 24 * 60;
    }
    const seg = calcSegmento(espera_min);

    let q = supabase.from("atenciones").update({
      h_atencion: null,
      espera_min,
      segmento_espera: seg.label,
      segmento_orden: seg.orden,
      es_demora: seg.esDemora,
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
    "id, fecha, h_registro, h_atencion, h_dev_docs, razon_social, empresa, company_id, planta, tipo, tipo_operacion, motivo_demora, espera_min, tiempo_total_min, segmento_espera, responsable, agente, observacion, es_demora"
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

  let query = supabase.from("atenciones").select("anio").not("anio", "is", null);
  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }

  const { data } = await query;
  if (!data) return [];
  const years = [...new Set(data.map((r: { anio: number }) => r.anio).filter(Boolean))].sort() as number[];
  return years.map(y => String(y));
}

export async function getRecentRegistrations(plant: string, limit = 20, offset = 0) {
  const supabase = await createClient();
  const ctx = await getUserContext();
  const { date: dateStr } = nowLima();

  let query = supabase
    .from("atenciones")
    .select("id, razon_social, empresa, h_registro, h_atencion, h_dev_docs, espera_min, tiempo_total_min, tipo_operacion, motivo_demora, responsable, agente, observacion, tipo, hora_cita", { count: "exact" })
    .eq("planta", plant)
    .eq("fecha", dateStr)
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }

  const { data, error, count } = await query;

  if (error) {
    logError("getRecentRegistrations", error, { plant });
    return { records: [], total: 0 };
  }

  const records = (data ?? []).map(d => ({
    id: d.id,
    razonSocial: d.razon_social || "",
    empresa: d.empresa || "",
    type: d.tipo || "Proveedor",
    time: d.h_registro ? d.h_registro.substring(0, 5) : "--:--",
    reason: d.tipo_operacion || d.motivo_demora || "Ingreso",
    responsable: d.responsable || "",
    agente: d.agente || "",
    observacion: d.observacion || "",
    attended: !!d.h_atencion,
    h_atencion: d.h_atencion ? d.h_atencion.substring(0, 5) : null,
    espera_min: d.espera_min ?? null,
    docsDelivered: !!d.h_dev_docs,
    h_dev_docs: d.h_dev_docs ? d.h_dev_docs.substring(0, 5) : null,
    tiempo_total_min: d.tiempo_total_min ?? null,
    hora_cita: d.hora_cita ? (d.hora_cita as string).substring(0, 5) : null,
  }));

  return { records, total: count ?? 0 };
}

// ─── Alertas proactivas (llamado por el cron /api/alertas/proactive) ──────────
// Revisa los registros pendientes de hoy para una empresa y encola alertas si
// la demora supera el umbral configurado, con deduplicación por tiempo.
export async function checkProactiveAlerts(
  companyId: string
): Promise<{ checked: number; alerted: number }> {
  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const supabase = createAdminClient();

    const { date: dateStr, hour, minute, second } = nowLima();
    const nowMinutes = hour * 60 + minute + second / 60;
    const nowIso = new Date().toISOString();

    // Umbral configurado para esta empresa
    const { data: company } = await supabase
      .from("companies")
      .select("alerta_minutos")
      .eq("id", companyId)
      .single();
    const alertaMinutos: number = (company?.alerta_minutos as number | null) ?? 45;

    // Registros pendientes de hoy (sin h_atencion)
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
      // Calcular minutos de espera efectivos
      let baseMinutes: number;
      const horaCita = rec.hora_cita as string | null;

      if (horaCita) {
        const parts = horaCita.split(":").map(Number);
        const citaMin = parts[0] * 60 + parts[1] + (parts[2] ?? 0) / 60;
        if (nowMinutes < citaMin) continue; // Aún antes de la cita — sin alerta
        baseMinutes = citaMin;
      } else {
        const parts = (rec.h_registro as string).split(":").map(Number);
        baseMinutes = parts[0] * 60 + parts[1] + (parts[2] ?? 0) / 60;
      }

      let waitMin = Math.round(nowMinutes - baseMinutes);
      if (waitMin < 0) waitMin += 24 * 60; // cruce de medianoche

      if (waitMin < alertaMinutos) continue;

      // Deduplicación: no repetir alerta hasta que pase otro ciclo de alertaMinutos
      const lastAt = rec.ultima_alerta_proactiva_at as string | null;
      if (lastAt) {
        const minutesSinceLast = (Date.now() - new Date(lastAt).getTime()) / 60_000;
        if (minutesSinceLast < alertaMinutos) continue;
      }

      // Encolar alerta
      await enqueueAlert({
        companyId,
        atencionId: rec.id as number,
        razonSocial: (rec.razon_social as string) ?? "Vehículo",
        empresa:     (rec.empresa as string) ?? "—",
        planta:      (rec.planta as string) ?? "—",
        hRegistro:   rec.h_registro as string,
        esperaMin:   waitMin,
      });

      // Marcar timestamp de última alerta proactiva
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

// ─── Importación histórica desde Excel ───────────────────────────────────────

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

    const mapped = rows.map(r => ({ ...r, company_id: ctx.companyId }));
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

// ─── Citas Programadas (Pre-registro) ─────────────────────────────────────────
// Permite crear una cita antes de que el vehículo llegue a portería.
// El guardia o supervisor crea el pre-registro con hora_cita y al menos un
// identificador. Cuando el vehículo llega, se activa el registro con h_registro.

export async function preRegisterCita(rawData: unknown) {
  const v = validated(preRegisterCitaSchema, rawData);
  if (!v.ok) return { success: false, error: v.error };
  const data = v.data;

  const supabase = await createClient();
  const ctx = await getUserContext();

  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, error: writeError };

  if (!ctx?.companyId) {
    return { success: false, error: "Debe tener una empresa asignada" };
  }

  const { date: dateStr, year, month } = nowLima();

  const payload = {
    fecha: dateStr,
    h_registro: null,     // ← trigger auto-set estado = 'esperado'
    hora_cita: data.horaCita + ":00",
    razon_social: data.razonSocial || null,
    empresa: data.empresa || null,
    planta: data.plant,
    tipo: data.type || "Proveedor",
    tipo_operacion: data.tipoOperacion || null,
    responsable: data.responsable || null,
    agente: data.agente || null,
    observacion: data.note || null,
    motivo_demora: null,
    espera_min: null,
    es_demora: 0,
    segmento_orden: 0,
    anio: year,
    mes_num: month,
    company_id: ctx.companyId,
  };

  const { data: created, error } = await supabase
    .from("atenciones")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    logError("preRegisterCita", error);
    return { success: false, error: error.message };
  }

  return { success: true, id: (created as { id: number }).id };
}

// Activa una cita pre-registrada: el vehículo llegó a portería.
// El trigger tg_set_atencion_estado cambia automáticamente estado → 'activo'.
export async function activateCita(rawData: unknown) {
  const v = validated(activateCitaSchema, rawData);
  if (!v.ok) return { success: false, error: v.error };
  const { id } = v.data;

  const supabase = await createClient();
  const ctx = await getUserContext();

  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, error: writeError };

  const { time: timeStr } = nowLima();

  let updQuery = supabase
    .from("atenciones")
    .update({ h_registro: timeStr })
    .eq("id", id)
    .eq("estado", "esperado"); // solo citas no activadas

  if (!ctx?.isAdmin && ctx?.companyId) {
    updQuery = updQuery.eq("company_id", ctx.companyId);
  }

  const { error } = await updQuery;
  if (error) {
    logError("activateCita", error, { id });
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Obtiene las citas del día para una planta.
// Devuelve registros con estado 'esperado' o 'activo' de hoy.
export async function getCitasDelDia(plant: string) {
  const ctx = await getUserContext();
  const supabase = await createClient();
  const { date: dateStr } = nowLima();

  let query = supabase
    .from("atenciones")
    .select(
      "id, razon_social, empresa, planta, hora_cita, h_registro, h_atencion, tipo, tipo_operacion, responsable, agente, observacion, estado, espera_min"
    )
    .eq("fecha", dateStr)
    .eq("planta", plant)
    .in("estado", ["esperado", "activo"])
    .order("hora_cita", { ascending: true });

  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }

  const { data, error } = await query;
  if (error) {
    logError("getCitasDelDia", error, { plant });
    return [];
  }

  return (data ?? []).map((c) => ({
    id: c.id as number,
    razonSocial: (c.razon_social as string) || "—",
    empresa: (c.empresa as string) || "—",
    planta: c.planta as string,
    horaCita: c.hora_cita ? (c.hora_cita as string).substring(0, 5) : "—",
    hRegistro: c.h_registro ? (c.h_registro as string).substring(0, 5) : null,
    hAtencion: c.h_atencion ? (c.h_atencion as string).substring(0, 5) : null,
    tipo: (c.tipo as string) || "Proveedor",
    tipoOperacion: (c.tipo_operacion as string) || null,
    responsable: (c.responsable as string) || null,
    agente: (c.agente as string) || null,
    observacion: (c.observacion as string) || null,
    estado: c.estado as "esperado" | "activo" | "atendido",
    esperaMin: c.espera_min as number | null,
  }));
}

// Cancela una cita pre-registrada que aún no ha sido activada.
export async function cancelarCita(rawId: unknown) {
  const id = typeof rawId === "number" ? rawId : Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "ID inválido" };

  const supabase = await createClient();
  const ctx = await getUserContext();

  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, error: writeError };

  let delQuery = supabase
    .from("atenciones")
    .delete()
    .eq("id", id)
    .eq("estado", "esperado"); // solo citas que aún no se activaron

  if (!ctx?.isAdmin && ctx?.companyId) {
    delQuery = delQuery.eq("company_id", ctx.companyId);
  }

  const { error } = await delQuery;
  if (error) {
    logError("cancelarCita", error, { id });
    return { success: false, error: error.message };
  }

  return { success: true };
}
