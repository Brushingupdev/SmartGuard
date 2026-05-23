import type { getAdminOverview } from "@/app/actions";

export type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;
export type AdminCompany = NonNullable<AdminOverview>["companies"][number];
export type DeletedCompany = NonNullable<AdminOverview>["deletedCompanies"][number];

export type InterventionType =
  | "no_activity"
  | "no_alerts"
  | "no_users"
  | "trial_ending"
  | "trial_expired";

export type AdminFilterKey =
  | "solo_alertas"
  | "sin_actividad"
  | "sin_usuarios"
  | "trial_venciendo"
  | "ok"
  | "problema";

export type AdminFilterOption = {
  key: AdminFilterKey;
  label: string;
  active: boolean;
  count?: number;
};
