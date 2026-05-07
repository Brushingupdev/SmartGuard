import {
  getAvailableYears,
  getDashboardHeatmap,
  getDashboardStats,
  getDashboardTrends,
  getUserPlants,
} from "@/app/actions";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

const DEFAULT_PLANT = "Todos";
const DEFAULT_TIMEFRAME = "Día";

export default async function DashboardPage() {
  const [stats, trends, plants, availableYears, heatmapData] = await Promise.all([
    getDashboardStats(DEFAULT_PLANT, DEFAULT_TIMEFRAME),
    getDashboardTrends(DEFAULT_PLANT, DEFAULT_TIMEFRAME),
    getUserPlants(),
    getAvailableYears(),
    getDashboardHeatmap(DEFAULT_PLANT),
  ]);

  return (
    <DashboardClient
      initialPlant={DEFAULT_PLANT}
      initialTimeframe={DEFAULT_TIMEFRAME}
      initialPlants={plants}
      initialAvailableYears={availableYears}
      initialStats={stats}
      initialTrends={trends.trend}
      initialHeatmapData={heatmapData}
      initialLastRefreshAt={new Date().toISOString()}
    />
  );
}
