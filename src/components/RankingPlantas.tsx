"use client";

import { motion } from "framer-motion";
import { Building2 } from "lucide-react";

interface PlantData {
  name: string;
  count: number;
  pct: number;
  tone: "deny" | "ok";
  trend?: "up" | "down" | "stable";
}

function toneColor(tone: PlantData["tone"], pct: number): string {
  if (tone === "deny" && pct < 80) return "var(--sg-danger)";
  if (pct < 90) return "var(--sg-warn)";
  return "var(--sg-success)";
}

export default function RankingPlantas({ plantas }: { plantas: PlantData[]; href?: string }) {
  if (plantas.length === 0) {
    return (
      <div className="sg-panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--sg-accent)]" />
          <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
            Comparativa Puertas
          </span>
        </div>
        <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-6 text-center">
          <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
            Configura múltiples puertas para ver comparativa
          </div>
        </div>
      </div>
    );
  }

  const sortedByPct = [...plantas].sort((a, b) => b.pct - a.pct);
  const sortedByVol = [...plantas].sort((a, b) => b.count - a.count);
  const totalCount = plantas.reduce((sum, p) => sum + p.count, 0);

  const bestPlant = sortedByPct[0];
  const worstPlant = sortedByPct[sortedByPct.length - 1];
  const maxVolPlant = sortedByVol[0];
  
  const brecha = bestPlant.pct - worstPlant.pct;

  return (
    <div className="sg-panel p-5">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center border border-[var(--sg-accent)] text-[var(--sg-accent)] rounded bg-[rgba(212,134,74,0.1)]">
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
          Comparativa Puertas
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="border border-[var(--sg-line)] p-3">
          <div className="sg-font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--sg-muted)] mb-2">
            Mejor Puerta
          </div>
          <div className="truncate text-[13px] font-bold text-[var(--sg-ink)] mb-1" title={bestPlant.name}>
            {bestPlant.name.length > 15 ? bestPlant.name.substring(0, 15) + "..." : bestPlant.name}
          </div>
          <div className="sg-font-mono text-[11px] font-bold text-[var(--sg-success)]">
            {bestPlant.pct}% a tiempo
          </div>
        </div>
        <div className="border border-[var(--sg-line)] p-3">
          <div className="sg-font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--sg-muted)] mb-2">
            Mayor Volumen
          </div>
          <div className="truncate text-[13px] font-bold text-[var(--sg-ink)] mb-1" title={maxVolPlant.name}>
            {maxVolPlant.name.length > 15 ? maxVolPlant.name.substring(0, 15) + "..." : maxVolPlant.name}
          </div>
          <div className="sg-font-mono text-[11px] font-bold text-[var(--sg-warn)]">
            {Math.round((maxVolPlant.count / totalCount) * 100)}% del flujo
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-end justify-between mb-2">
          <span className="sg-font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--sg-muted)]">
            Brecha Operativa
          </span>
          <span className="sg-font-mono text-[12px] font-bold text-[var(--sg-ink)]">
            {brecha} pts
          </span>
        </div>
        <div className="h-1.5 w-full bg-[var(--sg-line)] mb-2 flex">
          <div className="h-full bg-[var(--sg-warn)]" style={{ width: `${worstPlant.pct}%` }} />
          <div className="h-full bg-[var(--sg-success)]" style={{ width: `${brecha}%` }} />
        </div>
        <div className="text-[11px] text-[var(--sg-copy)] leading-relaxed">
          Diferencia entre la mejor y peor puerta por porcentaje a tiempo.
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-[var(--sg-line)]">
        {plantas.map((plant, index) => {
          const color = toneColor(plant.tone, plant.pct);
          return (
            <motion.div
              key={plant.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="flex items-center gap-3"
            >
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <span className="block truncate text-[12px] font-medium text-[var(--sg-ink)]">
                  {plant.name}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="sg-font-mono text-[11px] font-bold text-[var(--sg-ink)]">
                  {plant.count} <span className="text-[var(--sg-muted)] font-normal">{plant.pct}%</span>
                </span>
                <div className="w-16 h-1 bg-[var(--sg-line)]">
                  <div className="h-full" style={{ width: `${plant.pct}%`, background: color }} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
