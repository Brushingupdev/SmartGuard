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
    .order("nombre");

  if (!ctx?.isAdmin && ctx?.companyId) {
    respQuery = respQuery.eq("company_id", ctx.companyId);
  }

  const { data, error } = await respQuery;

  if (!error && data && data.length > 0) {
    return data.map((r: { nombre: string }) => r.nombre);
  }

  // Fallback: extraer dinámicamente de registros anteriores si la tabla no existe
  let fallQuery = supabase
    .from("atenciones")
    .select("responsable")
    .not("responsable", "is", null)
    .order("id", { ascending: false })
    .limit(300);

  if (!ctx?.isAdmin && ctx?.companyId) {
    fallQuery = fallQuery.eq("company_id", ctx.companyId);
  }

  const { data: pastData } = await fallQuery;

  if (pastData && pastData.length > 0) {
    const unique = Array.from(new Set(pastData.map(r => r.responsable).filter(Boolean)));
    return unique.slice(0, 15) as string[];
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
