type AuthUserLite = { email?: string; user_metadata?: Record<string, unknown> };

type CompanyRow = {
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
};

type CompanyRecordRow = {
  company_id: string | null;
  fecha: string;
};

type AlertLogRow = {
  company_id?: string | null;
  success?: boolean | null;
  [key: string]: unknown;
};

type PushSubscriptionRow = {
  company_id: string | null;
  plant?: string | null;
};

type QueueStatusRow = {
  company_id: string | null;
  status: string | null;
};

type QueueIssueRow = {
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
};

function getTrialState(plan: string | null | undefined, trialEndsAt: string | null | undefined, today: string) {
  const normalizedPlan = plan ?? "trial";
  let trialDaysLeft: number | null = null;
  let trialExpired = false;

  if (normalizedPlan === "trial" && trialEndsAt) {
    trialDaysLeft = Math.ceil((new Date(trialEndsAt).getTime() - new Date(today).getTime()) / 86_400_000);
    if (trialDaysLeft < 0) trialExpired = true;
  }

  return {
    plan: normalizedPlan,
    trialEndsAt: trialEndsAt ?? null,
    trialDaysLeft,
    trialExpired,
  };
}

function buildCompanyNameMap(companies: CompanyRow[]): Record<string, string> {
  const map: Record<string, string> = {};
  companies.forEach((company) => {
    map[company.id] = company.name;
  });
  return map;
}

export function buildAdminOverview({
  allCompanies,
  users,
  records,
  today,
  thirtyDaysAgo,
}: {
  allCompanies: CompanyRow[];
  users: AuthUserLite[];
  records: CompanyRecordRow[];
  today: string;
  thirtyDaysAgo: string;
}) {
  const companies = allCompanies.filter((company) => company.deleted_at == null);
  const deletedCompanies = allCompanies.filter((company) => company.deleted_at != null);

  const overview = companies.map((company) => {
    const compUsers = users.filter((user) => user.user_metadata?.company_id === company.id);
    const compRecords = records.filter((record) => record.company_id === company.id);
    const recentRecords = compRecords.filter((record) => record.fecha >= thirtyDaysAgo);
    const lastActivity = compRecords.length > 0
      ? [...compRecords].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha
      : null;
    const hasContacts = (company.notification_emails?.length ?? 0) > 0
      || (company.notification_phones?.length ?? 0) > 0;

    let health: "ok" | "warn" | "issue" = "ok";
    if (compUsers.length === 0 || compRecords.length === 0) health = "issue";
    else if (!hasContacts) health = "warn";

    const trialState = getTrialState(company.plan, company.trial_ends_at, today);

    return {
      id: company.id,
      name: company.name,
      sector: company.sector ?? "",
      logoUrl: company.logo_url ?? null,
      plantas: company.plantas ?? [],
      createdAt: company.created_at ?? "",
      users: compUsers.length,
      guardias: compUsers.filter((user) => user.user_metadata?.role === "guardia").length,
      supervisors: compUsers.filter((user) => user.user_metadata?.role === "supervisor").length,
      totalRecords: compRecords.length,
      recentRecords: recentRecords.length,
      lastActivity,
      hasContacts,
      health,
      ...trialState,
    };
  });

  return {
    companies: overview,
    deletedCompanies: deletedCompanies.map((company) => ({
      id: company.id,
      name: company.name,
      deletedAt: company.deleted_at ?? "",
    })),
    totalCompanies: companies.length,
    totalUsers: users.filter((user) => user.user_metadata?.company_id).length,
    totalRecords: records.length,
  };
}

export function buildPlatformStats<TLog extends AlertLogRow, TQueueIssue extends QueueIssueRow>({
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
}: {
  companies: CompanyRow[];
  logsToday: AlertLogRow[];
  logsRecent: TLog[];
  activityWeek: CompanyRecordRow[];
  activityMonth: CompanyRecordRow[];
  pushSubscriptions: PushSubscriptionRow[];
  queueRows: QueueStatusRow[];
  queueIssuesRaw: TQueueIssue[];
  users: AuthUserLite[];
  backend: {
    pushConfigured: boolean;
    resendConfigured: boolean;
    whatsappConfigured: boolean;
    siteUrlConfigured: boolean;
  };
}) {
  const sentToday = logsToday.length;
  const successToday = logsToday.filter((log) => Boolean(log.success)).length;
  const deliveryRate = sentToday > 0 ? Math.round((successToday / sentToday) * 100) : null;
  const pushDevices = pushSubscriptions.length;
  const queuePending = queueRows.filter((row) => row.status === "pending" || row.status === "processing").length;

  const companyStats = companies.map((company) => {
    const compUsers = users.filter((user) => user.user_metadata?.company_id === company.id);
    const weekActivity = activityWeek.filter((record) => record.company_id === company.id).length;
    const monthActivity = activityMonth.filter((record) => record.company_id === company.id).length;
    const compPushSubs = pushSubscriptions.filter((sub) => sub.company_id === company.id).length;
    const compQueuePending = queueRows.filter((row) => row.company_id === company.id && (row.status === "pending" || row.status === "processing")).length;
    const hasEmail = (company.notification_emails?.length ?? 0) > 0;
    const hasPhone = (company.notification_phones?.length ?? 0) > 0;
    const hasUsers = compUsers.length > 0;
    const hasPlants = (company.plantas?.length ?? 0) > 0;
    const hasPush = compPushSubs > 0;

    const issues: string[] = [];
    if (!hasEmail && !hasPhone) issues.push("Sin alertas configuradas");
    if (!hasUsers) issues.push("Sin usuarios");
    if (weekActivity === 0) issues.push("Sin actividad en 7 días");
    if (!hasPlants) issues.push("Sin sedes configuradas");
    if (!hasPush) issues.push("Sin dispositivos push");
    if (compQueuePending > 0) issues.push("Alertas en cola");

    let status: "ok" | "warn" | "risk" = "ok";
    if (issues.length >= 2 || (!hasUsers && monthActivity === 0)) status = "risk";
    else if (issues.length >= 1) status = "warn";

    return {
      id: company.id,
      name: company.name,
      logoUrl: company.logo_url ?? null,
      hasEmail,
      hasPhone,
      hasUsers,
      hasPlants,
      hasPush,
      weekActivity,
      monthActivity,
      pushDevices: compPushSubs,
      queuePending: compQueuePending,
      users: compUsers.length,
      issues,
      status,
    };
  });

  const activeThisWeek = companyStats.filter((company) => company.weekActivity > 0).length;
  const incompleteConfig = companyStats.filter((company) => company.status !== "ok").length;

  const infraIssues: string[] = [];
  if (queuePending > 0) infraIssues.push(`Hay ${queuePending} alerta${queuePending === 1 ? "" : "s"} pendiente${queuePending === 1 ? "" : "s"} o procesándose.`);
  if (pushDevices === 0) infraIssues.push("No hay dispositivos push suscritos en la plataforma.");
  if (logsToday.length === 0) infraIssues.push("Hoy no se registran envíos en alert_logs; revisa cron y canales configurados.");
  if (!backend.pushConfigured) infraIssues.push("Faltan variables VAPID para notificaciones push.");
  if (!backend.resendConfigured) infraIssues.push("Falta RESEND_API_KEY para alertas por correo.");
  if (!backend.whatsappConfigured) infraIssues.push("Falta configuración GREEN_API para WhatsApp.");
  if (!backend.siteUrlConfigured) infraIssues.push("Falta NEXT_PUBLIC_SITE_URL para enlaces consistentes en alertas.");

  const companyNameMap = buildCompanyNameMap(companies);

  return {
    sentToday,
    successToday,
    deliveryRate,
    activeThisWeek,
    totalCompanies: companies.length,
    incompleteConfig,
    pushDevices,
    queuePending,
    backend,
    infraIssues,
    companyStats,
    recentLogs: logsRecent.map((log) => ({
      ...log,
      companyName: log.company_id ? (companyNameMap[log.company_id] ?? "—") : "—",
    })),
    queueIssues: queueIssuesRaw.map((row) => ({
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_id ? (companyNameMap[row.company_id] ?? "—") : "—",
      razonSocial: row.razon_social ?? "—",
      empresa: row.empresa ?? "—",
      planta: row.planta ?? "—",
      status: row.status,
      attempts: Number(row.attempts ?? 0),
      maxAttempts: Number(row.max_attempts ?? 0),
      lastError: row.last_error ?? null,
      createdAt: row.created_at,
    })),
  };
}
