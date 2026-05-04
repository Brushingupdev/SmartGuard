"use client";

import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

interface HeatmapCell {
  dow: number;    // 0=Sun .. 6=Sat
  hour: number;   // 0..23
  total: number;
  delayed: number;
  rate: number | null;
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getColor(rate: number | null): string {
  if (rate === null || rate === 0) return "rgba(255,255,255,0.02)";
  if (rate < 10) return "rgba(107,189,138,0.2)";
  if (rate < 20) return "rgba(200,168,75,0.25)";
  if (rate < 35) return "rgba(224,123,58,0.3)";
  return "rgba(211,92,79,0.4)";
}

function getTextColor(rate: number | null): string {
  if (rate === null) return "var(--sg-muted)";
  if (rate < 20) return "var(--sg-success)";
  if (rate < 35) return "var(--sg-warn)";
  return "var(--sg-danger)";
}

export default function HeatmapDemoras({ data }: { data: HeatmapCell[] }) {
  const grid: Record<string, HeatmapCell | undefined> = {};
  data.forEach((d) => { grid[`${d.dow}-${d.hour}`] = d; });

  const hasData = data.length > 0;

  return (
    <div className="sg-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-[var(--sg-accent)]" />
        <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
          Mapa de Calor — Demoras
        </span>
      </div>

      {!hasData ? (
        <div className="text-center py-6 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
          Sin datos suficientes para generar el mapa
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-[600px]">
            {/* Header row */}
            <div className="flex mb-1">
              <div className="w-10 shrink-0" />
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex-1 text-center sg-font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--sg-muted)] py-1"
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Day rows */}
            {DAYS.map((day, dow) => (
              <div key={dow} className="flex items-center mb-0.5">
                <div className="w-10 shrink-0 sg-font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--sg-muted)] text-right pr-2">
                  {day}
                </div>
                {HOURS.map((hour) => {
                  const cell = grid[`${dow}-${hour}`];
                  return (
                    <motion.div
                      key={hour}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: dow * 0.02 + hour * 0.001 }}
                      className="flex-1 aspect-[1.4] flex items-center justify-center m-[1px] rounded-sm cursor-default"
                      style={{ background: getColor(cell?.rate ?? null) }}
                      title={cell ? `${cell.delayed}/${cell.total} demoras (${cell.rate}%)` : "Sin datos"}
                    >
                      <span
                        className="sg-font-mono text-[8px] font-bold"
                        style={{ color: getTextColor(cell?.rate ?? null) }}
                      >
                        {cell?.rate != null ? `${cell.rate}%` : ""}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--sg-line)]">
              <span className="sg-font-mono text-[8px] uppercase tracking-widest text-[var(--sg-muted)]">
                % demoras:
              </span>
              {[
                { label: "0-10%", bg: "rgba(107,189,138,0.2)" },
                { label: "10-20%", bg: "rgba(200,168,75,0.25)" },
                { label: "20-35%", bg: "rgba(224,123,58,0.3)" },
                { label: "35%+", bg: "rgba(211,92,79,0.4)" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-sm" style={{ background: l.bg }} />
                  <span className="sg-font-mono text-[8px] text-[var(--sg-muted)]">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
