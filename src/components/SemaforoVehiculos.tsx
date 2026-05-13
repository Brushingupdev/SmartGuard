"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, FileCheck2, Truck, AlertTriangle } from "lucide-react";
import type { RecentRegistration } from "@/app/registro/types";
import { isAbandonedRecord, isDelayedRecord } from "@/app/registro/status";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWaitMinutes(reg: RecentRegistration): number {
  if (!reg.time) return 0;
  const [h, m] = reg.time.split(":").map(Number);
  const now = new Date();
  const arrival = new Date();
  arrival.setHours(h, m, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - arrival.getTime()) / 60000));
}

type SemaforoLevel = "abandonado" | "demorado" | "esperando" | "fresco" | "atendido" | "completo";

function getLevel(reg: RecentRegistration, now: Date): SemaforoLevel {
  if (reg.docsDelivered) return "completo";
  if (reg.attended) return "atendido";
  if (isAbandonedRecord(reg, now)) return "abandonado";
  if (isDelayedRecord(reg, now)) return "demorado";
  const wait = getWaitMinutes(reg);
  if (wait <= 5) return "fresco";
  return "esperando";
}

const LEVEL_CONFIG: Record<SemaforoLevel, {
  color: string;
  bg: string;
  border: string;
  dot: string;
  label: string;
  order: number;
}> = {
  abandonado: { color: "var(--sg-danger)",  bg: "rgba(211,92,79,0.08)",   border: "rgba(211,92,79,0.4)",   dot: "#d35c4f", label: "Urgente",    order: 0 },
  demorado:   { color: "var(--sg-warn)",    bg: "rgba(212,134,74,0.08)",  border: "rgba(212,134,74,0.4)",  dot: "#d4864a", label: "Demorado",   order: 1 },
  esperando:  { color: "var(--sg-ink)",     bg: "rgba(255,255,255,0.02)", border: "rgba(196,192,180,0.2)", dot: "#c4c0b4", label: "Esperando",  order: 2 },
  fresco:     { color: "var(--sg-success)", bg: "rgba(107,189,138,0.06)", border: "rgba(107,189,138,0.3)", dot: "#6bbd8a", label: "Llegó",      order: 3 },
  atendido:   { color: "#6ba7ff",           bg: "rgba(107,167,255,0.06)", border: "rgba(107,167,255,0.3)", dot: "#6ba7ff", label: "En atención", order: 4 },
  completo:   { color: "var(--sg-muted)",   bg: "transparent",            border: "rgba(196,192,180,0.1)", dot: "#6bbd8a", label: "Completo",   order: 5 },
};

function formatWait(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// ── Row ───────────────────────────────────────────────────────────────────────

function SemaforoRow({
  reg,
  level,
  waitMin,
  onClose,
  onDocs,
}: {
  reg: RecentRegistration;
  level: SemaforoLevel;
  waitMin: number;
  onClose?: () => void;
  onDocs?: () => void;
}) {
  const cfg = LEVEL_CONFIG[level];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 px-3 py-2.5 border rounded-none"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      {/* Dot */}
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: cfg.dot, boxShadow: level === "abandonado" ? `0 0 6px ${cfg.dot}` : "none" }}
      />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="sg-font-display text-[13px] font-bold uppercase tracking-tight text-[var(--sg-ink)] truncate">
            {reg.razonSocial}
          </span>
          {reg.scheduledOnly && (
            <span className="sg-font-mono text-[8px] uppercase tracking-widest border border-[var(--sg-line)] px-1 text-[var(--sg-muted)] shrink-0">
              Cita
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--sg-muted)] mt-0.5">
          <span className="truncate">{reg.empresa}</span>
          {reg.responsable && (
            <>
              <span className="opacity-40">·</span>
              <span className="truncate">{reg.responsable}</span>
            </>
          )}
        </div>
      </div>

      {/* Tiempo + acciones */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Tiempo de espera */}
        {!reg.docsDelivered && (
          <div className="flex items-center gap-1" style={{ color: cfg.color }}>
            <Clock className="h-3 w-3 shrink-0" />
            <span className="sg-font-mono text-[11px] font-bold">
              {formatWait(waitMin)}
            </span>
          </div>
        )}

        {/* Acciones rápidas */}
        {level === "atendido" && onDocs && (
          <button
            onClick={onDocs}
            className="flex items-center gap-1 px-2 py-1 sg-font-mono text-[8px] uppercase tracking-widest border transition-colors"
            style={{ borderColor: "#6ba7ff55", color: "#6ba7ff" }}
          >
            <FileCheck2 className="h-3 w-3" />
            Docs
          </button>
        )}
        {(level === "abandonado" || level === "demorado" || level === "esperando" || level === "fresco") && onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2 py-1 sg-font-mono text-[8px] uppercase tracking-widest border transition-colors"
            style={{
              borderColor: level === "abandonado" ? "rgba(211,92,79,0.4)" : "rgba(196,192,180,0.3)",
              color: level === "abandonado" ? "var(--sg-danger)" : "var(--sg-muted)",
            }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Atendí
          </button>
        )}
        {level === "completo" && (
          <CheckCircle2 className="h-4 w-4 text-[var(--sg-success)] opacity-50" />
        )}
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface SemaforoVehiculosProps {
  registrations: RecentRegistration[];
  onClose: (reg: RecentRegistration) => void;
  onDocs: (reg: RecentRegistration) => void;
}

export default function SemaforoVehiculos({
  registrations,
  onClose,
  onDocs,
}: SemaforoVehiculosProps) {
  const now = new Date();

  const rows = registrations
    .map((reg) => ({
      reg,
      level: getLevel(reg, now),
      waitMin: getWaitMinutes(reg),
    }))
    .sort((a, b) => LEVEL_CONFIG[a.level].order - LEVEL_CONFIG[b.level].order || b.waitMin - a.waitMin);

  // Conteos para el resumen
  const urgentes  = rows.filter((r) => r.level === "abandonado").length;
  const demorados = rows.filter((r) => r.level === "demorado").length;
  const activos   = rows.filter((r) => !["completo"].includes(r.level)).length;

  if (registrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-[var(--sg-muted)]">
        <Truck className="h-8 w-8 opacity-20" />
        <span className="sg-font-mono text-[10px] uppercase tracking-widest opacity-40">
          Sin vehículos hoy
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Resumen rápido */}
      <div className="flex items-center gap-3 px-1 mb-1">
        {urgentes > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-[var(--sg-danger)]" />
            <span className="sg-font-mono text-[10px] text-[var(--sg-danger)] font-bold">{urgentes} urgente{urgentes !== 1 ? "s" : ""}</span>
          </div>
        )}
        {demorados > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--sg-warn)]" />
            <span className="sg-font-mono text-[10px] text-[var(--sg-warn)]">{demorados} demorado{demorados !== 1 ? "s" : ""}</span>
          </div>
        )}
        <span className="sg-font-mono text-[9px] text-[var(--sg-muted)] ml-auto">{activos} activo{activos !== 1 ? "s" : ""}</span>
      </div>

      {/* Lista */}
      <AnimatePresence mode="popLayout">
        {rows.map(({ reg, level, waitMin }) => (
          <SemaforoRow
            key={reg.id}
            reg={reg}
            level={level}
            waitMin={waitMin}
            onClose={reg.attended ? undefined : () => onClose(reg)}
            onDocs={reg.attended && !reg.docsDelivered ? () => onDocs(reg) : undefined}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
