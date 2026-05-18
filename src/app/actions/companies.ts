"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { cookies } from "next/headers";
import {
  adminUpdatePlanSchema,
  companySettingsSchema,
  validated,
} from "@/lib/validations";
import { normalizeGateAssignments, type GateAssignment } from "@/lib/gates";
import { nowLima, daysAgoLima, requireAdmin, checkWriteAccess } from "./_helpers";
import { signValue } from "@/utils/cookie-signing";

// Helper: fetch all auth users with pagination (max 10 páginas × 100 = 1000 usuarios)
async function fetchAllAuthUsers(): Promise<{ email?: string; user_metadata?: Record<string, unknown> }[]> {
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const all = [] as { email?: string; user_metadata?: Record<string, unknown> }[];
  let page = 1;
  const perPage = 100;
  let hasMore = true;
  while (hasMore && page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) { hasMore = false; break; }
    all.push(...data.users);
    if (data.users.length < perPage) hasMore = false;
    page++;
  }
  return all;
}

export async function getCompanySettings() {
  const ctx = await getUserContext();
  if (!ctx?.companyId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name, sector, contact_name, notification_emails, notification_phones, plantas, logo_url, alerta_minutos")
    .eq("id", ctx.companyId)
    .single();
  return data ?? null;
}

export async function updateCompanySettings(rawSettings: unknown) {
  const v = validated(companySettingsSchema, rawSettings);
  if (!v.ok) return { success: false, error: v.error };
  const settings = v.data;
  const ctx = await getUserContext();

  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, error: writeError };

  if (!ctx?.companyId) return { success: false, error: "No autorizado" };
  const supabase = await createClient();

  const update: Record<string, unknown> = {};
  if (settings.notificationEmails !== undefined) update.notification_emails = settings.notificationEmails.filter(Boolean);
  if (settings.notificationPhones !== undefined) update.notification_phones = settings.notificationPhones.filter(Boolean);
  if (settings.contactName        !== undefined) update.contact_name        = settings.contactName;
  if (settings.alertaMinutos      !== undefined) update.alerta_minutos      = settings.alertaMinutos;
  if (settings.plantas            !== undefined) {
    update.plantas = settings.plantas.split(",").map(p => p.trim()).filter(Boolean);
  }

  const { error } = await supabase.from("companies").update(update).eq("id", ctx.companyId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function adminUpdateCompanySettings(
  rawCompanyId: unknown,
  rawSettings: unknown
) {
  const companyId = typeof rawCompanyId === "string" ? rawCompanyId : String(rawCompanyId);
  if (!companyId) return { success: false, error: "ID de empresa inválido" };

  const v = validated(companySettingsSchema, rawSettings);
  if (!v.ok) return { success: false, error: v.error };
  const settings = v.data;
  const ctx = await getUserContext();
  if (!ctx?.isAdmin) return { success: false, error: "No autorizado" };
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const update: Record<string, unknown> = {};
  if (settings.notificationEmails !== undefined) update.notification_emails = settings.notificationEmails.filter(Boolean);
  if (settings.notificationPhones !== undefined) update.notification_phones = settings.notificationPhones.filter(Boolean);
  if (settings.contactName        !== undefined) update.contact_name        = settings.contactName;
  if (settings.alertaMinutos      !== undefined) update.alerta_minutos      = settings.alertaMinutos;
  if (settings.plantas            !== undefined) {
    update.plantas = settings.plantas.split(",").map(p => p.trim()).filter(Boolean);
  }

  const { error } = await admin.from("companies").update(update).eq("id", companyId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function adminUpdatePlan(rawData: unknown) {
  const v = validated(adminUpdatePlanSchema, rawData);
  if (!v.ok) return { success: false };
  const { companyId, plan, trialEndsAt } = v.data;
  const ctx = await getUserContext();
  if (!ctx?.isAdmin) return { success: false };
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const update: Record<string, unknown> = { plan };
  if (plan === "trial" && trialEndsAt) update.trial_ends_at = trialEndsAt;
  if (plan === "active" || plan === "suspended") update.trial_ends_at = null;
  const { error } = await admin.from("companies").update(update).eq("id", companyId);
  return error ? { success: false } : { success: true };
}

export async function getCompanies() {
  if (!(await requireAdmin())) return [];
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin.from("companies").select("id, name").is("deleted_at", null).order("name");
  return (data ?? []) as { id: string; name: string }[];
}

export async function getCompanyPlants(companyId: string): Promise<string[]> {
  if (!companyId) return [];
  const ctx = await getUserContext();
  const supabase = await createClient();

  let company:
    | { plantas: string[] | null }
    | null = null;

  if (ctx?.isAdmin) {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();
    const { data } = await admin
      .from("companies")
      .select("plantas")
      .eq("id", companyId)
      .single();
    company = data;
  } else {
    const { data } = await supabase
      .from("companies")
      .select("plantas")
      .eq("id", companyId)
      .single();
    company = data;
  }

  if (company?.plantas?.length) return company.plantas as string[];
  return [];
}

export async function getCompanyGateOptions(companyId: string): Promise<GateAssignment[]> {
  const plants = await getCompanyPlants(companyId);
  return normalizeGateAssignments(null, plants);
}

export async function getCompaniesMap(): Promise<Record<string, string>> {
  const ctx = await getUserContext();
  if (!ctx?.isAdmin) return {};
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin.from("companies").select("id, name").is("deleted_at", null);
  const map: Record<string, string> = {};
  (data ?? []).forEach((c: { id: string; name: string }) => { map[c.id] = c.name; });
  return map;
}

export async function getUserPlants(): Promise<string[]> {
  const ctx = await getUserContext();
  const supabase = await createClient();

  if (ctx?.role === "guardia" && ctx.plants.length > 0) {
    return ctx.plants;
  }

  if (ctx?.isAdmin) {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();
    const { data } = await admin
      .from("atenciones")
      .select("planta")
      .not("company_id", "is", null)
      .not("planta", "is", null)
      .order("planta")
      .limit(5000);
    if (!data) return [];
    return [...new Set(data.map((r: { planta: string }) => r.planta).filter(Boolean))] as string[];
  }

  // Company user: return their company's configured plants from companies table
  if (!ctx?.isAdmin && ctx?.companyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("plantas")
      .eq("id", ctx.companyId)
      .single();
    if (company?.plantas?.length) return company.plantas as string[];
  }

  // Fallback: distinct via SQL para usuario empresa
  try {
    const { data } = await supabase.rpc("get_user_plants", { p_company_id: ctx?.companyId ?? null });
    if (data) return (data as { planta: string }[]).map(r => r.planta);
  } catch {
    // fallback below
  }

  // Last-resort: query directa
  const { data } = await supabase.from("atenciones").select("planta").not("planta", "is", null).order("planta").limit(5000);
  if (!data) return [];
  return [...new Set(data.map((r: { planta: string }) => r.planta).filter(Boolean))] as string[];
}

export async function getUserGateOptions(): Promise<GateAssignment[]> {
  const ctx = await getUserContext();
  if (ctx?.role === "guardia" && ctx.gates.length > 0) {
    return ctx.gates;
  }
  const plants = await getUserPlants();
  return normalizeGateAssignments(null, plants);
}

export async function getAdminOverview() {
  const ctx = await getUserContext();
  if (!ctx?.isAdmin) return null;
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const [{ data: allCompanies }, usersData, { data: records }] = await Promise.all([
    admin.from("companies").select("id, name, sector, logo_url, notification_emails, notification_phones, plantas, created_at, deleted_at, plan, trial_ends_at").order("created_at", { ascending: false }),
    fetchAllAuthUsers(),
    admin.from("atenciones").select("company_id, fecha").not("company_id", "is", null),
  ]);

  const companies = (allCompanies ?? []).filter(c => c.deleted_at === null || c.deleted_at === undefined);
  const deletedCompanies = (allCompanies ?? []).filter(c => c.deleted_at !== null && c.deleted_at !== undefined);

  if (!companies) return null;

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30).toISOString().split("T")[0];

  const overview = companies.map(company => {
    const compUsers = (usersData ?? []).filter(u => u.user_metadata?.company_id === company.id);
    const compRecords = (records ?? []).filter(r => r.company_id === company.id);
    const recentRecords = compRecords.filter(r => r.fecha >= thirtyDaysAgo);
    const lastActivity = compRecords.length > 0
      ? compRecords.sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha
      : null;

    const hasContacts = ((company.notification_emails as string[] | null)?.length ?? 0) > 0
                     || ((company.notification_phones as string[] | null)?.length ?? 0) > 0;

    let health: "ok" | "warn" | "issue" = "ok";
    if (compUsers.length === 0 || compRecords.length === 0) health = "issue";
    else if (!hasContacts) health = "warn";

    const plan         = (company.plan as string) ?? "trial";
    const trialEndsAt  = company.trial_ends_at as string | null;
    const { date: today } = nowLima();
    let trialDaysLeft: number | null = null;
    let trialExpired = false;
    if (plan === "trial" && trialEndsAt) {
      trialDaysLeft = Math.ceil((new Date(trialEndsAt).getTime() - new Date(today).getTime()) / 86_400_000);
      if (trialDaysLeft < 0) trialExpired = true;
    }

    return {
      id:            company.id as string,
      name:          company.name as string,
      sector:        company.sector as string,
      logoUrl:       company.logo_url as string | null,
      plantas:       (company.plantas as string[]) ?? [],
      createdAt:     company.created_at as string,
      users:         compUsers.length,
      guardias:      compUsers.filter(u => u.user_metadata?.role === "guardia").length,
      supervisors:   compUsers.filter(u => u.user_metadata?.role === "supervisor").length,
      totalRecords:  compRecords.length,
      recentRecords: recentRecords.length,
      lastActivity,
      hasContacts,
      health,
      plan,
      trialEndsAt,
      trialDaysLeft,
      trialExpired,
    };
  });

  const deletedOverview = deletedCompanies.map(company => ({
    id:            company.id as string,
    name:          company.name as string,
    deletedAt:     company.deleted_at as string,
  }));

  return {
    companies: overview,
    deletedCompanies: deletedOverview,
    totalCompanies: companies.length,
    totalUsers: (usersData ?? []).filter(u => u.user_metadata?.company_id).length,
    totalRecords: (records ?? []).length,
  };
}

export async function getPlatformStats() {
  const ctx = await getUserContext();
  if (!ctx?.isAdmin) return null;
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const { date: today } = nowLima();
  const sevenAgo  = daysAgoLima(7);
  const thirtyAgo = daysAgoLima(30);

  const [
    { data: companies },
    { data: logsToday },
    { data: logsRecent },
    { data: activityWeek },
    { data: activityMonth },
    { data: pushSubscriptions },
    { data: queueRows },
    users,
  ] = await Promise.all([
    admin.from("companies").select("id, name, logo_url, notification_emails, notification_phones, plantas").is("deleted_at", null),
    admin.from("alert_logs").select("*").gte("created_at", today + "T00:00:00Z"),
    admin.from("alert_logs").select("*").order("created_at", { ascending: false }).limit(80),
    admin.from("atenciones").select("company_id, fecha").gte("fecha", sevenAgo),
    admin.from("atenciones").select("company_id, fecha").gte("fecha", thirtyAgo),
    admin.from("push_subscriptions").select("company_id, plant"),
    admin.from("alert_queue").select("company_id, status"),
    fetchAllAuthUsers(),
  ]);

  // KPIs globales de alertas hoy
  const sentToday    = (logsToday ?? []).length;
  const successToday = (logsToday ?? []).filter(l => l.success).length;
  const deliveryRate = sentToday > 0 ? Math.round((successToday / sentToday) * 100) : null;
  const pushDevices = (pushSubscriptions ?? []).length;
  const queuePending = (queueRows ?? []).filter((row) => row.status === "pending" || row.status === "processing").length;

  // Estado por empresa
  const companyStats = (companies ?? []).map(c => {
    const compUsers    = users.filter(u => u.user_metadata?.company_id === c.id);
    const weekActivity = (activityWeek ?? []).filter(r => r.company_id === c.id).length;
    const monthActivity= (activityMonth ?? []).filter(r => r.company_id === c.id).length;
    const compPushSubs = (pushSubscriptions ?? []).filter((sub) => sub.company_id === c.id).length;
    const compQueuePending = (queueRows ?? []).filter((row) => row.company_id === c.id && (row.status === "pending" || row.status === "processing")).length;
    const hasEmail     = ((c.notification_emails as string[] | null)?.length ?? 0) > 0;
    const hasPhone     = ((c.notification_phones as string[] | null)?.length ?? 0) > 0;
    const hasUsers     = compUsers.length > 0;
    const hasPlants    = ((c.plantas as string[] | null)?.length ?? 0) > 0;
    const hasPush      = compPushSubs > 0;

    const issues: string[] = [];
    if (!hasEmail && !hasPhone) issues.push("Sin alertas configuradas");
    if (!hasUsers)               issues.push("Sin usuarios");
    if (weekActivity === 0)      issues.push("Sin actividad en 7 días");
    if (!hasPlants)              issues.push("Sin sedes configuradas");
    if (!hasPush)                issues.push("Sin dispositivos push");
    if (compQueuePending > 0)    issues.push("Alertas en cola");

    let status: "ok" | "warn" | "risk" = "ok";
    if (issues.length >= 2 || (!hasUsers && monthActivity === 0)) status = "risk";
    else if (issues.length >= 1) status = "warn";

    return {
      id:            c.id as string,
      name:          c.name as string,
      logoUrl:       c.logo_url as string | null,
      hasEmail, hasPhone, hasUsers, hasPlants, hasPush,
      weekActivity, monthActivity,
      pushDevices:   compPushSubs,
      queuePending:  compQueuePending,
      users:         compUsers.length,
      issues, status,
    };
  });

  const activeThisWeek = companyStats.filter(c => c.weekActivity > 0).length;
  const incompleteConfig = companyStats.filter(c => c.status !== "ok").length;
  const backend = {
    pushConfigured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    whatsappConfigured: Boolean(process.env.GREEN_API_INSTANCE && process.env.GREEN_API_TOKEN),
    siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };
  const infraIssues: string[] = [];
  if (queuePending > 0) infraIssues.push(`Hay ${queuePending} alerta${queuePending === 1 ? "" : "s"} pendiente${queuePending === 1 ? "" : "s"} o procesándose.`);
  if (pushDevices === 0) infraIssues.push("No hay dispositivos push suscritos en la plataforma.");
  if ((logsToday ?? []).length === 0) infraIssues.push("Hoy no se registran envíos en alert_logs; revisa cron y canales configurados.");
  if (!backend.pushConfigured) infraIssues.push("Faltan variables VAPID para notificaciones push.");
  if (!backend.resendConfigured) infraIssues.push("Falta RESEND_API_KEY para alertas por correo.");
  if (!backend.whatsappConfigured) infraIssues.push("Falta configuración GREEN_API para WhatsApp.");
  if (!backend.siteUrlConfigured) infraIssues.push("Falta NEXT_PUBLIC_SITE_URL para enlaces consistentes en alertas.");

  // Logs recientes con company_id
  const compMap: Record<string, string> = {};
  (companies ?? []).forEach((c: { id: string; name: string }) => { compMap[c.id] = c.name; });

  const recentLogs = (logsRecent ?? []).map(l => ({
    ...l,
    companyName: l.company_id ? (compMap[l.company_id] ?? "—") : "—",
  }));

  return {
    sentToday, successToday, deliveryRate,
    activeThisWeek,
    totalCompanies: (companies ?? []).length,
    incompleteConfig,
    pushDevices,
    queuePending,
    backend,
    infraIssues,
    companyStats,
    recentLogs,
  };
}

export async function getBillingStatus() {
  const ctx = await getUserContext();
  if (!ctx || ctx.isAdmin || !ctx.companyId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("plan, trial_ends_at, name")
    .eq("id", ctx.companyId)
    .single();
  if (!data) return null;

  const plan = (data.plan as string) ?? "trial";
  const trialEndsAt = data.trial_ends_at as string | null;
  const { date: today } = nowLima();

  let daysLeft: number | null = null;
  let expired = false;
  if (plan === "trial" && trialEndsAt) {
    daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - new Date(today).getTime()) / 86_400_000);
    if (daysLeft < 0) expired = true;
  }

  return { plan, trialEndsAt, daysLeft, expired, companyName: data.name as string };
}

// ─── Impersonation ────────────────────────────────────────────────────────────

export async function startImpersonation(companyId: string): Promise<{ ok: boolean }> {
  const isAdmin = await requireAdmin();
  if (!isAdmin) return { ok: false };

  const secret = process.env.IMPERSONATE_COOKIE_SECRET;
  if (!secret) throw new Error("IMPERSONATE_COOKIE_SECRET is not configured");

  const cookieStore = await cookies();
  cookieStore.set("sg_impersonate", signValue(companyId, secret), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 30, // 30 min
  });

  return { ok: true };
}

export async function stopImpersonation(): Promise<{ ok: boolean }> {
  const cookieStore = await cookies();
  cookieStore.set("sg_impersonate", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0, // delete
  });

  return { ok: true };
}

// ─── Soft Delete / Reactivación ───────────────────────────────────────────────

export async function deleteCompany(companyId: string): Promise<{ success: boolean; error?: string }> {
  if (!companyId) return { success: false, error: "ID inválido" };
  if (!(await requireAdmin())) return { success: false, error: "No autorizado" };

  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const { error } = await admin
    .from("companies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", companyId)
    .is("deleted_at", null); // solo si no está ya eliminada

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function reactivateCompany(companyId: string): Promise<{ success: boolean; error?: string }> {
  if (!companyId) return { success: false, error: "ID inválido" };
  if (!(await requireAdmin())) return { success: false, error: "No autorizado" };

  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const { error } = await admin
    .from("companies")
    .update({ deleted_at: null })
    .eq("id", companyId)
    .not("deleted_at", "is", null); // solo si está eliminada

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getDeletedCompanies(): Promise<{ id: string; name: string; deletedAt: string }[]> {
  if (!(await requireAdmin())) return [];
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const { data } = await admin
    .from("companies")
    .select("id, name, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  return (data ?? []).map(c => ({
    id: c.id as string,
    name: c.name as string,
    deletedAt: c.deleted_at as string,
  }));
}
