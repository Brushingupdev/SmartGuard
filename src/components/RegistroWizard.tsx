"use client";

import { motion } from "framer-motion";
import { Truck, FormInput, FileCheck2 } from "lucide-react";

interface Step {
  num: number;
  label: string;
  key: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  { num: 1, label: "Registrar Ingreso", key: "pending", icon: Truck },
  { num: 2, label: "Marcar Atención", key: "attended", icon: FormInput },
  { num: 3, label: "Entregar Documentos", key: "complete", icon: FileCheck2 },
];

function StepNode({
  step,
  isActive,
  isDone,
  isLast,
}: {
  step: Step;
  isActive: boolean;
  isDone: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex flex-1 items-center">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
            isDone
              ? "bg-[var(--sg-success)] border border-[var(--sg-success)]"
              : isActive
                ? "bg-[var(--sg-accent)] border border-[var(--sg-accent)]"
                : "border border-[var(--sg-line)] bg-transparent"
          }`}
        >
          <span
            className={`sg-font-mono text-[11px] font-bold leading-none ${
              isDone || isActive
                ? "text-[var(--sg-canvas)]"
                : "text-[var(--sg-muted)]"
            }`}
          >
            {step.num}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5">
          <step.icon
            className={`h-3.5 w-3.5 ${
              isActive
                ? "text-[var(--sg-accent)]"
                : isDone
                  ? "text-[var(--sg-success)]"
                  : "text-[var(--sg-muted)]"
            }`}
          />
          <span
            className={`sg-font-mono text-[10px] uppercase tracking-[0.12em] whitespace-nowrap ${
              isActive
                ? "text-[var(--sg-accent)] font-bold"
                : isDone
                  ? "text-[var(--sg-success)]"
                  : "text-[var(--sg-muted)]"
            }`}
          >
            {step.label}
          </span>
        </div>
      </div>

      {!isLast && (
        <div className="mx-4 w-full max-w-[80px] sm:max-w-[140px]">
          <div
            className="h-px w-full transition-colors duration-500"
            style={{ background: isDone ? "var(--sg-success)" : "var(--sg-line)" }}
          />
        </div>
      )}
    </div>
  );
}

export default function RegistroWizard({
  pendingCount,
  attendedCount,
  completedCount,
}: {
  pendingCount: number;
  attendedCount: number;
  completedCount: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[var(--sg-line)] bg-[var(--sg-panel)] px-4 py-3"
    >
      <div className="mx-auto flex w-full max-w-[860px] items-center justify-center px-2">
        {STEPS.map((step, i) => {
          const totalActive = pendingCount + attendedCount + completedCount;
          const activeKey =
            totalActive === 0
              ? "pending"
              : pendingCount > 0
                ? "pending"
                : attendedCount > 0
                  ? "attended"
                  : "complete";

          const isActive = step.key === activeKey;
          const isDone =
            activeKey === "attended"
              ? step.key === "pending"
              : activeKey === "complete"
                ? step.key === "pending" || step.key === "attended"
                : false;

          return (
            <StepNode
              key={step.key}
              step={step}
              isActive={isActive}
              isDone={isDone}
              isLast={i === STEPS.length - 1}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
