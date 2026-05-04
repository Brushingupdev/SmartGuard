"use client";

import AppLayout from "@/components/AppLayout";
import DashboardKPICard from "@/components/DashboardKPICard";
import TimelineDia from "@/components/TimelineDia";
import HeatmapDemoras from "@/components/HeatmapDemoras";
import CausasTop from "@/components/CausasTop";
import RankingPlantas from "@/components/RankingPlantas";
import ExportPDFButton from "@/components/ExportPDFButton";
import { getDashboardStats, getUserPlants, getAvailableYears, getDashboardTrends, getDashboardHeatmap } from "@/app/actions";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import type {
  DashboardKpis,
  DashboardFlowRow,
  DashboardEvent,
  DashboardAlert,
  DashboardZone,
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
} from "recharts";

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown }>;
  label?: string | number;
  timeframe?: string;
}

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function formatXLabel(value: string, timeframe: string): string {
  if (timeframe === "Día") return `${value}h`;
  if (/^\d{4}$/.test(timeframe)) return MONTHS[parseInt(value) - 1] ?? value;
  return `d.${value}`;
}

function formatTooltipLabel(label: string, timeframe: string): string {
  if (timeframe === "Día") return `${label}:00 – ${label}:59`;
  if (/^\d{4}$/.test(timeframe)) return MONTHS[parseInt(label) - 1] ?? label;
  return `Día ${label}`;
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

export default function DashboardPage() {
  const [liveTime, setLiveTime]             = useState("--:--:--");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("Día");
  const [selectedPlant, setSelectedPlant]   = useState<string>("Todos");
  const [plants, setPlants]                 = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [kpis, setKpis]                     = useState<DashboardKpis>({ ok: 0, deny: 0, warn: 0, pending: 0, total: 0 });
  const [recentEvents, setRecentEvents]     = useState<DashboardEvent[]>([]);
  const [flowData, setFlowData]             = useState<DashboardFlowRow[]>([]);
  const [zones, setZones]                   = useState<DashboardZone[]>([]);
  const [alerts, setAlerts]                 = useState<DashboardAlert[]>([]);
  const [delayReasons, setDelayReasons]     = useState<{ motivo: string; count: number }[]>([]);
  const [heatmapData, setHeatmapData]       = useState<HeatmapCell[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [lastRefresh, setLastRefresh]       = useState<Date | null>(null);
  const [refreshing, setRefreshing]         = useState(false);
  const [trends, setTrends]                 = useState<{ ok: number | null; deny: number | null; total: number | null; puntualidad: number | null }>({ ok: null, deny: null, total: null, puntualidad: null });
  const intervalRef                         = useRef<ReturnType<typeof setInterval> | null>(null);
  const reqIdRef                            = useRef(0);

  const fetchStats = useCallback(async (plant: string, timeframe: string, silent = false, id: number) => {
    if (silent) setRefreshing(true); else { setLoading(true); setError(null); }
    try {
      const [data, trendData] = await Promise.all([
        getDashboardStats(plant, timeframe),
        silent ? null : getDashboardTrends(plant, timeframe),
      ]);
      if (id !== reqIdRef.current) return;
      if (data) {
        setKpis(data.kpis);
        setRecentEvents(data.events);
        setFlowData(data.flowData);
        setZones(data.zones);
        setAlerts(data.alerts);
        setDelayReasons(data.delayReasons ?? []);
      }
      if (trendData) setTrends(trendData.trend);
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
    getUserPlants().then(setPlants);
    getAvailableYears().then(setAvailableYears);
  }, []);

  // Heatmap: recarga cuando cambia la planta (no en cada tick de 60s)
  useEffect(() => {
    getDashboardHeatmap(selectedPlant).then(setHeatmapData);
  }, [selectedPlant]);

  useEffect(() => {
    const id = ++reqIdRef.current;
    fetchStats(selectedPlant, selectedTimeframe, false, id);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const silentId = ++reqIdRef.current;
      fetchStats(selectedPlant, selectedTimeframe, true, silentId);
    }, 60_000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [selectedPlant, selectedTimeframe, fetchStats]);

  const puntualidad = kpis.total > 0 ? Math.round((kpis.ok / kpis.total) * 100) : null;

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="sg-kicker">Dashboard</div>

          <div className="flex bg-[var(--sg-panel-2)] border border-[var(--sg-line)] p-0.5 flex-wrap">
            {["Todos", ...plants].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPlant(p)}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                  selectedPlant === p
                    ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]"
                    : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="w-[1px] h-4 bg-[var(--sg-line)]" />

          <div className="flex bg-[var(--sg-panel-2)] border border-[var(--sg-line)] p-0.5">
            {["Día", "Semana", "Mes", ...availableYears].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTimeframe(t)}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                  selectedTimeframe === t
                    ? "bg-[var(--sg-ink)] text-[var(--sg-canvas)]"
                    : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={`/reporte?plant=${selectedPlant}&timeframe=${selectedTimeframe}`}
            className="flex items-center gap-2 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-1.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Análisis detallado
          </Link>

          {lastRefresh && (
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${refreshing ? "bg-[var(--sg-warn)] sg-pulse" : "bg-[var(--sg-success)]"}`} />
              <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                {refreshing ? "Actualizando…" : `↻ ${lastRefresh.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`}
              </span>
            </div>
          )}
          <div className="sg-mono text-[11px] text-[var(--sg-muted)] tracking-[0.12em]" suppressHydrationWarning>
            {new Date().toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })} · {liveTime}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* ───────── MAIN ───────── */}
        <div className="flex flex-col gap-5">

          {/* KPIs v2 — con trends */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="sg-slabel">
                Resumen {selectedPlant === "Todos" ? "Global" : `Planta ${selectedPlant}`}
                {!loading && (
                  <span className="ml-3 text-[var(--sg-muted)]">
                    {puntualidad !== null && <span className="text-[var(--sg-success)]">{puntualidad}% a tiempo</span>}
                    {trends.total !== null && (
                      <span className={`ml-2 ${trends.total >= 0 ? 'text-[var(--sg-success)]' : 'text-[var(--sg-danger)]'}`}>
                        {trends.total >= 0 ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}
                        {' '}{trends.total > 0 ? '+' : ''}{trends.total}% vs período anterior
                      </span>
                    )}
                  </span>
                )}
              </div>
              <ExportPDFButton plant={selectedPlant} timeframe={selectedTimeframe} kpis={kpis} puntualidad={puntualidad} />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="h-[120px] animate-pulse bg-[var(--sg-panel-2)]" />
                ))
              ) : (
                <>
                  <DashboardKPICard
                    label="A tiempo"
                    value={kpis.ok}
                    sub="< 30 min"
                    accent="var(--sg-success)"
                    trend={trends.ok}
                  />
                  <DashboardKPICard
                    label="En revisión"
                    value={kpis.warn}
                    sub="30 – 45 min"
                    accent="var(--sg-warn)"
                  />
                  <DashboardKPICard
                    label="Con demora"
                    value={kpis.deny}
                    sub="> 45 min"
                    accent="var(--sg-danger)"
                    trend={trends.deny}
                    trendInverse
                  />
                  <DashboardKPICard
                    label="Anticipado"
                    value={kpis.anticipado ?? 0}
                    sub="Antes de cita"
                    accent="#3b82f6"
                  />
                  <DashboardKPICard
                    label="Total atenciones"
                    value={kpis.total}
                    sub={puntualidad !== null ? `${puntualidad}% a tiempo` : undefined}
                    accent="var(--sg-accent)"
                    trend={trends.total}
                  />
                </>
              )}
            </div>
          </section>

          {/* Chart */}
          <section className="sg-panel p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="sg-font-display text-[16px] font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)]">
                Flujo de acceso — {selectedTimeframe}
              </div>
              {!loading && flowData.length > 0 && (
                <div className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                  {flowData.reduce((s, d) => s + d.ok + d.warn + d.deny, 0)} atenciones
                </div>
              )}
            </div>

            <div className="h-[240px]">
              {loading ? (
                <div className="w-full h-full animate-pulse bg-[var(--sg-panel-2)]" />
              ) : flowData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">
                    Sin datos para este período
                  </span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" debounce={200}>
                  <BarChart data={flowData} barCategoryGap={6}>
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
                    <Bar dataKey="ok" stackId="a" radius={0} maxBarSize={40}>
                      {flowData.map((_, i) => <Cell key={i} fill="var(--sg-success)" fillOpacity={0.85} />)}
                    </Bar>
                    <Bar dataKey="warn" stackId="a" radius={0} maxBarSize={40}>
                      {flowData.map((_, i) => <Cell key={i} fill="var(--sg-warn)" fillOpacity={0.85} />)}
                    </Bar>
                    <Bar dataKey="deny" stackId="a" radius={0} maxBarSize={40}>
                      {flowData.map((_, i) => <Cell key={i} fill="var(--sg-danger)" fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-5 border-t border-[var(--sg-line)] pt-3">
              {[
                { color: "var(--sg-success)", label: "A tiempo (< 30 min)" },
                { color: "var(--sg-warn)",    label: "Revisión (30–45 min)" },
                { color: "var(--sg-danger)",  label: "Con demora (> 45 min)" },
                { color: "#3b82f6",           label: `Anticipado · ${kpis.anticipado ?? 0} atendidos antes de cita` },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sg-muted)]">
                  <span className="h-2.5 w-2.5" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </section>

          {/* Event table */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="sg-slabel">Últimos eventos</div>
              <Link
                href="/historial"
                className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-accent)] transition-colors"
              >
                Ver historial completo →
              </Link>
            </div>
            <div className="sg-panel overflow-x-auto">
              <table className="sg-table min-w-[680px]">
                <thead>
                  <tr>
                    <th>Razón Social</th>
                    <th>Estado</th>
                    <th>Empresa</th>
                    <th>Planta</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={`skel-${i}`}>
                        <td colSpan={5} className="py-3">
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
                  ) : recentEvents.map((e, index) => (
                    <tr key={`${e.time}-${index}`}>
                      <td>
                        <span className="font-semibold text-[13px] text-[var(--sg-ink)] truncate block max-w-[200px]" title={e.plate}>
                          {e.plate}
                        </span>
                      </td>
                      <td>
                        <span className={`sg-badge sg-badge-${e.status}`}>{e.label}</span>
                      </td>
                      <td className="text-[var(--sg-copy)]">{e.info}</td>
                      <td className="sg-mono text-[11px] text-[var(--sg-muted)] tracking-[0.08em]">{e.gate}</td>
                      <td className="sg-mono text-[11px] text-[var(--sg-muted)]">{e.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Timeline del día */}
          <TimelineDia
            events={recentEvents.map(e => ({
              time: e.time,
              plate: e.plate,
              status: e.status,
              label: e.label,
              info: e.info,
              gate: e.gate,
            }))}
          />

          {/* Causas de demora */}
          <CausasTop causas={delayReasons} />

          {/* Heatmap de demoras — últimos 6 meses, agrupado por día × hora */}
          <HeatmapDemoras data={heatmapData} />
        </div>

        {/* ───────── SIDEBAR ───────── */}
        <aside className="flex flex-col gap-4">
          <RankingPlantas
            plantas={zones.map(z => ({
              name: z.name,
              count: z.count,
              pct: z.pct,
              tone: z.tone,
            }))}
          />
        </aside>
      </div>
    </AppLayout>
  );
}
