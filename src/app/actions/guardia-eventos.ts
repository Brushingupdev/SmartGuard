"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";

export type GuardiaEvento = {
  id: number;
  tipo: "incidente" | "emergencia" | "novedad";
  descripcion: string;
  foto_url: string | null;
  urgente: boolean;
  agente: string;
  planta: string;
  created_at: string;
};

// ── Crear evento ──────────────────────────────────────────────────────────────

export async function crearGuardiaEvento(data: {
  tipo: "incidente" | "emergencia" | "novedad";
  descripcion: string;
  foto_url?: string | null;
  agente: string;
  planta: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const ctx      = await getUserContext();
  if (!ctx?.companyId) return { success: false, error: "No autorizado" };

  const { error } = await supabase.from("guardia_eventos").insert({
    company_id:  ctx.companyId,
    planta:      data.planta,
    agente:      data.agente,
    tipo:        data.tipo,
    descripcion: data.descripcion,
    foto_url:    data.foto_url ?? null,
    urgente:     data.tipo === "emergencia",
  });

  if (error) return { success: false, error: error.message };

  // Las emergencias quedan marcadas como urgente=true
  // El supervisor las ve en tiempo real en su dashboard

  return { success: true };
}

// ── Obtener eventos del día ───────────────────────────────────────────────────

export async function getGuardiaEventosHoy(planta: string): Promise<GuardiaEvento[]> {
  const supabase = await createClient();
  const ctx      = await getUserContext();
  if (!ctx?.companyId) return [];

  // Fecha de hoy en Lima
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Lima" })
  );
  const todayStr = now.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("guardia_eventos")
    .select("id, tipo, descripcion, foto_url, urgente, agente, planta, created_at")
    .eq("company_id", ctx.companyId)
    .eq("planta", planta)
    .gte("created_at", `${todayStr}T00:00:00`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as GuardiaEvento[];
}

// ── Marcar evento como leído ──────────────────────────────────────────────────

export async function marcarEventoLeido(id: number) {
  const supabase = await createClient();
  await supabase.from("guardia_eventos").update({ leido: true }).eq("id", id);
}
