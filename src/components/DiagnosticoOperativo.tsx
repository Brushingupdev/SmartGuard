"use client";

import { useState } from "react";
import Link from "next/link";
import { X, TrendingUp, TrendingDown, Minus, Clock, AlertTriangle, BarChart2, GitBranch, Truck } from "lucide-react";
import type { HeatmapCell, DashboardKpis, DashboardZone, DashboardTopProvider } from "@/types/dashboard";

const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type InsightTone = "ok" | "warn" | "danger" | "neutral";

interface InsightModal {
  what: string;       // qué significa este indicador
  why: string;        // por qué importa
  how: string;        // qué hacer
}

interface Insight {
  id: string;
  tone: InsightTone;
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  modal: InsightModal;
  action?: { text: string; href: string };
}

interface DiagnosticoProps {
  kpis: DashboardKpis;
  trends: { ok: number | null; deny: number | null; total: number | null; puntualidad: number | null };
  heatmapData: HeatmapCell[];
  delayReasons: { motivo: string; count: number }[];
  zones: DashboardZone[];
  topProvider?: DashboardTopProvider | null;
  timeframe: string;
  reporteHref: string;
}

function toneAccent(tone: InsightTone): string {
  if (tone === "ok")     return "var(--sg-success)";
  if (tone === "warn")   return "var(--sg-warn)";
  if (tone === "danger") return "var(--sg-danger)";
  return "var(--sg-muted)";
}

function toneSoft(tone: InsightTone): string {
  if (tone === "ok")     return "rgba(107,189,138,0.05)";
  if (tone === "warn")   return "rgba(212,134,74,0.05)";
  if (tone === "danger") return "rgba(211,92,79,0.05)";
  return "transparent";
}

function computeInsights(props: DiagnosticoProps): Insight[] {
  const { trends, heatmapData, delayReasons, zones, kpis, reporteHref } = props;
  const insights: Insight[] = [];

  // ── 1. Tendencia de demoras ────────────────────────────────────────────────
  const v = trends.deny;
  if (v != null) {
    const tone: InsightTone = v > 30 ? "danger" : v > 5 ? "warn" : v < -10 ? "ok" : "neutral";
    insights.push({
      id: "tendencia", tone, icon: v < 0 ? TrendingDown : v > 5 ? TrendingUp : Minus,
      label: "Tendencia demoras",
      value: `${v > 0 ? "+" : ""}${v}%`,
      detail: v > 30
        ? "Aumento crítico vs período anterior."
        : v > 5 ? "Leve aumento vs período anterior."
        : v < -10 ? "Reducción sostenida — tendencia positiva."
        : "Demoras estables vs período anterior.",
      modal: {
        what: "Compara el porcentaje de vehículos con demora en el período actual contra el período anterior de igual duración.",
        why: v > 30
          ? "Un aumento mayor al 30% indica un deterioro operativo significativo que requiere acción inmediata."
          : v > 5
          ? "Un incremento moderado puede escalar si no se identifica la causa raíz."
          : v < -10
          ? "Una reducción sostenida confirma que las acciones correctivas están funcionando."
          : "La operación está estable. Mantén los procesos actuales.",
        how: v > 5
          ? "Revisa si cambió algún factor: proveedor nuevo, turno, horario pico, o proceso interno. Usa el heatmap para identificar franjas críticas."
          : "Continúa monitoreando. Establece alertas automáticas si supera el 10%.",
      },
      action: { text: "Ver reporte", href: reporteHref },
    });
  }

  // ── 2. Hora pico histórica ────────────────────────────────────────────────
  const cells = heatmapData.filter(c => c.total >= 5 && c.rate !== null);
  if (cells.length > 0) {
    const peak = cells.reduce((a, b) => ((b.rate ?? 0) > (a.rate ?? 0) ? b : a));
    const tone: InsightTone = (peak.rate ?? 0) >= 60 ? "danger" : (peak.rate ?? 0) >= 35 ? "warn" : "neutral";
    insights.push({
      id: "hora-pico", tone, icon: Clock,
      label: "Hora pico histórica",
      value: `${DOW[peak.dow]} ${peak.hour}h`,
      detail: `${peak.rate}% de demora histórica · ${peak.total} registros en esa franja.`,
      modal: {
        what: `El ${DOW[peak.dow]} a las ${peak.hour}:00 h es la franja horaria con mayor tasa de demora histórica (${peak.rate}% sobre ${peak.total} registros).`,
        why: (peak.rate ?? 0) >= 60
          ? "Más de la mitad de los vehículos que llegan en esa franja terminan con demora. Es el cuello de botella más predecible de la operación."
          : (peak.rate ?? 0) >= 35
          ? "Un tercio de los vehículos en esa franja sufren demora. Con anticipación se puede reducir."
          : "La franja tiene cierta concentración de demoras pero es manejable.",
        how: `Refuerza la capacidad operativa los ${DOW[peak.dow]} entre las ${peak.hour}:00 y ${peak.hour + 1}:00 h: más personal de almacén disponible, rampas libres y procesos de documentación pre-aprobados.`,
      },
      action: { text: "Ver heatmap", href: reporteHref },
    });
  }

  // ── 3. Concentración Pareto ───────────────────────────────────────────────
  const totalDelays = kpis.deny + kpis.warn;
  if (totalDelays > 0 && delayReasons.length > 0) {
    const top = delayReasons[0];
    const pct = Math.round((top.count / totalDelays) * 100);
    const tone: InsightTone = pct >= 60 ? "danger" : pct >= 40 ? "warn" : "neutral";
    const name = top.motivo.length > 24 ? top.motivo.slice(0, 24) + "…" : top.motivo;
    insights.push({
      id: "pareto", tone, icon: BarChart2,
      label: "Concentración demoras",
      value: `${pct}%`,
      detail: `"${name}" explica el ${pct}% del total de demoras del período.`,
      modal: {
        what: `El motivo "${top.motivo}" es responsable de ${top.count} demoras, representando el ${pct}% del total (${totalDelays}) en el período.`,
        why: pct >= 60
          ? "Concentración crítica: más de la mitad de las demoras tienen una sola causa. Resolverla tendría impacto inmediato en los KPIs."
          : pct >= 40
          ? "Una causa explica casi la mitad de los problemas. Aplicar el principio de Pareto aquí es de alto impacto."
          : "La operación tiene demoras distribuidas. No hay una causa dominante.",
        how: pct >= 40
          ? `Prioriza eliminar "${top.motivo}": investiga si es un problema de infraestructura, proceso o proveedor específico. Define un plan de acción con responsable y fecha límite.`
          : "Analiza el top 3 de causas en conjunto. Puede que varias causas tengan el mismo origen raíz.",
      },
      action: { text: "Ver causas", href: reporteHref },
    });
  }

  // ── 4. Brecha entre puertas ───────────────────────────────────────────────
  if (zones.length >= 2) {
    const sorted = [...zones].sort((a, b) => b.pct - a.pct);
    const best  = sorted[0];
    const worst = sorted[sorted.length - 1];
    const gap   = best.pct - worst.pct;
    const tone: InsightTone = gap >= 30 ? "danger" : gap >= 15 ? "warn" : "ok";
    const wName = worst.name.length > 18 ? worst.name.slice(0, 18) + "…" : worst.name;
    const bName = best.name.length  > 18 ? best.name.slice(0, 18)  + "…" : best.name;
    insights.push({
      id: "brecha", tone, icon: GitBranch,
      label: "Brecha operativa",
      value: `${gap} pts`,
      detail: gap >= 15
        ? `${wName} está ${gap} pts por debajo de ${bName}.`
        : "Puertas operando de forma homogénea.",
      modal: {
        what: `Diferencia de puntualidad entre la mejor puerta (${best.name}: ${best.pct}% a tiempo) y la peor (${worst.name}: ${worst.pct}% a tiempo).`,
        why: gap >= 30
          ? "Una brecha mayor a 30 puntos indica desigualdad operativa severa. La puerta con menor rendimiento está afectando los KPIs globales desproporcionadamente."
          : gap >= 15
          ? "Una brecha de 15-30 puntos sugiere diferencias en capacidad, personal o flujo entre puertas. Es corregible con ajustes operativos."
          : "Las puertas operan de forma homogénea. La variación es normal y no requiere acción.",
        how: gap >= 15
          ? `Analiza qué tiene ${best.name} que no tiene ${worst.name}: ¿más personal?, ¿mejor infraestructura?, ¿menos volumen?. Replica las mejores prácticas de la puerta líder.`
          : "Mantén el equilibrio actual. Revisa mensualmente que la brecha no supere los 15 puntos.",
      },
      action: gap >= 15 ? { text: "Ver comparativa", href: reporteHref } : undefined,
    });
  }

  // ── 5. Proveedor más crítico ──────────────────────────────────────────────
  const tp = props.topProvider;
  if (tp) {
    const tone: InsightTone = tp.rate >= 75 ? "danger" : tp.rate >= 50 ? "warn" : "neutral";
    const nombre = tp.empresa.length > 22 ? tp.empresa.slice(0, 22) + "…" : tp.empresa;
    insights.push({
      id: "proveedor", tone, icon: Truck,
      label: "Proveedor más crítico",
      value: `${tp.rate}%`,
      detail: `"${nombre}" llega tarde en ${tp.rate}% de sus ${tp.total} visitas del período.`,
      modal: {
        what: `"${tp.empresa}" es el proveedor con mayor tasa de demora: ${tp.delayed} de ${tp.total} visitas en el período tuvieron espera superior a 30 minutos.`,
        why: tp.rate >= 75
          ? "Una tasa de demora mayor al 75% indica un patrón sistemático, no casos aislados. Este proveedor genera una carga operativa desproporcionada."
          : tp.rate >= 50
          ? "Más de la mitad de las visitas de este proveedor generan demora. Puede estar afectando la disponibilidad de rampas para otros proveedores."
          : "El proveedor tiene una tasa de demora notable pero dentro de un rango manejable.",
        how: tp.rate >= 50
          ? `Comunica formalmente a "${tp.empresa}" sus métricas de puntualidad. Propón un SLA con penalidades por incumplimiento. Verifica si el problema es de horario de llegada, documentación o proceso interno.`
          : "Monitorea durante el próximo período. Si la tasa no mejora, inicia una conversación con el proveedor sobre sus procesos de despacho.",
      },
      action: { text: "Ver SLA", href: reporteHref },
    });
  }

  return insights;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function InsightModal({ insight, onClose }: { insight: Insight; onClose: () => void }) {
  const accent = toneAccent(insight.tone);
  const Icon = insight.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[8px_8px_0_rgba(0,0,0,0.4)]"
        style={{ borderTopColor: accent, borderTopWidth: 2 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--sg-line)]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-[var(--sg-line)]" style={{ background: toneSoft(insight.tone) }}>
              <Icon className="h-4 w-4" style={{ color: accent }} />
            </div>
            <div>
              <div className="sg-font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: accent }}>
                {insight.label}
              </div>
              <div className="sg-font-mono text-[28px] font-bold leading-none text-[var(--sg-ink)] mt-0.5">
                {insight.value}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <div>
            <div className="sg-font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--sg-muted)] mb-1.5">
              Qué mide
            </div>
            <p className="text-[13px] leading-5 text-[var(--sg-copy)]">{insight.modal.what}</p>
          </div>
          <div className="border-t border-[var(--sg-line)] pt-4">
            <div className="sg-font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--sg-muted)] mb-1.5">
              Por qué importa
            </div>
            <p className="text-[13px] leading-5 text-[var(--sg-copy)]">{insight.modal.why}</p>
          </div>
          <div className="border-t border-[var(--sg-line)] pt-4">
            <div className="sg-font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--sg-muted)] mb-1.5">
              Qué hacer
            </div>
            <p className="text-[13px] leading-5 text-[var(--sg-copy)]">{insight.modal.how}</p>
          </div>
        </div>

        {/* Footer */}
        {insight.action && (
          <div className="flex items-center justify-end gap-3 border-t border-[var(--sg-line)] px-5 py-3">
            <button
              onClick={onClose}
              className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
            >
              Cerrar
            </button>
            <Link
              href={insight.action.href}
              onClick={onClose}
              className="sg-font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-[var(--sg-accent)] text-[var(--sg-accent)] hover:bg-[var(--sg-accent)] hover:text-[var(--sg-canvas)] transition-colors"
            >
              {insight.action.text} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DiagnosticoOperativo(props: DiagnosticoProps) {
  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);

  const insights = computeInsights(props);
  const signals  = insights.filter(i => i.tone !== "neutral").length;

  const colClass = insights.length >= 5 ? "xl:grid-cols-5"
    : insights.length === 4 ? "xl:grid-cols-4"
    : insights.length === 3 ? "xl:grid-cols-3"
    : insights.length === 2 ? "xl:grid-cols-2"
    : "xl:grid-cols-1";

  return (
    <>
      <div className="sg-panel p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
              Diagnóstico Operativo
            </div>
            <div className="mt-1 text-[12px] text-[var(--sg-muted)]">
              {props.timeframe} ·{" "}
              {signals > 0
                ? <span style={{ color: signals >= 3 ? "var(--sg-danger)" : "var(--sg-warn)" }}>
                    {signals} señal{signals !== 1 ? "es" : ""} detectada{signals !== 1 ? "s" : ""}
                  </span>
                : <span className="text-[var(--sg-success)]">Sin alertas operativas</span>
              }
            </div>
          </div>
          <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hidden sm:block">
            Haz clic en una tarjeta para más detalle
          </span>
        </div>

        {insights.length === 0 ? (
          <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-8 text-center">
            <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
              Sin datos suficientes para generar diagnóstico
            </div>
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${colClass}`}>
            {insights.map(insight => {
              const accent = toneAccent(insight.tone);
              const soft   = toneSoft(insight.tone);
              const Icon   = insight.icon;
              return (
                <button
                  key={insight.id}
                  onClick={() => setActiveInsight(insight)}
                  className="border border-[var(--sg-line)] p-4 flex flex-col gap-2 text-left hover:border-[var(--sg-accent)] transition-colors cursor-pointer group"
                  style={{ borderLeftWidth: "2px", borderLeftColor: accent, background: soft }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="sg-font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: accent }}>
                      {insight.label}
                    </div>
                    <Icon className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-80 transition-opacity" style={{ color: accent }} />
                  </div>

                  <div className="sg-font-mono text-[22px] font-bold leading-none text-[var(--sg-ink)]">
                    {insight.value}
                  </div>

                  <div className="text-[12px] leading-5 text-[var(--sg-copy)] flex-1">
                    {insight.detail}
                  </div>

                  <div className="mt-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] group-hover:text-[var(--sg-accent)] transition-colors">
                    Ver detalle →
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activeInsight && (
        <InsightModal insight={activeInsight} onClose={() => setActiveInsight(null)} />
      )}
    </>
  );
}
