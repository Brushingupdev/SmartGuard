"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ClientChartFrame from "@/components/ClientChartFrame";
import { formatGateLabelFromPlant, type GateAssignment } from "@/lib/gates";
import type {
  ActivePersonnelRow,
  DashboardAlert,
  DashboardEvent,
  DashboardFlowRow,
  DashboardKpis,
  DashboardZone,
  HeatmapCell,
} from "@/types/dashboard";
import { formatXLabel } from "./dashboardClientUtils";

const HeatmapDemoras = dynamic(() => import("@/components/HeatmapDemoras"), {
  loading: () => <div className="h-[260px] animate-pulse bg-[var(--sg-panel-2)]" />,
});

type DashboardTab = "operation" | "delays" | "activity";

interface DashboardExecutiveOverviewProps {
  selectedTimeframe: string;
  useMonthWeekFlow: boolean;
  selectedLabel: string;
  flowData: DashboardFlowRow[];
  kpis: DashboardKpis;
  delayReasons: { motivo: string; count: number }[];
  recentEvents: DashboardEvent[];
  gateOptions: GateAssignment[];
  alerts: DashboardAlert[];
  zones: DashboardZone[];
  activePersonnel: ActivePersonnelRow[];
  heatmapData: HeatmapCell[];
  loading: boolean;
  onSegmentClick: (bucket?: string) => void;
}

const CHART_GRID = "rgba(196,192,180,0.08)";
const CHART_TICK = {
  fill: "#8b918d",
  fontSize: 11,
  fontFamily: "DM Mono",
};

const TAB_OPTIONS: { id: DashboardTab; label: string }[] = [
  { id: "operation", label: "Operación" },
  { id: "delays", label: "Demoras" },
  { id: "activity", label: "Actividad" },
];

function Panel({
  title,
  subtitle,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`sg-panel min-w-0 overflow-hidden ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-[var(--sg-line)] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon ? <span className="text-[var(--sg-accent)]">{icon}</span> : null}
            <h2 className="sg-font-display text-[15px] font-bold text-[var(--sg-ink)]">
              {title}
            </h2>
          </div>
          {subtitle ? (
            <p className="mt-1 text-[12px] leading-4 text-[var(--sg-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ChartSkeleton() {
  return <div className="h-full w-full animate-pulse bg-[var(--sg-panel-2)]" />;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center">
      <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
        {label}
      </span>
    </div>
  );
}

function statusTone(status: DashboardEvent["status"]) {
  if (status === "ok") return { color: "var(--sg-success)", label: "A tiempo" };
  if (status === "warn") return { color: "var(--sg-warn)", label: "Revisión" };
  if (status === "deny") return { color: "var(--sg-danger)", label: "Con demora" };
  return { color: "var(--sg-info)", label: "En proceso" };
}

export default function DashboardPowerBiOverview({
  selectedTimeframe,
  useMonthWeekFlow,
  selectedLabel,
  flowData,
  kpis,
  delayReasons,
  recentEvents,
  gateOptions,
  alerts,
  zones,
  activePersonnel,
  heatmapData,
  loading,
  onSegmentClick,
}: DashboardExecutiveOverviewProps) {
  const [chartsReady, setChartsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("operation");
  const chartPeriodUnit = useMonthWeekFlow
    ? "semana"
    : selectedTimeframe === "Día"
    ? "hora"
    : selectedTimeframe === "Semana"
      ? "día"
      : selectedTimeframe === "Mes"
        ? "semana"
        : "mes";

  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const volumeData = flowData.map((row) => ({
    ...row,
    label: formatXLabel(row.h, selectedTimeframe),
  }));
  const intervalData = [
    { name: "A tiempo", value: kpis.ok, color: "var(--sg-success)" },
    { name: "Revisión", value: kpis.warn, color: "var(--sg-warn)" },
    { name: "Con demora", value: kpis.deny, color: "var(--sg-danger)" },
    { name: "En proceso", value: kpis.pending, color: "var(--sg-info)" },
  ];
  const intervalTotal = intervalData.reduce((sum, item) => sum + item.value, 0);
  const reasonData = delayReasons.slice(0, 6).map((reason) => ({
    ...reason,
    display: reason.motivo.length > 32 ? `${reason.motivo.slice(0, 32)}…` : reason.motivo,
  }));
  const averageData = volumeData.map((row) => ({ ...row, average: row.avgWait }));
  const rankedZones = zones
    .filter((zone) => zone.name !== "Sin planta")
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);
  const visibleRecords = recentEvents.slice(0, activeTab === "activity" ? 10 : 4);
  const priorityItems = alerts.length > 0
    ? alerts.slice(0, 2)
    : kpis.deny > 0
      ? [{ title: "Demoras críticas", sub: `${kpis.deny} atenciones superan el límite`, tone: "deny" as const }]
      : [{ title: "Operación estable", sub: "No hay alertas críticas para los filtros activos", tone: "ok" as const }];

  return (
    <section className={`space-y-4 ${loading ? "opacity-80" : ""}`} aria-label="Resumen operativo">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.72fr)]">
        <Panel
          title="Flujo de atenciones"
          subtitle={`${selectedLabel} · volumen y estado por ${chartPeriodUnit}`}
          icon={<BarChart3 className="h-4 w-4" />}
          action={
            <span className="hidden text-[11px] text-[var(--sg-muted)] sm:inline">
              Haz clic en una barra
            </span>
          }
        >
          <ClientChartFrame className="h-[270px] min-w-0 px-2 pb-2 pt-3 sm:h-[300px] sm:px-4">
            {(chartSize) => (
              !chartsReady ? (
                <ChartSkeleton />
              ) : volumeData.length === 0 ? (
                <EmptyState label="Sin datos para los filtros activos" />
              ) : (
                <ResponsiveContainer width={chartSize.width} height={chartSize.height} minWidth={0} minHeight={1} debounce={150}>
                  <BarChart data={volumeData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_TICK} interval="preserveStartEnd" />
                    <YAxis axisLine={false} tickLine={false} tick={CHART_TICK} allowDecimals={false} width={34} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--sg-panel)",
                        border: "1px solid var(--sg-line)",
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                      cursor={{ fill: "rgba(200,168,75,0.05)" }}
                    />
                    <Bar dataKey="ok" name="A tiempo" stackId="status" fill="var(--sg-success)" maxBarSize={36} isAnimationActive={false} onClick={(data) => onSegmentClick(data?.payload?.h)} cursor="pointer" />
                    <Bar dataKey="warn" name="Revisión" stackId="status" fill="var(--sg-warn)" maxBarSize={36} isAnimationActive={false} onClick={(data) => onSegmentClick(data?.payload?.h)} cursor="pointer" />
                    <Bar dataKey="deny" name="Con demora" stackId="status" fill="var(--sg-danger)" maxBarSize={36} isAnimationActive={false} onClick={(data) => onSegmentClick(data?.payload?.h)} cursor="pointer" />
                    <Bar dataKey="pending" name="En proceso" stackId="status" fill="var(--sg-info)" maxBarSize={36} radius={[3, 3, 0, 0]} isAnimationActive={false} onClick={(data) => onSegmentClick(data?.payload?.h)} cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
              )
            )}
          </ClientChartFrame>
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--sg-line)] px-4 py-3 sm:px-5">
            {intervalData.map((item) => (
              <span key={item.name} className="flex items-center gap-2 text-[11px] text-[var(--sg-copy)]">
                <span className="h-2 w-2" style={{ background: item.color }} />
                {item.name}
              </span>
            ))}
          </div>
        </Panel>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Panel title="Estado actual" subtitle="Distribución del período seleccionado" icon={<Clock3 className="h-4 w-4" />}>
            <div className="grid min-h-[210px] grid-cols-[140px_minmax(0,1fr)] items-center gap-2 px-3 py-4 sm:grid-cols-[160px_minmax(0,1fr)]">
              <ClientChartFrame className="relative h-[160px] min-w-0">
                {(chartSize) => (
                  !chartsReady ? (
                    <ChartSkeleton />
                  ) : intervalTotal === 0 ? (
                    <EmptyState label="Sin datos" />
                  ) : (
                    <>
                      <ResponsiveContainer width={chartSize.width} height={chartSize.height} minWidth={0} minHeight={1}>
                        <PieChart>
                          <Pie data={intervalData.filter((item) => item.value > 0)} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="var(--sg-panel)" strokeWidth={2} isAnimationActive={false}>
                            {intervalData.filter((item) => item.value > 0).map((item) => <Cell key={item.name} fill={item.color} />)}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [`${Number(value)} registros`, ""]}
                            contentStyle={{ background: "var(--sg-panel)", border: "1px solid var(--sg-line)", borderRadius: 4, fontSize: 11 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <strong className="sg-font-display text-[22px] text-[var(--sg-ink)]">{intervalTotal.toLocaleString()}</strong>
                        <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">registros</span>
                      </div>
                    </>
                  )
                )}
              </ClientChartFrame>
              <div className="space-y-3">
                {intervalData.map((item) => {
                  const pct = intervalTotal > 0 ? Math.round((item.value / intervalTotal) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="flex min-w-0 items-center gap-2 text-[var(--sg-copy)]">
                        <span className="h-2 w-2 shrink-0" style={{ background: item.color }} />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <strong className="sg-font-mono text-[var(--sg-ink)]">{pct}%</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel title="Prioridad ahora" subtitle="Situaciones que requieren seguimiento" icon={<AlertTriangle className="h-4 w-4" />}>
            <div className="divide-y divide-[var(--sg-line)]">
              {priorityItems.map((item, index) => {
                const color = item.tone === "deny" ? "var(--sg-danger)" : item.tone === "warn" ? "var(--sg-warn)" : "var(--sg-success)";
                return (
                  <div key={`${item.title}-${index}`} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                    <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[var(--sg-ink)]">{item.title}</div>
                      <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--sg-muted)]">{item.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-[var(--sg-line)] px-4 py-3 text-right sm:px-5">
              <Link href="/alertas" className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)] hover:underline">
                Ver todas las alertas
              </Link>
            </div>
          </Panel>
        </div>
      </div>

      <div className="sg-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] px-3 sm:px-5">
          <div role="tablist" aria-label="Detalle del dashboard" className="flex min-w-0 overflow-x-auto">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`dashboard-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`dashboard-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-4 py-3 text-[12px] font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "border-[var(--sg-accent)] text-[var(--sg-ink)]"
                    : "border-transparent text-[var(--sg-muted)] hover:text-[var(--sg-copy)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "operation" ? (
          <div id="dashboard-panel-operation" role="tabpanel" aria-labelledby="dashboard-tab-operation" className="grid gap-0 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div className="border-b border-[var(--sg-line)] p-4 sm:p-5 xl:border-b-0 xl:border-r">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[var(--sg-accent)]" />
                <h3 className="text-[13px] font-semibold text-[var(--sg-ink)]">Rendimiento por puerta</h3>
              </div>
              {rankedZones.length === 0 ? (
                <div className="h-[132px]"><EmptyState label="Sin movimiento por puerta" /></div>
              ) : (
                <div className="space-y-3">
                  {rankedZones.map((zone) => {
                    const color = zone.pct >= 90 ? "var(--sg-success)" : zone.pct >= 80 ? "var(--sg-warn)" : "var(--sg-danger)";
                    return (
                      <div key={zone.name} className="grid grid-cols-[minmax(110px,180px)_minmax(0,1fr)_44px] items-center gap-3">
                        <span className="truncate text-[11px] text-[var(--sg-copy)]" title={formatGateLabelFromPlant(zone.name, gateOptions)}>
                          {formatGateLabelFromPlant(zone.name, gateOptions)}
                        </span>
                        <div className="h-2 overflow-hidden bg-[var(--sg-panel-2)]">
                          <div className="h-full" style={{ width: `${Math.max(3, zone.pct)}%`, background: color }} />
                        </div>
                        <strong className="text-right sg-font-mono text-[11px] text-[var(--sg-ink)]">{zone.pct}%</strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-[var(--sg-accent)]" />
                  <h3 className="text-[13px] font-semibold text-[var(--sg-ink)]">Cobertura del turno</h3>
                </div>
                <span className={`flex items-center gap-1.5 text-[11px] ${activePersonnel.length > 0 ? "text-[var(--sg-success)]" : "text-[var(--sg-warn)]"}`}>
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {activePersonnel.length > 0 ? "En vivo" : "Sin cobertura"}
                </span>
              </div>
              {activePersonnel.length === 0 ? (
                <div className="flex items-center gap-3 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(200,168,75,0.1)] text-[var(--sg-warn)]">
                    <UsersRound className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[var(--sg-ink)]">Sin guardias activos</div>
                    <div className="mt-0.5 text-[11px] text-[var(--sg-muted)]">No hay turnos visibles en este momento</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-baseline gap-2">
                    <strong className="sg-font-display text-[26px] text-[var(--sg-ink)]">{activePersonnel.length}</strong>
                    <span className="text-[11px] text-[var(--sg-muted)]">guardias activos</span>
                  </div>
                  <div className="divide-y divide-[var(--sg-line)] border border-[var(--sg-line)]">
                    {activePersonnel.slice(0, 3).map((person) => (
                  <div key={`${person.name}-${person.turn}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="truncate text-[11px] font-medium text-[var(--sg-ink)]">{person.name}</span>
                    <span className="shrink-0 sg-font-mono text-[10px] text-[var(--sg-muted)]">{person.turn}</span>
                  </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "delays" ? (
          <div id="dashboard-panel-delays" role="tabpanel" aria-labelledby="dashboard-tab-delays">
            <div className="grid border-b border-[var(--sg-line)] xl:grid-cols-2">
              <div className="border-b border-[var(--sg-line)] p-4 sm:p-5 xl:border-b-0 xl:border-r">
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--sg-warn)]" />
                  <h3 className="text-[13px] font-semibold text-[var(--sg-ink)]">Principales causas</h3>
                </div>
                <ClientChartFrame className="h-[230px] min-w-0">
                  {(chartSize) => (
                    !chartsReady ? <ChartSkeleton /> : reasonData.length === 0 ? <EmptyState label="Sin causas registradas" /> : (
                      <ResponsiveContainer width={chartSize.width} height={chartSize.height} minWidth={0} minHeight={1}>
                        <BarChart layout="vertical" data={reasonData} margin={{ top: 4, right: 22, left: 8, bottom: 0 }}>
                          <CartesianGrid stroke={CHART_GRID} horizontal={false} />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={CHART_TICK} allowDecimals={false} />
                          <YAxis type="category" dataKey="display" axisLine={false} tickLine={false} tick={CHART_TICK} width={142} />
                          <Tooltip contentStyle={{ background: "var(--sg-panel)", border: "1px solid var(--sg-line)", borderRadius: 4, fontSize: 11 }} />
                          <Bar dataKey="count" name="Frecuencia" fill="var(--sg-warn)" maxBarSize={22} radius={[0, 3, 3, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  )}
                </ClientChartFrame>
              </div>
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[var(--sg-info)]" />
                  <h3 className="text-[13px] font-semibold text-[var(--sg-ink)]">Evolución de la espera</h3>
                </div>
                <ClientChartFrame className="h-[230px] min-w-0">
                  {(chartSize) => (
                    !chartsReady ? <ChartSkeleton /> : averageData.length === 0 ? <EmptyState label="Sin datos de espera" /> : (
                      <ResponsiveContainer width={chartSize.width} height={chartSize.height} minWidth={0} minHeight={1}>
                        <LineChart data={averageData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                          <CartesianGrid stroke={CHART_GRID} vertical={false} />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={CHART_TICK} interval="preserveStartEnd" />
                          <YAxis axisLine={false} tickLine={false} tick={CHART_TICK} unit="m" width={42} />
                          <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} min`, "Promedio"]} contentStyle={{ background: "var(--sg-panel)", border: "1px solid var(--sg-line)", borderRadius: 4, fontSize: 11 }} />
                          <Line type="monotone" dataKey="average" stroke="var(--sg-info)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--sg-info)", strokeWidth: 0 }} connectNulls isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )
                  )}
                </ClientChartFrame>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <HeatmapDemoras data={heatmapData} />
            </div>
          </div>
        ) : null}

        {activeTab === "activity" ? (
          <div id="dashboard-panel-activity" role="tabpanel" aria-labelledby="dashboard-tab-activity" className="flex items-center gap-3 border-b border-[var(--sg-line)] px-4 py-3 sm:px-5">
            <CheckCircle2 className="h-4 w-4 text-[var(--sg-success)]" />
            <p className="text-[11px] text-[var(--sg-copy)]">Mostrando los registros recientes del período seleccionado.</p>
          </div>
        ) : null}

        <div className="border-t border-[var(--sg-line)]">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--sg-ink)]">Últimos registros</h3>
              <p className="mt-0.5 text-[11px] text-[var(--sg-muted)]">Actividad reciente según los filtros activos</p>
            </div>
            <Link href="/historial" className="flex shrink-0 items-center gap-1.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)] hover:underline">
              Ver historial completo <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-y border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-left sg-font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--sg-muted)]">
                  <th className="px-4 py-2.5 font-normal sm:px-5">Hora</th>
                  <th className="px-4 py-2.5 font-normal">Razón social</th>
                  <th className="px-4 py-2.5 font-normal">Puerta</th>
                  <th className="px-4 py-2.5 font-normal">Estado</th>
                  <th className="px-4 py-2.5 text-right font-normal sm:px-5">Espera</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sg-line)]">
                {visibleRecords.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">Sin registros para mostrar</td></tr>
                ) : visibleRecords.map((event, index) => {
                  const tone = statusTone(event.status);
                  return (
                    <tr key={`${event.date ?? "date"}-${event.time}-${index}`} className="transition-colors hover:bg-[var(--sg-panel-2)]">
                      <td className="whitespace-nowrap px-4 py-2.5 sg-font-mono text-[11px] text-[var(--sg-muted)] sm:px-5">{event.time}</td>
                      <td className="max-w-[240px] px-4 py-2.5 text-[12px] font-semibold text-[var(--sg-ink)]"><span className="block truncate">{event.plate}</span></td>
                      <td className="max-w-[190px] px-4 py-2.5 text-[11px] text-[var(--sg-copy)]"><span className="block truncate">{formatGateLabelFromPlant(event.gate, gateOptions)}</span></td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-2 text-[11px]" style={{ color: tone.color }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: tone.color }} /> {tone.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right sg-font-mono text-[11px] text-[var(--sg-ink)] sm:px-5">{event.espera_min == null ? "—" : `${event.espera_min} min`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 text-[10px] text-[var(--sg-muted)]">
        <ShieldCheck className="h-3.5 w-3.5 text-[var(--sg-success)]" />
        Vista {selectedLabel.toLowerCase()} actualizada
      </div>
    </section>
  );
}
