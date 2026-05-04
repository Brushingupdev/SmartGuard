"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface FunnelStage {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
}

export default function OnboardingFunnel({ stages, total }: { stages: FunnelStage[]; total: number }) {
  if (total === 0) return null;

  return (
    <div className="sg-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="h-4 w-4 text-[var(--sg-success)]" />
        <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
          Embudo de Activación
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {stages.map((stage, i) => {
          const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0;
          const width = Math.max(100, pct);
          const colors = [
            "var(--sg-accent)",
            "var(--sg-info)",
            "var(--sg-success)",
          ];

          return (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <stage.icon className="h-3.5 w-3.5" />
                  <span className="text-[12px] text-[var(--sg-copy)]">{stage.label}</span>
                </div>
                <span className="sg-font-mono text-[12px] font-bold text-[var(--sg-ink)]">
                  {stage.count}
                </span>
              </div>
              <div className="h-[24px] bg-[var(--sg-panel-2)] flex items-center">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: "easeOut" }}
                  className="h-full flex items-center px-3"
                  style={{ background: colors[i % colors.length], minWidth: 0 }}
                >
                  <span className="sg-font-mono text-[10px] font-bold text-[var(--sg-canvas)]">
                    {pct}%
                  </span>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
