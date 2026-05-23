"use server";

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
import { buildAdminOverview, buildPlatformStats } from "./_companyAdminMetrics";
import {
  buildCompanySettingsUpdate,
  fetchActiveCompanies,
  fetchCompanyNameMap,
  fetchCompanyPlants,
  fetchDeletedCompaniesRows,
  resolveUserPlants,
} from "./_companiesShared";
import {
  fetchAdminOverviewData,
  fetchCompanyBillingById,
  fetchCompanySettingsById,
  fetchPlatformStatsData,
  markCompanyDeleted,
  persistCompanyPlan,
  persistCompanySettings,
  retryFailedAlertQueueRows,
} from "./_companiesAdmin";

export async function getCompanySettings() {
  const ctx = await getUserContext();
  if (!ctx?.companyId) return null;
  return fetchCompanySettingsById(ctx.companyId, false);
}

export async function updateCompanySettings(rawSettings: unknown) {
  const v = validated(companySettingsSchema, rawSettings);
  if (!v.ok) return { success: false, error: v.error };
  const settings = v.data;
  const ctx = await getUserContext();

  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, error: writeError };

  if (!ctx?.companyId) return { success: false, error: "No autorizado" };
  const update = buildCompanySettingsUpdate(settings);
  const error = await persistCompanySettings(ctx.companyId, update, false);
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
  const update = buildCompanySettingsUpdate(settings);
  const error = await persistCompanySettings(companyId, update, true);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function adminUpdatePlan(rawData: unknown) {
  const v = validated(adminUpdatePlanSchema, rawData);
  if (!v.ok) return { success: false };
  const { companyId, plan, trialEndsAt } = v.data;
  const ctx = await getUserContext();
  if (!ctx?.isAdmin) return { success: false };
  const update: Record<string, unknown> = { plan };
  if (plan === "trial" && trialEndsAt) update.trial_ends_at = trialEndsAt;
  if (plan === "active" || plan === "suspended") update.trial_ends_at = null;
  const error = await persistCompanyPlan(companyId, update);
  return error ? { success: false } : { success: true };
}

export async function getCompanies() {
  if (!(await requireAdmin())) return [];
  return fetchActiveCompanies();
}

export async function getCompanyPlants(companyId: string): Promise<string[]> {
  if (!companyId) return [];
  const ctx = await getUserContext();
  return fetchCompanyPlants(companyId, Boolean(ctx?.isAdmin));
}

export async function getCompanyGateOptions(companyId: string): Promise<GateAssignment[]> {
  const plants = await getCompanyPlants(companyId);
  return normalizeGateAssignments(null, plants);
}

export async function getCompaniesMap(): Promise<Record<string, string>> {
  const ctx = await getUserContext();
  if (!ctx?.isAdmin) return {};
  return fetchCompanyNameMap();
}

export async function getUserPlants(): Promise<string[]> {
  const ctx = await getUserContext();
  return resolveUserPlants(ctx);
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
  const { allCompanies, users, records } = await fetchAdminOverviewData();
  const { date: today } = nowLima();
  const thirtyDaysAgo = daysAgoLima(30);

  return buildAdminOverview({
    allCompanies,
    users,
    records,
    today,
    thirtyDaysAgo,
  });
}

export async function getPlatformStats() {
  const ctx = await getUserContext();
  if (!ctx?.isAdmin) return null;

  const { date: today } = nowLima();
  const sevenAgo  = daysAgoLima(7);
  const thirtyAgo = daysAgoLima(30);
  const {
    companies,
    logsToday,
    logsRecent,
    activityWeek,
    activityMonth,
    pushSubscriptions,
    queueRows,
    queueIssuesRaw,
    users,
  } = await fetchPlatformStatsData({
    today,
    sevenAgo,
    thirtyAgo,
  });

  const backend = {
    pushConfigured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL),
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    whatsappConfigured: Boolean(process.env.GREEN_API_INSTANCE && process.env.GREEN_API_TOKEN),
    siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };

  return buildPlatformStats({
    companies,
    logsToday,
    logsRecent,
    activityWeek,
    activityMonth,
    pushSubscriptions,
    queueRows,
    queueIssuesRaw,
    users,
    backend,
  });
}

export async function retryAlertQueue(ids?: string[]): Promise<{ success: boolean; updated: number; error?: string }> {
  if (!(await requireAdmin())) return { success: false, updated: 0, error: "No autorizado" };
  const { data, error } = await retryFailedAlertQueueRows(ids);
  if (error) return { success: false, updated: 0, error: error.message };
  return { success: true, updated: (data ?? []).length };
}

export async function getBillingStatus() {
  const ctx = await getUserContext();
  if (!ctx || ctx.isAdmin || !ctx.companyId) return null;
  const data = await fetchCompanyBillingById(ctx.companyId);
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
  const error = await markCompanyDeleted(companyId, new Date().toISOString());
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function reactivateCompany(companyId: string): Promise<{ success: boolean; error?: string }> {
  if (!companyId) return { success: false, error: "ID inválido" };
  if (!(await requireAdmin())) return { success: false, error: "No autorizado" };
  const error = await markCompanyDeleted(companyId, null);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getDeletedCompanies(): Promise<{ id: string; name: string; deletedAt: string }[]> {
  if (!(await requireAdmin())) return [];
  return fetchDeletedCompaniesRows();
}
