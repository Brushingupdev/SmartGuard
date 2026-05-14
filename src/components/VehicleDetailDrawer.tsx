"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Building2, CheckCircle2, Clock, FileCheck2,
  History, Package, Truck, User, UserCheck, X,
} from "lucide-react";
import { getVehicleHistory, type VehicleVisit } from "@/app/actions";
import { fmtLiveWait } from "@/hooks/useLiveTimer";
import type { RecentRegistration } from "@/app/registro/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(t: string | null): string {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const p = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${p}`;
}

function fmtDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Status timeline ───────────────────────────────────────────────────────────

function StatusTimeline({ reg }: { reg: RecentRegistration }) {
  const steps = [
    { label: "Llegó",     time: reg.time,        done: true },
    { label: "Atendido",  time: reg.h_atencion ?? null, done: reg.attended },
    { label: "Docs",      time: reg.h_dev_docs ?? null, done: reg.docsDelivered },
  ];

  return (
    <div className="flex items-start gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex flex-col items-center flex-1">
          <div className="flex items-center w-full">
            {i > 0 && (
              <div className="flex-1 h-px"
                style={{ background: step.done ? "var(--pwa-accent)" : "var(--pwa-border)" }} />
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
              style={{
                background: step.done
                  ? "color-mix(in srgb, var(--pwa-accent) 15%, transparent)"
                  : "var(--pwa-surface-2)",
                border: `1.5px solid ${step.done ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
              }}>
              {step.done
                ? <CheckCircle2 className="h-4 w-4" style={{ color: "var(--pwa-accent)" }} />
                : <div className="h-2 w-2 rounded-full" style={{ background: "var(--pwa-border)" }} />
              }
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px"
                style={{ background: steps[i + 1]?.done ? "var(--pwa-accent)" : "var(--pwa-border)" }} />
            )}
          </div>
          <div className="mt-2 text-center">
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.14em",
              textTransform: "uppercase", color: step.done ? "var(--pwa-accent)" : "var(--pwa-muted)",
              margin: 0 }}>
              {step.label}
            </p>
            {step.time && (
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
                color: "var(--pwa-ink-soft)", margin: "2px 0 0" }}>
                {fmtTime(step.time)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, accent = false }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | null | undefined;
  accent?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-3"
      style={{ borderBottom: "1px solid var(--pwa-border)" }}>
      <Icon className="h-4 w-4 shrink-0"
        style={{ color: accent ? "var(--pwa-accent)" : "var(--pwa-muted)" }} />
      <div className="min-w-0 flex-1">
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.16em",
          textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
          {label}
        </p>
        <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 14, fontWeight: 700,
          textTransform: "uppercase", color: "var(--pwa-ink)", margin: "2px 0 0" }}
          className="truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

interface Props {
  reg: RecentRegistration | null;
  waitSeconds: number;
  onClose: () => void;
  onMarkAttended: () => void;
  onMarkDocs: () => void;
}

export default function VehicleDetailDrawer({
  reg, waitSeconds, onClose, onMarkAttended, onMarkDocs,
}: Props) {
  const [history, setHistory]   = useState<VehicleVisit[]>([]);
  const [loadingH, setLoadingH] = useState(false);

  useEffect(() => {
    if (!reg) return;
    setLoadingH(true);
    getVehicleHistory(reg.razonSocial, 5).then(h => {
      setHistory(h);
      setLoadingH(false);
    });
  }, [reg?.id, reg?.razonSocial]);

  return (
    <AnimatePresence>
      {reg && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              background: "var(--pwa-surface)",
              borderTop: "2px solid var(--pwa-accent)",
              maxHeight: "88vh",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full" style={{ background: "var(--pwa-border)" }} />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 pb-4 pt-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="h-4 w-4 shrink-0" style={{ color: "var(--pwa-accent)" }} />
                  <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
                    textTransform: "uppercase", color: "var(--pwa-accent)" }}>
                    Detalle del vehículo
                  </span>
                </div>
                <h2 style={{ fontFamily: "var(--sg-font-display)", fontSize: 20, fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: "-0.01em",
                  color: "var(--pwa-ink)", margin: 0 }}
                  className="truncate">
                  {reg.razonSocial}
                </h2>

                {/* Tiempo en vivo */}
                {!reg.docsDelivered && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <motion.div
                      className="h-2 w-2 rounded-full"
                      style={{ background: waitSeconds > 2700 ? "#d35c4f" : waitSeconds > 1200 ? "#d4864a" : "#6bbd8a" }}
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                    <span style={{
                      fontFamily: "var(--sg-font-mono)", fontSize: 18, fontWeight: 800,
                      color: waitSeconds > 2700 ? "#d35c4f" : waitSeconds > 1200 ? "#d4864a" : "var(--pwa-ink)",
                    }}>
                      {fmtLiveWait(waitSeconds)}
                    </span>
                    <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                      letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
                      esperando
                    </span>
                  </div>
                )}
              </div>
              <button onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer",
                  color: "var(--pwa-muted)", marginTop: 2 }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">

              {/* Timeline */}
              <div className="mb-5">
                <StatusTimeline reg={reg} />
              </div>

              {/* Info del registro */}
              <div>
                <InfoRow icon={Building2} label="Empresa destino" value={reg.empresa} />
                <InfoRow icon={Package}   label="Tipo de operación" value={reg.tipoOperacion} accent />
                <InfoRow icon={UserCheck} label="Responsable de almacén" value={reg.responsable} />
                <InfoRow icon={User}      label="Registrado por" value={reg.agente} />
                <InfoRow icon={Clock}     label="Hora de llegada" value={reg.time} />
              </div>

              {/* Acciones */}
              {!reg.docsDelivered && (
                <div className="flex gap-3 mt-5">
                  {!reg.attended ? (
                    <motion.button whileTap={{ scale: 0.96 }}
                      onClick={() => { onMarkAttended(); onClose(); }}
                      className="flex-1 h-12 flex items-center justify-center gap-2"
                      style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
                        border: "none", cursor: "pointer",
                        fontFamily: "var(--sg-font-mono)", fontSize: 11,
                        letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
                      <CheckCircle2 className="h-4 w-4" /> Marcar atendido
                    </motion.button>
                  ) : (
                    <motion.button whileTap={{ scale: 0.96 }}
                      onClick={() => { onMarkDocs(); onClose(); }}
                      className="flex-1 h-12 flex items-center justify-center gap-2"
                      style={{ background: "#6ba7ff", color: "#000",
                        border: "none", cursor: "pointer",
                        fontFamily: "var(--sg-font-mono)", fontSize: 11,
                        letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
                      <FileCheck2 className="h-4 w-4" /> Documentos entregados
                    </motion.button>
                  )}
                </div>
              )}

              {/* Historial de visitas */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <History className="h-4 w-4" style={{ color: "var(--pwa-muted)" }} />
                  <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
                    textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
                    Últimas visitas
                  </p>
                </div>

                {loadingH ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-14 animate-pulse"
                        style={{ background: "var(--pwa-surface-2)" }} />
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
                    textTransform: "uppercase", color: "var(--pwa-muted)", opacity: 0.5 }}>
                    Primera visita registrada
                  </p>
                ) : (
                  <div className="flex flex-col" style={{ border: "1px solid var(--pwa-border)" }}>
                    {history.map(visit => (
                      <div key={visit.id} className="flex items-center gap-4 px-4 py-3"
                        style={{ borderBottom: "1px solid var(--pwa-border)",
                          background: "var(--pwa-surface)" }}>
                        <div className="flex flex-col" style={{ minWidth: 80 }}>
                          <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11,
                            fontWeight: 700, color: "var(--pwa-ink)" }}>
                            {fmtDate(visit.fecha)}
                          </span>
                          <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                            color: "var(--pwa-muted)", letterSpacing: "0.1em",
                            textTransform: "uppercase" }}>
                            {visit.planta ?? ""}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {visit.espera_min != null && (
                              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11,
                                color: visit.espera_min > 45 ? "#d35c4f" : "var(--pwa-ink-soft)" }}>
                                {visit.espera_min} min espera
                              </span>
                            )}
                            {visit.responsable && (
                              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                                letterSpacing: "0.1em", textTransform: "uppercase",
                                color: "var(--pwa-muted)" }}>
                                {visit.responsable.split(" ")[0]}
                              </span>
                            )}
                          </div>
                          {visit.tipo_operacion && (
                            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                              letterSpacing: "0.1em", textTransform: "uppercase",
                              color: "var(--pwa-accent)", opacity: 0.7 }}>
                              {visit.tipo_operacion}
                            </span>
                          )}
                        </div>
                        {visit.h_dev_docs && (
                          <CheckCircle2 className="h-4 w-4 shrink-0"
                            style={{ color: "#6bbd8a", opacity: 0.6 }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
