"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface Causa {
  motivo: string;
  count: number;
  pct?: number;
}

export default function CausasTop({ causas }: { causas: Causa[] }) {
  const max = Math.max(1, ...causas.map((c) => c.count));

  return (
    <div className="sg-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-[var(--sg-warn)]" />
        <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
          Top Causas de Demora
        </span>
      </div>

      {causas.length === 0 ? (
        <div className="text-center py-6 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
          Sin demoras registradas
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {causas.map((c, i) => {
            const pct = c.pct ?? Math.round((c.count / max) * 100);
            let color = "var(--sg-success)";
            if (i === 0) color = "var(--sg-danger)";
            else if (i === 1) color = "#e07b3a";
            else if (i === 2) color = "var(--sg-warn)";

            return (
              <motion.div
                key={c.motivo}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] text-[var(--sg-copy)] truncate">{c.motivo}</span>
                  <span className="sg-font-mono text-[12px] font-bold text-[var(--sg-ink)] ml-3 shrink-0">
                    {c.count}
                  </span>
                </div>
                <div className="h-[5px] bg-[var(--sg-line)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                    className="h-[5px]"
                    style={{ background: color }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
