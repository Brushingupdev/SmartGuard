"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Truck } from "lucide-react";

interface Causa {
  motivo: string;
  count: number;
  pct?: number;
}

interface TopProvider {
  empresa: string;
  rate: number;
  total: number;
}

function barColor(index: number): string {
  if (index === 0) return "var(--sg-danger)";
  if (index === 1) return "#e07b3a";
  if (index === 2) return "var(--sg-warn)";
  return "rgba(196,192,180,0.45)";
}

export default function CausasTop({ causas, totalDemoras = 0, topProvider }: {
  causas: Causa[];
  totalDemoras?: number;
  href?: string;
  topProvider?: TopProvider | null;
}) {
  const total = Math.max(
    totalDemoras,
    causas.reduce((sum, causa) => sum + causa.count, 0),
  );

  return (
    <div className="sg-panel p-5">
      <div className="mb-5 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[var(--sg-warn)]" />
        <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
          Top Causas de Demora
        </span>
      </div>

      {causas.length === 0 ? (
        <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-6 text-center">
          <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
            Sin causas registradas
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {causas.slice(0, 5).map((causa, index) => {
            const pct = causa.pct ?? (total > 0 ? Math.round((causa.count / total) * 100) : 0);
            return (
              <motion.div
                key={causa.motivo}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[13px] font-medium text-[var(--sg-copy)]" title={causa.motivo}>
                    {causa.motivo}
                  </span>
                  <span className="sg-font-mono text-[12px] font-bold text-[var(--sg-ink)]">
                    {causa.count}
                  </span>
                </div>
                <div className="h-[4px] w-full overflow-hidden bg-[var(--sg-line)]">
                  <div className="h-full" style={{ width: `${pct}%`, background: barColor(index) }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {topProvider && topProvider.rate >= 50 && (
        <div className="mt-4 border-t border-[var(--sg-line)] pt-4">
          <div className="flex items-start gap-2 border-l-2 border-[var(--sg-danger)] bg-[rgba(211,92,79,0.05)] px-3 py-2.5">
            <Truck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--sg-danger)]" />
            <div className="min-w-0">
              <div className="sg-font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--sg-danger)] mb-0.5">
                Proveedor más crítico
              </div>
              <div className="truncate text-[12px] font-semibold text-[var(--sg-ink)]" title={topProvider.empresa}>
                {topProvider.empresa}
              </div>
              <div className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                {topProvider.rate}% demora · {topProvider.total} visitas
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
