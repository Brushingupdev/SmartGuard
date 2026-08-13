export type DashboardIntervalFilter =
  | "all"
  | "ok"
  | "warn"
  | "delay"
  | "critical"
  | "pending";

export interface DashboardFilters {
  month?: number | null;
  weekOfMonth?: number | null;
  interval?: DashboardIntervalFilter;
  observation?: string | null;
}

export const DASHBOARD_MONTH_OPTIONS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
] as const;

export const DASHBOARD_INTERVAL_OPTIONS: ReadonlyArray<{
  value: DashboardIntervalFilter;
  label: string;
}> = [
  { value: "all", label: "Todos los intervalos" },
  { value: "ok", label: "A tiempo · < 30 min" },
  { value: "warn", label: "En revisión · 30–44 min" },
  { value: "delay", label: "Con demora · 45–89 min" },
  { value: "critical", label: "Crítico · 90+ min" },
  { value: "pending", label: "En proceso · sin atención" },
];

const VALID_INTERVALS = new Set<DashboardIntervalFilter>(
  DASHBOARD_INTERVAL_OPTIONS.map((option) => option.value),
);

function validInteger(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function normalizeDashboardFilters(
  filters?: DashboardFilters | null,
): {
  month: number | null;
  weekOfMonth: number | null;
  interval: DashboardIntervalFilter;
  observation: string | null;
} {
  const month = validInteger(filters?.month, 1, 12);
  const weekOfMonth = month ? validInteger(filters?.weekOfMonth, 1, 5) : null;
  const interval = VALID_INTERVALS.has(filters?.interval ?? "all")
    ? (filters?.interval ?? "all")
    : "all";
  const observation = typeof filters?.observation === "string"
    ? filters.observation.trim().slice(0, 180) || null
    : null;

  return { month, weekOfMonth, interval, observation };
}

export function refineDashboardDateRange(
  timeframe: string,
  filters: DashboardFilters | null | undefined,
  baseRange: { from: string; to: string },
): { from: string; to: string } {
  const normalized = normalizeDashboardFilters(filters);
  if (!/^\d{4}$/.test(timeframe) || !normalized.month) return baseRange;

  const year = Number(timeframe);
  const lastDay = new Date(Date.UTC(year, normalized.month, 0)).getUTCDate();
  const startDay = normalized.weekOfMonth
    ? Math.min((normalized.weekOfMonth - 1) * 7 + 1, lastDay)
    : 1;
  const endDay = normalized.weekOfMonth
    ? Math.min(normalized.weekOfMonth * 7, lastDay)
    : lastDay;
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    from: `${year}-${pad(normalized.month)}-${pad(startDay)}`,
    to: `${year}-${pad(normalized.month)}-${pad(endDay)}`,
  };
}

export function getDashboardIntervalExpression(
  interval: DashboardIntervalFilter,
): string | null {
  if (interval === "ok") {
    return "demora_cita_min.lt.30,and(demora_cita_min.is.null,espera_min.lt.30)";
  }
  if (interval === "warn") {
    return "and(demora_cita_min.gte.30,demora_cita_min.lt.45),and(demora_cita_min.is.null,and(espera_min.gte.30,espera_min.lt.45))";
  }
  if (interval === "delay") {
    return "and(demora_cita_min.gte.45,demora_cita_min.lt.90),and(demora_cita_min.is.null,and(espera_min.gte.45,espera_min.lt.90))";
  }
  if (interval === "critical") {
    return "demora_cita_min.gte.90,and(demora_cita_min.is.null,espera_min.gte.90)";
  }
  if (interval === "pending") {
    return "and(demora_cita_min.is.null,espera_min.is.null)";
  }
  return null;
}

export function countDashboardFilters(filters?: DashboardFilters | null): number {
  const normalized = normalizeDashboardFilters(filters);
  return [
    normalized.month,
    normalized.weekOfMonth,
    normalized.interval !== "all" ? normalized.interval : null,
    normalized.observation,
  ].filter(Boolean).length;
}
