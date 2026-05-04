"use client";

import AppLayout from "@/components/AppLayout";
import { getReporteData, getUserPlants, getAvailableYears } from "@/app/actions";
import { motion } from "framer-motion";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

// ── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Types ────────────────────────────────────────────────────────────────────

type ReporteData = NonNullable<Awaited<ReturnType<typeof getReporteData>>>;

function exportReporteCSV(data: ReporteData, plant: string, timeframe: string) {
  const ts  = new Date().toLocaleDateString("en-CA");
  const bom = "﻿";
  const lines: string[] = [
    `SmartGuard — Reporte Analítico`,
    `Planta: ${plant} | Período: ${timeframe} | Generado: ${ts}`,
    ``,
    `RESUMEN GENERAL`,
    `Total,A tiempo,Moderado,Alto,Crítico,Pendiente,% A tiempo,Prom. espera (min),Máx. espera (min),P90 (min)`,
    `${data.total},${data.ok},${data.warn},${data.alto},${data.critico},${data.pending},${data.pctOnTime ?? ""},${data.avgEspera},${data.maxEspera},${data.p90Espera}`,
    ``,
    `COMPARATIVO POR PLANTA`,
    `Planta,Total,A tiempo,Moderado,Alto,Crítico,Pendiente,% A tiempo,Prom. espera (min)`,
    ...data.plantStats.map((p) =>
      `${p.planta},${p.total},${p.ok},${p.warn},${p.alto},${p.critico},${p.pending},${p.pctOnTime ?? ""},${p.avg}`
    ),
    ``,
    `EMPRESAS CON MAYOR DEMORA`,
    `Empresa,Demoras,Prom. espera (min),Máx. espera (min)`,
    ...data.topCompanies.map((c) =>
      `"${c.empresa.replace(/"/g, '""')}",${c.count},${c.avgEspera},${c.maxEspera}`
    ),
    ``,
    `TIPOS DE OPERACIÓN`,
    `Tipo,Total,Con demora,% demora,Prom. espera (min)`,
    ...data.opTypes.map((o) =>
      `"${o.tipo.replace(/"/g, '""')}",${o.count},${o.delayed},${o.pctDelayed},${o.avgEspera}`
    ),
    ...(data.delayReasons.length > 0 ? [
      ``,
      `MOTIVOS DE DEMORA`,
      `Motivo,Cantidad`,
      ...data.delayReasons.map((r) => `"${r.motivo.replace(/"/g, '""')}",${r.count}`),
    ] : []),
    ...(data.agentStats.length > 0 ? [
      ``,
      `RENDIMIENTO DE AGENTES`,
      `Agente,Total,A tiempo,Con demora,Pendiente,% A tiempo,Prom. espera (min)`,
      ...data.agentStats.map((a) =>
        `"${a.agente.replace(/"/g, '""')}",${a.total},${a.ok},${a.delayed},${a.pending},${a.pctOnTime ?? ""},${a.avgEspera ?? ""}`
      ),
    ] : []),
  ];
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `reporte_smartguard_${plant.toLowerCase().replace(/ /g, "_")}_${timeframe.toLowerCase()}_${ts}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatXLabel(v: string, tf: string) {
  if (tf === "Día") return `${v}h`;
  if (/^\d{4}$/.test(tf)) return MONTHS[parseInt(v) - 1] ?? v;
  return `d.${parseInt(v)}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pctColor(pct: number | null) {
  if (pct == null) return "var(--sg-muted)";
  if (pct >= 80)   return "var(--sg-success)";
  if (pct >= 60)   return "var(--sg-warn)";
  return "var(--sg-danger)";
}

function esperaColor(min: number | null) {
  if (min == null) return "var(--sg-muted)";
  if (min < 30)    return "var(--sg-success)";
  if (min < 45)    return "var(--sg-warn)";
  if (min < 90)    return "#e07b3a";
  return "var(--sg-danger)";
}

// ── Small components ─────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up")   return <span className="sg-font-mono text-[11px] font-bold text-[var(--sg-danger)]" title="Empeorando">↑</span>;
  if (trend === "down") return <span className="sg-font-mono text-[11px] font-bold text-[var(--sg-success)]" title="Mejorando">↓</span>;
  return <span className="sg-font-mono text-[11px] text-[var(--sg-muted)]" title="Estable">—</span>;
}

const DAYS_SHORT = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const HOURS_RANGE = Array.from({ length: 14 }, (_, i) => i + 6); // 06..19

function heatColor(rate: number | null): string {
  if (rate === null) return "transparent";
  if (rate === 0)    return "rgba(107,189,138,0.25)";
  if (rate < 20)     return "rgba(107,189,138,0.55)";
  if (rate < 40)     return "rgba(200,168,75,0.55)";
  if (rate < 60)     return "rgba(224,123,58,0.65)";
  return "rgba(211,92,79,0.75)";
}

function HeatmapGrid({ heatmap }: { heatmap: { dow: number; hour: number; total: number; delayed: number; rate: number | null }[] }) {
  const [tooltip, setTooltip] = useState<{ dow: number; hour: number; total: number; rate: number | null } | null>(null);

  const cellMap: Record<string, { total: number; delayed: number; rate: number | null }> = {};
  heatmap.forEach(h => { cellMap[`${h.dow}-${h.hour}`] = { total: h.total, delayed: h.delayed, rate: h.rate }; });

  const hasSomeData = heatmap.length > 0;
  if (!hasSomeData) return <div className="py-10 text-center sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">Sin datos suficientes para el período</div>;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Hour labels */}
        <div className="flex mb-1 ml-10">
          {HOURS_RANGE.map(h => (
            <div key={h} className="flex-1 text-center sg-font-mono text-[9px] text-[var(--sg-muted)]">{h}h</div>
          ))}
        </div>

        {/* Rows: dow 1..6..0 (Mon→Sun) */}
        {[1,2,3,4,5,6,0].map(dow => (
          <div key={dow} className="flex items-center mb-1">
            <div className="w-10 sg-font-mono text-[9px] uppercase text-[var(--sg-muted)] shrink-0">{DAYS_SHORT[dow]}</div>
            {HOURS_RANGE.map(hour => {
              const cell = cellMap[`${dow}-${hour}`];
              const rate = cell?.rate ?? null;
              const total = cell?.total ?? 0;
              return (
                <div
                  key={hour}
                  className="flex-1 mx-px h-7 border border-[var(--sg-line)] cursor-default relative"
                  style={{ background: total > 0 ? heatColor(rate) : "var(--sg-panel-2)" }}
                  onMouseEnter={() => total > 0 && setTooltip({ dow, hour, total, rate })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {tooltip?.dow === dow && tooltip?.hour === hour && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 border border-[var(--sg-accent)] bg-[var(--sg-panel)] px-3 py-2 shadow-lg whitespace-nowrap">
                      <div className="sg-font-mono text-[9px] uppercase text-[var(--sg-muted)] mb-1">{DAYS_SHORT[dow]} · {hour}:00</div>
                      <div className="sg-font-mono text-[12px] font-bold text-[var(--sg-ink)]">{total} registros</div>
                      {rate !== null && (
                        <div className="sg-font-mono text-[11px]" style={{ color: heatColor(rate).replace("0.", "1") }}>
                          {rate}% con demora
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 ml-10">
          <span className="sg-font-mono text-[9px] text-[var(--sg-muted)]">Sin datos</span>
          {[0, 20, 40, 60].map(v => (
            <div key={v} className="flex items-center gap-1">
              <div className="h-3 w-5 border border-[var(--sg-line)]" style={{ background: heatColor(v) }} />
              <span className="sg-font-mono text-[9px] text-[var(--sg-muted)]">{v}%+</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <div className="sg-slabel">{title}</div>
        {sub && (
          <span className="sg-font-mono text-[10px] text-[var(--sg-muted)] opacity-70">{sub}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Skel({ h = "h-[160px]" }: { h?: string }) {
  return <div className={`w-full ${h} animate-pulse bg-[var(--sg-panel-2)]`} />;
}

function EmptyMsg({ text = "Sin datos para este período" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <span className="sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">
        {text}
      </span>
    </div>
  );
}

// ── Recharts custom tooltips ─────────────────────────────────────────────────

interface ChartPayload { dataKey: string; value: number; fill?: string; }

function FlowTip({ active, payload, label, timeframe }: { active?: boolean; payload?: ChartPayload[]; label?: string; timeframe: string }) {
  if (!active || !payload?.length) return null;
  const map: Record<string, string> = { ok: "A tiempo", warn: "Revisión", deny: "Con demora" };
  const col: Record<string, string> = { ok: "var(--sg-success)", warn: "var(--sg-warn)", deny: "var(--sg-danger)" };
  return (
    <div className="border border-[var(--sg-line)] bg-[var(--sg-panel)] px-3 py-2 shadow-lg text-[11px]">
      <div className="sg-slabel mb-1.5">{formatXLabel(label ?? "", timeframe)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-5">
          <span className="flex items-center gap-1.5 text-[var(--sg-copy)]">
            <span className="h-1.5 w-1.5" style={{ background: col[p.dataKey] }} />
            {map[p.dataKey]}
          </span>
          <span className="sg-font-mono text-[var(--sg-ink)]">{p.value}</span>
        </div>
      ))}
      <div className="mt-1.5 border-t border-[var(--sg-line)] pt-1.5 flex justify-between text-[10px]">
        <span className="text-[var(--sg-muted)]">Total</span>
        <span className="sg-font-mono text-[var(--sg-ink)]">
          {payload.reduce((s, p) => s + (p.value ?? 0), 0)}
        </span>
      </div>
    </div>
  );
}

function TrendTip({ active, payload, label }: { active?: boolean; payload?: ChartPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const labelMap: Record<string, string> = { onTime: "A tiempo", delayed: "Con demora" };
  return (
    <div className="border border-[var(--sg-line)] bg-[var(--sg-panel)] px-3 py-2 shadow-lg text-[11px]">
      <div className="sg-slabel mb-1.5">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-5">
          <span className="flex items-center gap-1.5 text-[var(--sg-copy)]">
            <span className="h-1.5 w-1.5" style={{ background: p.fill }} />
            {labelMap[p.dataKey] ?? p.dataKey}
          </span>
          <span className="sg-font-mono text-[var(--sg-ink)]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main content ─────────────────────────────────────────────────────────────

function ReporteContent() {
  const searchParams  = useSearchParams();
  const [plant,          setPlant]          = useState(searchParams.get("plant")     ?? "Todos");
  const [plants,         setPlants]         = useState<string[]>([]);
  const [timeframe,      setTimeframe]      = useState(searchParams.get("timeframe") ?? "Día");
  const [data,           setData]           = useState<ReporteData | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [mounted,   setMounted]   = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getReporteData(plant, timeframe));
    } finally {
      setLoading(false);
    }
  }, [plant, timeframe]);

  useEffect(() => { getUserPlants().then(setPlants); getAvailableYears().then(setAvailableYears); }, []);
  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const report = await getReporteData(plant, timeframe);
        if (active) {
          setData(report);
          setLoading(false);
        }
      } catch {
        if (active) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [plant, timeframe]);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const d = data;

  return (
    <AppLayout>

      {/* ── Topbar ──────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <div className="h-3.5 w-px bg-[var(--sg-line)]" />
          <div className="sg-kicker">Análisis Detallado</div>

          {/* Plant filter */}
          <div className="flex bg-[var(--sg-panel-2)] border border-[var(--sg-line)] p-0.5">
            {["Todos", ...plants].map(p => (
              <button
                key={p}
                onClick={() => setPlant(p)}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                  plant === p
                    ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]"
                    : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Timeframe filter */}
          <div className="flex bg-[var(--sg-panel-2)] border border-[var(--sg-line)] p-0.5">
            {["Día", "Semana", "Mes", ...availableYears].map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                  timeframe === t
                    ? "bg-[var(--sg-ink)] text-[var(--sg-canvas)]"
                    : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data && !loading && (
            <button
              onClick={() => { setExporting(true); exportReporteCSV(data, plant, timeframe); setExporting(false); }}
              disabled={exporting}
              className="flex items-center gap-2 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-1.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-success)] hover:text-[var(--sg-success)] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
          >
            <motion.span
              animate={loading ? { rotate: 360 } : { rotate: 0 }}
              transition={loading ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </motion.span>
            Actualizar
          </button>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────── */}
      <motion.div
        key={plant + timeframe}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        {[
          { label: "Total atenciones", val: d?.total,      color: "var(--sg-ink)",                         suffix: ""     },
          { label: "% A tiempo",       val: d?.pctOnTime != null ? `${d.pctOnTime}%` : "—",
                                                           color: pctColor(d?.pctOnTime ?? null),            suffix: ""     },
          { label: "Espera promedio",  val: d?.avgEspera,  color: esperaColor(d?.avgEspera ?? null),        suffix: " min" },
          { label: "Espera máxima",    val: d?.maxEspera,  color: esperaColor(d?.maxEspera ?? null),        suffix: " min" },
          { label: "Percentil 90",     val: d?.p90Espera,  color: esperaColor(d?.p90Espera ?? null),        suffix: " min" },
          { label: "Pendientes",       val: d?.pending,    color: "var(--sg-info)",                         suffix: ""     },
        ].map(k => (
          <div key={k.label} className="sg-panel p-4 flex flex-col gap-1">
            <div>
              <span className="sg-font-mono text-[26px] font-bold leading-none" style={{ color: k.color }}>
                {loading ? "—" : (k.val ?? "—")}
              </span>
              {!loading && k.val != null && k.suffix && (
                <span className="sg-font-mono text-[14px] ml-1 text-[var(--sg-muted)]">{k.suffix}</span>
              )}
            </div>
            <div className="sg-font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--sg-muted)] mt-1">
              {k.label}
            </div>
          </div>
        ))}
      </motion.div>

      <div className="flex flex-col gap-6">

        {/* ── Comparativo plantas + Segmentos ─────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Plant comparison */}
          <Section title="Comparativo por Planta">
            {loading ? <Skel h="h-[220px]" /> : !d ? <EmptyMsg /> : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {d.plantStats.map((p) => (
                  <div key={p.planta} className="sg-panel p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="sg-font-display text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--sg-ink)]">
                        {p.planta}
                      </span>
                      <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                        {p.total} registros
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        { label: "A tiempo",  val: p.ok,      color: "var(--sg-success)" },
                        { label: "Moderado",  val: p.warn,    color: "var(--sg-warn)"    },
                        { label: "Alto",      val: p.alto,    color: "#e07b3a"            },
                        { label: "Crítico",   val: p.critico, color: "var(--sg-danger)"  },
                      ].map(item => (
                        <div key={item.label} className="bg-[var(--sg-panel-2)] px-3 py-2.5">
                          <div className="sg-font-mono text-[18px] font-bold" style={{ color: item.color }}>
                            {item.val}
                          </div>
                          <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] mt-0.5">
                            {item.label}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-1.5 border-t border-[var(--sg-line)] pt-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--sg-muted)]">Espera promedio</span>
                        <span className="sg-font-mono font-bold" style={{ color: esperaColor(p.avg) }}>
                          {p.avg} min
                        </span>
                      </div>
                      {p.pctOnTime !== null && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[var(--sg-muted)]">% a tiempo</span>
                          <span className="sg-font-mono font-bold" style={{ color: pctColor(p.pctOnTime) }}>
                            {p.pctOnTime}%
                          </span>
                        </div>
                      )}
                      {p.pending > 0 && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[var(--sg-muted)]">Pendientes</span>
                          <span className="sg-font-mono text-[var(--sg-info)]">{p.pending}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Segment distribution */}
          <Section title="Distribución por Segmento">
            {loading ? <Skel h="h-[220px]" /> : !d ? <EmptyMsg /> : (
              <div className="sg-panel p-5 flex flex-col justify-between h-full min-h-[220px]">
                <div className="flex flex-col gap-4">
                  {d.segments.map((s) => (
                    <div key={s.name}>
                      <div className="flex items-center justify-between text-[12px] mb-1.5">
                        <span className="flex items-center gap-2 text-[var(--sg-copy)]">
                          <span className="h-2 w-2 shrink-0" style={{ background: s.color }} />
                          <span className="font-medium">{s.name}</span>
                          <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">{s.range}</span>
                        </span>
                        <span className="sg-font-mono text-[var(--sg-ink)]">
                          {s.count}
                          <span className="text-[var(--sg-muted)] ml-1">({s.pct}%)</span>
                        </span>
                      </div>
                      <div className="h-[5px] bg-[var(--sg-line)]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.pct}%` }}
                          transition={{ duration: 0.65, ease: easeOut }}
                          className="h-[5px]"
                          style={{ background: s.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* ── Flujo temporal (full width) ──────────────────────────── */}
        <Section title={`Flujo de Acceso — ${timeframe}`}>
          <div className="sg-panel p-5">
            <div className="h-[280px]">
              {loading ? (
                <Skel h="h-full" />
              ) : !d || d.flowData.length === 0 ? (
                <EmptyMsg />
              ) : mounted && (
                <ResponsiveContainer width="100%" height="100%" debounce={200}>
                  <BarChart data={d.flowData} barCategoryGap={6}>
                    <CartesianGrid stroke="rgba(196,192,180,0.06)" vertical={false} />
                    <XAxis
                      dataKey="h"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6a706c", fontSize: 10, fontFamily: "DM Mono" }}
                      tickFormatter={v => formatXLabel(v, timeframe)}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6a706c", fontSize: 10, fontFamily: "DM Mono" }}
                      width={28}
                      allowDecimals={false}
                    />
                    <Tooltip content={<FlowTip timeframe={timeframe} />} cursor={{ fill: "rgba(196,192,180,0.04)" }} />
                    <Bar dataKey="ok"   stackId="a" maxBarSize={44} radius={0}>
                      {d.flowData.map((_, i) => <Cell key={i} fill="var(--sg-success)" fillOpacity={0.85} />)}
                    </Bar>
                    <Bar dataKey="warn" stackId="a" maxBarSize={44} radius={0}>
                      {d.flowData.map((_, i) => <Cell key={i} fill="var(--sg-warn)" fillOpacity={0.85} />)}
                    </Bar>
                    <Bar dataKey="deny" stackId="a" maxBarSize={44} radius={0}>
                      {d.flowData.map((_, i) => <Cell key={i} fill="var(--sg-danger)" fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-3 flex gap-5 border-t border-[var(--sg-line)] pt-3">
              {[
                { color: "var(--sg-success)", label: "A tiempo (< 30 min)" },
                { color: "var(--sg-warn)",    label: "Revisión (30–45 min)" },
                { color: "var(--sg-danger)",  label: "Con demora (> 45 min)" },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sg-muted)]">
                  <span className="h-2.5 w-2.5" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Tendencia diaria (solo multi-día) ───────────────────── */}
        {!loading && d && d.trendData.length > 1 && timeframe !== "Día" && (
          <Section title="Tendencia Diaria" sub="a tiempo vs. con demora (≥ 30 min)">
            <div className="sg-panel p-5">
              <div className="h-[220px]">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%" debounce={200}>
                    <BarChart data={d.trendData} barCategoryGap={4}>
                      <CartesianGrid stroke="rgba(196,192,180,0.06)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6a706c", fontSize: 10, fontFamily: "DM Mono" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#6a706c", fontSize: 10, fontFamily: "DM Mono" }}
                        width={28}
                        allowDecimals={false}
                      />
                      <Tooltip content={<TrendTip />} cursor={{ fill: "rgba(196,192,180,0.04)" }} />
                      <Bar dataKey="onTime"  stackId="t" fill="var(--sg-success)" fillOpacity={0.8} maxBarSize={44} radius={0} />
                      <Bar dataKey="delayed" stackId="t" fill="var(--sg-danger)"  fillOpacity={0.8} maxBarSize={44} radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-3 flex gap-5 border-t border-[var(--sg-line)] pt-3">
                {[
                  { color: "var(--sg-success)", label: "A tiempo" },
                  { color: "var(--sg-danger)",  label: "Con demora" },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sg-muted)]">
                    <span className="h-2.5 w-2.5" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* ── Heatmap: Patrones horarios ──────────────────────────── */}
        <Section title="Patrones de Demora por Hora y Día" sub="horas 06–19 · celdas con ≥3 registros">
          <div className="sg-panel p-5">
            {loading ? <Skel h="h-[200px]" /> : !d ? <EmptyMsg /> : (
              <HeatmapGrid heatmap={d.heatmap ?? []} />
            )}
          </div>
        </Section>

        {/* ── Top empresas + Tipos de operación ───────────────────── */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

          {/* Top companies */}
          <Section title="Empresas con Mayor Demora" sub="espera ≥ 30 min · top 10">
            <div className="sg-panel overflow-x-auto">
              {loading ? (
                <Skel h="h-[220px]" />
              ) : !d || d.topCompanies.length === 0 ? (
                <div className="p-8"><EmptyMsg text="Sin demoras registradas" /></div>
              ) : (
                <table className="sg-table min-w-[480px]">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Empresa</th>
                      <th>Demoras</th>
                      <th>Prom. espera</th>
                      <th>Máx. espera</th>
                      <th title="Tendencia 1ª vs 2ª mitad del período">Tendencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.topCompanies.map((c, i) => (
                      <motion.tr
                        key={c.empresa}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <td className="sg-mono text-[11px] text-[var(--sg-muted)]">{i + 1}</td>
                        <td>
                          <span
                            className="font-semibold text-[13px] text-[var(--sg-ink)] block truncate max-w-[200px]"
                            title={c.empresa}
                          >
                            {c.empresa}
                          </span>
                        </td>
                        <td>
                          <span className="sg-font-mono text-[14px] font-bold text-[var(--sg-danger)]">
                            {c.count}
                          </span>
                        </td>
                        <td>
                          <span className="sg-font-mono text-[12px]" style={{ color: esperaColor(c.avgEspera) }}>
                            {c.avgEspera} min
                          </span>
                        </td>
                        <td>
                          <span className="sg-font-mono text-[12px]" style={{ color: esperaColor(c.maxEspera) }}>
                            {c.maxEspera} min
                          </span>
                        </td>
                        <td><TrendIcon trend={c.trend ?? "stable"} /></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Section>

          {/* Operation types */}
          <Section title="Tipos de Operación">
            {loading ? (
              <Skel h="h-[220px]" />
            ) : !d || d.opTypes.length === 0 ? (
              <EmptyMsg />
            ) : (
              <div className="sg-panel p-4 flex flex-col gap-3.5">
                {d.opTypes.map((op) => (
                  <div key={op.tipo} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[var(--sg-copy)] truncate max-w-[160px]" title={op.tipo}>
                        {op.tipo}
                      </span>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                          {op.count} registros
                        </span>
                        {op.pctDelayed > 0 && (
                          <span className="sg-font-mono text-[11px] font-bold" style={{ color: pctColor(100 - op.pctDelayed) }}>
                            {op.pctDelayed}% demora
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Proportional bar: green = on-time, red = delayed */}
                    <div className="flex h-[5px] overflow-hidden gap-px">
                      <div
                        className="h-full bg-[var(--sg-success)] opacity-80 transition-all duration-500"
                        style={{ flex: Math.max(op.count - op.delayed, 0) }}
                      />
                      {op.delayed > 0 && (
                        <div
                          className="h-full bg-[var(--sg-danger)] opacity-80 transition-all duration-500"
                          style={{ flex: op.delayed }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Motivos de demora + Rendimiento agentes ──────────────── */}
        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">

          {/* Delay reasons */}
          <Section title="Motivos de Demora">
            {loading ? (
              <Skel h="h-[200px]" />
            ) : !d || d.delayReasons.length === 0 ? (
              <div className="sg-panel p-5">
                <EmptyMsg text="Sin motivos registrados" />
              </div>
            ) : (
              <div className="sg-panel p-4 flex flex-col gap-3">
                {(() => {
                  const max = Math.max(...d.delayReasons.map((r) => r.count));
                  return d.delayReasons.map((r, i) => (
                    <motion.div
                      key={r.motivo}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      className="flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[var(--sg-copy)] truncate max-w-[190px]" title={r.motivo}>
                          {r.motivo}
                        </span>
                        <span className="sg-font-mono text-[11px] text-[var(--sg-ink)] shrink-0 ml-2">
                          {r.count}
                        </span>
                      </div>
                      <div className="h-[3px] bg-[var(--sg-line)]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(r.count / max) * 100}%` }}
                          transition={{ duration: 0.5, ease: easeOut, delay: i * 0.04 }}
                          className="h-[3px] bg-[var(--sg-danger)] opacity-75"
                        />
                      </div>
                    </motion.div>
                  ));
                })()}
              </div>
            )}
          </Section>

          {/* Agent stats */}
          <Section title="Rendimiento de Agentes" sub="top 10 por volumen">
            <div className="sg-panel overflow-x-auto">
              {loading ? (
                <Skel h="h-[200px]" />
              ) : !d || d.agentStats.length === 0 ? (
                <div className="p-8"><EmptyMsg text="Sin datos de agentes" /></div>
              ) : (
                <table className="sg-table min-w-[560px]">
                  <thead>
                    <tr>
                      <th>Agente</th>
                      <th>Total</th>
                      <th>A tiempo</th>
                      <th>Con demora</th>
                      <th>% a tiempo</th>
                      <th>Prom. espera</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.agentStats.map((a, i) => (
                      <motion.tr
                        key={a.agente}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <td>
                          <span className="font-semibold text-[13px] text-[var(--sg-ink)]">
                            {a.agente}
                          </span>
                          {a.pending > 0 && (
                            <span className="sg-font-mono text-[9px] ml-2 text-[var(--sg-info)]">
                              +{a.pending} pend.
                            </span>
                          )}
                        </td>
                        <td className="sg-mono text-[12px] text-[var(--sg-copy)]">{a.total}</td>
                        <td>
                          <span className="sg-mono text-[12px] text-[var(--sg-success)]">{a.ok}</span>
                        </td>
                        <td>
                          <span className="sg-mono text-[12px] text-[var(--sg-danger)]">{a.delayed}</span>
                        </td>
                        <td>
                          {a.pctOnTime !== null ? (
                            <span className="sg-font-mono text-[12px] font-bold" style={{ color: pctColor(a.pctOnTime) }}>
                              {a.pctOnTime}%
                            </span>
                          ) : (
                            <span className="text-[var(--sg-muted)]">—</span>
                          )}
                        </td>
                        <td>
                          {a.avgEspera !== null ? (
                            <span className="sg-mono text-[12px]" style={{ color: esperaColor(a.avgEspera) }}>
                              {a.avgEspera} min
                            </span>
                          ) : (
                            <span className="text-[var(--sg-muted)]">—</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Section>
        </div>

      </div>
    </AppLayout>
  );
}

// ── Page export with Suspense boundary for useSearchParams ───────────────────

export default function ReportePage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex items-center gap-3 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-5 py-4">
              <span className="sg-live-dot sg-pulse" />
              <span className="sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-accent)]">
                Cargando análisis…
              </span>
            </div>
          </div>
        </AppLayout>
      }
    >
      <ReporteContent />
    </Suspense>
  );
}
