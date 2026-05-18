"use server";

import { createAdminClient } from "@/utils/supabase/admin";

// ── Acción pública: no requiere auth — usa admin client (bypass RLS) ──────────
// Llamada desde /cita/[token] (portal para proveedores)

export interface CitaPublicaInput {
  companyId: string;
  plant: string;
  horaCita: string;       // HH:MM
  fecha?: string;         // YYYY-MM-DD, si vacío = hoy en Lima
  razonSocial: string;
  tipoOperacion?: string;
  responsable?: string;
  observacion?: string;
}

function nowLimaDate(): string {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Lima" })
  ).toISOString().split("T")[0];
}

export async function submitCitaPublica(
  input: CitaPublicaInput
): Promise<{ success: boolean; error?: string }> {
  // Validaciones básicas
  if (!input.companyId || !input.plant) return { success: false, error: "Enlace inválido" };
  if (!/^\d{2}:\d{2}$/.test(input.horaCita)) return { success: false, error: "Hora inválida" };
  if (!input.razonSocial?.trim()) return { success: false, error: "Ingresa tu razón social" };

  const admin = createAdminClient();

  // Verificar que la empresa existe y no está eliminada
  const { data: company, error: companyErr } = await admin
    .from("companies")
    .select("id, plan, trial_ends_at")
    .eq("id", input.companyId)
    .is("deleted_at", null)
    .single();

  if (companyErr || !company) return { success: false, error: "Enlace no válido" };

  // Verificar plan activo (no bloquear trial vigente)
  if (company.plan === "suspended") {
    return { success: false, error: "El servicio no está disponible en este momento" };
  }

  const fechaStr = input.fecha || nowLimaDate();
  const [year, month] = fechaStr.split("-").map(Number);

  const { data: existingCita } = await admin
    .from("atenciones")
    .select("id, hora_cita, estado")
    .eq("company_id", input.companyId)
    .eq("planta", input.plant)
    .eq("fecha", fechaStr)
    .eq("razon_social", input.razonSocial.trim().toUpperCase())
    .not("hora_cita", "is", null)
    .in("estado", ["esperado", "activo"])
    .maybeSingle();

  if (existingCita) {
    const hora = (existingCita.hora_cita as string | null)?.slice(0, 5) ?? "—";
    return { success: false, error: `Ya existe una cita registrada para este vehículo a las ${hora}.` };
  }

  const { error } = await admin.from("atenciones").insert({
    fecha: fechaStr,
    hora_cita: input.horaCita + ":00",
    h_registro: null,
    razon_social: input.razonSocial.trim().toUpperCase(),
    empresa: input.razonSocial.trim().toUpperCase(),
    planta: input.plant,
    tipo: "Proveedor",
    tipo_operacion: input.tipoOperacion || null,
    responsable: input.responsable || null,
    agente: "Portal web",
    observacion: input.observacion?.trim() || null,
    motivo_demora: null,
    espera_min: null,
    es_demora: 0,
    segmento_orden: 0,
    anio: year,
    mes_num: month,
    company_id: input.companyId,
  });

  if (error) return { success: false, error: "No se pudo registrar la cita. Intenta de nuevo." };
  return { success: true };
}

// ── Datos públicos para el formulario de cita (sin auth) ─────────────────────

export async function getPublicCitaPageData(companyId: string, plant: string): Promise<{
  companyName: string;
  responsables: string[];
} | null> {
  if (!companyId || !plant) return null;
  const admin = createAdminClient();

  const [{ data: company }, { data: responsablesData }] = await Promise.all([
    admin.from("companies").select("name").eq("id", companyId).is("deleted_at", null).single(),
    admin.from("responsables").select("nombre").eq("company_id", companyId).eq("activo", true).order("nombre"),
  ]);

  if (!company) return null;

  return {
    companyName: company.name as string,
    responsables: (responsablesData ?? []).map(r => r.nombre as string),
  };
}
