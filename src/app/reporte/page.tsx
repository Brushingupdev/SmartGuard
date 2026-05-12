"use client";

import AppLayout from "@/components/AppLayout";
import { getReporteData, getUserPlants, getAvailableYears, getUserGateOptions, getDashboardTrends } from "@/app/actions";
import DiagnosticoOperativo from "@/components/DiagnosticoOperativo";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatGateLabelFromPlant, groupGatesBySite, type GateAssignment } from "@/lib/gates";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ── Constants ────────────────────────────────────────────────────────────────

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Types ────────────────────────────────────────────────────────────────────

type ReporteData = NonNullable<Awaited<ReturnType<typeof getReporteData>>>;

function exportReporteCSV(data: ReporteData, plant: string, timeframe: string, selectedSegments: string[], soloDemoras: boolean, compareMode?: string) {
  const ts  = new Date().toLocaleDateString("en-CA");
  const bom = "\ufeff";
  const filters: string[] = [];
  if (compareMode && compareMode !== "Todas") filters.push(`Sede: ${compareMode}`);
  if (selectedSegments.length > 0) filters.push(`Segmentos: ${selectedSegments.join(", ")}`);
  if (soloDemoras) filters.push("Solo demoras");
  const filtersLine = filters.length > 0 ? `Filtros: ${filters.join(" | ")}` : "";

  const lines: string[] = [
    `SmartGuard — Reporte Analítico`,
    `Puerta: ${formatGateLabelFromPlant(plant)} | Período: ${timeframe} | Generado: ${ts}`,
    ...(filtersLine ? [filtersLine] : []),
    ``,
    `RESUMEN GENERAL`,
    `Total,A tiempo,Moderado,Alto,Crítico,Pendiente,% A tiempo,Prom. espera (min),Máx. espera (min),P90 (min)`,
    `${data.total},${data.ok},${data.warn},${data.alto},${data.critico},${data.pending},${data.pctOnTime ?? ""},${data.avgEspera},${data.maxEspera},${data.p90Espera}`,
    ``,
    `COMPARATIVO POR PUERTA`,
    `Puerta,Total,A tiempo,Moderado,Alto,Crítico,Pendiente,% A tiempo,Prom. espera (min)`,
    ...data.plantStats.map((p) =>
      `${formatGateLabelFromPlant(p.planta)},${p.total},${p.ok},${p.warn},${p.alto},${p.critico},${p.pending},${p.pctOnTime ?? ""},${p.avg}`
    ),
    ``,
    `EMPRESAS CON MAYOR DEMORA`,
    `Empresa,Demoras,Prom. espera (min),Máx. espera (min)`,
    ...data.topCompanies.map((c) =>
      `"${c.empresa.replace(/"/g, '""')}",${c.count},${c.avgEspera},${c.maxEspera}`
    ),
    ``,
    `SLA DE PROVEEDORES`,
    `Proveedor,Visitas,A tiempo,Demoras,Tasa demora %,Grade,Prom. espera (min)`,
    ...data.providerSLA.map((p) =>
      `"${p.empresa.replace(/"/g, '""')}",${p.total},${p.onTime},${p.delayed},${p.rate}%,${p.grade},${p.avgEspera ?? "N/A"}`
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

function rateColor(rate: number): string {
  if (rate <= 10) return "var(--sg-success)";
  if (rate <= 25) return "var(--sg-warn)";
  if (rate <= 50) return "#e07b3a";
  return "var(--sg-danger)";
}

function GradeBadge({ grade }: { grade: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    A: { bg: "rgba(107,189,138,0.15)", color: "var(--sg-success)" },
    B: { bg: "rgba(107,189,138,0.08)", color: "var(--sg-success)" },
    C: { bg: "rgba(212,134,74,0.15)",  color: "var(--sg-warn)"    },
    D: { bg: "rgba(211,92,79,0.12)",   color: "#e07b3a"           },
    F: { bg: "rgba(211,92,79,0.20)",   color: "var(--sg-danger)"  },
  };
  const s = styles[grade] ?? styles.F;
  return (
    <span
      className="sg-font-mono text-[12px] font-bold px-2 py-0.5 inline-block"
      style={{ background: s.bg, color: s.color }}
    >
      {grade}
    </span>
  );
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

// ── Export dropdown ───────────────────────────────────────────────────────────

function ExportDropdown({ onCSV, excelHref, pdfHref, exporting }: {
  onCSV: () => void;
  excelHref: string;
  pdfHref: string;
  exporting: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={exporting}
        className="flex items-center gap-1.5 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-2.5 py-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        Exportar
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[6px_6px_0_rgba(0,0,0,0.3)] min-w-[140px]">
            <button
              onClick={() => { setOpen(false); onCSV(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:bg-[var(--sg-panel-2)] hover:text-[var(--sg-success)] transition-colors"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              CSV
            </button>
            <a
              href={excelHref}
              download
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:bg-[var(--sg-panel-2)] hover:text-[#22c55e] transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
              Excel
            </a>
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:bg-[var(--sg-panel-2)] hover:text-[#ef4444] transition-colors"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              PDF
            </a>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main content ─────────────────────────────────────────────────────────────

function ReporteContent() {
  const searchParams  = useSearchParams();
  const [plant,          setPlant]          = useState(searchParams.get("plant")     ?? "Todos");
  const [plants,         setPlants]         = useState<string[]>([]);
  const [timeframe,      setTimeframe]      = useState(searchParams.get("timeframe") ?? "Día");
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [soloDemoras,    setSoloDemoras]    = useState(false);
  const [compareMode,    setCompareMode]    = useState<string>("Todas");
  const [data,           setData]           = useState<ReporteData | null>(null);
  const [trends,         setTrends]         = useState({ ok: null as number | null, deny: null as number | null, total: null as number | null, puntualidad: null as number | null });
  const [loading,        setLoading]        = useState(true);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [mounted,   setMounted]   = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [slaSort, setSlaSort]       = useState<{ col: string; dir: "asc" | "desc" }>({ col: "rate", dir: "desc" });
  const [gateOptions, setGateOptions] = useState<GateAssignment[]>([]);
  const siteGroups = useMemo(() => groupGatesBySite(gateOptions), [gateOptions]);
  const sites = useMemo(() => siteGroups.map(s => s.site), [siteGroups]);
  // Si cada sede tiene exactamente 1 puerta, el dropdown de puertas es redundante con los pills
  const showGateDropdown = useMemo(() => siteGroups.some(s => s.gates.length > 1), [siteGroups]);

  const activeFilterCount = selectedSegments.length + (soloDemoras ? 1 : 0);

  const toggleSlaSort = (col: string) =>
    setSlaSort(prev => ({ col, dir: prev.col === col && prev.dir === "desc" ? "asc" : "desc" }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [report, trendsData] = await Promise.all([
        getReporteData(plant, timeframe, selectedSegments, soloDemoras, compareMode),
        getDashboardTrends(plant, timeframe),
      ]);
      setData(report);
      setTrends(trendsData.trend);
    } finally {
      setLoading(false);
    }
  }, [plant, timeframe, selectedSegments, soloDemoras, compareMode]);

  useEffect(() => {
    getUserPlants().then(setPlants);
    getAvailableYears().then(setAvailableYears);
    getUserGateOptions().then(setGateOptions);
  }, []);
  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const [report, trendsData] = await Promise.all([
          getReporteData(plant, timeframe, selectedSegments, soloDemoras, compareMode),
          getDashboardTrends(plant, timeframe),
        ]);
        if (active) {
          setData(report);
          setTrends(trendsData.trend);
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
  }, [plant, timeframe, selectedSegments, soloDemoras, compareMode]);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const d = data;

  const sortedSLA = useMemo(() => {
    if (!d?.providerSLA) return [];
    return [...d.providerSLA].sort((a, b) => {
      type SLAKey = keyof typeof a;
      const va = a[slaSort.col as SLAKey] ?? (typeof a[slaSort.col as SLAKey] === "string" ? "" : -1);
      const vb = b[slaSort.col as SLAKey] ?? (typeof b[slaSort.col as SLAKey] === "string" ? "" : -1);
      const cmp = typeof va === "string" ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
      return slaSort.dir === "desc" ? -cmp : cmp;
    });
  }, [d?.providerSLA, slaSort]);

  return (
    <AppLayout>

      {/* ── Topbar ──────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <div className="h-3.5 w-px bg-[var(--sg-line)]" />
          <div className="sg-kicker">Análisis Detallado</div>

          {/* Site comparison buttons — only shown when company has multiple sites */}
          {sites.length > 1 && (
            <div className="flex items-center bg-[var(--sg-panel-2)] border border-[var(--sg-line)] p-0.5">
              {["Todas", ...sites].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setCompareMode(s);
                    if (s !== "Todas") setPlant("Todos");
                  }}
                  className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                    compareMode === s
                      ? "bg-[var(--sg-ink)] text-[var(--sg-canvas)]"
                      : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Gate filter (dropdown) — solo cuando hay sedes con múltiples puertas */}
          {showGateDropdown && (
            <div className="relative">
              <select
                aria-label="Seleccionar puerta"
                value={plant}
                onChange={(e) => {
                  setPlant(e.target.value);
                  setCompareMode("Todas");
                }}
                disabled={compareMode !== "Todas"}
                className="h-[26px] appearance-none border border-[var(--sg-line)] bg-[var(--sg-panel-2)] pr-6 pl-2.5 text-[10px] uppercase tracking-widest font-bold text-[var(--sg-ink)] outline-none transition-colors hover:border-[var(--sg-accent)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {["Todos", ...plants].map((p) => (
                  <option key={p} value={p} className="bg-[var(--sg-panel)] text-[var(--sg-ink)]">
                    {p === "Todos" ? "Todas las puertas" : formatGateLabelFromPlant(p)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--sg-muted)]" />
            </div>
          )}

          {/* Timeframe filter */}
          <div className="flex items-center bg-[var(--sg-panel-2)] border border-[var(--sg-line)] p-0.5">
            {["Día", "Semana", "Mes"].map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                  timeframe === t
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
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setTimeframe(year)}
                    className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                      timeframe === year
                        ? "bg-[var(--sg-ink)] text-[var(--sg-canvas)]"
                        : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Exportar dropdown */}
          {data && !loading && (
            <ExportDropdown
              onCSV={() => { setExporting(true); exportReporteCSV(data, plant, timeframe, selectedSegments, soloDemoras, compareMode); setExporting(false); }}
              excelHref={`/api/exportar/excel?plant=${encodeURIComponent(plant)}&timeframe=${encodeURIComponent(timeframe)}${selectedSegments.length > 0 ? `&segments=${encodeURIComponent(selectedSegments.join(","))}` : ""}${soloDemoras ? "&soloDemoras=1" : ""}${compareMode !== "Todas" ? `&site=${encodeURIComponent(compareMode)}` : ""}`}
              pdfHref={`/api/exportar/pdf?plant=${encodeURIComponent(plant)}&timeframe=${encodeURIComponent(timeframe)}${selectedSegments.length > 0 ? `&segments=${encodeURIComponent(selectedSegments.join(","))}` : ""}${soloDemoras ? "&soloDemoras=1" : ""}${compareMode !== "Todas" ? `&site=${encodeURIComponent(compareMode)}` : ""}`}
              exporting={exporting}
            />
          )}
          <button
            onClick={load}
            disabled={loading}
            title="Actualizar datos"
            className="flex items-center gap-1.5 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-2.5 py-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
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

      {/* ── Filters row ─────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Segment pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "Normal",    label: "Normal",    color: "var(--sg-success)" },
            { key: "Moderado",  label: "Moderado",  color: "var(--sg-warn)" },
            { key: "Alto",      label: "Alto",      color: "#e07b3a" },
            { key: "Crítico",   label: "Crítico",   color: "var(--sg-danger)" },
            { key: "Pendiente", label: "Pendiente", color: "var(--sg-info)" },
          ].map((seg) => {
            const count = d?.segments.find((s) => s.name === seg.key)?.count ?? 0;
            const isActive = selectedSegments.includes(seg.key);
            return (
              <button
                key={seg.key}
                onClick={() => {
                  setSelectedSegments((prev) =>
                    prev.includes(seg.key)
                      ? prev.filter((s) => s !== seg.key)
                      : [...prev, seg.key]
                  );
                }}
                className={`flex items-center gap-1.5 border px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold transition-colors ${
                  isActive
                    ? "bg-[var(--sg-ink)] text-[var(--sg-canvas)] border-[var(--sg-ink)]"
                    : "border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-muted)] hover:text-[var(--sg-ink)] hover:border-[var(--sg-accent)]"
                }`}
                title={`${seg.label} (${count})`}
              >
                <span className="h-2 w-2 shrink-0" style={{ background: seg.color }} />
                {seg.label}
                <span className="sg-font-mono text-[9px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Solo demoras toggle */}
        <button
          onClick={() => setSoloDemoras((v) => !v)}
          className={`flex items-center gap-1.5 border px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold transition-colors ${
            soloDemoras
              ? "bg-[var(--sg-danger)] text-white border-[var(--sg-danger)]"
              : "border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-muted)] hover:text-[var(--sg-ink)] hover:border-[var(--sg-accent)]"
          }`}
        >
          Solo demoras
        </button>

        {/* Active filters badge + clear */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => { setSelectedSegments([]); setSoloDemoras(false); }}
            className="flex items-center gap-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Limpiar {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""}
          </button>
        )}
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

        {/* ── Diagnóstico Operativo ───────────────────────────────────── */}
        {!loading && d && (
          <DiagnosticoOperativo
            kpis={{
              ok: d.ok,
              warn: d.warn,
              deny: d.alto + d.critico,
              pending: d.pending,
              total: d.total,
            }}
            trends={trends}
            heatmapData={d.heatmap}
            delayReasons={d.delayReasons}
            zones={d.plantStats.map((p) => ({
              name: p.planta,
              count: p.total,
              pct: p.pctOnTime ?? 0,
              tone: ((p.pctOnTime ?? 0) >= 70 ? "ok" : "deny") as "ok" | "deny",
            }))}
            topProvider={
              d.providerSLA.length > 0
                ? {
                    empresa: d.providerSLA[0].empresa,
                    rate: d.providerSLA[0].rate,
                    total: d.providerSLA[0].total,
                    delayed: d.providerSLA[0].delayed,
                  }
                : null
            }
            timeframe={timeframe}
            reporteHref={`/reporte?plant=${encodeURIComponent(plant)}&timeframe=${encodeURIComponent(timeframe)}`}
          />
        )}

        {/* ── Comparativo plantas + Segmentos ─────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Plant comparison */}
          <Section title="Comparativo por Puerta">
            {loading ? <Skel h="h-[220px]" /> : !d ? <EmptyMsg /> : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {d.plantStats.map((p) => (
                  <div key={p.planta} className="sg-panel p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="sg-font-display text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--sg-ink)]">
                        {formatGateLabelFromPlant(p.planta)}
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

        {/* ── Motivos de Demora (full width) ───────────────────────── */}
        <Section title="Motivos de Demora">
          {loading ? (
            <Skel h="h-[280px]" />
          ) : !d || d.delayReasons.length === 0 ? (
            <div className="sg-panel p-5">
              <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-3">
                <div className="sg-font-mono text-[28px] font-bold leading-none text-[var(--sg-danger)]">
                  {d?.topCompanies.reduce((sum, company) => sum + company.count, 0) ?? 0}
                </div>
                <div className="mt-1 sg-font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--sg-muted)]">
                  demoras sin motivo
                </div>
              </div>
              <p className="mt-4 text-[12px] leading-5 text-[var(--sg-copy)]">
                Para que el análisis sea más convincente, conviene registrar motivos estandarizados:
                documentación, almacén, rampa, programación, producción o espera de personal.
              </p>
            </div>
          ) : (
            <div className="sg-panel p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {(() => {
                  const max = Math.max(...d.delayReasons.map((r) => r.count));
                  return d.delayReasons.map((r, i) => (
                    <motion.div
                      key={r.motivo}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                      className="flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[var(--sg-copy)] truncate" title={r.motivo}>
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
                          transition={{ duration: 0.5, ease: easeOut, delay: i * 0.03 }}
                          className="h-[3px] bg-[var(--sg-danger)] opacity-75"
                        />
                      </div>
                    </motion.div>
                  ));
                })()}
              </div>
            </div>
          )}
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
                {d.opTypes.length === 1 && d.opTypes[0]?.tipo.toLowerCase().includes("sin tipo") && (
                  <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-2">
                    <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                      Clasificación pendiente
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-[var(--sg-copy)]">
                      La operación ya está medida, pero falta etiquetar tipo de movimiento para comparar despacho, recepción o visita.
                    </p>
                  </div>
                )}
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

        {/* ── SLA de Proveedores ──────────────────────────────────── */}
        {!loading && d && d.providerSLA.length > 0 && (
          <Section title="SLA de Proveedores" sub="tasa de demora por proveedor · mín. 3 visitas · ordenado por peor tasa">
            <div className="sg-panel overflow-x-auto">
              <table className="sg-table min-w-[600px]">
                <thead>
                  <tr>
                    <th>#</th>
                    {([
                      { col: "empresa",   label: "Proveedor"    },
                      { col: "total",     label: "Visitas"      },
                      { col: "onTime",    label: "A tiempo"     },
                      { col: "delayed",   label: "Demoras"      },
                      { col: "rate",      label: "Tasa demora"  },
                      { col: "grade",     label: "Grade"        },
                      { col: "avgEspera", label: "Prom. espera" },
                    ] as const).map(({ col, label }) => (
                      <th
                        key={col}
                        onClick={() => toggleSlaSort(col)}
                        className="cursor-pointer select-none hover:text-[var(--sg-ink)] transition-colors"
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          <span className="sg-font-mono text-[8px] opacity-60">
                            {slaSort.col === col ? (slaSort.dir === "desc" ? "↓" : "↑") : "↕"}
                          </span>
                        </span>
                      </th>
                    ))}
                    <th title="Tendencia 1ª vs 2ª mitad del período">Tend.</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSLA.map((p, i) => (
                    <motion.tr
                      key={p.empresa}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <td className="sg-mono text-[11px] text-[var(--sg-muted)]">{i + 1}</td>
                      <td>
                        <span className="font-semibold text-[13px] text-[var(--sg-ink)] block truncate max-w-[200px]" title={p.empresa}>
                          {p.empresa}
                        </span>
                      </td>
                      <td>
                        <span className="sg-font-mono text-[12px] text-[var(--sg-copy)]">{p.total}</span>
                      </td>
                      <td>
                        <span className="sg-font-mono text-[12px] text-[var(--sg-success)]">{p.onTime}</span>
                      </td>
                      <td>
                        <span className="sg-font-mono text-[12px] text-[var(--sg-danger)]">{p.delayed}</span>
                      </td>
                      <td>
                        <span className="sg-font-mono text-[14px] font-bold" style={{ color: rateColor(p.rate) }}>
                          {p.rate}%
                        </span>
                      </td>
                      <td><GradeBadge grade={p.grade} /></td>
                      <td>
                        <span className="sg-font-mono text-[12px]" style={{ color: p.avgEspera != null ? esperaColor(p.avgEspera) : "var(--sg-muted)" }}>
                          {p.avgEspera != null ? `${p.avgEspera} min` : "—"}
                        </span>
                      </td>
                      <td><TrendIcon trend={p.trend} /></td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-[var(--sg-line)] px-5 py-3 flex flex-wrap gap-5">
                {[
                  { grade: "A", label: "≤ 10% demora" },
                  { grade: "B", label: "11–25%" },
                  { grade: "C", label: "26–50%" },
                  { grade: "D", label: "51–75%" },
                  { grade: "F", label: "> 75% demora" },
                ].map(g => (
                  <span key={g.grade} className="flex items-center gap-2 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                    <GradeBadge grade={g.grade} />
                    {g.label}
                  </span>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* ── Rendimiento agentes ──────────────────────────────────── */}
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
