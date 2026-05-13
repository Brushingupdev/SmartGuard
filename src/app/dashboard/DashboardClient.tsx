"use client";

import AppLayout from "@/components/AppLayout";
import DashboardKPICard from "@/components/DashboardKPICard";
import CausasTop from "@/components/CausasTop";
import RankingPlantas from "@/components/RankingPlantas";
import TimelineDia from "@/components/TimelineDia";
import HeatmapDemoras from "@/components/HeatmapDemoras";
import ExportPDFButton from "@/components/ExportPDFButton";
import { getDashboardStats, getDashboardTrends, getDashboardHeatmap } from "@/app/actions";
import { formatGateLabelFromPlant, groupGatesBySite, type GateAssignment } from "@/lib/gates";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ListChecks,
  UsersRound,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
} from "lucide-react";
import type {
  DashboardKpis,
  DashboardFlowRow,
  DashboardEvent,
  DashboardZone,
  DashboardAlert,
  DashboardTopProvider,
  HeatmapCell,
} from "@/types/dashboard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  LabelList,
} from "recharts";

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown }>;
  label?: string | number;
  timeframe?: string;
}

type DashboardStatsResult = Awaited<ReturnType<typeof getDashboardStats>>;
type DashboardTrendState = { ok: number | null; deny: number | null; total: number | null; puntualidad: number | null };

interface DashboardClientProps {
  initialPlant: string;
  initialTimeframe: string;
  initialPlants: string[];
  initialGateOptions: GateAssignment[];
  initialAvailableYears: string[];
  initialStats: DashboardStatsResult;
  initialTrends: DashboardTrendState;
  initialHeatmapData: HeatmapCell[];
  initialLastRefreshAt: string;
}

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAYS_LONG  = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function formatXLabel(value: string, timeframe: string): string {
  if (timeframe === "Día")    return `${value}h`;
  if (timeframe === "Semana") return DAYS_SHORT[parseInt(value)] ?? value;
  if (timeframe === "Mes")    return `S${value}`;
  if (/^\d{4}$/.test(timeframe)) return MONTHS[parseInt(value) - 1] ?? value;
  return `d.${value}`;
}

function formatTooltipLabel(label: string, timeframe: string): string {
  if (timeframe === "Día")    return `${label}:00 – ${label}:59`;
  if (timeframe === "Semana") return DAYS_LONG[parseInt(label)] ?? label;
  if (timeframe === "Mes")    return `Semana ${label}`;
  if (/^\d{4}$/.test(timeframe)) return MONTHS[parseInt(label) - 1] ?? label;
  return `Día ${label}`;
}


function alertToneClasses(tone: DashboardAlert["tone"]): { border: string; text: string; soft: string } {
  if (tone === "warn") {
    return {
      border: "var(--sg-warn)",
      text: "var(--sg-warn)",
      soft: "rgba(212,134,74,0.08)",
    };
  }
  if (tone === "ok") {
    return {
      border: "var(--sg-success)",
      text: "var(--sg-success)",
      soft: "rgba(107,189,138,0.08)",
    };
  }
  return {
    border: "var(--sg-danger)",
    text: "var(--sg-danger)",
    soft: "rgba(211,92,79,0.08)",
  };
}

function ChartTooltip({ active, payload, label, timeframe = "Día" }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const labelMap: Record<string, string> = { ok: "A tiempo", warn: "Revisión", deny: "Con demora" };
  const colorMap: Record<string, string> = { ok: "var(--sg-success)", warn: "var(--sg-warn)", deny: "var(--sg-danger)" };
  return (
    <div className="border border-[var(--sg-line)] bg-[var(--sg-panel)] px-3 py-2 shadow-[6px_6px_0_rgba(196,192,180,0.08)]">
      <div className="sg-slabel mb-2">{formatTooltipLabel(String(label), String(timeframe))}</div>
      {payload.map((p) => {
        const key = String(p.dataKey ?? '');
        return (
        <div key={key} className="flex items-center justify-between gap-5 text-[12px]">
          <span className="flex items-center gap-2 text-[var(--sg-copy)]">
            <span className="h-2 w-2" style={{ background: colorMap[key] }} />
            {labelMap[key] ?? key}
          </span>
          <span className="sg-mono text-[var(--sg-ink)]">{String(p.value ?? '')}</span>
        </div>
      )})}
      <div className="mt-1.5 border-t border-[var(--sg-line)] pt-1.5 flex justify-between text-[11px]">
        <span className="text-[var(--sg-muted)]">Total</span>
        <span className="sg-mono text-[var(--sg-ink)]">{payload.reduce((s, p) => s + (Number(p.value) || 0), 0)}</span>
      </div>
    </div>
  );
}

export default function DashboardClient({
  initialPlant,
  initialTimeframe,
  initialPlants,
  initialGateOptions,
  initialAvailableYears,
  initialStats,
  initialTrends,
  initialHeatmapData,
  initialLastRefreshAt,
}: DashboardClientProps) {
  const [liveTime, setLiveTime]             = useState("--:--:--");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(initialTimeframe);
  const [lastSelectedYear, setLastSelectedYear]   = useState<string>(
    initialAvailableYears.includes(initialTimeframe) ? initialTimeframe : (initialAvailableYears.at(-1) ?? "")
  );
  const [selectedPlant, setSelectedPlant]   = useState<string>(initialPlant);
  const [selectedSite, setSelectedSite]     = useState<string>("Todos");
  const [plants]                            = useState<string[]>(initialPlants);
  const [gateOptions]                       = useState<GateAssignment[]>(initialGateOptions);
  const [availableYears]                    = useState<string[]>(initialAvailableYears);
  const [kpis, setKpis]                     = useState<DashboardKpis>(initialStats.kpis);
  const [recentEvents, setRecentEvents]     = useState<DashboardEvent[]>(initialStats.events);
  const [flowData, setFlowData]             = useState<DashboardFlowRow[]>(initialStats.flowData);
  const [zones, setZones]                   = useState<DashboardZone[]>(initialStats.zones);
  const [alerts, setAlerts]                 = useState<DashboardAlert[]>(initialStats.alerts);
  const [delayReasons, setDelayReasons]     = useState<{ motivo: string; count: number }[]>(initialStats.delayReasons ?? []);
  const [topProvider, setTopProvider]       = useState<DashboardTopProvider | null>(initialStats.topProvider ?? null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [lastRefresh, setLastRefresh]       = useState<Date | null>(new Date(initialLastRefreshAt));
  const [refreshing, setRefreshing]         = useState(false);
  const [trends, setTrends]                 = useState<DashboardTrendState>(initialTrends);
  const [heatmapData, setHeatmapData]       = useState<HeatmapCell[]>(initialHeatmapData);
  const intervalRef                         = useRef<ReturnType<typeof setInterval> | null>(null);
  const reqIdRef                            = useRef(0);
  const statsBootstrappedRef                = useRef(false);
  const heatmapPlantRef                     = useRef<string>(initialPlant);

  const fetchStats = useCallback(async (plant: string, timeframe: string, silent = false, id: number) => {
    if (silent) setRefreshing(true); else { setLoading(true); setError(null); }
    try {
      const [statsResult, trendsResult] = await Promise.allSettled([
        getDashboardStats(plant, timeframe),
        silent ? Promise.resolve(null) : getDashboardTrends(plant, timeframe),
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

      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      if (id !== reqIdRef.current) return;
      setError(err instanceof Error ? err.message : "Error al cargar datos del dashboard");
    } finally {
      if (id !== reqIdRef.current) return;
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tick = () =>
      setLiveTime(new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const clockId = setInterval(tick, 1000);
    return () => clearInterval(clockId);
  }, []);

  useEffect(() => {
    if (!statsBootstrappedRef.current) {
      statsBootstrappedRef.current = true;
    } else {
      const id = ++reqIdRef.current;
      fetchStats(selectedPlant, selectedTimeframe, false, id);
      // Re-fetch heatmap only when plant changes (180-day history, not needed every 60s)
      if (heatmapPlantRef.current !== selectedPlant) {
        heatmapPlantRef.current = selectedPlant;
        getDashboardHeatmap(selectedPlant).then(setHeatmapData).catch(() => {});
      }
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const silentId = ++reqIdRef.current;
      fetchStats(selectedPlant, selectedTimeframe, true, silentId);
    }, 60_000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [selectedPlant, selectedTimeframe, fetchStats]);

  const puntualidad = kpis.total > 0 ? Math.round((kpis.ok / kpis.total) * 100) : null;
  const sites = groupGatesBySite(gateOptions.length ? gateOptions : plants.map((plant) => ({ site: plant, gate: plant, plant })));
  const currentSiteGates = selectedSite === "Todos" ? [] : sites.find((site) => site.site === selectedSite)?.gates ?? [];
  const selectedLabel = selectedPlant === "Todos"
    ? "Global"
    : selectedPlant.startsWith("site:")
      ? `Sede ${selectedPlant.replace("site:", "")}`
      : formatGateLabelFromPlant(selectedPlant, gateOptions);
  const encodedPlant = encodeURIComponent(selectedPlant);
  const encodedTimeframe = encodeURIComponent(selectedTimeframe);

  const sparkSeries = flowData.length > 1
    ? {
        ok:    flowData.map(r => r.ok),
        warn:  flowData.map(r => r.warn),
        deny:  flowData.map(r => r.deny),
        total: flowData.map(r => r.ok + r.warn + r.deny),
      }
    : {
        ok:    [kpis.ok    || 1],
        warn:  [kpis.warn  || 1],
        deny:  [kpis.deny  || 1],
        total: [kpis.total || 1],
      };

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

  return (
    <AppLayout>
      {/* Error banner */}
      {error && (
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
      )}

      {/* Topbar */}
      <div className="mb-6 flex flex-col gap-3 border-b border-[var(--sg-line)] pb-4 sm:pb-5">
        {/* Fila 1: título + acciones derechas */}
        <div className="flex items-center justify-between gap-2">
          <div className="sg-kicker">Dashboard</div>
          <div className="flex items-center gap-2">
            <Link
              href={`/reporte?plant=${encodedPlant}&timeframe=${encodedTimeframe}`}
              className="flex items-center gap-1.5 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-2.5 py-1.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Análisis</span>
            </Link>
            {lastRefresh && (
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${refreshing ? "bg-[var(--sg-warn)] sg-pulse" : "bg-[var(--sg-success)]"}`} />
                <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                  {refreshing ? "…" : lastRefresh.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
            <div className="hidden xl:flex flex-col items-end">
              <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                {new Date().toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
              </span>
              <span className="sg-font-mono text-[9px] text-[var(--sg-muted)]">{liveTime}</span>
            </div>
          </div>
        </div>

        {/* Fila 2: filtros de planta + período */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de sede */}
          <div className="flex bg-[var(--sg-panel-2)] border border-[var(--sg-line)] p-0.5">
            {["Todos", ...sites.map((site) => site.site)].map((site) => (
              <button
                key={site}
                onClick={() => {
                  setSelectedSite(site);
                  setSelectedPlant(site === "Todos" ? "Todos" : `site:${site}`);
                }}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                  selectedSite === site
                    ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]"
                    : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                }`}
              >
                {site}
              </button>
            ))}
          </div>

          {currentSiteGates.length > 0 && (
            <div className="relative">
              <select
                aria-label="Seleccionar puerta"
                value={selectedPlant}
                onChange={(e) => setSelectedPlant(e.target.value)}
                className="h-[30px] appearance-none border border-[var(--sg-line)] bg-[var(--sg-panel-2)] pr-6 pl-2.5 text-[10px] uppercase tracking-widest font-bold text-[var(--sg-ink)] outline-none transition-colors hover:border-[var(--sg-accent)] cursor-pointer"
              >
                <option value={`site:${selectedSite}`} className="bg-[var(--sg-panel)] text-[var(--sg-ink)]">Todas las puertas</option>
                {currentSiteGates.map((gate) => (
                  <option key={gate.plant} value={gate.plant} className="bg-[var(--sg-panel)] text-[var(--sg-ink)]">{gate.gate}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--sg-muted)]" />
            </div>
          )}

          <div className="w-px h-4 bg-[var(--sg-line)] hidden sm:block" />

          {/* Selector de período */}
          <div className="flex items-center bg-[var(--sg-panel-2)] border border-[var(--sg-line)] p-0.5">
            {["Día", "Semana", "Mes"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTimeframe(t)}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                  selectedTimeframe === t
                    ? "bg-[var(--sg-ink)] text-[var(--sg-canvas)]"
                    : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                }`}
              >
                {t}
              </button>
            ))}
            {availableYears.length > 0 && (
              <>
                <div className="w-px h-4 bg-[var(--sg-line)] mx-0.5" />
                <div className="relative">
                  <select
                    aria-label="Seleccionar año"
                    value={lastSelectedYear}
                    onChange={(e) => {
                      if (e.target.value) {
                        setLastSelectedYear(e.target.value);
                        setSelectedTimeframe(e.target.value);
                      }
                    }}
                    className={`h-[26px] appearance-none border bg-[var(--sg-panel-2)] pr-6 pl-2.5 text-[10px] uppercase tracking-widest font-bold outline-none transition-colors cursor-pointer ${
                      availableYears.includes(selectedTimeframe)
                        ? "border-[var(--sg-ink)] text-[var(--sg-canvas)] bg-[var(--sg-ink)]"
                        : "border-[var(--sg-line)] text-[var(--sg-ink)] hover:border-[var(--sg-accent)]"
                    }`}
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year} className="bg-[var(--sg-panel)] text-[var(--sg-ink)]">{year}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--sg-muted)]" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="sg-font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--sg-muted)]">Resumen global</span>
          {loading ? (
            <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-warn)]">Actualizando...</span>
          ) : (
            <>
              <span className="sg-font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--sg-success)]">{puntualidad ?? 0}% A tiempo</span>
              {trends.total != null && (
                <span className={`flex items-center gap-1.5 sg-font-mono text-[10px] uppercase tracking-[0.16em] ${trends.total > 0 ? 'text-[var(--sg-success)]' : 'text-[var(--sg-danger)]'}`}>
                  {trends.total > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {trends.total > 0 ? "+" : ""}{trends.total}% vs período anterior
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ExportPDFButton plant={selectedPlant} timeframe={selectedTimeframe} kpis={kpis} puntualidad={puntualidad} />
        </div>
      </div>

      <section className={`grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4 ${loading ? "opacity-80" : ""}`}>
        {kpiCards.map((card) => (
          <DashboardKPICard key={card.label} {...card} />
        ))}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
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
                  {selectedLabel} · {flowData.reduce((sum, row) => sum + row.ok + row.warn + row.deny, 0)} registros en el período
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-2 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                  Por {selectedTimeframe === "Día" ? "hora" : "segmento"}
                </div>
              </div>
            </div>

            <div className="relative h-[320px]">
              {loading && flowData.length === 0 ? (
                <div className="h-full w-full animate-pulse bg-[var(--sg-panel-2)]" />
              ) : flowData.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">
                    Sin datos para este período
                  </span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" debounce={200}>
                  <BarChart data={flowData} barCategoryGap={8}>
                    <CartesianGrid stroke="rgba(196,192,180,0.06)" vertical={false} />
                    <XAxis
                      dataKey="h"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6a706c", fontSize: 10, fontFamily: "DM Mono" }}
                      tickFormatter={(v) => formatXLabel(v, selectedTimeframe)}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6a706c", fontSize: 10, fontFamily: "DM Mono" }}
                      width={28}
                      allowDecimals={false}
                    />
                    <Tooltip content={(props) => <ChartTooltip {...props} timeframe={selectedTimeframe} />} cursor={{ fill: "rgba(196,192,180,0.04)" }} />
                    <Bar dataKey="ok" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={34}>
                      {flowData.map((_, i) => <Cell key={i} fill="var(--sg-success)" fillOpacity={0.88} />)}
                    </Bar>
                    <Bar dataKey="warn" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={34}>
                      {flowData.map((_, i) => <Cell key={i} fill="var(--sg-warn)" fillOpacity={0.9} />)}
                    </Bar>
                    <Bar dataKey="deny" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={34}>
                      {flowData.map((_, i) => <Cell key={i} fill="var(--sg-danger)" fillOpacity={0.88} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {loading && flowData.length > 0 ? (
                <div className="pointer-events-none absolute inset-0 border border-[var(--sg-line)] bg-[rgba(10,12,11,0.22)]" />
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-5 border-t border-[var(--sg-line)] pt-4">
              {[
                { color: "var(--sg-success)", label: "A tiempo (< 30 min)" },
                { color: "var(--sg-warn)", label: "Revisión (30-45 min)" },
                { color: "var(--sg-danger)", label: "Con demora (> 45 min)" },
                { color: "#4f8df7", label: `Anticipado - ${kpis.anticipado ?? 0} Atendidos antes de cita` },
              ].map((legend) => (
                <span key={legend.label} className="flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sg-muted)]">
                  <span className="h-2.5 w-2.5" style={{ background: legend.color }} />
                  {legend.label}
                </span>
              ))}
            </div>
          </section>

          <HeatmapDemoras data={heatmapData} />
        </div>

        <div className="flex flex-col gap-5">
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
                      className="border-l-2 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4"
                      style={{ borderLeftColor: tone.border, background: tone.soft }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="sg-font-mono text-[9px] uppercase tracking-widest" style={{ color: tone.text }}>
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

          <TimelineDia events={recentEvents} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="sg-panel p-5 flex flex-col">
          <div className="mb-4 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-[var(--sg-accent)]" />
            <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
              Estado Actual
            </div>
          </div>

          {(() => {
            const chartData = [
              { name: "A tiempo", value: kpis.ok, fill: "var(--sg-success)" },
              { name: "Revisión", value: kpis.warn, fill: "var(--sg-warn)" },
              { name: "Con demora", value: kpis.deny, fill: "var(--sg-danger)" },
              { name: "En proceso", value: kpis.pending, fill: "var(--sg-accent)" },
            ].filter(d => d.value > 0);

            const total = chartData.reduce((sum, d) => sum + d.value, 0);
            const puntualidad = total > 0 ? Math.round((kpis.ok / total) * 100) : 0;

            return (
              <>
                <div className="h-[200px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
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
                          formatter={(value) => Number(value) > 0 ? value : ''}
                          className="sg-font-mono text-[11px] font-bold"
                          fill="var(--sg-ink)"
                        />
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} registros`, String(name)]}
                        contentStyle={{
                          backgroundColor: 'var(--sg-panel)',
                          border: '1px solid var(--sg-line)',
                          borderRadius: '0',
                          fontSize: '12px',
                        }}
                        itemStyle={{ color: 'var(--sg-ink)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="sg-font-mono text-[26px] font-bold text-[var(--sg-ink)] leading-none">
                      {puntualidad}%
                    </span>
                    <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] mt-1">
                      A tiempo
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {chartData.map((item) => {
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-2 bg-[var(--sg-panel-2)] px-3 py-2">
                        <span className="h-2.5 w-2.5 shrink-0" style={{ background: item.fill }} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] text-[var(--sg-copy)] truncate">{item.name}</span>
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

        <CausasTop causas={delayReasons} totalDemoras={kpis.warn + kpis.deny} topProvider={topProvider} />
        
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
              className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-accent)] transition-colors"
            >
              Ver historial completo →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="sg-font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--sg-muted)] border-b border-[var(--sg-line)]">
                  <th className="py-3 px-4 text-left font-normal">Razón Social</th>
                  <th className="py-3 px-4 text-left font-normal">Estado</th>
                  <th className="py-3 px-4 text-left font-normal hidden sm:table-cell">Empresa</th>
                  <th className="py-3 px-4 text-left font-normal hidden md:table-cell">Puerta</th>
                  <th className="py-3 px-4 text-right font-normal">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sg-line)]">
                {loading && recentEvents.length === 0 ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={`skel-${i}`}>
                      <td colSpan={5} className="py-3 px-4">
                        <div className="h-6 w-full animate-pulse bg-[var(--sg-panel-2)]" />
                      </td>
                    </tr>
                  ))
                ) : recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[var(--sg-muted)] sg-font-mono text-[10px] uppercase tracking-widest">
                      No hay eventos recientes
                    </td>
                  </tr>
                ) : recentEvents.map((event, index) => (
                  <tr key={`${event.time}-${index}`} className="hover:bg-[var(--sg-panel-2)] transition-colors">
                    <td className="py-3 px-4 text-[12px] font-bold text-[var(--sg-ink)]">
                      {event.plate}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`border border-[var(--sg-line)] px-2 py-0.5 sg-font-mono text-[9px] uppercase tracking-[0.16em] ${event.status === 'ok' ? 'text-[var(--sg-success)]' : event.status === 'warn' ? 'text-[var(--sg-warn)]' : 'text-[var(--sg-muted)]'}`}>
                        {event.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[var(--sg-copy)] uppercase tracking-wider hidden sm:table-cell">
                      {event.info}
                    </td>
                    <td className="py-3 px-4 sg-font-mono text-[11px] text-[var(--sg-muted)] tracking-widest hidden md:table-cell">
                      {formatGateLabelFromPlant(event.gate)}
                    </td>
                    <td className="py-3 px-4 text-right sg-font-mono text-[11px] text-[var(--sg-muted)]">
                      {event.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </section>
        </div>
    </AppLayout>
  );
}
