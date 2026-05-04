"use client";

import { motion } from "framer-motion";

function scoreColor(s: number): string {
  if (s >= 80) return "var(--sg-success)";
  if (s >= 50) return "var(--sg-warn)";
  return "var(--sg-danger)";
}

function scoreLabel(s: number): string {
  if (s >= 80) return "Saludable";
  if (s >= 50) return "Atención";
  return "Crítico";
}

export default function HealthScoreBar({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreColor(clamped);

  const height = size === "sm" ? 3 : size === "lg" ? 6 : 4;
  const showLabel = size !== "sm";

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-[{height}px] bg-[var(--sg-line)]" style={{ height }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full"
          style={{ background: color }}
        />
      </div>
      <span
        className="sg-font-mono text-[11px] font-bold shrink-0"
        style={{ color }}
      >
        {clamped}
      </span>
      {showLabel && (
        <span className="text-[10px] shrink-0 hidden sm:inline" style={{ color }}>
          {scoreLabel(clamped)}
        </span>
      )}
    </div>
  );
}

export function computeHealthScore(opts: {
  hasUsers: boolean;
  hasContacts: boolean;
  hasPlants: boolean;
  recentRecords: number;
  totalRecords: number;
}): number {
  let score = 0;

  // Users configured (25 pts)
  if (opts.hasUsers) score += 25;
  // Alert contacts configured (25 pts)
  if (opts.hasContacts) score += 25;
  // Plants configured (15 pts)
  if (opts.hasPlants) score += 15;
  // Recent activity (25 pts)
  if (opts.recentRecords > 0) score += 15;
  if (opts.recentRecords >= 10) score += 10;
  // Overall engagement (10 pts)
  if (opts.totalRecords > 0) score += 5;
  if (opts.totalRecords >= 50) score += 5;

  return score;
}
