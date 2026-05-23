"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getActivePersonnel,
  getDashboardHeatmap,
  getDashboardStats,
  getDashboardTrends,
} from "@/app/actions";
import { formatGateLabelFromPlant, groupGatesBySite } from "@/lib/gates";
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
  const heatmapPlantRef = useRef<string>(initialPlant);

  const fetchStats = useCallback(
    async (plant: string, timeframe: string, silent = false, id: number) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const [statsResult, trendsResult, personnelResult] =
          await Promise.allSettled([
            getDashboardStats(plant, timeframe),
            silent ? Promise.resolve(null) : getDashboardTrends(plant, timeframe),
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
      void fetchStats(selectedPlant, selectedTimeframe, false, id);
      if (heatmapPlantRef.current !== selectedPlant) {
        heatmapPlantRef.current = selectedPlant;
        void getDashboardHeatmap(selectedPlant)
          .then(setHeatmapData)
          .catch(() => {});
      }
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const silentId = ++reqIdRef.current;
      void fetchStats(selectedPlant, selectedTimeframe, true, silentId);
    }, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedPlant, selectedTimeframe, fetchStats]);

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
  const kpiCards = [
    {
      label: "A tiempo",
      value: kpis.ok,
      accent: "var(--sg-success)",
      sub: "< 30 min",
      trend: trends.ok,
    },
    {
      label: "En revisión",
      value: kpis.warn,
      accent: "var(--sg-warn)",
      sub: "30 - 45 min",
    },
    {
      label: "Con demora",
      value: kpis.deny,
      accent: "var(--sg-danger)",
      sub: "> 45 min",
      trend: trends.deny,
      trendInverse: true,
    },
    {
      label: "En proceso",
      value: kpis.pending,
      accent: "#4f8df7",
      sub: "Sin atención",
    },
    {
      label: "Anticipado",
      value: kpis.anticipado ?? 0,
      accent: "transparent",
      sub: "Antes de cita",
    },
    {
      label: "Total atenciones",
      value: kpis.total,
      accent: "transparent",
      sub: `${puntualidad ?? 0}% a tiempo`,
      trend: trends.total,
    },
  ];

  return {
    liveTime,
    selectedTimeframe,
    setSelectedTimeframe,
    lastSelectedYear,
    setLastSelectedYear,
    selectedPlant,
    setSelectedPlant,
    selectedSite,
    setSelectedSite,
    plants: initialPlants,
    gateOptions: initialGateOptions,
    availableYears: initialAvailableYears,
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
