"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import {
  preRegisterCitaSchema,
  activateCitaSchema,
  validated,
} from "@/lib/validations";
import { nowLima, logError, checkWriteAccess } from "./_helpers";

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

  const { date: todayStr, year: todayYear, month: todayMonth } = nowLima();

  const fechaStr = data.fecha || todayStr;
  const parts = fechaStr.split("-").map(Number);
  const anio = parts[0] ?? todayYear;
  const mesNum = parts[1] ?? todayMonth;

  const payload = {
    fecha: fechaStr,
    h_registro: null,
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
    anio: anio,
    mes_num: mesNum,
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

  let baseQuery = supabase
    .from("atenciones")
    .select("id")
    .eq("id", id)
    .eq("estado", "esperado");

  if (!ctx?.isAdmin && ctx?.companyId) {
    baseQuery = baseQuery.eq("company_id", ctx.companyId);
  }

  const { data: existing } = await baseQuery.maybeSingle();
  if (!existing) {
    return { success: false, error: "Esta cita ya fue activada o cancelada por otro usuario." };
  }

  let updQuery = supabase
    .from("atenciones")
    .update({ h_registro: timeStr })
    .eq("id", id)
    .eq("estado", "esperado");

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

// Obtiene las citas para una planta: de hoy en adelante, estado esperado/activo.
export async function getCitasDelDia(plant: string) {
  const ctx = await getUserContext();
  const supabase = await createClient();
  const { date: dateStr } = nowLima();

  let query = supabase
    .from("atenciones")
    .select(
      "id, razon_social, empresa, planta, fecha, hora_cita, h_registro, h_atencion, tipo, tipo_operacion, responsable, agente, observacion, estado, espera_min"
    )
    .gte("fecha", dateStr)
    .eq("planta", plant)
    .in("estado", ["esperado", "activo"])
    .order("fecha", { ascending: true })
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
    fecha: (c.fecha as string) || "",
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

  let baseQuery = supabase
    .from("atenciones")
    .select("id")
    .eq("id", id)
    .eq("estado", "esperado");

  if (!ctx?.isAdmin && ctx?.companyId) {
    baseQuery = baseQuery.eq("company_id", ctx.companyId);
  }

  const { data: existing } = await baseQuery.maybeSingle();
  if (!existing) {
    return { success: false, error: "Esta cita ya fue cancelada o activada por otro usuario." };
  }

  let delQuery = supabase
    .from("atenciones")
    .delete()
    .eq("id", id)
    .eq("estado", "esperado");

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
