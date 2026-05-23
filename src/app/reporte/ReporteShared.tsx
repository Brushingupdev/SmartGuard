"use client";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { DAYS_SHORT, heatColor, HOURS_RANGE } from "./reporteUtils";

export function TrendIcon({
  trend,
}: {
  trend: "up" | "down" | "stable";
}) {
  if (trend === "up") {
    return (
      <span
        className="sg-font-mono text-[11px] font-bold text-[var(--sg-danger)]"
        title="Empeorando"
      >
        ↑
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span
        className="sg-font-mono text-[11px] font-bold text-[var(--sg-success)]"
        title="Mejorando"
      >
        ↓
      </span>
    );
  }
  return (
    <span
      className="sg-font-mono text-[11px] text-[var(--sg-muted)]"
      title="Estable"
    >
      —
    </span>
  );
}

export function GradeBadge({ grade }: { grade: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    A: { bg: "rgba(107,189,138,0.15)", color: "var(--sg-success)" },
    B: { bg: "rgba(107,189,138,0.08)", color: "var(--sg-success)" },
    C: { bg: "rgba(212,134,74,0.15)", color: "var(--sg-warn)" },
    D: { bg: "rgba(211,92,79,0.12)", color: "#e07b3a" },
    F: { bg: "rgba(211,92,79,0.20)", color: "var(--sg-danger)" },
  };
  const style = styles[grade] ?? styles.F;

  return (
    <span
      className="sg-font-mono inline-block px-2 py-0.5 text-[12px] font-bold"
      style={{ background: style.bg, color: style.color }}
    >
      {grade}
    </span>
  );
}

export function HeatmapGrid({
  heatmap,
}: {
  heatmap: {
    dow: number;
    hour: number;
    total: number;
    delayed: number;
    rate: number | null;
  }[];
}) {
  const [tooltip, setTooltip] = useState<{
    dow: number;
    hour: number;
    total: number;
    rate: number | null;
  } | null>(null);

  const cellMap: Record<
    string,
    { total: number; delayed: number; rate: number | null }
  > = {};
  heatmap.forEach((item) => {
    cellMap[`${item.dow}-${item.hour}`] = {
      total: item.total,
      delayed: item.delayed,
      rate: item.rate,
    };
  });

  if (heatmap.length === 0) {
    return (
      <div className="py-10 text-center sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">
        Sin datos suficientes para el período
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="mb-1 ml-10 flex">
          {HOURS_RANGE.map((hour) => (
            <div
              key={hour}
              className="sg-font-mono flex-1 text-center text-[9px] text-[var(--sg-muted)]"
            >
              {hour}h
            </div>
          ))}
        </div>

        {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
          <div key={dow} className="mb-1 flex items-center">
            <div className="sg-font-mono w-10 shrink-0 text-[9px] uppercase text-[var(--sg-muted)]">
              {DAYS_SHORT[dow]}
            </div>
            {HOURS_RANGE.map((hour) => {
              const cell = cellMap[`${dow}-${hour}`];
              const rate = cell?.rate ?? null;
              const total = cell?.total ?? 0;
              return (
                <div
                  key={hour}
                  className="relative mx-px h-7 flex-1 cursor-default border border-[var(--sg-line)]"
                  style={{
                    background:
                      total > 0 ? heatColor(rate) : "var(--sg-panel-2)",
                  }}
                  onMouseEnter={() =>
                    total > 0 && setTooltip({ dow, hour, total, rate })
                  }
                  onMouseLeave={() => setTooltip(null)}
                >
                  {tooltip?.dow === dow && tooltip?.hour === hour && (
                    <div className="absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap border border-[var(--sg-accent)] bg-[var(--sg-panel)] px-3 py-2 shadow-lg">
                      <div className="sg-font-mono mb-1 text-[9px] uppercase text-[var(--sg-muted)]">
                        {DAYS_SHORT[dow]} · {hour}:00
                      </div>
                      <div className="sg-font-mono text-[12px] font-bold text-[var(--sg-ink)]">
                        {total} registros
                      </div>
                      {rate !== null && (
                        <div
                          className="sg-font-mono text-[11px]"
                          style={{
                            color: heatColor(rate).replace("0.", "1"),
                          }}
                        >
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

        <div className="mt-3 ml-10 flex items-center gap-3">
          <span className="sg-font-mono text-[9px] text-[var(--sg-muted)]">
            Sin datos
          </span>
          {[0, 20, 40, 60].map((value) => (
            <div key={value} className="flex items-center gap-1">
              <div
                className="h-3 w-5 border border-[var(--sg-line)]"
                style={{ background: heatColor(value) }}
              />
              <span className="sg-font-mono text-[9px] text-[var(--sg-muted)]">
                {value}%+
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <div className="sg-slabel">{title}</div>
        {sub && (
          <span className="sg-font-mono text-[10px] text-[var(--sg-muted)] opacity-70">
            {sub}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export function Skel({ h = "h-[160px]" }: { h?: string }) {
  return <div className={`w-full animate-pulse bg-[var(--sg-panel-2)] ${h}`} />;
}

export function EmptyMsg({
  text = "Sin datos para este período",
}: {
  text?: string;
}) {
  return (
    <div className="flex items-center justify-center py-10">
      <span className="sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">
        {text}
      </span>
    </div>
  );
}

interface ChartPayload {
  dataKey: string;
  value: number;
  fill?: string;
}

export function TrendTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const labelMap: Record<string, string> = {
    onTime: "A tiempo",
    delayed: "Con demora",
  };

  return (
    <div className="border border-[var(--sg-line)] bg-[var(--sg-panel)] px-3 py-2 text-[11px] shadow-lg">
      <div className="sg-slabel mb-1.5">{label}</div>
      {payload.map((item) => (
        <div
          key={item.dataKey}
          className="flex items-center justify-between gap-5"
        >
          <span className="flex items-center gap-1.5 text-[var(--sg-copy)]">
            <span className="h-1.5 w-1.5" style={{ background: item.fill }} />
            {labelMap[item.dataKey] ?? item.dataKey}
          </span>
          <span className="sg-font-mono text-[var(--sg-ink)]">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ExportDropdown({
  onCSV,
  excelHref,
  pdfHref,
  exporting,
}: {
  onCSV: () => void;
  excelHref: string;
  pdfHref: string;
  exporting: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        disabled={exporting}
        className="sg-font-mono flex items-center gap-1.5 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-2.5 py-1 text-[9px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
      >
        <Download className="h-3.5 w-3.5" />
        Exportar
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[6px_6px_0_rgba(0,0,0,0.3)]">
            <button
              onClick={() => {
                setOpen(false);
                onCSV();
              }}
              className="sg-font-mono flex w-full items-center gap-2.5 px-3 py-2.5 text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:bg-[var(--sg-panel-2)] hover:text-[var(--sg-success)]"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              CSV
            </button>
            <a
              href={excelHref}
              download
              onClick={() => setOpen(false)}
              className="sg-font-mono flex w-full items-center gap-2.5 px-3 py-2.5 text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:bg-[var(--sg-panel-2)] hover:text-[#22c55e]"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
              Excel
            </a>
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="sg-font-mono flex w-full items-center gap-2.5 px-3 py-2.5 text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:bg-[var(--sg-panel-2)] hover:text-[#ef4444]"
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
