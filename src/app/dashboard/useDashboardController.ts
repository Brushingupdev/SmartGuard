"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getActivePersonnel,
  getDashboardHeatmap,
  getDashboardStats,
  getDashboardTrends,
} from "@/app/actions";
import { formatGateLabelFromPlant, groupGatesBySite } from "@/lib/gates";
import type { DashboardFilters, DashboardIntervalFilter } from "@/lib/dashboardFilters";
import type { ActivePersonnelRow, DashboardAlert, DashboardEvent, DashboardFlowRow, DashboardKpis, DashboardTopProvider, DashboardZone, HeatmapCell } from "@/types/dashboard";
import type {
  DashboardClientProps,
  DashboardTrendState,
} from "./dashboardClientTypes";

export function useDashboardController({
  initialPlant,
  initialTimeframe,
  initialPlants,
  initialGateOptions,
  initialAvailableYears,
  initialStats,
  initialTrends,
  initialHeatmapData,
  initialActivePersonnel,
  initialUserRole,
  initialLastRefreshAt,
}: DashboardClientProps) {
  const [liveTime, setLiveTime] = useState("--:--:--");
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<string>(initialTimeframe);
  const [lastSelectedYear, setLastSelectedYear] = useState<string>(
    initialAvailableYears.includes(initialTimeframe)
      ? initialTimeframe
      : (initialAvailableYears.at(-1) ?? "")
  );
  const [selectedPlant, setSelectedPlant] = useState<string>(initialPlant);
  const [selectedSite, setSelectedSite] = useState<string>("Todos");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedWeekOfMonth, setSelectedWeekOfMonth] = useState<number | null>(null);
  const [selectedIntervals, setSelectedIntervals] =
    useState<DashboardIntervalFilter[]>([]);
  const [selectedObservation, setSelectedObservation] = useState<string | null>(null);
  const [observationOptions, setObservationOptions] = useState<string[]>(() =>
    Array.from(
      new Set(
        (initialStats.delayReasons ?? [])
          .map(({ motivo }) => motivo.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "es"))
  );
  const dashboardFilters = useMemo<DashboardFilters>(
    () => ({
      months: selectedMonths,
      weekOfMonth: selectedWeekOfMonth,
      intervals: selectedIntervals,
      observation: selectedObservation,
    }),
    [selectedIntervals, selectedMonths, selectedObservation, selectedWeekOfMonth]
  );

  const [kpis, setKpis] = useState<DashboardKpis>(initialStats.kpis);
  const [recentEvents, setRecentEvents] = useState<DashboardEvent[]>(
    initialStats.events
  );
  const [flowData, setFlowData] = useState<DashboardFlowRow[]>(
    initialStats.flowData
  );
  const [zones, setZones] = useState<DashboardZone[]>(initialStats.zones);
  const [alerts, setAlerts] = useState<DashboardAlert[]>(initialStats.alerts);
  const [delayReasons, setDelayReasons] = useState<
    { motivo: string; count: number }[]
  >(initialStats.delayReasons ?? []);
  const [topProvider, setTopProvider] = useState<DashboardTopProvider | null>(
    initialStats.topProvider ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(
    new Date(initialLastRefreshAt)
  );
  const [refreshing, setRefreshing] = useState(false);
  const [trends, setTrends] = useState<DashboardTrendState>(initialTrends);
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>(
    initialHeatmapData
  );
  const [activePersonnel, setActivePersonnel] = useState<ActivePersonnelRow[]>(
    initialActivePersonnel
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reqIdRef = useRef(0);
  const statsBootstrappedRef = useRef(false);
  const setDashboardTimeframe = useCallback(
    (value: string) => {
      if (!initialAvailableYears.includes(value)) {
        setSelectedMonths([]);
        setSelectedWeekOfMonth(null);
      }
      setSelectedTimeframe(value);
    },
    [initialAvailableYears]
  );

  const handleMonthFilterChange = useCallback(
    (months: number[]) => {
      setSelectedMonths(months);
      if (months.length === 0) {
        setSelectedWeekOfMonth(null);
        return;
      }

      if (!initialAvailableYears.includes(selectedTimeframe)) {
        const targetYear =
          lastSelectedYear || initialAvailableYears.at(-1) || "";
        if (targetYear) {
          setLastSelectedYear(targetYear);
          setSelectedTimeframe(targetYear);
        }
      }
    },
    [initialAvailableYears, lastSelectedYear, selectedTimeframe]
  );

  const clearDashboardFilters = useCallback(() => {
    setSelectedMonths([]);
    setSelectedWeekOfMonth(null);
    setSelectedIntervals([]);
    setSelectedObservation(null);
  }, []);

  const fetchStats = useCallback(
    async (
      plant: string,
      timeframe: string,
      filters: DashboardFilters,
      silent = false,
      id: number
    ) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const [statsResult, trendsResult, personnelResult] =
          await Promise.allSettled([
            getDashboardStats(plant, timeframe, filters),
            silent
              ? Promise.resolve(null)
              : getDashboardTrends(plant, timeframe, filters),
            initialUserRole === "guardia"
              ? Promise.resolve(null)
              : getActivePersonnel(),
          ]);

        if (id !== reqIdRef.current) return;

        if (statsResult.status === "fulfilled" && statsResult.value) {
          const data = statsResult.value;
          setKpis(data.kpis);
          setRecentEvents(data.events);
          setFlowData(data.flowData);
          setZones(data.zones);
          setAlerts(data.alerts);
          setDelayReasons(data.delayReasons ?? []);
          setTopProvider(data.topProvider ?? null);
          const reasons = (data.delayReasons ?? [])
            .map(({ motivo }) => motivo.trim())
            .filter(Boolean);
          setObservationOptions((current) =>
            Array.from(new Set([...current, ...reasons])).sort((a, b) =>
              a.localeCompare(b, "es")
            )
          );
        } else {
          throw statsResult.status === "rejected"
            ? statsResult.reason
            : new Error("No se pudo obtener el resumen del dashboard");
        }

        if (trendsResult.status === "fulfilled" && trendsResult.value) {
          setTrends(trendsResult.value.trend);
        } else if (!silent) {
          setTrends({ ok: null, deny: null, total: null, puntualidad: null });
        }

        if (personnelResult.status === "fulfilled" && personnelResult.value) {
          setActivePersonnel(personnelResult.value);
        } else if (initialUserRole !== "guardia" && !silent) {
          setActivePersonnel([]);
        }

        setLastRefresh(new Date());
        setError(null);
      } catch (err) {
        if (id !== reqIdRef.current) return;
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar datos del dashboard"
        );
      } finally {
        if (id !== reqIdRef.current) return;
        if (silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    [initialUserRole]
  );

  useEffect(() => {
    const tick = () =>
      setLiveTime(
        new Date().toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    tick();
    const clockId = setInterval(tick, 1000);
    return () => clearInterval(clockId);
  }, []);

  useEffect(() => {
    if (!statsBootstrappedRef.current) {
      statsBootstrappedRef.current = true;
    } else {
      const id = ++reqIdRef.current;
      void fetchStats(selectedPlant, selectedTimeframe, dashboardFilters, false, id);
      void getDashboardHeatmap(selectedPlant, selectedTimeframe, dashboardFilters)
        .then(setHeatmapData)
        .catch(() => {});
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const silentId = ++reqIdRef.current;
      void fetchStats(selectedPlant, selectedTimeframe, dashboardFilters, true, silentId);
    }, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [dashboardFilters, fetchStats, selectedPlant, selectedTimeframe]);

  const puntualidad = kpis.total > 0 ? Math.round((kpis.ok / kpis.total) * 100) : null;
  const sites = groupGatesBySite(
    initialGateOptions.length
      ? initialGateOptions
      : initialPlants.map((plant) => ({ site: plant, gate: plant, plant }))
  );
  const currentSiteGates =
    selectedSite === "Todos"
      ? []
      : sites.find((site) => site.site === selectedSite)?.gates ?? [];
  const selectedLabel =
    selectedPlant === "Todos"
      ? "Global"
      : selectedPlant.startsWith("site:")
        ? `Sede ${selectedPlant.replace("site:", "")}`
        : formatGateLabelFromPlant(selectedPlant, initialGateOptions);
  const encodedPlant = encodeURIComponent(selectedPlant);
  const encodedTimeframe = encodeURIComponent(selectedTimeframe);
  const operationalZones = zones
    .filter((zone) => zone.name !== "Sin planta")
    .slice(0, 4);
  const currentGateLoad = operationalZones.reduce(
    (sum, zone) => sum + zone.count,
    0
  );
  const personnelSummary = activePersonnel.slice(0, 5);
  const waitSamples = flowData.reduce((sum, row) => sum + row.delaySamples, 0);
  const averageWait = waitSamples > 0
    ? Math.round(flowData.reduce((sum, row) => sum + row.delayTotal, 0) / waitSamples)
    : 0;
  const kpiCards = [
    {
      label: "Total atenciones",
      value: kpis.total,
      accent: "var(--sg-accent)",
      sub: "Registros del período",
      trend: trends.total,
      trendSuffix: "%",
      trendLabel: "vs. período anterior",
    },
    {
      label: "Puntualidad",
      value: puntualidad ?? 0,
      suffix: "%",
      accent: "var(--sg-success)",
      sub: "Meta operativa: 90%",
      trend: trends.puntualidad,
      trendSuffix: " pts",
      trendLabel: "vs. período anterior",
    },
    {
      label: "Espera promedio",
      value: averageWait,
      suffix: " min",
      accent: "var(--sg-info)",
      sub: "Tiempo medio de atención",
    },
    {
      label: "Alertas activas",
      value: alerts.length,
      accent: "var(--sg-danger)",
      sub: alerts.length === 1 ? "Requiere atención" : "Requieren atención",
    },
  ];

  return {
    liveTime,
    selectedTimeframe,
    setSelectedTimeframe: setDashboardTimeframe,
    lastSelectedYear,
    setLastSelectedYear,
    selectedPlant,
    setSelectedPlant,
    selectedSite,
    setSelectedSite,
    plants: initialPlants,
    gateOptions: initialGateOptions,
    availableYears: initialAvailableYears,
    dashboardFilters,
    observationOptions,
    onMonthFilterChange: handleMonthFilterChange,
    onWeekFilterChange: setSelectedWeekOfMonth,
    onIntervalFilterChange: setSelectedIntervals,
    onObservationFilterChange: setSelectedObservation,
    clearDashboardFilters,
    kpis,
    recentEvents,
    flowData,
    zones,
    alerts,
    delayReasons,
    topProvider,
    loading,
    error,
    setError,
    lastRefresh,
    refreshing,
    trends,
    heatmapData,
    activePersonnel,
    initialUserRole,
    puntualidad,
    sites,
    currentSiteGates,
    selectedLabel,
    encodedPlant,
    encodedTimeframe,
    operationalZones,
    currentGateLoad,
    personnelSummary,
    kpiCards,
    initialGateOptions,
  };
}
