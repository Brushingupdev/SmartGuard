"use client";

import { motion } from "framer-motion";
import { Building2, TrendingUp, TrendingDown } from "lucide-react";

interface PlantData {
  name: string;
  count: number;
  pct: number;
  tone: "deny" | "ok";
  trend?: "up" | "down" | "stable";
}

export default function RankingPlantas({ plantas }: { plantas: PlantData[] }) {
  if (plantas.length === 0) {
    return (
      <div className="sg-panel p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-[var(--sg-accent)]" />
          <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
            Comparativa Plantas
          </span>
        </div>
        <div className="text-center py-6 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
          Configura múltiples plantas para ver comparativa
        </div>
      </div>
    );
  }

  const maxCount = Math.max(1, ...plantas.map((p) => p.count));
  const sorted = [...plantas].sort((a, b) => b.count - a.count);
  const best = [...plantas].sort((a, b) => b.pct - a.pct)[0];
  const busiest = sorted[0];
  const total = plantas.reduce((sum, p) => sum + p.count, 0);
  const pctValues = plantas.map((p) => p.pct);
  const gap = pctValues.length > 1 ? Math.max(...pctValues) - Math.min(...pctValues) : 0;

  return (
    <div className="sg-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-4 w-4 text-[var(--sg-accent)]" />
        <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
          Comparativa Plantas
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-3">
          <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Mejor planta</div>
          <div className="mt-1 truncate text-[13px] font-semibold text-[var(--sg-ink)]" title={best.name}>{best.name}</div>
          <div className="sg-font-mono text-[12px] font-bold text-[var(--sg-success)]">{best.pct}% a tiempo</div>
        </div>
        <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-3">
          <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Mayor volumen</div>
          <div className="mt-1 truncate text-[13px] font-semibold text-[var(--sg-ink)]" title={busiest.name}>{busiest.name}</div>
          <div className="sg-font-mono text-[12px] font-bold text-[var(--sg-accent)]">
            {total > 0 ? Math.round((busiest.count / total) * 100) : 0}% del flujo
          </div>
        </div>
      </div>

      <div className="mb-4 border-y border-[var(--sg-line)] py-3">
        <div className="flex items-center justify-between">
          <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Brecha operativa</span>
          <span className="sg-font-mono text-[12px] font-bold text-[var(--sg-ink)]">{gap} pts</span>
        </div>
        <div className="mt-2 h-[4px] bg-[var(--sg-line)]">
          <div
            className="h-[4px] bg-[var(--sg-accent)]"
            style={{ width: `${Math.min(100, gap)}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] leading-4 text-[var(--sg-muted)]">
          Diferencia entre la mejor y peor planta por porcentaje a tiempo.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      background: p.tone === "deny" ? "var(--sg-danger)" : "var(--sg-success)",
                    }}
                  />
                  <span className="text-[13px] font-semibold text-[var(--sg-ink)] truncate">
                    {p.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className="sg-font-mono text-[13px] font-bold text-[var(--sg-ink)]">
                    {p.count}
                  </span>
                  <span className="sg-font-mono text-[10px] font-bold text-[var(--sg-muted)]">
                    {p.pct}%
                  </span>
                  {p.trend && (
                    <span>
                      {p.trend === "up" ? (
                        <TrendingUp className="h-3.5 w-3.5 text-[var(--sg-danger)]" />
                      ) : p.trend === "down" ? (
                        <TrendingDown className="h-3.5 w-3.5 text-[var(--sg-success)]" />
                      ) : null}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-[4px] bg-[var(--sg-line)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(p.count / maxCount) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
                  className="h-[4px]"
                  style={{
                    background: p.tone === "deny" ? "var(--sg-danger)" : "var(--sg-success)",
                  }}
                />
              </div>
            </motion.div>
          ))}
      </div>
    </div>
  );
}
