import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  Clock,
  type LucideIcon,
  Users,
} from "lucide-react";
import type {
  AdminCompany,
  AdminFilterKey,
  AdminFilterOption,
  InterventionType,
} from "./adminTypes";

export const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function getOnboardingUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/onboarding`;
}

export function filterCompanies(
  companies: AdminCompany[],
  search: string,
  activeFilters: Set<AdminFilterKey>
): AdminCompany[] {
  let result = companies;

  if (search) {
    const term = search.toLowerCase();
    result = result.filter(
      (company) =>
        company.name.toLowerCase().includes(term) ||
        company.sector.toLowerCase().includes(term)
    );
  }

  if (activeFilters.has("solo_alertas")) {
    result = result.filter((company) => !company.hasContacts);
  }
  if (activeFilters.has("sin_actividad")) {
    result = result.filter((company) => company.recentRecords === 0);
  }
  if (activeFilters.has("sin_usuarios")) {
    result = result.filter((company) => company.users === 0);
  }
  if (activeFilters.has("trial_venciendo")) {
    result = result.filter(
      (company) =>
        company.plan === "trial" &&
        !company.trialExpired &&
        (company.trialDaysLeft ?? 99) <= 7
    );
  }
  if (activeFilters.has("ok")) {
    result = result.filter((company) => company.health === "ok");
  }
  if (activeFilters.has("problema")) {
    result = result.filter(
      (company) => company.health === "warn" || company.health === "issue"
    );
  }

  return result;
}

export function countTrialsExpiringSoon(companies: AdminCompany[]): number {
  return companies.filter(
    (company) =>
      company.plan === "trial" &&
      !company.trialExpired &&
      (company.trialDaysLeft ?? 99) <= 7
  ).length;
}

export function countHealthyCompanies(companies: AdminCompany[]): number {
  return companies.filter((company) => company.health === "ok").length;
}

export function buildFilterOptions(
  companies: AdminCompany[],
  activeFilters: Set<AdminFilterKey>
): AdminFilterOption[] {
  return [
    {
      key: "solo_alertas",
      label: "Sin alertas",
      active: activeFilters.has("solo_alertas"),
      count: companies.filter((company) => !company.hasContacts).length,
    },
    {
      key: "sin_actividad",
      label: "Sin actividad",
      active: activeFilters.has("sin_actividad"),
      count: companies.filter((company) => company.recentRecords === 0).length,
    },
    {
      key: "sin_usuarios",
      label: "Sin usuarios",
      active: activeFilters.has("sin_usuarios"),
      count: companies.filter((company) => company.users === 0).length,
    },
    {
      key: "trial_venciendo",
      label: "Trial por vencer",
      active: activeFilters.has("trial_venciendo"),
      count: countTrialsExpiringSoon(companies),
    },
    {
      key: "ok",
      label: "OK",
      active: activeFilters.has("ok"),
    },
    {
      key: "problema",
      label: "Problemas",
      active: activeFilters.has("problema"),
    },
  ];
}

export function buildFunnelStages(companies: AdminCompany[]) {
  return [
    {
      label: "Registradas",
      count: companies.length,
      icon: Building2,
    },
    {
      label: "Con usuarios",
      count: companies.filter((company) => company.users > 0).length,
      icon: Users,
    },
    {
      label: "Con actividad reciente",
      count: companies.filter((company) => company.recentRecords > 0).length,
      icon: Activity,
    },
  ];
}

export function getCompanyInterventions(
  company: AdminCompany
): InterventionType[] {
  const interventions: InterventionType[] = [];

  if (company.trialExpired) {
    interventions.push("trial_expired");
  } else if (
    company.plan === "trial" &&
    (company.trialDaysLeft ?? 99) <= 7
  ) {
    interventions.push("trial_ending");
  }
  if (company.recentRecords === 0) {
    interventions.push("no_activity");
  }
  if (!company.hasContacts) {
    interventions.push("no_alerts");
  }
  if (company.users === 0) {
    interventions.push("no_users");
  }

  return interventions;
}

export const HEALTH_LEGEND = [
  { score: 90, label: "80-100 Saludable" },
  { score: 60, label: "50-79 Atención" },
  { score: 30, label: "0-49 Crítico" },
] as const;

export const INTERVENTION_META: Record<
  InterventionType,
  { label: string; color: string; icon: LucideIcon }
> = {
  no_activity: {
    label: "Sin actividad",
    color: "var(--sg-danger)",
    icon: Clock,
  },
  no_alerts: {
    label: "Sin alertas",
    color: "var(--sg-warn)",
    icon: Bell,
  },
  no_users: {
    label: "Sin usuarios",
    color: "var(--sg-danger)",
    icon: Users,
  },
  trial_ending: {
    label: "Trial por vencer",
    color: "var(--sg-warn)",
    icon: AlertTriangle,
  },
  trial_expired: {
    label: "Trial vencido",
    color: "var(--sg-danger)",
    icon: AlertTriangle,
  },
};
