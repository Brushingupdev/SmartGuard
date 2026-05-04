"use client";

import { motion } from "framer-motion";
import { Building2, BarChart3 } from "lucide-react";

interface Props {
  companyName?: string;
  plantas?: string;
}

export default function OnboardingPreview({ companyName, plantas }: Props) {
  const name = companyName || "TU EMPRESA";
  const plants = plantas ? plantas.split(",").map((p) => p.trim()).filter(Boolean) : ["Planta A", "Planta B"];

  return (
    <div className="mt-6 border border-[var(--sg-accent)] bg-[#0d0f0e] p-5 rounded-sm">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-[var(--sg-accent)]" />
        <span className="sg-font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--sg-accent)]">
          Así se verá tu panel de control
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border border-[var(--sg-line)] bg-[var(--sg-panel)] p-4"
      >
        {/* Mock header */}
        <div className="flex items-center gap-3 mb-4 border-b border-[var(--sg-line)] pb-3">
          <div className="flex h-6 w-6 items-center justify-center bg-[var(--sg-accent)]">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-[var(--sg-canvas)]">
              <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
            </svg>
          </div>
          <div>
            <span className="sg-font-display text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)]">
              {name}
            </span>
          </div>
          <span className="ml-auto flex items-center gap-1.5 text-[9px] text-[var(--sg-success)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--sg-success)]" />
            En vivo
          </span>
        </div>

        {/* Mock KPIs */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { val: "48", label: "A tiempo", color: "var(--sg-success)" },
            { val: "4", label: "Revisión", color: "var(--sg-warn)" },
            { val: "3", label: "Demora", color: "var(--sg-danger)" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[var(--sg-panel-2)] p-2">
              <div className="sg-font-mono text-[18px] font-bold" style={{ color: kpi.color }}>
                {kpi.val}
              </div>
              <div className="text-[8px] uppercase tracking-[0.12em] text-[var(--sg-muted)] mt-0.5">
                {kpi.label}
              </div>
            </div>
          ))}
        </div>

        {/* Mock event entries */}
        <div className="space-y-1">
          {[
            { plate: "ABC-4521", info: "Entrada · Garita Principal", time: "08:14", tone: "var(--sg-success)" },
            { plate: "XYZ-9983", info: "Demora detectada", time: "08:09", tone: "var(--sg-danger)" },
            { plate: "MKL-1102", info: "Salida · Garita Sur", time: "07:58", tone: "var(--sg-success)" },
          ].map((ev) => (
            <div
              key={ev.plate}
              className="flex items-center gap-2 px-2 py-1.5 bg-[var(--sg-panel-2)] text-[10px]"
            >
              <span className="sg-font-mono font-bold text-[var(--sg-ink)] w-[70px] shrink-0">
                {ev.plate}
              </span>
              <span className="text-[var(--sg-copy)] truncate flex-1">{ev.info}</span>
              <span className="sg-font-mono text-[var(--sg-muted)] shrink-0">{ev.time}</span>
            </div>
          ))}
        </div>

        {/* Plants bar */}
        <div className="mt-3 pt-3 border-t border-[var(--sg-line)] flex items-center gap-2">
          {plants.slice(0, 3).map((p, i) => (
            <div key={p} className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3" style={{ color: i === 0 ? "var(--sg-success)" : "var(--sg-muted)" }} />
              <span className="text-[9px] text-[var(--sg-muted)]">{p}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <p className="mt-3 text-[10px] text-[var(--sg-muted)] text-center">
        Dashboard en tiempo real · Alertas automáticas · Exportación de reportes
      </p>
    </div>
  );
}
