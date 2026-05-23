"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  Building2,
  Clock,
  Timer,
  X,
} from "lucide-react";
import { getIncidentsByDate } from "@/app/actions";
import { formatGateLabelFromPlant } from "@/lib/gates";
import type { AlertDetail, IncidentAlert } from "./alertasTypes";
import { easeOut, formatFullDate, severityConfig } from "./alertasUtils";

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
        {label}
      </span>
      <span
        className={`text-[13px] text-[var(--sg-ink)] ${mono ? "sg-font-mono tracking-[0.08em]" : ""}`}
      >
        {value ?? <span className="text-[var(--sg-muted)]">—</span>}
      </span>
    </div>
  );
}

export function AlertDetailModal({
  alert,
  onClose,
}: {
  alert: AlertDetail;
  onClose: () => void;
}) {
  const sev = severityConfig(alert.espera_min);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.78)] px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: easeOut }}
        className="w-full max-w-[520px] bg-[var(--sg-panel)] shadow-[12px_12px_0_rgba(196,192,180,0.06)]"
        style={{ border: `1px solid ${sev.border}` }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{
            borderBottom: `1px solid ${sev.border}40`,
            background: sev.bg,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center"
              style={{ background: sev.color }}
            >
              {alert.isLive ? (
                <Timer className="h-4 w-4 text-[var(--sg-canvas)]" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-[var(--sg-canvas)]" />
              )}
            </div>
            <div>
              <div
                className="sg-font-display text-[14px] font-bold uppercase tracking-[0.14em]"
                style={{ color: sev.color }}
              >
                {sev.label} — {alert.espera_min} min
              </div>
              <div className="sg-font-mono mt-0.5 text-[10px] text-[var(--sg-muted)]">
                {formatGateLabelFromPlant(alert.planta ?? "")} ·{" "}
                {alert.isLive ? "Actualmente en espera" : "Atención registrada"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {alert.isLive ? (
              <span className="sg-live-pill">
                <span className="sg-live-dot sg-pulse" />
                En vivo
              </span>
            ) : null}
            <button
              onClick={onClose}
              className="text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <section className="border border-[var(--sg-line)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-[var(--sg-muted)]" />
              <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
                Vehículo / Empresa
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Razón Social" value={alert.razon_social} />
              <Field label="Empresa" value={alert.empresa} />
              <Field
                label="Sede / Puerta"
                value={formatGateLabelFromPlant(alert.planta ?? "")}
              />
              <Field label="Tipo de operación" value={alert.tipo_operacion} />
            </div>
          </section>

          <section
            className="border p-4"
            style={{
              borderColor: `${sev.border}50`,
              background: sev.bg,
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" style={{ color: sev.color }} />
              <span
                className="sg-font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: sev.color }}
              >
                Tiempos
              </span>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-4">
              <Field
                label="H. Registro"
                value={alert.h_registro?.substring(0, 5)}
                mono
              />
              <Field
                label="H. Atención"
                value={
                  alert.isLive ? (
                    <span className="text-[var(--sg-info)]">Pendiente</span>
                  ) : (
                    alert.h_atencion?.substring(0, 5)
                  )
                }
                mono
              />
              <div className="flex flex-col gap-0.5">
                <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
                  Espera
                </span>
                <span
                  className="sg-font-mono text-[24px] font-bold leading-none"
                  style={{ color: sev.color }}
                >
                  {alert.espera_min}
                  <span className="ml-1 text-[14px]">min</span>
                </span>
                {alert.isLive ? (
                  <span
                    className="sg-font-mono text-[9px] uppercase tracking-widest"
                    style={{ color: sev.color }}
                  >
                    ↑ Creciendo
                  </span>
                ) : null}
              </div>
            </div>
            {!alert.isLive && alert.segmento_espera ? (
              <Field label="Segmento" value={alert.segmento_espera} />
            ) : null}
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--sg-line)] px-5 py-4">
          <div className="sg-font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sg-muted)]">
            Incidente #{alert.id} · {formatGateLabelFromPlant(alert.planta ?? "")}
          </div>
          <button onClick={onClose} className="sg-btn sg-btn-ghost sg-btn-sm">
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function DayIncidentsModal({
  date,
  plant,
  onClose,
}: {
  date: string;
  plant?: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<IncidentAlert[]>([]);
  const [fetching, setFetching] = useState(true);
  const [inner, setInner] = useState<AlertDetail | null>(null);

  useEffect(() => {
    let active = true;
    getIncidentsByDate(date, plant).then((data) => {
      if (!active) return;
      setRows(data);
      setFetching(false);
    });
    return () => {
      active = false;
    };
  }, [date, plant]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (inner) setInner(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, inner]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.78)] px-4 py-8 backdrop-blur-sm"
      onClick={() => {
        if (inner) setInner(null);
        else onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: easeOut }}
        className="flex max-h-[85vh] w-full max-w-[600px] flex-col border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[12px_12px_0_rgba(196,192,180,0.06)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[var(--sg-line)] px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center bg-[var(--sg-danger)]">
                <AlertTriangle className="h-3.5 w-3.5 text-[var(--sg-canvas)]" />
              </div>
              <div>
                <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.14em] text-[var(--sg-ink)]">
                  Incidentes · {formatFullDate(date)}
                </div>
                <div className="sg-font-mono mt-0.5 text-[10px] text-[var(--sg-muted)]">
                  {fetching
                    ? "Cargando…"
                    : `${rows.length} registro${rows.length !== 1 ? "s" : ""} con espera ≥ 30 min`}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
          {fetching ? (
            [...Array(3)].map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse border-l-4 border-transparent bg-[var(--sg-panel-2)]"
              />
            ))
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--sg-muted)]">
              <Bell className="mb-3 h-10 w-10 opacity-10" />
              <p className="sg-font-mono text-[11px] uppercase tracking-widest">
                Sin incidentes ese día
              </p>
            </div>
          ) : (
            rows.map((row, index) => {
              const sev = severityConfig(row.espera_min);
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.3, ease: easeOut }}
                  onClick={() => setInner(row)}
                  className="flex cursor-pointer items-center gap-4 border-l-4 px-4 py-3 transition-opacity hover:opacity-75"
                  style={{
                    borderLeftColor: sev.color,
                    background: sev.bg,
                    borderTop: `1px solid ${sev.border}15`,
                    borderRight: `1px solid ${sev.border}15`,
                    borderBottom: `1px solid ${sev.border}15`,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span className="sg-font-display max-w-[220px] truncate text-[13px] font-bold text-[var(--sg-ink)]">
                        {row.razon_social || "N/A"}
                      </span>
                      <span
                        className="sg-font-mono border px-1.5 py-0.5 text-[9px] uppercase tracking-widest"
                        style={{
                          color: sev.color,
                          borderColor: `${sev.color}40`,
                        }}
                      >
                        {sev.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[11px] text-[var(--sg-copy)]">
                        {row.empresa || "Sin empresa"} ·{" "}
                        {formatGateLabelFromPlant(row.planta ?? "")}
                      </span>
                      <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                        {row.h_registro?.substring(0, 5)} →{" "}
                        {row.h_atencion?.substring(0, 5) ?? "—"}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className="sg-font-mono text-[18px] font-bold"
                      style={{ color: sev.color }}
                    >
                      {row.espera_min} min
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="flex justify-end border-t border-[var(--sg-line)] px-5 py-3 shrink-0">
          <button onClick={onClose} className="sg-btn sg-btn-ghost sg-btn-sm">
            Cerrar
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {inner ? (
          <AlertDetailModal alert={inner} onClose={() => setInner(null)} />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
