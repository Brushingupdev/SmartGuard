import type { getDashboardStats } from "@/app/actions";
import type { GateAssignment } from "@/lib/gates";
import type { ActivePersonnelRow, HeatmapCell } from "@/types/dashboard";

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown }>;
  label?: string | number;
  timeframe?: string;
}

export type DashboardStatsResult = Awaited<ReturnType<typeof getDashboardStats>>;

export type DashboardTrendState = {
  ok: number | null;
  deny: number | null;
  total: number | null;
  puntualidad: number | null;
};

export interface DashboardClientProps {
  initialPlant: string;
  initialTimeframe: string;
  initialPlants: string[];
  initialGateOptions: GateAssignment[];
  initialAvailableYears: string[];
  initialStats: DashboardStatsResult;
  initialTrends: DashboardTrendState;
  initialHeatmapData: HeatmapCell[];
  initialActivePersonnel: ActivePersonnelRow[];
  initialUserRole: string;
  initialLastRefreshAt: string;
}
