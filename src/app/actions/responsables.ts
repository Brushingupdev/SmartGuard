"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { requireAdmin } from "./_helpers";

export async function getResponsables(): Promise<string[]> {
  const supabase = await createClient();
  const ctx = await getUserContext();

  // Solo mostrar responsables con actividad en el año en curso
  const currentYear = new Date().getFullYear();

  let activeQuery = supabase
    .from("atenciones")
    .select("responsable")
    .not("responsable", "is", null)
    .eq("anio", currentYear)
    .limit(5000);

  if (!ctx?.isAdmin && ctx?.companyId) {
    activeQuery = activeQuery.eq("company_id", ctx.companyId);
  }

  const { data: activeData } = await activeQuery;

  if (activeData && activeData.length > 0) {
    const unique = [...new Set(activeData.map((r: { responsable: string }) => r.responsable).filter(Boolean))].sort() as string[];
    if (unique.length > 0) return unique;
  }

  // Fallback: tabla responsables completa
  let respQuery = supabase
    .from("responsables")
    .select("nombre")
    .eq("activo", true)
    .order("nombre");

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

  const currentYear = new Date().getFullYear();

  let activeQuery = supabase
    .from("atenciones")
    .select("agente")
    .not("agente", "is", null)
    .eq("anio", currentYear)
    .limit(5000);

  if (!ctx?.isAdmin && ctx?.companyId) {
    activeQuery = activeQuery.eq("company_id", ctx.companyId);
  }

  const { data: activeData } = await activeQuery;

  if (activeData && activeData.length > 0) {
    const unique = [...new Set(activeData.map((r: { agente: string }) => r.agente).filter(Boolean))].sort() as string[];
    if (unique.length > 0) return unique;
  }

  // Fallback: tabla agentes completa
  let query = supabase
    .from("agentes")
    .select("nombre")
    .eq("activo", true)
    .order("nombre");

  if (!ctx?.isAdmin && ctx?.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }

  const { data, error } = await query;
  if (!error && data && data.length > 0) {
    return data.map((r: { nombre: string }) => r.nombre);
  }

  return [];
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
