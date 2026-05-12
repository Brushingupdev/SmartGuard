"use client";

import { motion } from "framer-motion";
import {
  Timer, FileCheck2, Pencil, Trash2, AlertTriangle, CheckCircle2, Clock, Bell, ArrowRight
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getArrivalDeltaMinutes,
  getAnticipationMinutes,
  getPendingWaitMinutes,
  getScheduleDelayMinutes,
  getWaitInPlantMinutes,
  isAnticipatedRecord,
  isDelayedRecord,
} from "@/app/registro/status";

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
  tipoOperacion?: string | null;
  responsable?: string;
  agente?: string;
  observacion?: string;
  hora_cita?: string | null;
  estado?: "esperado" | "activo" | "atendido";
  hasArrived?: boolean;
  scheduledOnly?: boolean;
}

type State = "pending" | "attended" | "complete";

function getState(r: Registro): State {
  if (r.docsDelivered) return "complete";
  if (r.attended) return "attended";
  return "pending";
}

function formatDuration(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  }
  return `${m} min`;
}

function formatClockTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "p. m." : "a. m.";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${minutes} ${period}`;
}

function formatSignedMinutes(value: number): string {
  if (value > 0) return `+${value} min`;
  if (value < 0) return `${value} min`;
  return "0 min";
}

function StatePill({
  state,
  isDemora,
  isCitaActiva,
  isScheduledOnly,
}: {
  state: State;
  isDemora: boolean;
  isCitaActiva: boolean;
  isScheduledOnly: boolean;
}) {
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
  if (isScheduledOnly)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-danger)]">
        <AlertTriangle className="h-3.5 w-3.5" />
        No llegó
      </span>
    );
  // Pendiente con demora
  if (isDemora)
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-danger)]">
        <AlertTriangle className="h-3.5 w-3.5" />
        Demora Crítica
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
  onActivate,
  isAbandoned = false,
  closing = false,
  docsLoading = false,
  deleting = false,
  compact = false,
}: {
  reg: Registro;
  onClose?: () => void;
  onActivate?: () => void;
  onDocs?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isAbandoned?: boolean;
  closing?: boolean;
  docsLoading?: boolean;
  deleting?: boolean;
  compact?: boolean;
}) {
  const state = getState(reg);
  const isPending = state === "pending";
  const isAttended = state === "attended";
  const isScheduledOnly = !!reg.scheduledOnly;

  // Para pendientes: calcular espera en vivo cada 30 segundos
  const [liveMin, setLiveMin] = useState<number>(() =>
    isPending ? getPendingWaitMinutes(reg) : 0
  );

  useEffect(() => {
    if (!isPending) return;
    const id = setInterval(() => setLiveMin(getPendingWaitMinutes(reg)), 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, reg.time, reg.hora_cita]);

  // Demora: para atendidos usa espera_min guardada, para pendientes usa el contador en vivo
  const isDemora = state !== "complete" && isDelayedRecord(reg);
  const waitInPlantMin = getWaitInPlantMinutes(reg);
  const delayAgainstCitaMin = getScheduleDelayMinutes(reg);
  const arrivalDeltaMin = getArrivalDeltaMinutes(reg);
  const isAnticipated = isAnticipatedRecord(reg);
  const anticipationMin = getAnticipationMinutes(reg);

  // Cita activa: cita llegó (liveMin > 0) pero aún no fue atendido y no es demora aún
  const isCitaActiva = isPending && !!reg.hora_cita && !!reg.hasArrived && liveMin > 0 && !isDemora;
  const principalMeta = [
    reg.responsable ? `Resp. ${reg.responsable}` : null,
    reg.agente ? `Agente ${reg.agente}` : null,
  ].filter(Boolean);
  const typeSummary = [reg.type, reg.tipoOperacion || "Carga"].filter(Boolean).join(" • ");
  const showPrimaryActionInHeader = isPending && !isScheduledOnly && !isDemora && !reg.hora_cita;
  const showPrimaryActionInMetrics = !showPrimaryActionInHeader;
  const leftBottomText = (() => {
    if (isScheduledOnly) return formatClockTime(reg.hora_cita) ?? reg.hora_cita ?? undefined;
    if (isPending) return `${liveMin} min`;
    if (reg.espera_min != null) return formatDuration(reg.espera_min);
    return undefined;
  })();
  const arrivalDeltaText = (() => {
    if (arrivalDeltaMin === null) return null;
    if (arrivalDeltaMin > 0) return `${arrivalDeltaMin} min tarde`;
    if (arrivalDeltaMin < 0) return `${Math.abs(arrivalDeltaMin)} min antes`;
    return "A tiempo";
  })();
  const arrivalDeltaTone = arrivalDeltaMin === null
    ? "text-[var(--sg-muted)]"
    : arrivalDeltaMin > 0
      ? "text-[var(--sg-danger)]"
      : arrivalDeltaMin < 0
        ? "text-[#6ba7ff]"
        : "text-[var(--sg-success)]";

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

  const statusText = (() => {
    if (isScheduledOnly) return "Sin registro de ingreso";
    if (state === "complete") return "Flujo cerrado";
    if (isAttended && isDemora) return "Demora detectada";
    if (isAttended) return "Documentos pendientes";
    if (isPending) return "Esperando atención";
    return "";
  })();

  const actionButton = (() => {
    if (isScheduledOnly && onActivate) {
      return (
        <button
          onClick={onActivate}
          className="flex h-11 items-center justify-center gap-2 border border-[var(--sg-danger)] px-5 text-[var(--sg-danger)] sg-font-mono text-[11px] uppercase tracking-[0.18em] transition-all hover:bg-[var(--sg-danger)] hover:text-[var(--sg-canvas)]"
        >
          Llegó ahora
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      );
    }
    if (isPending && !isScheduledOnly && onClose) {
      return (
        <button
          onClick={onClose}
          disabled={closing}
          className={`flex h-11 items-center justify-center gap-2 border px-5 sg-font-mono text-[11px] uppercase tracking-[0.18em] transition-all ${
            isDemora
              ? "border-[var(--sg-danger)] text-[var(--sg-danger)] hover:bg-[var(--sg-danger)] hover:text-[var(--sg-canvas)]"
              : isCitaActiva
                ? "border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white"
                : "border-[var(--sg-accent)] text-[var(--sg-accent)] hover:bg-[var(--sg-accent)] hover:text-[var(--sg-canvas)]"
          } ${closing ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {closing ? (
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
              <Timer className="h-4 w-4" />
            </motion.span>
          ) : (
            <Timer className="h-4 w-4" />
          )}
          Iniciar atención
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      );
    }
    if (isAttended && onDocs) {
      return (
        <button
          onClick={onDocs}
          disabled={docsLoading}
          className={`flex h-11 items-center justify-center gap-2 border px-5 sg-font-mono text-[11px] uppercase tracking-[0.18em] transition-all ${
            isDemora
              ? "border-[var(--sg-danger)] text-[var(--sg-danger)] hover:bg-[var(--sg-danger)] hover:text-[var(--sg-canvas)]"
              : "border-[var(--sg-success)] text-[var(--sg-success)] hover:bg-[var(--sg-success)] hover:text-[var(--sg-canvas)]"
          } ${
            docsLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {docsLoading ? (
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
              <FileCheck2 className="h-4 w-4" />
            </motion.span>
          ) : (
            <FileCheck2 className="h-4 w-4" />
          )}
          Entregar documentos
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      );
    }
    if (state === "complete") {
      return (
        <button
          onClick={onEdit}
          disabled={!onEdit}
          className={`flex h-11 items-center justify-center gap-2 border border-[var(--sg-success)] px-5 sg-font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--sg-success)] transition-all ${
            onEdit
              ? "hover:bg-[var(--sg-success)] hover:text-[var(--sg-canvas)]"
              : "opacity-60 cursor-default"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Ver registro
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      );
    }
    return null;
  })();

  const timeLabel = isScheduledOnly ? "Cita" : "Ingreso";

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className={`border bg-[var(--sg-panel-2)] ${borderClass}`}
        style={shadowStyle}
      >
        {/* Fila principal */}
        <div className="flex items-start justify-between gap-3 px-3 py-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="flex flex-col items-start shrink-0">
              <span className="sg-font-mono text-[13px] font-bold leading-none text-[var(--sg-ink)]">{reg.time}</span>
              {leftBottomText && (
                <span className={`sg-font-mono text-[10px] font-bold mt-0.5 ${isDemora ? "text-[var(--sg-danger)]" : "text-[var(--sg-accent)]"}`}>
                  {leftBottomText}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="sg-font-display text-[13px] font-bold uppercase tracking-tight text-[var(--sg-ink)] truncate leading-tight">
                {reg.razonSocial || "—"}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-[var(--sg-muted)] truncate">
                {reg.empresa || "Sin empresa"}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-[var(--sg-muted)]">
                <span>{reg.type}</span>
                {reg.tipoOperacion && <><span className="opacity-40">•</span><span>{reg.tipoOperacion}</span></>}
                {reg.responsable && <><span className="opacity-40">•</span><span>{reg.responsable}</span></>}
                {reg.agente && <><span className="opacity-40">•</span><span>{reg.agente}</span></>}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StatePill state={state} isDemora={isDemora} isCitaActiva={isCitaActiva} isScheduledOnly={isScheduledOnly} />
            {actionButton && <div className="w-full">{actionButton}</div>}
          </div>
        </div>
        {/* Acciones secundarias */}
        {(onEdit || onDelete) && (
          <div className="border-t border-[var(--sg-line)] px-3 py-1.5 flex items-center gap-1">
            {onEdit && (
              <button onClick={onEdit} className="flex items-center gap-1 px-2 py-1 sg-font-mono text-[8px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-accent)] transition-colors">
                <Pencil className="h-2.5 w-2.5" /> Editar
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} disabled={deleting} className={`flex items-center gap-1 px-2 py-1 sg-font-mono text-[8px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors ${deleting ? "opacity-40 cursor-not-allowed" : ""}`}>
                <Trash2 className="h-2.5 w-2.5" /> Eliminar
              </button>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      className={`border bg-[var(--sg-panel-2)] ${borderClass}`}
      style={shadowStyle}
    >
      <div className="p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[72px_minmax(0,1fr)_240px] xl:items-start">
          <div className="flex flex-col items-start gap-1">
            <span className="sg-font-mono text-[18px] font-bold leading-none text-[var(--sg-ink)] sm:text-[22px]">
              {reg.time}
            </span>
            <span className="sg-font-mono text-[8px] uppercase tracking-[0.22em] text-[var(--sg-muted)]">
              {timeLabel}
            </span>
            {leftBottomText ? (
              <span className={`sg-font-mono text-[11px] font-bold ${isDemora ? "text-[var(--sg-danger)]" : state === "complete" ? "text-[var(--sg-success)]" : "text-[var(--sg-accent)]"}`}>
                {leftBottomText}
              </span>
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="sg-font-display text-[15px] font-bold uppercase tracking-tight text-[var(--sg-ink)] sm:text-[17px]">
              {reg.razonSocial || "—"}
            </div>
            <div className="mt-1 text-[12px] font-medium uppercase tracking-[0.03em] text-[var(--sg-copy)]">
              {reg.empresa || "Sin empresa"}
            </div>
            <div className="mt-3 inline-flex border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] px-3 py-1 text-[11px] text-[var(--sg-muted)]">
              {typeSummary}
            </div>
            {principalMeta.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--sg-muted)]">
                {principalMeta.map((item, index) => (
                  <span key={item} className="inline-flex items-center gap-3">
                    {index > 0 ? <span className="text-[var(--sg-line)]">•</span> : null}
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-stretch gap-3 xl:items-end">
            <div className="flex items-center gap-2 self-end">
              <StatePill state={state} isDemora={isDemora} isCitaActiva={isCitaActiva} isScheduledOnly={isScheduledOnly} />
              {isAbandoned ? (
                <span className="inline-flex items-center gap-1 border border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] px-2 py-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-danger)]">
                  <AlertTriangle className="h-3 w-3" />
                  +4h
                </span>
              ) : null}
            </div>
            {showPrimaryActionInHeader && actionButton ? <div className="xl:min-w-[210px]">{actionButton}</div> : null}
            {statusText ? (
              <span className="text-right text-[11px] text-[var(--sg-muted)]">
                {statusText}
              </span>
            ) : null}
          </div>
        </div>

        {(isScheduledOnly || reg.hora_cita || waitInPlantMin > 0 || isAttended || isDemora || isCitaActiva) ? (
          <div className="mt-4 grid gap-0 border border-[var(--sg-line)] bg-[rgba(255,255,255,0.01)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_220px]">
            <div className="border-b border-[var(--sg-line)] px-4 py-3 sm:border-b-0 sm:border-r">
              <div className="sg-font-mono text-[8px] uppercase tracking-[0.22em] text-[var(--sg-muted)]">
                {reg.hora_cita ? "Llegada vs cita" : "Llegada"}
              </div>
              <div className="mt-2 text-[14px] font-semibold text-[var(--sg-ink)]">
                {isScheduledOnly ? "Sin registro" : formatClockTime(reg.time) ?? reg.time}
              </div>
              {arrivalDeltaText ? (
                <div className={`mt-1 text-[11px] font-semibold ${arrivalDeltaTone}`}>
                  {arrivalDeltaText}
                </div>
              ) : null}
            </div>

            <div className="border-b border-[var(--sg-line)] px-4 py-3 sm:border-b-0 sm:border-r">
              <div className="sg-font-mono text-[8px] uppercase tracking-[0.22em] text-[var(--sg-muted)]">
                Espera en planta
              </div>
              <div className="mt-2 text-[14px] font-semibold text-[var(--sg-ink)]">
                {waitInPlantMin > 0 ? `${waitInPlantMin} min` : "0 min"}
              </div>
            </div>

            <div className="border-b border-[var(--sg-line)] px-4 py-3 sm:border-b-0 sm:border-r">
              <div className="sg-font-mono text-[8px] uppercase tracking-[0.22em] text-[var(--sg-muted)]">
                {reg.hora_cita ? "Demora total cita" : "Estado de atención"}
              </div>
              <div className={`mt-2 text-[14px] font-semibold ${
                reg.hora_cita && delayAgainstCitaMin !== null
                  ? delayAgainstCitaMin > 0
                    ? "text-[var(--sg-danger)]"
                    : isAnticipated
                      ? "text-[var(--sg-success)]"
                      : "text-[var(--sg-ink)]"
                  : "text-[var(--sg-ink)]"
              }`}>
                {reg.hora_cita && delayAgainstCitaMin !== null
                  ? isAnticipated
                    ? `-${anticipationMin} min`
                    : formatSignedMinutes(delayAgainstCitaMin)
                  : isCitaActiva
                    ? "Cita activa"
                    : state === "complete"
                      ? "Cerrado"
                      : state === "attended"
                        ? "Atendido"
                        : "Pendiente"}
              </div>
            </div>

            <div className="flex items-center justify-end px-4 py-3">
              {showPrimaryActionInMetrics && actionButton ? <div className="w-full sm:w-auto">{actionButton}</div> : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Acciones secundarias: editar / eliminar */}
      {(onEdit || onDelete) && (
        <div className="border-t border-[var(--sg-line)] px-4 py-2 sm:px-5 flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-2 py-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-accent)] transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className={`flex items-center gap-1.5 px-2 py-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors ${
                deleting ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              {deleting ? (
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                  <Trash2 className="h-3 w-3" />
                </motion.span>
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Eliminar
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
