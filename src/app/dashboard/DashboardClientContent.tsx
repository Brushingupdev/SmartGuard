"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import DashboardKPICard from "@/components/DashboardKPICard";
import CausasTop from "@/components/CausasTop";
import RankingPlantas from "@/components/RankingPlantas";
import TimelineDia from "@/components/TimelineDia";
import HeatmapDemoras from "@/components/HeatmapDemoras";
import ExportPDFButton from "@/components/ExportPDFButton";
import { getDashboardFlowSegmentDetail } from "@/app/actions";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock3,
  Eye,
  Filter,
  ListChecks,
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import { formatGateLabelFromPlant, type GateAssignment } from "@/lib/gates";
import {
  countDashboardFilters,
  type DashboardFilters,
  type DashboardIntervalFilter,
} from "@/lib/dashboardFilters";
import type {
  ActivePersonnelRow,
  DashboardAlert,
  DashboardEvent,
  DashboardFlowDetail,
  DashboardFlowRow,
  DashboardKpis,
  DashboardTopProvider,
  DashboardZone,
  HeatmapCell,
} from "@/types/dashboard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardTrendState } from "./dashboardClientTypes";
import {
  alertToneClasses,
  ChartTooltip,
  formatXLabel,
} from "./dashboardClientUtils";
import DashboardAdvancedFilters from "./DashboardAdvancedFilters";
import DashboardPowerBiOverview from "./DashboardPowerBiOverview";
import ClientChartFrame from "@/components/ClientChartFrame";

export function DashboardClientContent({
  liveTime,
  selectedTimeframe,
  setSelectedTimeframe,
  lastSelectedYear,
  setLastSelectedYear,
  selectedPlant,
  setSelectedPlant,
  selectedSite,
  setSelectedSite,
  gateOptions,
  availableYears,
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
  dashboardFilters,
  observationOptions,
  onMonthFilterChange,
  onWeekFilterChange,
  onIntervalFilterChange,
  onObservationFilterChange,
  clearDashboardFilters,
}: {
  liveTime: string;
  selectedTimeframe: string;
  setSelectedTimeframe: (value: string) => void;
  lastSelectedYear: string;
  setLastSelectedYear: (value: string) => void;
  selectedPlant: string;
  setSelectedPlant: (value: string) => void;
  selectedSite: string;
  setSelectedSite: (value: string) => void;
  gateOptions: GateAssignment[];
  availableYears: string[];
  kpis: DashboardKpis;
  recentEvents: DashboardEvent[];
  flowData: DashboardFlowRow[];
  zones: DashboardZone[];
  alerts: DashboardAlert[];
  delayReasons: { motivo: string; count: number }[];
  topProvider: DashboardTopProvider | null;
  loading: boolean;
  error: string | null;
  setError: (value: string | null) => void;
  lastRefresh: Date | null;
  refreshing: boolean;
  trends: DashboardTrendState;
  heatmapData: HeatmapCell[];
  activePersonnel: ActivePersonnelRow[];
  initialUserRole: string;
  puntualidad: number | null;
  sites: {
    site: string;
    gates: { site: string; gate: string; plant: string }[];
  }[];
  currentSiteGates: { site: string; gate: string; plant: string }[];
  selectedLabel: string;
  encodedPlant: string;
  encodedTimeframe: string;
  operationalZones: DashboardZone[];
  currentGateLoad: number;
  personnelSummary: ActivePersonnelRow[];
  kpiCards: {
    label: string;
    value: number;
    suffix?: string;
    accent: string;
    sub: string;
    trend?: number | null;
    trendInverse?: boolean;
    trendSuffix?: string;
    trendLabel?: string;
  }[];
  dashboardFilters: DashboardFilters;
  observationOptions: string[];
  onMonthFilterChange: (months: number[]) => void;
  onWeekFilterChange: (week: number | null) => void;
  onIntervalFilterChange: (intervals: DashboardIntervalFilter[]) => void;
  onObservationFilterChange: (observation: string | null) => void;
  clearDashboardFilters: () => void;
}) {
  const [flowDetail, setFlowDetail] = useState<DashboardFlowDetail | null>(null);
  const [flowDetailLoading, setFlowDetailLoading] = useState(false);
  const [flowDetailError, setFlowDetailError] = useState<string | null>(null);
  const [chartsReady, setChartsReady] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = countDashboardFilters(dashboardFilters);
  const isFlowInteractive = true;
  const closeFlowDetail = () => {
    setFlowDetail(null);
    setFlowDetailLoading(false);
    setFlowDetailError(null);
  };
  const displayRefreshTime = chartsReady && lastRefresh
    ? lastRefresh.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  })
    : "—";
  const displayRefreshDate = chartsReady && lastRefresh
    ? lastRefresh.toLocaleDateString("es-PE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  })
    : "—";

  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFlowDetail();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleFlowBarClick = async (bucket?: string) => {
    if (!bucket) return;
    closeFlowDetail();
    setFlowDetailLoading(true);
    try {
      const detail = await getDashboardFlowSegmentDetail(
        selectedPlant,
        selectedTimeframe,
        bucket,
        dashboardFilters
      );
      if (!detail) {
        setFlowDetailError("No se pudo cargar el detalle de este segmento.");
        return;
      }
      setFlowDetail(detail);
    } catch {
      setFlowDetailError("No se pudo cargar el detalle de este segmento.");
    } finally {
      setFlowDetailLoading(false);
    }
  };

  return (
    <AppLayout>
      {error ? (
        <div className="mb-6 flex items-center justify-between border border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-[var(--sg-danger)]">
              <span className="text-[11px] font-bold text-white">!</span>
            </div>
            <span className="text-[12px] text-[var(--sg-danger)]">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
          >
            Cerrar
          </button>
        </div>
      ) : null}

      <div className="sticky top-[64px] z-30 mb-5 flex flex-col gap-3 border-b border-[var(--sg-line)] bg-[rgba(10,12,11,0.96)] pb-4 backdrop-blur lg:top-0 lg:pt-1">
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="sg-font-display text-[22px] font-bold text-[var(--sg-ink)] sm:text-[25px]">
                Dashboard operativo
              </h1>
              {lastRefresh ? (
                <span className="flex items-center gap-1.5 text-[10px] text-[var(--sg-muted)]" title={`${displayRefreshDate} · ${liveTime}`}>
                  <span className={`h-2 w-2 rounded-full ${refreshing ? "bg-[var(--sg-warn)] sg-pulse" : "bg-[var(--sg-success)]"}`} />
                  {refreshing ? "Actualizando" : `Actualizado ${displayRefreshTime}`}
                </span>
              ) : null}
            </div>
            <p className="mt-1 hidden text-[11px] text-[var(--sg-muted)] sm:block">
              Lectura consolidada de accesos, puntualidad y situaciones prioritarias
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-expanded={showFilters}
              aria-controls="dashboard-advanced-filters"
              onClick={() => setShowFilters((current) => !current)}
              className={`flex h-9 items-center gap-2 border px-3 text-[10px] font-semibold transition-colors ${showFilters || activeFilterCount > 0 ? "border-[var(--sg-accent)] text-[var(--sg-accent)]" : "border-[var(--sg-line)] text-[var(--sg-copy)] hover:border-[var(--sg-line-strong)]"}`}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtros
              {activeFilterCount > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sg-accent)] px-1.5 sg-font-mono text-[9px] font-bold text-[var(--sg-canvas)]">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <ExportPDFButton plant={selectedPlant} timeframe={selectedTimeframe} kpis={kpis} puntualidad={puntualidad} />
            <Link
              href={`/reporte?plant=${encodedPlant}&timeframe=${encodedTimeframe}`}
              className="flex h-9 items-center gap-1.5 border border-[var(--sg-line)] px-3 text-[10px] font-semibold text-[var(--sg-copy)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Análisis</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[160px]">
            <select
              aria-label="Seleccionar sede"
              value={selectedSite}
              onChange={(event) => {
                const site = event.target.value;
                closeFlowDetail();
                setSelectedSite(site);
                setSelectedPlant(site === "Todos" ? "Todos" : `site:${site}`);
              }}
              className="h-9 w-full cursor-pointer appearance-none border border-[var(--sg-line)] bg-[var(--sg-panel-2)] pl-3 pr-8 text-[10px] font-semibold text-[var(--sg-ink)] outline-none transition-colors hover:border-[var(--sg-line-strong)] focus:border-[var(--sg-accent)]"
            >
              <option value="Todos">Todas las sedes</option>
              {sites.map((site) => (
                <option key={site.site} value={site.site}>{site.site}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
          </div>

          {currentSiteGates.length > 0 ? (
            <div className="relative">
              <select
                aria-label="Seleccionar puerta"
                value={selectedPlant}
                onChange={(event) => {
                  closeFlowDetail();
                  setSelectedPlant(event.target.value);
                }}
                className="h-9 min-w-[160px] cursor-pointer appearance-none border border-[var(--sg-line)] bg-[var(--sg-panel-2)] pl-3 pr-8 text-[10px] font-semibold text-[var(--sg-ink)] outline-none transition-colors hover:border-[var(--sg-line-strong)] focus:border-[var(--sg-accent)]"
              >
                <option
                  value={`site:${selectedSite}`}
                  className="bg-[var(--sg-panel)] text-[var(--sg-ink)]"
                >
                  Todas las puertas
                </option>
                {currentSiteGates.map((gate) => (
                  <option
                    key={gate.plant}
                    value={gate.plant}
                    className="bg-[var(--sg-panel)] text-[var(--sg-ink)]"
                  >
                    {gate.gate}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
            </div>
          ) : (
            <div className="flex h-9 min-w-[160px] items-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 text-[10px] font-semibold text-[var(--sg-muted)]">
              Todas las puertas
            </div>
          )}

          <div className="hidden h-4 w-px bg-[var(--sg-line)] sm:block" />

          <div className="flex items-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-0.5">
            {["Día", "Semana", "Mes"].map((timeframe) => (
              <button
                key={timeframe}
                type="button"
                aria-pressed={selectedTimeframe === timeframe}
                onClick={() => {
                  closeFlowDetail();
                  setSelectedTimeframe(timeframe);
                }}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  selectedTimeframe === timeframe
                    ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)] shadow-[0_0_0_1px_var(--sg-accent)]"
                    : "text-[var(--sg-copy)] hover:bg-[var(--sg-panel)] hover:text-[var(--sg-ink)]"
                }`}
              >
                {timeframe}
              </button>
            ))}
            {availableYears.length > 0 ? (
              <>
                <div className="mx-0.5 h-4 w-px bg-[var(--sg-line)]" />
                <div className="relative">
                  <select
                    aria-label="Seleccionar año"
                    value={lastSelectedYear}
                    onChange={(event) => {
                      if (event.target.value) {
                        closeFlowDetail();
                        setLastSelectedYear(event.target.value);
                        setSelectedTimeframe(event.target.value);
                      }
                    }}
                    className={`h-[26px] cursor-pointer appearance-none border bg-[var(--sg-panel-2)] pl-2.5 pr-6 text-[10px] font-bold uppercase tracking-widest outline-none transition-colors ${
                      availableYears.includes(selectedTimeframe)
                        ? "border-[var(--sg-accent)] !bg-[var(--sg-accent)] !text-[var(--sg-canvas)]"
                        : "border-[var(--sg-line)] text-[var(--sg-copy)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-ink)]"
                    }`}
                  >
                    {availableYears.map((year) => (
                      <option
                        key={year}
                        value={year}
                        className="bg-[var(--sg-panel)] text-[var(--sg-ink)]"
                      >
                        {year}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={`pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 ${availableYears.includes(selectedTimeframe) ? "text-[var(--sg-canvas)]" : "text-[var(--sg-muted)]"}`} />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-4 space-y-4">
        {showFilters ? (
          <div id="dashboard-advanced-filters">
            <DashboardAdvancedFilters
          filters={dashboardFilters}
          selectedYear={lastSelectedYear || "este año"}
          observations={observationOptions}
          onMonthChange={(months) => {
            closeFlowDetail();
            onMonthFilterChange(months);
          }}
          onWeekChange={(week) => {
            closeFlowDetail();
            onWeekFilterChange(week);
          }}
          onIntervalChange={(intervals) => {
            closeFlowDetail();
            onIntervalFilterChange(intervals);
          }}
          onObservationChange={(observation) => {
            closeFlowDetail();
            onObservationFilterChange(observation);
          }}
          onClear={() => {
            closeFlowDetail();
            clearDashboardFilters();
          }}
            />
          </div>
        ) : null}

        <section
          aria-label="Indicadores principales"
          className={`grid grid-cols-2 gap-3 xl:grid-cols-4 ${loading ? "opacity-80" : ""}`}
        >
          {kpiCards.map((card) => (
            <DashboardKPICard key={card.label} {...card} />
          ))}
        </section>
      </div>

      <div className="hidden">
        <div className="flex flex-wrap items-center gap-4">
          <span className="sg-font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--sg-muted)]">
            Resumen global
          </span>
          {loading ? (
            <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-warn)]">
              Actualizando...
            </span>
          ) : (
            <>
              <span className="sg-font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--sg-success)]">
                {puntualidad ?? 0}% en plazo
              </span>
              {trends.total != null ? (
                <span
                  className={`flex items-center gap-1.5 sg-font-mono text-[10px] uppercase tracking-[0.16em] ${trends.total > 0 ? "text-[var(--sg-success)]" : "text-[var(--sg-danger)]"}`}
                >
                  {trends.total > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trends.total > 0 ? "+" : ""}
                  {trends.total}% vs período anterior
                </span>
              ) : null}
            </>
          )}
        </div>
        <ExportPDFButton
          plant={selectedPlant}
          timeframe={selectedTimeframe}
          kpis={kpis}
          puntualidad={puntualidad}
        />
      </div>

      <DashboardPowerBiOverview
        selectedTimeframe={selectedTimeframe}
        selectedLabel={selectedLabel}
        flowData={flowData}
        kpis={kpis}
        delayReasons={delayReasons}
        recentEvents={recentEvents}
        gateOptions={gateOptions}
        alerts={alerts}
        zones={zones}
        activePersonnel={activePersonnel}
        heatmapData={heatmapData}
        loading={loading}
        onSegmentClick={(bucket) => {
          void handleFlowBarClick(bucket);
        }}
      />

      {false ? (
      <>
      <div className="mt-8 border-t border-[var(--sg-line)] pt-6">
        <div className="sg-kicker">Operación Matritech</div>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="sg-font-display text-[18px] font-bold uppercase tracking-[0.08em] text-[var(--sg-ink)]">
              Seguimiento operativo
            </h2>
            <p className="mt-1 text-[12px] text-[var(--sg-muted)]">
              Drill-down, cobertura, alertas y actividad en tiempo real
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:items-start xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-5">
          <section className="sg-panel p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="sg-font-display text-[16px] font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)]">
                    Flujo de acceso — {selectedTimeframe}
                  </div>
                </div>
                <div className="mt-2 text-[12px] text-[var(--sg-muted)]">
                  {selectedLabel} ·{" "}
                  {flowData.reduce(
                    (sum, row) => sum + row.ok + row.warn + row.deny,
                    0
                  )}{" "}
                  registros en el período
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-2 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                  Por {selectedTimeframe === "Día" ? "hora" : "segmento"}
                </div>
                {isFlowInteractive ? (
                  <div className="hidden items-center gap-1.5 border border-[var(--sg-line)] bg-[rgba(200,168,75,0.06)] px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--sg-accent)] md:flex">
                    <Eye className="h-3.5 w-3.5" />
                    Haz clic en una barra
                  </div>
                ) : null}
              </div>
            </div>

            <ClientChartFrame className="relative h-[320px]">
              {(chartSize) => (
              <>
              {!chartsReady || (loading && flowData.length === 0) ? (
                <div className="h-full w-full animate-pulse bg-[var(--sg-panel-2)]" />
              ) : flowData.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">
                    Sin datos para este período
                  </span>
                </div>
              ) : (
                <ResponsiveContainer width={chartSize.width} height={chartSize.height} minWidth={0} minHeight={1} debounce={200}>
                  <BarChart data={flowData} barCategoryGap={8}>
                    <CartesianGrid
                      stroke="rgba(196,192,180,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="h"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#6a706c",
                        fontSize: 10,
                        fontFamily: "DM Mono",
                      }}
                      tickFormatter={(value) =>
                        formatXLabel(value, selectedTimeframe)
                      }
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#6a706c",
                        fontSize: 10,
                        fontFamily: "DM Mono",
                      }}
                      width={28}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={(props) => (
                        <ChartTooltip {...props} timeframe={selectedTimeframe} />
                      )}
                      cursor={{ fill: "rgba(196,192,180,0.04)" }}
                    />
                  <Bar
                    dataKey="ok"
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={34}
                    onClick={(data) => handleFlowBarClick(data?.payload?.h)}
                    cursor={isFlowInteractive ? "pointer" : "default"}
                  >
                      {flowData.map((_, index) => (
                        <Cell
                          key={index}
                          fill="var(--sg-success)"
                          fillOpacity={0.88}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="warn"
                      stackId="a"
                      radius={[0, 0, 0, 0]}
                      maxBarSize={34}
                      onClick={(data) => handleFlowBarClick(data?.payload?.h)}
                      cursor={isFlowInteractive ? "pointer" : "default"}
                    >
                      {flowData.map((_, index) => (
                        <Cell
                          key={index}
                          fill="var(--sg-warn)"
                          fillOpacity={0.9}
                        />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="deny"
                      stackId="a"
                      radius={[0, 0, 0, 0]}
                      maxBarSize={34}
                      onClick={(data) => handleFlowBarClick(data?.payload?.h)}
                      cursor={isFlowInteractive ? "pointer" : "default"}
                    >
                      {flowData.map((_, index) => (
                        <Cell
                          key={index}
                          fill="var(--sg-danger)"
                          fillOpacity={0.88}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {loading && flowData.length > 0 ? (
                <div className="pointer-events-none absolute inset-0 border border-[var(--sg-line)] bg-[rgba(10,12,11,0.22)]" />
              ) : null}
              </>
              )}
            </ClientChartFrame>

            <div className="mt-4 flex flex-wrap gap-5 border-t border-[var(--sg-line)] pt-4">
              {[
                { color: "var(--sg-success)", label: "A tiempo (< 30 min)" },
                { color: "var(--sg-warn)", label: "Revisión (30-45 min)" },
                { color: "var(--sg-danger)", label: "Con demora (> 45 min)" },
                {
                  color: "#4f8df7",
                  label: `Anticipado - ${kpis.anticipado ?? 0} Atendidos antes de cita`,
                },
              ].map((legend) => (
                <span
                  key={legend.label}
                  className="flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sg-muted)]"
                >
                  <span className="h-2.5 w-2.5" style={{ background: legend.color }} />
                  {legend.label}
                </span>
              ))}
            </div>
          </section>

          <HeatmapDemoras data={heatmapData} />
        </div>

        <div className="flex flex-col gap-5">
          {(initialUserRole !== "guardia" || activePersonnel.length > 0) && (
            <section className="sg-panel p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-[var(--sg-accent)]" />
                  <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
                    Cobertura del turno
                  </span>
                </div>
                <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                  {activePersonnel.length} guardia
                  {activePersonnel.length === 1 ? "" : "s"} activo
                  {activePersonnel.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-[var(--sg-accent)]" />
                    <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                      Operación visible
                    </span>
                  </div>
                  <div className="text-[26px] font-bold leading-none text-[var(--sg-ink)]">
                    {currentGateLoad}
                  </div>
                  <div className="mt-2 text-[12px] text-[var(--sg-copy)]">
                    registros en las puertas más activas del período
                  </div>
                </div>

                <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[var(--sg-success)]" />
                    <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                      Plantas con movimiento
                    </span>
                  </div>
                  <div className="text-[26px] font-bold leading-none text-[var(--sg-ink)]">
                    {operationalZones.length}
                  </div>
                  <div className="mt-2 text-[12px] text-[var(--sg-copy)]">
                    {selectedLabel === "Global"
                      ? "sedes/puertas"
                      : selectedLabel}{" "}
                    con actividad reciente
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)]">
                  <div className="border-b border-[var(--sg-line)] px-4 py-3">
                    <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                      Guardias activos
                    </div>
                  </div>
                  <div className="divide-y divide-[var(--sg-line)]">
                    {personnelSummary.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                          Sin guardias activos visibles
                        </div>
                      </div>
                    ) : (
                      personnelSummary.map((person) => (
                        <div
                          key={`${person.name}-${person.turn}`}
                          className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel)] sg-font-mono text-[11px] font-bold text-[var(--sg-accent)]">
                              {person.initials}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-bold text-[var(--sg-ink)]">
                                {person.name}
                              </div>
                              <div className="mt-0.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                                {person.turn}
                              </div>
                            </div>
                          </div>
                          <span className="flex items-center gap-1.5 self-start sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-success)] sm:self-auto">
                            <span className="h-2 w-2 rounded-full bg-[var(--sg-success)]" />
                            activo
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)]">
                  <div className="border-b border-[var(--sg-line)] px-4 py-3">
                    <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                      Carga por puerta
                    </div>
                  </div>
                  <div className="divide-y divide-[var(--sg-line)]">
                    {operationalZones.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                          Sin movimiento en este período
                        </div>
                      </div>
                    ) : (
                      operationalZones.map((zone) => (
                        <div key={zone.name} className="px-4 py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-bold text-[var(--sg-ink)]">
                                {formatGateLabelFromPlant(zone.name, gateOptions)}
                              </div>
                              <div className="mt-0.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                                {zone.count} registros
                              </div>
                            </div>
                            <span
                              className={`sg-font-mono text-[10px] uppercase tracking-widest sm:shrink-0 ${zone.tone === "ok" ? "text-[var(--sg-success)]" : "text-[var(--sg-danger)]"}`}
                            >
                              {zone.pct}% a tiempo
                            </span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden bg-[rgba(196,192,180,0.08)]">
                            <div
                              className={`h-full ${zone.tone === "ok" ? "bg-[var(--sg-success)]" : "bg-[var(--sg-danger)]"}`}
                              style={{ width: `${Math.max(8, zone.pct)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="sg-panel p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[var(--sg-danger)]" />
                <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
                  Alertas activas
                </span>
                {alerts.length > 0 ? (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full border border-[var(--sg-danger)] px-1.5 sg-font-mono text-[10px] text-[var(--sg-danger)]">
                    {alerts.length}
                  </span>
                ) : null}
              </div>
              <Link
                href="/alertas"
                className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-accent)]"
              >
                Ver todas →
              </Link>
            </div>

            {alerts.length === 0 ? (
              <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--sg-line)] text-[var(--sg-success)]">
                  <ListChecks className="h-5 w-5" />
                </div>
                <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                  Sin alertas críticas
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, index) => {
                  const tone = alertToneClasses(alert.tone);
                  return (
                    <div
                      key={`${alert.title}-${index}`}
                      className="border border-[var(--sg-line)] border-l-2 bg-[var(--sg-panel-2)] p-4"
                      style={{
                        borderLeftColor: tone.border,
                        background: tone.soft,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className="sg-font-mono text-[9px] uppercase tracking-widest"
                            style={{ color: tone.text }}
                          >
                            {alert.title}
                          </div>
                          <div className="mt-1 text-[13px] leading-5 text-[var(--sg-copy)]">
                            {alert.sub}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <section className="sg-panel flex flex-col p-5">
          <div className="mb-4 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-[var(--sg-accent)]" />
            <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
              Estado Actual
            </div>
          </div>

          {!chartsReady ? (
            <div className="h-[200px] w-full animate-pulse bg-[var(--sg-panel-2)]" />
          ) : (() => {
            const chartData = [
              { name: "A tiempo", value: kpis.ok, fill: "var(--sg-success)" },
              { name: "Revisión", value: kpis.warn, fill: "var(--sg-warn)" },
              { name: "Con demora", value: kpis.deny, fill: "var(--sg-danger)" },
              { name: "En proceso", value: kpis.pending, fill: "var(--sg-accent)" },
            ].filter((item) => item.value > 0);

            const total = chartData.reduce((sum, item) => sum + item.value, 0);
            const currentPuntualidad =
              total > 0 ? Math.round((kpis.ok / total) * 100) : 0;

            return (
              <>
                <ClientChartFrame className="relative h-[200px] w-full">
                  {(chartSize) => (
                  <>
                  <ResponsiveContainer width={chartSize.width} height={chartSize.height} minWidth={0} minHeight={1}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="outside"
                          offset={10}
                          formatter={(value) => (Number(value) > 0 ? value : "")}
                          className="sg-font-mono text-[11px] font-bold"
                          fill="var(--sg-ink)"
                        />
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          `${value} registros`,
                          String(name),
                        ]}
                        contentStyle={{
                          backgroundColor: "var(--sg-panel)",
                          border: "1px solid var(--sg-line)",
                          borderRadius: "0",
                          fontSize: "12px",
                        }}
                        itemStyle={{ color: "var(--sg-ink)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="sg-font-mono text-[26px] font-bold leading-none text-[var(--sg-ink)]">
                      {currentPuntualidad}%
                    </span>
                    <span className="sg-font-mono mt-1 text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                      A tiempo
                    </span>
                  </div>
                  </>
                  )}
                </ClientChartFrame>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {chartData.map((item) => {
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-2 bg-[var(--sg-panel-2)] px-3 py-2"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0"
                          style={{ background: item.fill }}
                        />
                        <div className="min-w-0 flex flex-col">
                          <span className="truncate text-[11px] text-[var(--sg-copy)]">
                            {item.name}
                          </span>
                          <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                            {item.value} ({pct}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </section>

        <CausasTop
          causas={delayReasons}
          totalDemoras={kpis.warn + kpis.deny}
          topProvider={topProvider}
        />

        <RankingPlantas
          plantas={zones
            .filter((zone) => zone.name !== "Sin planta")
            .map((zone) => ({
              name: formatGateLabelFromPlant(zone.name, gateOptions),
              count: zone.count,
              pct: zone.pct,
              tone: zone.tone,
            }))}
        />

        <TimelineDia events={recentEvents} />
      </div>

      <div className="mt-5">
        <section className="sg-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--sg-line)] px-5 py-4">
            <div>
              <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
                Últimos eventos
              </div>
              <div className="mt-1 text-[12px] text-[var(--sg-muted)]">
                Registros recientes con su estado operativo actual
              </div>
            </div>
            <Link
              href="/historial"
              className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-accent)]"
            >
              Ver historial completo →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-[var(--sg-line)] sg-font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--sg-muted)]">
                  <th className="px-4 py-3 text-left font-normal">Razón Social</th>
                  <th className="px-4 py-3 text-left font-normal">Estado</th>
                  <th className="hidden px-4 py-3 text-left font-normal sm:table-cell">
                    Empresa
                  </th>
                  <th className="hidden px-4 py-3 text-left font-normal md:table-cell">
                    Puerta
                  </th>
                  <th className="px-4 py-3 text-right font-normal">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sg-line)]">
                {loading && recentEvents.length === 0 ? (
                  [...Array(5)].map((_, index) => (
                    <tr key={`skel-${index}`}>
                      <td colSpan={5} className="px-4 py-3">
                        <div className="h-6 w-full animate-pulse bg-[var(--sg-panel-2)]" />
                      </td>
                    </tr>
                  ))
                ) : recentEvents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]"
                    >
                      No hay eventos recientes
                    </td>
                  </tr>
                ) : (
                  recentEvents.map((event, index) => (
                    <tr
                      key={`${event.time}-${index}`}
                      className="transition-colors hover:bg-[var(--sg-panel-2)]"
                    >
                      <td className="px-4 py-3 text-[12px] font-bold text-[var(--sg-ink)]">
                        {event.plate}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`border border-[var(--sg-line)] px-2 py-0.5 sg-font-mono text-[9px] uppercase tracking-[0.16em] ${event.status === "ok" ? "text-[var(--sg-success)]" : event.status === "warn" ? "text-[var(--sg-warn)]" : "text-[var(--sg-muted)]"}`}
                        >
                          {event.label}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--sg-copy)] sm:table-cell">
                        {event.info}
                      </td>
                      <td className="hidden px-4 py-3 sg-font-mono text-[11px] tracking-widest text-[var(--sg-muted)] md:table-cell">
                        {formatGateLabelFromPlant(event.gate)}
                      </td>
                      <td className="px-4 py-3 text-right sg-font-mono text-[11px] text-[var(--sg-muted)]">
                        {event.time}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      </>
      ) : null}

      {(flowDetailLoading || flowDetail || flowDetailError) ? (
        <FlowDetailModal
          key={`${flowDetail?.timeframe ?? "loading"}-${flowDetail?.bucket ?? "none"}`}
          detail={flowDetail}
          error={flowDetailError}
          loading={flowDetailLoading}
          gateOptions={gateOptions}
          onClose={closeFlowDetail}
        />
      ) : null}
    </AppLayout>
  );
}

function FlowDetailModal({
  detail,
  error,
  loading,
  gateOptions,
  onClose,
}: {
  detail: DashboardFlowDetail | null;
  error: string | null;
  loading: boolean;
  gateOptions: GateAssignment[];
  onClose: () => void;
}) {
  const punctualidad =
    detail && detail.total > 0 ? Math.round((detail.kpis.ok / detail.total) * 100) : 0;
  const [sortBy, setSortBy] = useState<"recent" | "delay" | "company">("recent");
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<DashboardFlowDetail["records"][number] | null>(null);
  const PAGE_SIZE = 5;

  const sortedRecords = detail
    ? [...detail.records].sort((a, b) => {
        if (sortBy === "delay") return (b.delay ?? -1) - (a.delay ?? -1);
        if (sortBy === "company") {
          const byCompany = a.empresa.localeCompare(b.empresa);
          if (byCompany !== 0) return byCompany;
        }
        const byDate = b.fecha.localeCompare(a.fecha);
        if (byDate !== 0) return byDate;
        return (b.time ?? "").localeCompare(a.time ?? "");
      })
    : [];
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = sortedRecords.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const timeValue = (value: string | null | undefined) =>
    value ? value.substring(0, 5) : "—";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(3,5,4,0.78)] px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[88vh] w-full max-w-[760px] overflow-y-auto border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[12px_12px_0_rgba(196,192,180,0.06)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-[var(--sg-line)] bg-[rgba(24,24,27,0.96)] px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
                {detail?.timeframe ?? "Detalle"} · Flujo de acceso
              </div>
              <div className="mt-2 sg-font-display text-[18px] font-bold uppercase tracking-[0.08em] text-[var(--sg-ink)]">
                {detail ? detail.label : "Cargando segmento"}
              </div>
              <div className="mt-1 max-w-[720px] text-[12px] leading-5 text-[var(--sg-muted)]">
                {detail?.subtitle ?? "Cargando detalle operativo del segmento seleccionado."}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {detail ? (
                <div className="hidden text-right md:block">
                  <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                    Puntualidad
                  </div>
                  <div className="mt-1 sg-font-mono text-[18px] font-bold text-[var(--sg-success)]">
                    {punctualidad}%
                  </div>
                </div>
              ) : null}
              <button
                onClick={onClose}
                className="text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5">
          {loading ? (
            <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-14 text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-[var(--sg-line)] border-t-[var(--sg-accent)]" />
              <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                Cargando detalle...
              </div>
            </div>
          ) : error ? (
            <div className="border border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] px-4 py-6 text-center text-[13px] text-[var(--sg-danger)]">
              {error}
            </div>
          ) : detail ? (
            <>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {[
                  { label: "Registros", value: detail.total, tone: "text-[var(--sg-ink)]" },
                  { label: "Puntualidad", value: `${punctualidad}%`, tone: "text-[var(--sg-success)]" },
                  { label: "A tiempo", value: detail.kpis.ok, tone: "text-[var(--sg-success)]" },
                  { label: "Revisión", value: detail.kpis.warn, tone: "text-[var(--sg-warn)]" },
                  { label: "Con demora", value: detail.kpis.deny, tone: "text-[var(--sg-danger)]" },
                ].map((item) => (
                  <div key={item.label} className="border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                      {item.label}
                    </div>
                    <div className={`mt-1.5 text-[22px] font-bold leading-none ${item.tone}`}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
                <section className="border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="sg-font-display text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
                    Puertas más cargadas
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {detail.topGates.length === 0 ? (
                      <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                        Sin puertas con movimiento
                      </div>
                    ) : (
                      detail.topGates.map((zone, index) => (
                        <div key={zone.name} className="py-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="sg-font-mono text-[8px] uppercase tracking-widest text-[var(--sg-muted)]">
                                #{index + 1}
                              </div>
                              <span className="mt-1 block truncate text-[12px] font-semibold text-[var(--sg-ink)]">
                                {formatGateLabelFromPlant(zone.name, gateOptions)}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="sg-font-mono text-[10px] font-bold text-[var(--sg-ink)]">
                                {zone.count}
                              </div>
                              <div className={`sg-font-mono text-[8px] uppercase tracking-widest ${zone.tone === "ok" ? "text-[var(--sg-success)]" : "text-[var(--sg-danger)]"}`}>
                                {zone.pct}% a tiempo
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 h-1 overflow-hidden bg-[rgba(196,192,180,0.1)]">
                            <div
                              className={zone.tone === "ok" ? "h-full bg-[var(--sg-success)]" : "h-full bg-[var(--sg-danger)]"}
                              style={{ width: `${Math.max(zone.pct, 8)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)]">
                  <div className="border-b border-[var(--sg-line)] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="sg-font-display text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
                          Registros del segmento
                        </div>
                      </div>
                      <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                        {sortedRecords.length} items
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {[
                        { key: "recent", label: "Recientes" },
                        { key: "delay", label: "Más demora" },
                        { key: "company", label: "Empresa" },
                      ].map((option) => (
                        <button
                          key={option.key}
                          onClick={() => {
                            setSortBy(option.key as "recent" | "delay" | "company");
                            setPage(1);
                          }}
                          className={`px-2.5 py-1 sg-font-mono text-[9px] uppercase tracking-widest transition-colors ${
                            sortBy === option.key
                              ? "bg-[var(--sg-ink)] text-[var(--sg-canvas)]"
                              : "border border-[var(--sg-line)] text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="divide-y divide-[var(--sg-line)]">
                    {paginatedRecords.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                          Sin registros para este tramo
                        </div>
                      </div>
                    ) : (
                      paginatedRecords.map((record) => (
                        <button
                          key={`${record.id ?? record.razon_social}-${record.time}-${record.fecha}`}
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          className="w-full px-4 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.03)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="sg-font-mono text-[11px] font-bold text-[var(--sg-ink)]">
                                  {record.time}
                                </span>
                                <span className="truncate text-[13px] font-semibold text-[var(--sg-ink)]">
                                  {record.razon_social}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--sg-copy)]">
                                <span>{record.empresa}</span>
                                <span className="text-[var(--sg-muted)]">·</span>
                                <span>{formatGateLabelFromPlant(record.gate, gateOptions)}</span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--sg-muted)]">
                                <span>{record.fecha}</span>
                                {record.tipo_operacion ? (
                                  <>
                                    <span>·</span>
                                    <span>{record.tipo_operacion}</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 pl-2">
                              <span className={`sg-font-mono text-[10px] font-bold uppercase tracking-widest ${
                                record.status === "deny"
                                  ? "text-[var(--sg-danger)]"
                                  : record.status === "warn"
                                    ? "text-[var(--sg-warn)]"
                                    : record.status === "pending"
                                      ? "text-[var(--sg-info)]"
                                      : "text-[var(--sg-success)]"
                              }`}>
                                {record.delay != null ? `${record.delay} min` : "—"}
                              </span>
                              <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)]">
                                Ver
                              </span>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-[var(--sg-line)] px-4 py-3">
                    <div>
                      <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                        Página {currentPage} de {totalPages}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 border border-[var(--sg-line)] px-2.5 py-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 border border-[var(--sg-line)] px-2.5 py-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Siguiente
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </>
          ) : null}
        </div>

        {selectedRecord ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(9,9,11,0.86)] p-4 backdrop-blur-sm">
            <div className="w-full max-w-[560px] border border-[var(--sg-line)] bg-[var(--sg-panel)]">
              <div className="flex items-center justify-between border-b border-[var(--sg-line)] px-4 py-3">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="flex items-center gap-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)] transition-colors hover:text-[var(--sg-accent-soft)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver
                </button>
                <button
                  onClick={onClose}
                  className="text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                    Registro seleccionado
                  </div>
                  <div className="mt-2 text-[16px] font-semibold text-[var(--sg-ink)]">
                    {selectedRecord.razon_social}
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--sg-copy)]">
                    {selectedRecord.empresa} · {formatGateLabelFromPlant(selectedRecord.gate, gateOptions)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Fecha</div>
                    <div className="mt-1 text-[13px] text-[var(--sg-ink)]">{selectedRecord.fecha}</div>
                  </div>
                  <div className="border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Espera</div>
                    <div className="mt-1 text-[13px] text-[var(--sg-ink)]">{selectedRecord.delay != null ? `${selectedRecord.delay} min` : "—"}</div>
                  </div>
                  <div className="border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">H. registro</div>
                    <div className="mt-1 text-[13px] text-[var(--sg-ink)]">{timeValue(selectedRecord.h_registro)}</div>
                  </div>
                  <div className="border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">H. atención</div>
                    <div className="mt-1 text-[13px] text-[var(--sg-ink)]">{timeValue(selectedRecord.h_atencion)}</div>
                  </div>
                  <div className="border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">H. cita</div>
                    <div className="mt-1 text-[13px] text-[var(--sg-ink)]">{timeValue(selectedRecord.hora_cita)}</div>
                  </div>
                  <div className="border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Tiempo total</div>
                    <div className="mt-1 text-[13px] text-[var(--sg-ink)]">{selectedRecord.tiempo_total_min != null ? `${selectedRecord.tiempo_total_min} min` : "—"}</div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Tipo / operación</div>
                    <div className="mt-1 text-[13px] text-[var(--sg-ink)]">
                      {[selectedRecord.tipo, selectedRecord.tipo_operacion].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <div className="border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Motivo de demora</div>
                    <div className="mt-1 text-[13px] text-[var(--sg-ink)]">{selectedRecord.motivo_demora || "—"}</div>
                  </div>
                  <div className="border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] p-3">
                    <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Observación</div>
                    <div className="mt-1 text-[13px] text-[var(--sg-ink)]">{selectedRecord.observacion || "—"}</div>
                  </div>
                </div>

                {selectedRecord.id ? (
                  <div className="flex justify-end">
                    <Link
                      href={`/historial?id=${selectedRecord.id}`}
                      className="border border-[var(--sg-line)] px-3 py-2 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)] transition-colors hover:border-[var(--sg-accent)] hover:bg-[rgba(200,168,75,0.06)]"
                    >
                      Abrir en historial
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
