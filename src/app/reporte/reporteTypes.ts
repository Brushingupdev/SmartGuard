import type {
  getDashboardTrends,
  getReporteData,
} from "@/app/actions";

export type ReporteData = NonNullable<Awaited<ReturnType<typeof getReporteData>>>;
export type DashboardTrendSummary = Awaited<
  ReturnType<typeof getDashboardTrends>
>["trend"];
