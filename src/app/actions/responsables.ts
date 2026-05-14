"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { requireAdmin } from "./_helpers";

export async function getResponsables(): Promise<string[]> {
  const supabase = await createClient();
  const ctx = await getUserContext();

  let respQuery = supabase
    .from("responsables")
    .select("nombre")
    .eq("activo", true)
    .order("id", { ascending: true });

  if (!ctx?.isAdmin && ctx?.companyId) {
    respQuery = respQuery.eq("company_id", ctx.companyId);
  }

  const { data, error } = await respQuery;
  if (!error && data && data.length > 0) {
    return data.map((r: { nombre: string }) => r.nombre);
  }

  return [];
}

// ─── RESPONSABLES (admin CRUD) ───────────────────────────────────────────────

export async function getResponsablesAdmin() {
  if (!(await requireAdmin())) return { data: [], error: "No autorizado" };
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("responsables")
    .select("id, nombre, activo, company_id")
    .order("nombre");
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null };
}

export async function addResponsable(nombre: string, companyId: string) {
  if (!(await requireAdmin())) return { success: false, error: "No autorizado" };
  if (!companyId) return { success: false, error: "Empresa requerida" };
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const { error } = await admin
    .from("responsables")
    .insert({ nombre: nombre.trim(), activo: true, company_id: companyId });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function toggleResponsableActivo(id: number, activo: boolean) {
  if (!(await requireAdmin())) return { success: false, error: "No autorizado" };
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const { error } = await admin
    .from("responsables")
    .update({ activo })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removeResponsable(id: number) {
  if (!(await requireAdmin())) return { success: false, error: "No autorizado" };
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const { error } = await admin
    .from("responsables")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── AGENTES ─────────────────────────────────────────────────────────────────

export async function getAgentes(): Promise<string[]> {
  const supabase = await createClient();
  const ctx = await getUserContext();

  let query = supabase
    .from("agentes")
    .select("nombre")
    .eq("activo", true)
    .order("id", { ascending: true });

  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }

  const { data, error } = await query;
  if (!error && data && data.length > 0) {
    return data.map((r: { nombre: string }) => r.nombre);
  }

  return [];
}

// ─── AGENTES — gestión de perfiles de guardia ────────────────────────────────

export type AgentePerfilRow = {
  id: number;
  nombre: string;
  planta: string | null;
  turno: string;
  activo: boolean;
  pin_configurado: boolean;
  ultimo_acceso: string | null;
  avatar_color: string;
};

export async function getAgentesPerfiles(): Promise<AgentePerfilRow[]> {
  const supabase = await createClient();
  const ctx = await getUserContext();

  let query = supabase
    .from("agentes")
    .select("id, nombre, planta, turno, activo, pin_hash, ultimo_acceso, avatar_color")
    .order("nombre", { ascending: true });

  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    planta: r.planta ?? null,
    turno: r.turno ?? "Día",
    activo: r.activo,
    pin_configurado: !!r.pin_hash,
    ultimo_acceso: r.ultimo_acceso ?? null,
    avatar_color: r.avatar_color ?? "#c8a84b",
  }));
}

export async function updateAgentePerfil(
  id: number,
  data: { planta?: string | null; turno?: string; activo?: boolean }
) {
  const supabase = await createClient();
  const ctx = await getUserContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  const { error } = await supabase
    .from("agentes")
    .update(data)
    .eq("id", id)
    .eq("company_id", ctx.companyId ?? "");

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function setAgentePIN(id: number, pin: string) {
  const supabase = await createClient();
  const ctx = await getUserContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  if (!/^\d{4}$/.test(pin)) return { success: false, error: "El PIN debe tener exactamente 4 dígitos" };

  // Hash SHA-256 del PIN en el servidor
  const { createHash } = await import("crypto");
  const pin_hash = createHash("sha256").update(pin).digest("hex");

  const { error } = await supabase
    .from("agentes")
    .update({ pin_hash })
    .eq("id", id)
    .eq("company_id", ctx.companyId ?? "");

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removeAgentePIN(id: number) {
  const supabase = await createClient();
  const ctx = await getUserContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  const { error } = await supabase
    .from("agentes")
    .update({ pin_hash: null })
    .eq("id", id)
    .eq("company_id", ctx.companyId ?? "");

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function addAgente(nombre: string, planta: string | null, turno: string) {
  const supabase = await createClient();
  const ctx = await getUserContext();
  if (!ctx?.companyId) return { success: false, error: "No autorizado" };

  const { error } = await supabase
    .from("agentes")
    .insert({
      nombre: nombre.trim().toUpperCase(),
      activo: true,
      company_id: ctx.companyId,
      planta: planta || null,
      turno,
    });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function removeAgente(id: number) {
  const supabase = await createClient();
  const ctx = await getUserContext();
  if (!ctx?.companyId) return { success: false, error: "No autorizado" };

  const { error } = await supabase
    .from("agentes")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function upsertAgentes(nombres: string[], companyId: string) {
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const unique = Array.from(new Set(nombres.map(n => n.trim()).filter(Boolean)));
  if (unique.length === 0) return { success: true, inserted: 0 };

  const { error } = await admin
    .from("agentes")
    .upsert(
      unique.map(nombre => ({ nombre, activo: true, company_id: companyId })),
      { onConflict: "nombre,company_id", ignoreDuplicates: true }
    );

  if (error) return { success: false, error: error.message, inserted: 0 };
  return { success: true, inserted: unique.length };
}

export async function upsertResponsables(nombres: string[], companyId: string) {
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const unique = Array.from(new Set(nombres.map(n => n.trim()).filter(Boolean)));
  if (unique.length === 0) return { success: true, inserted: 0 };

  const { error } = await admin
    .from("responsables")
    .upsert(
      unique.map(nombre => ({ nombre, activo: true, company_id: companyId })),
      { onConflict: "nombre,company_id", ignoreDuplicates: true }
    );

  if (error) return { success: false, error: error.message, inserted: 0 };
  return { success: true, inserted: unique.length };
}
