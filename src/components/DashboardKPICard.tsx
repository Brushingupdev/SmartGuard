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
  trendInverse?: boolean;
  trendSuffix?: string;
  trendLabel?: string;
}

export default function DashboardKPICard({
  label,
  value,
  suffix = "",
  sub,
  accent = "transparent",
  trend,
  trendInverse = false,
  trendSuffix = "%",
  trendLabel = "vs. período anterior",
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
      className="sg-panel relative flex min-h-[118px] flex-col justify-between overflow-hidden px-4 py-4 sm:min-h-[126px] sm:px-5"
    >
      <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />

      <div className="sg-font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sg-muted)]">
        {label}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="sg-font-display text-[28px] font-bold leading-none text-[var(--sg-ink)] sm:text-[32px]">
              {value.toLocaleString()}
            </span>
            {suffix ? (
              <span className="sg-font-display text-[14px] font-bold text-[var(--sg-copy)] sm:text-[16px]">
                {suffix}
              </span>
            ) : null}
          </div>
          {sub ? (
            <div className="mt-2 truncate text-[11px] text-[var(--sg-copy)]" title={sub}>
              {sub}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 pb-0.5 text-right">
          {TrendIcon && (
            <>
              <div className="flex items-center justify-end gap-1 sg-font-mono text-[11px] font-bold" style={{ color: trendColor }}>
                <TrendIcon className="h-3.5 w-3.5" />
                {trend! > 0 ? "+" : ""}{trend}{trendSuffix}
              </div>
              <div className="mt-1 max-w-[104px] text-[10px] leading-3 text-[var(--sg-muted)]">
                {trendLabel}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
