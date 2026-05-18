import {
  getAvailableYears,
  getActivePersonnel,
  getDashboardHeatmap,
  getDashboardStats,
  getDashboardTrends,
  getUserGateOptions,
  getUserPlants,
} from "@/app/actions";
import { getUserContext } from "@/utils/supabase/user";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

const DEFAULT_PLANT = "Todos";

export default async function DashboardPage() {
  const [availableYears, plants, gateOptions, heatmapData, activePersonnel, ctx] = await Promise.all([
    getAvailableYears(),
    getUserPlants(),
    getUserGateOptions(),
    getDashboardHeatmap(DEFAULT_PLANT),
    getActivePersonnel(),
    getUserContext(),
  ]);

  const defaultTimeframe = availableYears.at(-1) ?? "Día";

  const [stats, trends] = await Promise.all([
    getDashboardStats(DEFAULT_PLANT, defaultTimeframe),
    getDashboardTrends(DEFAULT_PLANT, defaultTimeframe),
  ]);

  return (
    <DashboardClient
      initialPlant={DEFAULT_PLANT}
      initialTimeframe={defaultTimeframe}
      initialPlants={plants}
      initialGateOptions={gateOptions}
      initialAvailableYears={availableYears}
      initialStats={stats}
      initialTrends={trends.trend}
      initialHeatmapData={heatmapData}
      initialActivePersonnel={activePersonnel}
      initialUserRole={ctx?.role ?? "guardia"}
      initialLastRefreshAt={new Date().toISOString()}
    />
  );
}
