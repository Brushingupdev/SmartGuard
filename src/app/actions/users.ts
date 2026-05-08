"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import {
  changePasswordSchema,
  createUserSchema,
  updateUserSchema,
  deleteUserSchema,
  validated,
} from "@/lib/validations";
import { normalizeGateAssignments } from "@/lib/gates";
import { requireAdmin } from "./_helpers";

export async function getUsers() {
  if (!(await requireAdmin())) return { users: [], error: "No autorizado" };
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  type ListUsersResponse = Awaited<ReturnType<typeof admin.auth.admin.listUsers>>;
  type AuthUser = NonNullable<ListUsersResponse["data"]>["users"][number];

  const allUsers: AuthUser[] = [];
  let page = 1;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { users: [] };
    if (!data?.users?.length) break;
    allUsers.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }

  const roleLabel: Record<string, string> = {
    administrador: "Administrador",
    supervisor: "Supervisor",
    guardia: "Guardia",
  };
  return {
    users: allUsers.map(u => {
      const metaRole = u.user_metadata?.role as string | undefined;
      const role = metaRole
        ? (roleLabel[metaRole.toLowerCase()] ?? "Guardia")
        : "Guardia";
      return {
        id: u.id,
        email: u.email ?? "",
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        role,
        companyId: (u.user_metadata?.company_id as string) ?? null,
        companyName: (u.user_metadata?.company as string) ?? null,
        plant: (u.user_metadata?.plant as string) ?? null,
        assignedPlants: Array.isArray(u.user_metadata?.assigned_plants)
          ? (u.user_metadata.assigned_plants as string[])
          : ((u.user_metadata?.plant as string | undefined) ? [u.user_metadata.plant as string] : []),
        assignedGates: normalizeGateAssignments(
          u.user_metadata?.assigned_gates,
          Array.isArray(u.user_metadata?.assigned_plants)
            ? (u.user_metadata.assigned_plants as string[])
            : ((u.user_metadata?.plant as string | undefined) ? [u.user_metadata.plant as string] : [])
        ),
      };
    }),
  };
}

export async function createUser(rawData: unknown) {
  const v = validated(createUserSchema, rawData);
  if (!v.ok) return { success: false, error: v.error };
  const { email, password, role, plant, assignedPlants, assignedGates, companyId, companyName } = v.data;
  if (!(await requireAdmin())) return { success: false, error: "No autorizado" };
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const guardiaPlants = role === "guardia"
    ? [...new Set((assignedPlants.length > 0 ? assignedPlants : [plant]).filter(Boolean))]
    : [];
  const guardiaGates = role === "guardia" ? normalizeGateAssignments(assignedGates, guardiaPlants) : [];
  const metadata: Record<string, unknown> = {
    role,
    plant: guardiaPlants[0] ?? "",
    assigned_plants: guardiaPlants,
    assigned_gates: guardiaGates,
  };
  if (companyId) { metadata.company_id = companyId; metadata.company = companyName || ""; }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, userId: data.user?.id };
}

export async function updateUser(rawData: unknown) {
  const v = validated(updateUserSchema, rawData);
  if (!v.ok) return { success: false, error: v.error };
  const { userId, role, plant, assignedPlants, assignedGates, password, companyId, companyName } = v.data;
  if (!(await requireAdmin())) return { success: false, error: "No autorizado" };
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const guardiaPlants = role === "guardia"
    ? [...new Set((assignedPlants.length > 0 ? assignedPlants : [plant]).filter(Boolean))]
    : [];
  const guardiaGates = role === "guardia" ? normalizeGateAssignments(assignedGates, guardiaPlants) : [];
  const metadata: Record<string, unknown> = {
    role,
    plant: guardiaPlants[0] ?? "",
    assigned_plants: guardiaPlants,
    assigned_gates: guardiaGates,
  };
  if (companyId) { metadata.company_id = companyId; metadata.company = companyName || ""; }
  const update: Parameters<typeof admin.auth.admin.updateUserById>[1] = {
    user_metadata: metadata,
  };
  if (password && password.length >= 8) update.password = password;
  const { error } = await admin.auth.admin.updateUserById(userId, update);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteUser(rawData: unknown) {
  const v = validated(deleteUserSchema, rawData);
  if (!v.ok) return { success: false, error: v.error };
  const { userId } = v.data;
  if (!(await requireAdmin())) return { success: false, error: "No autorizado" };
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── USER PROFILE ──────────────────────────────────────────────────────────

export async function getUserProfile() {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let companyName: string | null = (user?.user_metadata?.company as string) ?? null;
  let logoUrl: string | null = (user?.user_metadata?.logo_url as string) ?? null;
  let plantas: string[] = (user?.user_metadata?.plantas as string[]) ?? [];

  if (ctx.companyId) {
    const client = ctx.isImpersonating
      ? (await import("@/utils/supabase/admin")).createAdminClient()
      : supabase;
    const { data: c } = await client.from("companies")
      .select("name, logo_url, plantas")
      .eq("id", ctx.companyId)
      .maybeSingle();
    if (c) {
      companyName = c.name as string;
      logoUrl = c.logo_url as string | null;
      if (Array.isArray(c.plantas)) plantas = c.plantas as string[];
    }
  }

  return {
    email: user?.email ?? null,
    role: ctx.role,
    isAdmin: ctx.isAdmin,
    plant: ctx.plant,
    assignedPlants: ctx.plants,
    assignedGates: ctx.gates,
    companyId: ctx.companyId,
    companyName,
    logoUrl,
    plantas,
    isImpersonating: ctx.isImpersonating,
  };
}

export async function changePassword(rawData: unknown) {
  const v = validated(changePasswordSchema, rawData);
  if (!v.ok) return { success: false, error: v.error };
  const { currentPassword, newPassword } = v.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { success: false, error: "No autenticado" };
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email, password: currentPassword,
  });
  if (signInError) return { success: false, error: "Contraseña actual incorrecta" };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function generateUserMagicLink(email: string) {
  if (!(await requireAdmin())) return { success: false as const, error: "No autorizado" };
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !data?.properties?.action_link) {
    return { success: false as const, error: error?.message ?? "No se pudo generar el enlace" };
  }
  return { success: true as const, link: data.properties.action_link as string };
}
