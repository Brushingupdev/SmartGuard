"use client";

import { motion } from "framer-motion";
import { FormInput, FileCheck2, Truck } from "lucide-react";

interface Step {
  num: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
}

const STEPS: Step[] = [
  { num: 1, label: "Registrar Ingreso", icon: Truck, key: "pending" },
  { num: 2, label: "Marcar Atención", icon: FormInput, key: "attended" },
  { num: 3, label: "Entregar Documentos", icon: FileCheck2, key: "complete" },
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
    <div className="flex items-center flex-1 min-w-0">
      <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center transition-all duration-300 ${
            isDone
              ? "bg-[var(--sg-success)] border border-[var(--sg-success)]"
              : isActive
                ? "bg-[var(--sg-accent)] border border-[var(--sg-accent)] shadow-[0_0_12px_rgba(200,168,75,0.25)]"
                : "border border-[var(--sg-line)] bg-[var(--sg-canvas-2)]"
          }`}
        >
          <step.icon
            className={`h-5 w-5 ${
              isDone
                ? "text-[var(--sg-canvas)]"
                : isActive
                  ? "text-[var(--sg-canvas)]"
                  : "text-[var(--sg-muted)]"
            }`}
          />
        </div>

        <span
          className={`sg-font-mono text-[10px] uppercase tracking-[0.12em] text-center leading-tight hidden sm:block ${
            isActive
              ? "text-[var(--sg-accent)] font-bold"
              : isDone
                ? "text-[var(--sg-success)]"
                : "text-[var(--sg-muted)]"
          }`}
        >
          {step.label}
        </span>
        <span
          className={`sg-font-display text-[20px] font-bold ${
            isActive
              ? "text-[var(--sg-accent)]"
              : isDone
                ? "text-[var(--sg-success)]"
                : "text-[var(--sg-muted)]"
          }`}
        >
          {step.num}
        </span>
      </div>

      {!isLast && (
        <div className="w-full max-w-[48px] sm:max-w-[80px] mx-1">
          <div className="h-1 w-full rounded-full transition-colors duration-500"
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
      className="bg-[var(--sg-canvas-2)] border-b border-[var(--sg-line)] px-4 py-4 sm:px-6"
    >
      <div className="flex items-center max-w-[680px] mx-auto">
        {STEPS.map((step, i) => {
          const totalActive = pendingCount + attendedCount + completedCount;
          const activeKey =
            totalActive === 0 ? "pending"
            : pendingCount > 0 ? "pending"
            : attendedCount > 0 ? "attended"
            : "complete";

          const isActive = step.key === activeKey;
          const isDone = activeKey === "attended" ? step.key === "pending"
                       : activeKey === "complete" ? step.key === "pending" || step.key === "attended"
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

      {/* Status bar */}
      <div className="flex justify-between max-w-[680px] mx-auto mt-3 sg-font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--sg-muted)]">
        <span>
          {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
        </span>
        <span>
          {attendedCount} atendido{attendedCount !== 1 ? "s" : ""}
        </span>
        <span>
          {completedCount} completado{completedCount !== 1 ? "s" : ""}
        </span>
      </div>
    </motion.div>
  );
}
