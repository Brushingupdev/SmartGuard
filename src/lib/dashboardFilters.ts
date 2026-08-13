export type DashboardIntervalFilter =
  | "ok"
  | "warn"
  | "delay"
  | "critical"
  | "pending";

export interface DashboardFilters {
  months?: number[];
  weekOfMonth?: number | null;
  intervals?: DashboardIntervalFilter[];
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

const MONTH_WEEK_BUCKET_PATTERN = /^(\d{2})-W([1-5])$/;

export const DASHBOARD_INTERVAL_OPTIONS: ReadonlyArray<{
  value: DashboardIntervalFilter;
  label: string;
}> = [
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
  months: number[];
  weekOfMonth: number | null;
  intervals: DashboardIntervalFilter[];
  observation: string | null;
} {
  const months = Array.from(
    new Set(
      Array.isArray(filters?.months)
        ? filters.months
            .map((month) => validInteger(month, 1, 12))
            .filter((month): month is number => month !== null)
        : [],
    ),
  ).sort((a, b) => a - b);
  const weekOfMonth = months.length > 0
    ? validInteger(filters?.weekOfMonth, 1, 5)
    : null;
  const intervals = Array.from(
    new Set(
      Array.isArray(filters?.intervals)
        ? filters.intervals.filter((interval) => VALID_INTERVALS.has(interval))
        : [],
    ),
  );
  const observation = typeof filters?.observation === "string"
    ? filters.observation.trim().slice(0, 180) || null
    : null;

  return { months, weekOfMonth, intervals, observation };
}

export function refineDashboardDateRange(
  timeframe: string,
  filters: DashboardFilters | null | undefined,
  baseRange: { from: string; to: string },
): { from: string; to: string } {
  const normalized = normalizeDashboardFilters(filters);
  if (!/^\d{4}$/.test(timeframe) || normalized.months.length === 0) return baseRange;

  const year = Number(timeframe);
  const firstMonth = normalized.months[0];
  const lastMonth = normalized.months.at(-1) ?? firstMonth;
  const firstMonthLastDay = new Date(Date.UTC(year, firstMonth, 0)).getUTCDate();
  const lastMonthLastDay = new Date(Date.UTC(year, lastMonth, 0)).getUTCDate();
  const startDay = normalized.weekOfMonth
    ? Math.min((normalized.weekOfMonth - 1) * 7 + 1, firstMonthLastDay)
    : 1;
  const endDay = normalized.weekOfMonth
    ? Math.min(normalized.weekOfMonth * 7, lastMonthLastDay)
    : lastMonthLastDay;
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    from: `${year}-${pad(firstMonth)}-${pad(startDay)}`,
    to: `${year}-${pad(lastMonth)}-${pad(endDay)}`,
  };
}

export function matchesDashboardDateFilter(
  date: string | null | undefined,
  timeframe: string,
  filters?: DashboardFilters | null,
): boolean {
  const normalized = normalizeDashboardFilters(filters);
  if (!/^\d{4}$/.test(timeframe) || normalized.months.length === 0) return true;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const month = Number(date.slice(5, 7));
  if (!normalized.months.includes(month)) return false;
  if (!normalized.weekOfMonth) return true;

  const day = Number(date.slice(8, 10));
  const startDay = (normalized.weekOfMonth - 1) * 7 + 1;
  const endDay = normalized.weekOfMonth * 7;
  return day >= startDay && day <= endDay;
}

export function usesDashboardMonthWeekBuckets(
  timeframe: string,
  filters?: DashboardFilters | null,
): boolean {
  return /^\d{4}$/.test(timeframe) && normalizeDashboardFilters(filters).months.length > 0;
}

export function getDashboardMonthWeekBucket(
  date: string | null | undefined,
  timeframe: string,
  filters?: DashboardFilters | null,
): string | null {
  if (!usesDashboardMonthWeekBuckets(timeframe, filters)) return null;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const normalized = normalizeDashboardFilters(filters);
  if (!normalized.months.includes(month)) return null;

  const week = Math.ceil(day / 7);
  if (normalized.weekOfMonth && week !== normalized.weekOfMonth) return null;
  return `${String(month).padStart(2, "0")}-W${week}`;
}

export function getDashboardMonthWeekBuckets(
  timeframe: string,
  filters?: DashboardFilters | null,
): string[] {
  if (!usesDashboardMonthWeekBuckets(timeframe, filters)) return [];

  const year = Number(timeframe);
  const normalized = normalizeDashboardFilters(filters);
  return normalized.months.flatMap((month) => {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const maxWeek = Math.ceil(lastDay / 7);
    const weeks = normalized.weekOfMonth
      ? [normalized.weekOfMonth].filter((week) => week <= maxWeek)
      : Array.from({ length: maxWeek }, (_, index) => index + 1);
    return weeks.map((week) => `${String(month).padStart(2, "0")}-W${week}`);
  });
}

export function parseDashboardMonthWeekBucket(
  bucket: string,
): { month: number; week: number } | null {
  const match = MONTH_WEEK_BUCKET_PATTERN.exec(bucket);
  if (!match) return null;
  return { month: Number(match[1]), week: Number(match[2]) };
}

export function getDashboardIntervalExpression(
  intervals: readonly DashboardIntervalFilter[],
): string | null {
  if (intervals.length === 0) return null;

  const expressions = intervals.flatMap((interval) => {
    if (interval === "ok") {
      return ["demora_cita_min.lt.30", "and(demora_cita_min.is.null,espera_min.lt.30)"];
    }
    if (interval === "warn") {
      return ["and(demora_cita_min.gte.30,demora_cita_min.lt.45)", "and(demora_cita_min.is.null,and(espera_min.gte.30,espera_min.lt.45))"];
    }
    if (interval === "delay") {
      return ["and(demora_cita_min.gte.45,demora_cita_min.lt.90)", "and(demora_cita_min.is.null,and(espera_min.gte.45,espera_min.lt.90))"];
    }
    if (interval === "critical") {
      return ["demora_cita_min.gte.90", "and(demora_cita_min.is.null,espera_min.gte.90)"];
    }
    if (interval === "pending") {
      return ["and(demora_cita_min.is.null,espera_min.is.null)"];
    }
    return [];
  });

  return expressions.length > 0 ? expressions.join(",") : null;
}

export function countDashboardFilters(filters?: DashboardFilters | null): number {
  const normalized = normalizeDashboardFilters(filters);
  return [
    normalized.months.length > 0 ? normalized.months : null,
    normalized.weekOfMonth,
    normalized.intervals.length > 0 ? normalized.intervals : null,
    normalized.observation,
  ].filter(Boolean).length;
}
