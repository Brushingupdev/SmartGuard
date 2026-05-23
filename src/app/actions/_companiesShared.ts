import { createClient } from "@/utils/supabase/server";
import type { UserContext } from "@/utils/supabase/user";
import type { CompanySettingsInput } from "@/lib/validations";

type AuthUserLite = { email?: string; user_metadata?: Record<string, unknown> };

async function getAdminClient() {
  const { createAdminClient } = await import("@/utils/supabase/admin");
  return createAdminClient();
}

export function buildCompanySettingsUpdate(settings: CompanySettingsInput): Record<string, unknown> {
  const update: Record<string, unknown> = {};

  if (settings.notificationEmails !== undefined) {
    update.notification_emails = settings.notificationEmails.filter(Boolean);
  }
  if (settings.notificationPhones !== undefined) {
    update.notification_phones = settings.notificationPhones.filter(Boolean);
  }
  if (settings.contactName !== undefined) {
    update.contact_name = settings.contactName;
  }
  if (settings.alertaMinutos !== undefined) {
    update.alerta_minutos = settings.alertaMinutos;
  }
  if (settings.plantas !== undefined) {
    update.plantas = settings.plantas
      .split(",")
      .map((plant) => plant.trim())
      .filter(Boolean);
  }

  return update;
}

export async function fetchAllAuthUsers(): Promise<AuthUserLite[]> {
  const admin = await getAdminClient();
  const all = [] as AuthUserLite[];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  while (hasMore && page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) {
      hasMore = false;
      break;
    }

    all.push(...data.users);
    if (data.users.length < perPage) {
      hasMore = false;
    }
    page++;
  }

  return all;
}

export async function fetchActiveCompanies() {
  const admin = await getAdminClient();
  const { data } = await admin
    .from("companies")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");

  return (data ?? []) as { id: string; name: string }[];
}

export async function fetchCompanyNameMap(): Promise<Record<string, string>> {
  const companies = await fetchActiveCompanies();
  return companies.reduce<Record<string, string>>((map, company) => {
    map[company.id] = company.name;
    return map;
  }, {});
}

export async function fetchDeletedCompaniesRows(): Promise<{ id: string; name: string; deletedAt: string }[]> {
  const admin = await getAdminClient();
  const { data } = await admin
    .from("companies")
    .select("id, name, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  return (data ?? []).map((company) => ({
    id: company.id as string,
    name: company.name as string,
    deletedAt: company.deleted_at as string,
  }));
}

export async function fetchCompanyPlants(companyId: string, isAdmin: boolean): Promise<string[]> {
  if (!companyId) return [];

  const supabase = isAdmin ? await getAdminClient() : await createClient();
  const { data } = await supabase
    .from("companies")
    .select("plantas")
    .eq("id", companyId)
    .single();

  return data?.plantas?.length ? (data.plantas as string[]) : [];
}

export async function resolveUserPlants(ctx: UserContext | null): Promise<string[]> {
  if (ctx?.role === "guardia" && ctx.plants.length > 0) {
    return ctx.plants;
  }

  if (ctx?.isAdmin) {
    const admin = await getAdminClient();
    const { data } = await admin
      .from("atenciones")
      .select("planta")
      .not("company_id", "is", null)
      .not("planta", "is", null)
      .order("planta")
      .limit(5000);

    if (!data) return [];
    return [...new Set(data.map((row: { planta: string }) => row.planta).filter(Boolean))] as string[];
  }

  const supabase = await createClient();

  if (ctx?.companyId) {
    const companyPlants = await fetchCompanyPlants(ctx.companyId, false);
    if (companyPlants.length > 0) return companyPlants;
  }

  try {
    const { data } = await supabase.rpc("get_user_plants", {
      p_company_id: ctx?.companyId ?? null,
    });
    if (data) {
      return (data as { planta: string }[]).map((row) => row.planta);
    }
  } catch {
    // Keep last-resort fallback below.
  }

  const { data } = await supabase
    .from("atenciones")
    .select("planta")
    .not("planta", "is", null)
    .order("planta")
    .limit(5000);

  if (!data) return [];
  return [...new Set(data.map((row: { planta: string }) => row.planta).filter(Boolean))] as string[];
}
