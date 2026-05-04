"use client";

import { motion } from "framer-motion";
import {
  Timer, FileCheck2, Pencil, Trash2, AlertTriangle, CheckCircle2, Clock, Bell
} from "lucide-react";
import { useEffect, useState } from "react";

interface Registro {
  id: number;
  time: string;
  razonSocial: string;
  empresa: string;
  attended: boolean;
  docsDelivered: boolean;
  espera_min: number | null;
  h_atencion: string | null;
  h_dev_docs: string | null;
  reason?: string;
  type?: string;
  responsable?: string;
  agente?: string;
  observacion?: string;
  hora_cita?: string | null;
}

type State = "pending" | "attended" | "complete";

const DELAY_THRESHOLD = 45; // minutos

function getState(r: Registro): State {
  if (r.docsDelivered) return "complete";
  if (r.attended) return "attended";
  return "pending";
}

/** Calcula minutos transcurridos desde una hora "HH:MM" hasta ahora */
function minutesSince(timeStr: string): number {
  const [hh, mm] = timeStr.split(":").map(Number);
  const now = new Date();
  const diffMin = (now.getHours() * 60 + now.getMinutes()) - (hh * 60 + mm);
  return diffMin < 0 ? diffMin + 1440 : diffMin;
}

/**
 * Para el contador en vivo de pendientes:
 * Si hay hora_cita, se mide desde ella (y es 0 si aún no llegó la cita).
 * Si no, se mide desde h_registro (time).
 * IMPORTANTE: no usar minutesSince para hora_cita (evita el +1440 cuando la cita no llegó).
 */
function liveWaitMinutes(reg: Registro): number {
  if (reg.hora_cita) {
    const [hh, mm] = reg.hora_cita.split(":").map(Number);
    const now = new Date();
    const diffMin = (now.getHours() * 60 + now.getMinutes()) - (hh * 60 + mm);
    return Math.max(0, diffMin); // 0 si la cita aún no llegó (sin +1440)
  }
  return minutesSince(reg.time);
}

function StatePill({ state, isDemora, isCitaActiva }: { state: State; isDemora: boolean; isCitaActiva: boolean }) {
  if (state === "complete")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-[var(--sg-success)] bg-[rgba(107,189,138,0.08)] sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-success)]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completado
      </span>
    );
  if (state === "attended")
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 border sg-font-mono text-[10px] uppercase tracking-widest ${
        isDemora
          ? "border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] text-[var(--sg-danger)]"
          : "border-[var(--sg-accent)] bg-[rgba(200,168,75,0.08)] text-[var(--sg-accent)]"
      }`}>
        <Clock className="h-3.5 w-3.5" />
        {isDemora ? "Demora" : "Atendido"}
      </span>
    );
  // Pendiente con demora
  if (isDemora)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-danger)]">
        <span className="h-2 w-2 rounded-full sg-pulse bg-[var(--sg-danger)]" />
        Demora
      </span>
    );
  // Cita llegó y aún no fue atendido
  if (isCitaActiva)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-orange-500 bg-orange-500/10 sg-font-mono text-[10px] uppercase tracking-widest text-orange-400 animate-pulse">
        <Bell className="h-3.5 w-3.5" />
        Cita Activa
      </span>
    );
  // Pendiente normal
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-[var(--sg-warn)] bg-[rgba(200,160,75,0.08)] sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-warn)]">
      <span className="h-2 w-2 rounded-full sg-pulse bg-[var(--sg-warn)]" />
      Pendiente
    </span>
  );
}

export default function TarjetaRegistro({
  reg,
  onClose,
  onDocs,
  onEdit,
  onDelete,
  isAbandoned = false,
  closing = false,
  docsLoading = false,
  deleting = false,
}: {
  reg: Registro;
  onClose?: () => void;
  onDocs?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isAbandoned?: boolean;
  closing?: boolean;
  docsLoading?: boolean;
  deleting?: boolean;
}) {
  const state = getState(reg);
  const isPending = state === "pending";
  const isAttended = state === "attended";

  // Para pendientes: calcular espera en vivo cada 30 segundos
  const [liveMin, setLiveMin] = useState<number>(() =>
    isPending ? liveWaitMinutes(reg) : 0
  );

  useEffect(() => {
    if (!isPending) return;
    const id = setInterval(() => setLiveMin(liveWaitMinutes(reg)), 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, reg.time, reg.hora_cita]);

  // Demora: para atendidos usa espera_min guardada, para pendientes usa el contador en vivo
  const waitMin = isPending ? liveMin : (reg.espera_min ?? 0);
  const isDemora = state !== "complete" && waitMin >= DELAY_THRESHOLD;

  // Cita activa: cita llegó (liveMin > 0) pero aún no fue atendido y no es demora aún
  const isCitaActiva = isPending && !!reg.hora_cita && liveMin > 0 && !isDemora;

  // Colores del borde según estado + demora + cita activa
  const borderClass = state === "complete"
    ? "border-[var(--sg-line)] opacity-70"
    : isDemora
      ? "border-[var(--sg-danger)]"
      : isCitaActiva
        ? "border-orange-500"
        : isPending
          ? "border-[var(--sg-warn)]"
          : "border-[var(--sg-accent)]";

  const shadowStyle = isDemora
    ? { boxShadow: "0 0 0 1px rgba(211,92,79,0.35)" }
    : isCitaActiva
      ? { boxShadow: "0 0 0 1px rgba(249,115,22,0.35)" }
      : isPending
        ? { boxShadow: "0 0 0 1px rgba(200,160,75,0.3)" }
        : {};

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      className={`border p-4 sm:p-5 transition-all bg-[var(--sg-panel-2)] ${borderClass}`}
      style={shadowStyle}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Time badge */}
          <div className="flex flex-col items-center min-w-[54px] shrink-0">
            <span className="sg-font-mono text-[20px] font-bold text-[var(--sg-ink)] leading-none">
              {reg.time}
            </span>
            <span className="text-[8px] uppercase tracking-[0.12em] text-[var(--sg-muted)] mt-0.5">
              Ingreso
            </span>
            {/* Badge de hora de cita */}
            {reg.hora_cita && (
              <span className="mt-1 sg-font-mono text-[9px] font-bold text-[var(--sg-accent)] border border-[var(--sg-accent)] px-1.5 leading-[1.6]">
                {reg.hora_cita}
              </span>
            )}
            {/* Contador de espera en vivo para pendientes */}
            {isPending && (
              <span className={`mt-1 sg-font-mono text-[9px] font-bold ${
                isDemora ? "text-[var(--sg-danger)]" : "text-[var(--sg-muted)]"
              }`}>
                {liveMin}m
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="sg-font-display text-[16px] font-bold text-[var(--sg-ink)] truncate">
              {reg.razonSocial || "—"}
            </div>
            <div className="text-[12px] text-[var(--sg-copy)] truncate mt-0.5">
              {reg.empresa || "Sin empresa"}
            </div>
            {reg.type && (
              <div className="text-[10px] text-[var(--sg-muted)] mt-0.5 uppercase tracking-widest">
                {reg.type} · {reg.reason || ""}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatePill state={state} isDemora={isDemora} isCitaActiva={isCitaActiva} />
          {isAbandoned && (
            <span className="inline-flex items-center gap-1 px-2 py-1 border border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-danger)]">
              <AlertTriangle className="h-3 w-3" />
              +4h
            </span>
          )}
        </div>
      </div>

      {/* Info row */}
      {(reg.responsable || reg.agente || reg.h_atencion || reg.h_dev_docs || isDemora || isCitaActiva) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-[11px] text-[var(--sg-copy)]">
          {reg.responsable && <span>Resp: {reg.responsable}</span>}
          {reg.agente && <span>Agente: {reg.agente}</span>}
          {reg.h_atencion && (
            <span className={isDemora ? "text-[var(--sg-danger)] font-bold" : "text-[var(--sg-accent)]"}>
              Atención: {reg.h_atencion}
            </span>
          )}
          {reg.h_dev_docs && (
            <span className="text-[var(--sg-success)]">Docs: {reg.h_dev_docs}</span>
          )}
          {isCitaActiva && (
            <span className="text-orange-400 font-bold flex items-center gap-1">
              <Bell className="h-3 w-3" />
              Cita hace {liveMin} min — atender ya
            </span>
          )}
          {isDemora && (
            <span className="text-[var(--sg-danger)] font-bold flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {waitMin} min de espera
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {isPending && onClose && (
          <button
            onClick={onClose}
            disabled={closing}
            className={`flex items-center justify-center gap-3 h-14 border sg-font-mono text-[14px] uppercase tracking-[0.1em] transition-all active:scale-[0.98] ${
              isDemora
                ? "border-[var(--sg-danger)] text-[var(--sg-danger)] hover:bg-[var(--sg-danger)] hover:text-[var(--sg-canvas)]"
                : isCitaActiva
                  ? "border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white"
                  : "border-[var(--sg-accent)] text-[var(--sg-accent)] hover:bg-[var(--sg-accent)] hover:text-[var(--sg-canvas)]"
            } ${closing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {closing ? (
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                <Timer className="h-5 w-5" />
              </motion.span>
            ) : (
              <Timer className="h-5 w-5" />
            )}
            Marcar Atención
          </button>
        )}

        {isAttended && onDocs && (
          <button
            onClick={onDocs}
            disabled={docsLoading}
            className={`flex items-center justify-center gap-3 h-14 border border-[var(--sg-success)] sg-font-mono text-[14px] uppercase tracking-[0.1em] text-[var(--sg-success)] transition-all hover:bg-[var(--sg-success)] hover:text-[var(--sg-canvas)] active:scale-[0.98] ${
              docsLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {docsLoading ? (
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                <FileCheck2 className="h-5 w-5" />
              </motion.span>
            ) : (
              <FileCheck2 className="h-5 w-5" />
            )}
            Documentos Entregados
          </button>
        )}

        {state !== "complete" && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-2 h-11 border border-[var(--sg-line)] bg-[var(--sg-canvas)] sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                disabled={deleting}
                className={`flex-1 flex items-center justify-center gap-2 h-11 border border-[var(--sg-line)] bg-[var(--sg-canvas)] sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-danger)] hover:text-[var(--sg-danger)] transition-colors ${
                  deleting ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                {deleting ? (
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                    <Trash2 className="h-4 w-4" />
                  </motion.span>
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
