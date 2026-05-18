"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { createAdminClient } from "@/utils/supabase/admin";

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
  foto_base64?: string | null;
  foto_mime_type?: string | null;
  urgente?: boolean;
  agente: string;
  planta: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const admin    = createAdminClient();
  const ctx      = await getUserContext();
  if (!ctx?.companyId) return { success: false, error: "No autorizado" };

  let fotoUrl = data.foto_url ?? null;
  if (data.foto_base64 && data.foto_mime_type) {
    try {
      const ext = data.foto_mime_type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      const safePlant = data.planta.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const safeAgent = data.agente.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const filePath = `${ctx.companyId}/${new Date().toISOString().slice(0, 10)}/${safePlant || "sin-planta"}/${Date.now()}-${safeAgent || "guardia"}.${ext}`;

      await admin.storage.createBucket("guardia-evidencias", { public: true }).catch(() => {});
      const buffer = Buffer.from(data.foto_base64, "base64");
      const { data: uploadData, error: uploadError } = await admin.storage
        .from("guardia-evidencias")
        .upload(filePath, buffer, { contentType: data.foto_mime_type, upsert: false });

      if (uploadError) {
        return { success: false, error: "No se pudo guardar la evidencia fotográfica." };
      }

      const { data: publicUrlData } = admin.storage
        .from("guardia-evidencias")
        .getPublicUrl(uploadData.path);

      fotoUrl = publicUrlData.publicUrl;
    } catch {
      return { success: false, error: "No se pudo procesar la evidencia fotográfica." };
    }
  }

  const { error } = await supabase.from("guardia_eventos").insert({
    company_id:  ctx.companyId,
    planta:      data.planta,
    agente:      data.agente,
    tipo:        data.tipo,
    descripcion: data.descripcion,
    foto_url:    fotoUrl,
    urgente:     data.urgente ?? data.tipo === "emergencia",
  });

  if (error) return { success: false, error: error.message };

  // Las emergencias quedan marcadas como urgente=true
  // El supervisor las ve en tiempo real en su dashboard

  return { success: true };
}

// ── Obtener eventos del día ───────────────────────────────────────────────────

function normalizePlantScope(input: string | string[]): string[] {
  if (Array.isArray(input)) return [...new Set(input.map((item) => item.trim()).filter(Boolean))];
  return input.trim() ? [input.trim()] : [];
}

export async function getGuardiaEventosHoy(planta: string | string[]): Promise<GuardiaEvento[]> {
  const supabase = await createClient();
  const ctx      = await getUserContext();
  if (!ctx?.companyId) return [];
  const plants = normalizePlantScope(planta);
  if (plants.length === 0) return [];

  // Fecha de hoy en Lima
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Lima" })
  );
  const todayStr = now.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("guardia_eventos")
    .select("id, tipo, descripcion, foto_url, urgente, agente, planta, created_at")
    .eq("company_id", ctx.companyId)
    .in("planta", plants)
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
