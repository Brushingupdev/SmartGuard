"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface KPICardProps {
  label: string;
  value: number;
  suffix?: string;
  sub?: string;
  accent?: string;
  trend?: number | null;
  trendInverse?: boolean; // true = down is good (for delays)
}

export default function DashboardKPICard({
  label,
  value,
  suffix,
  sub,
  accent = "var(--sg-success)",
  trend,
  trendInverse = false,
}: KPICardProps) {
  const TrendIcon = trend == null ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const isGood = trend == null
    ? null
    : trendInverse
      ? trend <= 0
      : trend >= 0;
  const trendColor = trend == null
    ? "var(--sg-muted)"
    : isGood
      ? "var(--sg-success)"
      : "var(--sg-danger)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sg-panel p-5 flex flex-col gap-2 relative overflow-hidden"
    >
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accent }} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="sg-font-mono text-[32px] font-bold text-[var(--sg-ink)] leading-none">
              {value.toLocaleString()}
            </span>
            {suffix && (
              <span className="sg-font-mono text-[14px] text-[var(--sg-muted)]">{suffix}</span>
            )}
          </div>
          <div className="sg-font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--sg-muted)] mt-2">
            {label}
          </div>
        </div>

        {TrendIcon && (
          <div className="flex items-center gap-1 shrink-0 mt-1">
            <TrendIcon className="h-4 w-4" style={{ color: trendColor }} />
            <span className="sg-font-mono text-[12px] font-bold" style={{ color: trendColor }}>
              {trend! > 0 ? "+" : ""}{trend}%
            </span>
          </div>
        )}
      </div>

      {sub && (
        <div className="text-[10px] text-[var(--sg-muted)] leading-relaxed">{sub}</div>
      )}
    </motion.div>
  );
}
