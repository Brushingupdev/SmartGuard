"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface KPICardProps {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
  trend?: number | null;
  trendInverse?: boolean;
}

export default function DashboardKPICard({
  label,
  value,
  sub,
  accent = "transparent",
  trend,
  trendInverse = false,
}: KPICardProps) {
  const TrendIcon = trend == null ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const isGood = trend == null ? null : trendInverse ? trend <= 0 : trend >= 0;
  const trendColor = trend == null
    ? "var(--sg-muted)"
    : isGood
      ? "var(--sg-success)"
      : "var(--sg-danger)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sg-panel relative flex flex-col overflow-hidden px-4 py-5 sm:px-5 sm:py-6"
    >
      <div className="absolute left-0 right-0 top-0 h-[3px]" style={{ background: accent }} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="sg-font-display text-[24px] sm:text-[32px] font-bold leading-none text-[var(--sg-ink)]">
            {value.toLocaleString()}
          </span>
          {TrendIcon && (
            <div className="flex items-center gap-1 sg-font-mono text-[12px] font-bold" style={{ color: trendColor }}>
              <TrendIcon className="h-4 w-4" />
              {trend! > 0 ? "+" : ""}{trend}%
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="sg-font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--sg-muted)]">
            {label}
          </div>
          {sub && (
            <div className="text-[11px] text-[var(--sg-copy)]">
              {sub}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
