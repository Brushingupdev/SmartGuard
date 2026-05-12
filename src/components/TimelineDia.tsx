"use client";

import { motion } from "framer-motion";
import { Truck, AlertTriangle, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

interface TimelineEvent {
  time: string;
  plate: string;
  status: "ok" | "warn" | "deny" | "pending";
  label: string;
  info: string;
  gate: string;
  espera_min?: number | null;
  atencionId?: number;
}

const toneConfig = {
  ok: { color: "var(--sg-success)", icon: CheckCircle2, bg: "rgba(107,189,138,0.06)" },
  warn: { color: "var(--sg-warn)", icon: AlertTriangle, bg: "rgba(200,168,75,0.06)" },
  deny: { color: "var(--sg-danger)", icon: Clock, bg: "rgba(211,92,79,0.06)" },
  pending: { color: "var(--sg-info)", icon: Truck, bg: "rgba(196,192,180,0.04)" },
};

export default function TimelineDia({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="sg-panel p-8 text-center">
        <Truck className="h-8 w-8 text-[var(--sg-muted)] opacity-20 mx-auto mb-3" />
        <p className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
          Sin actividad registrada hoy
        </p>
      </div>
    );
  }

  return (
    <div className="sg-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)]">
          Línea de Tiempo
        </div>
        <Link
          href="/historial"
          className="flex items-center gap-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-accent)] transition-colors"
        >
          Historial <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-[var(--sg-line)]" />

        <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto">
          {events.map((e, i) => {
            const config = toneConfig[e.status];
            return (
              <motion.div
                key={e.time + i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-4 py-2.5 px-3 hover:bg-[var(--sg-panel-2)] transition-colors"
              >
                {/* Dot */}
                <div className="relative z-10 flex h-[10px] w-[10px] shrink-0 items-center justify-center mt-1.5">
                  <div
                    className="h-[10px] w-[10px] rounded-full border-2"
                    style={{ background: config.bg, borderColor: config.color }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="sg-font-mono text-[12px] font-bold text-[var(--sg-ink)]">
                      {e.time}
                    </span>
                    <span className="sg-font-display text-[13px] font-bold text-[var(--sg-ink)] truncate">
                      {e.plate}
                    </span>
                    <span
                      className="sg-font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border"
                      style={{ color: config.color, borderColor: config.color }}
                    >
                      {e.label}
                    </span>
                    {e.espera_min != null && e.espera_min >= 30 && (
                      <span className="sg-font-mono text-[10px] font-bold" style={{ color: config.color }}>
                        {e.espera_min} min
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--sg-copy)]">
                    <span>{e.info}</span>
                    <span className="text-[var(--sg-muted)]">·</span>
                    <span className="sg-font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--sg-muted)]">
                      {e.gate}
                    </span>
                    {e.atencionId && (
                      <Link
                        href={`/historial?id=${e.atencionId}`}
                        className="ml-auto sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)] hover:underline"
                      >
                        Ver detalle →
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
