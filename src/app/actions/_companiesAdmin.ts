import { createClient } from "@/utils/supabase/server";

type PlatformStatsDateRange = {
  today: string;
  sevenAgo: string;
  thirtyAgo: string;
};

async function getAdminClient() {
  const { createAdminClient } = await import("@/utils/supabase/admin");
  return createAdminClient();
}

export async function fetchCompanySettingsById(
  companyId: string,
  useAdminClient: boolean
) {
  const supabase = useAdminClient ? await getAdminClient() : await createClient();
  const { data } = await supabase
    .from("companies")
    .select(
      "id, name, sector, contact_name, notification_emails, notification_phones, plantas, logo_url, alerta_minutos"
    )
    .eq("id", companyId)
    .single();

  return data ?? null;
}

export async function persistCompanySettings(
  companyId: string,
  update: Record<string, unknown>,
  useAdminClient: boolean
) {
  const supabase = useAdminClient ? await getAdminClient() : await createClient();
  const { error } = await supabase
    .from("companies")
    .update(update)
    .eq("id", companyId);

  return error;
}

export async function persistCompanyPlan(
  companyId: string,
  update: Record<string, unknown>
) {
  const admin = await getAdminClient();
  const { error } = await admin.from("companies").update(update).eq("id", companyId);
  return error;
}

export async function fetchAdminOverviewData() {
  const admin = await getAdminClient();
  const { fetchAllAuthUsers } = await import("./_companiesShared");

  const [{ data: allCompanies }, users, { data: records }] = await Promise.all([
    admin
      .from("companies")
      .select(
        "id, name, sector, logo_url, notification_emails, notification_phones, plantas, created_at, deleted_at, plan, trial_ends_at"
      )
      .order("created_at", { ascending: false }),
    fetchAllAuthUsers(),
    admin
      .from("atenciones")
      .select("company_id, fecha")
      .not("company_id", "is", null),
  ]);

  return {
    allCompanies: (allCompanies ?? []) as {
      id: string;
      name: string;
      sector?: string | null;
      logo_url?: string | null;
      notification_emails?: string[] | null;
      notification_phones?: string[] | null;
      plantas?: string[] | null;
      created_at?: string | null;
      deleted_at?: string | null;
      plan?: string | null;
      trial_ends_at?: string | null;
    }[],
    users,
    records: (records ?? []) as { company_id: string | null; fecha: string }[],
  };
}

export async function fetchPlatformStatsData({
  today,
  sevenAgo,
  thirtyAgo,
}: PlatformStatsDateRange) {
  const admin = await getAdminClient();
  const { fetchAllAuthUsers } = await import("./_companiesShared");

  const [
    { data: companies },
    { data: logsToday },
    { data: logsRecent },
    { data: activityWeek },
    { data: activityMonth },
    { data: pushSubscriptions },
    { data: queueRows },
    { data: queueIssuesRaw },
    users,
  ] = await Promise.all([
    admin
      .from("companies")
      .select("id, name, logo_url, notification_emails, notification_phones, plantas")
      .is("deleted_at", null),
    admin.from("alert_logs").select("*").gte("created_at", `${today}T00:00:00Z`),
    admin
      .from("alert_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80),
    admin.from("atenciones").select("company_id, fecha").gte("fecha", sevenAgo),
    admin.from("atenciones").select("company_id, fecha").gte("fecha", thirtyAgo),
    admin.from("push_subscriptions").select("company_id, plant"),
    admin.from("alert_queue").select("company_id, status"),
    admin
      .from("alert_queue")
      .select(
        "id, company_id, razon_social, empresa, planta, status, attempts, max_attempts, last_error, created_at"
      )
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: false })
      .limit(12),
    fetchAllAuthUsers(),
  ]);

  return {
    companies: (companies ?? []) as {
      id: string;
      name: string;
      logo_url?: string | null;
      notification_emails?: string[] | null;
      notification_phones?: string[] | null;
      plantas?: string[] | null;
    }[],
    logsToday: (logsToday ?? []) as {
      company_id?: string | null;
      success?: boolean | null;
      [key: string]: unknown;
    }[],
    logsRecent: (logsRecent ?? []) as {
      id: string;
      channel: string;
      company_id: string | null;
      success: boolean;
      razon_social: string;
      recipient: string;
      created_at: string;
    }[],
    activityWeek: (activityWeek ?? []) as {
      company_id: string | null;
      fecha: string;
    }[],
    activityMonth: (activityMonth ?? []) as {
      company_id: string | null;
      fecha: string;
    }[],
    pushSubscriptions: (pushSubscriptions ?? []) as {
      company_id: string | null;
      plant?: string | null;
    }[],
    queueRows: (queueRows ?? []) as {
      company_id: string | null;
      status: string | null;
    }[],
    queueIssuesRaw: (queueIssuesRaw ?? []) as {
      id: string;
      company_id: string | null;
      razon_social?: string | null;
      empresa?: string | null;
      planta?: string | null;
      status: "pending" | "failed";
      attempts?: number | null;
      max_attempts?: number | null;
      last_error?: string | null;
      created_at: string;
    }[],
    users,
  };
}

export async function retryFailedAlertQueueRows(ids?: string[]) {
  const admin = await getAdminClient();
  let query = admin
    .from("alert_queue")
    .update({
      status: "pending",
      attempts: 0,
      last_error: null,
      processed_at: null,
      processing_started_at: null,
    })
    .eq("status", "failed");

  if (ids && ids.length > 0) {
    query = query.in("id", ids);
  }

  const { data, error } = await query.select("id");
  return { data, error };
}

export async function fetchCompanyBillingById(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("plan, trial_ends_at, name")
    .eq("id", companyId)
    .single();

  return data ?? null;
}

export async function markCompanyDeleted(companyId: string, deletedAt: string | null) {
  const admin = await getAdminClient();
  const query = admin.from("companies").update({ deleted_at: deletedAt }).eq("id", companyId);
  const { error } =
    deletedAt == null
      ? await query.not("deleted_at", "is", null)
      : await query.is("deleted_at", null);

  return error;
}
