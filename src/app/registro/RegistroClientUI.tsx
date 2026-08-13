"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Database,
  Monitor,
  MonitorSmartphone,
  Package,
  Save,
  Truck,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import CitasDelDia from "@/components/CitasDelDia";
import KioskLayout from "@/components/KioskLayout";
import RegistroWizard from "@/components/RegistroWizard";
import type { GateAssignment } from "@/lib/gates";
import type {
  ModalIcon,
} from "./registroClientTypes";
import {
  getArrivalDeltaMinutes,
  getOperationalDelayMinutes,
  getScheduleDelayMinutes,
  getWaitInPlantMinutes,
} from "./status";
import RegistroFormPanel from "./RegistroFormPanel";
import RegistroHistoryPanel from "./RegistroHistoryPanel";
import type { CitaRow, RecentRegistration } from "./types";

type EditPayload = {
  razonSocial: string;
  empresa: string;
  type: string;
  tipoOperacion: string;
  responsable: string;
  agente: string;
  note: string;
  hAtencion?: string | null;
  hDevDocs?: string | null;
  horaCita?: string | null;
};

const MOTIVOS_DEMORA = [
  "Documentación incompleta",
  "Revisión manual requerida",
  "Falla de sistema",
  "Exceso de vehículos",
  "Verificación de carga",
  "Problema con conductor",
  "Otro",
];

export function Toast({
  show,
  message,
}: {
  show: boolean;
  message: string;
}) {
  const isError =
    message.toLowerCase().includes("error") ||
    message.toLowerCase().includes("inválid") ||
    message.toLowerCase().includes("permi");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 22, scale: 0.96 }}
          className={`fixed bottom-4 left-4 right-4 z-[70] border bg-[var(--sg-panel)] px-5 py-4 shadow-[6px_6px_0_rgba(196,192,180,0.08)] sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto ${isError ? "border-[var(--sg-danger)]" : "border-[var(--sg-success)]"}`}
        >
          <div className="flex items-center gap-3 text-sm text-[var(--sg-ink)]">
            <CheckCircle2
              className={`h-5 w-5 ${isError ? "text-[var(--sg-danger)]" : "text-[var(--sg-success)]"}`}
            />
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MotivoDemoraModal({
  reg,
  onConfirm,
  onCancel,
}: {
  reg: RecentRegistration;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState(MOTIVOS_DEMORA[0]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.75)] px-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
        className="w-full max-w-[420px] border border-[var(--sg-warn)] bg-[var(--sg-panel)] shadow-[8px_8px_0_rgba(196,192,180,0.06)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--sg-line)] px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[var(--sg-warn)]" />
            <span className="sg-font-display text-[15px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
              Demora detectada
            </span>
          </div>
          <button
            onClick={onCancel}
            className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="mb-4 text-[13px] text-[var(--sg-copy)]">
            El vehículo registrado a las{" "}
            <strong className="text-[var(--sg-ink)]">{reg.time}</strong> tiene
            demora. Indica el motivo antes de cerrar la atención.
          </p>

          <div className="sg-field mb-4">
            <label className="sg-label">Motivo de demora *</label>
            <div className="relative">
              <select
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                className="sg-select appearance-none pr-8"
              >
                {MOTIVOS_DEMORA.map((item) => (
                  <option
                    key={item}
                    value={item}
                    className="bg-[var(--sg-panel-2)]"
                  >
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="sg-btn sg-btn-ghost flex-1 justify-center"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(motivo)}
              className="sg-btn sg-btn-accent flex-1 justify-center"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar cierre
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ConfirmActionModal({
  title,
  message,
  onConfirm,
  onCancel,
  icon: Icon = CheckCircle2,
  accentColor = "var(--sg-accent)",
  confirmText = "Confirmar",
}: {
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: ModalIcon;
  accentColor?: string;
  confirmText?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(3,5,4,0.75)] px-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
        className="w-full max-w-[420px] border bg-[var(--sg-panel)] shadow-[8px_8px_0_rgba(196,192,180,0.06)]"
        style={{ borderColor: accentColor }}
      >
        <div className="flex items-center justify-between border-b border-[var(--sg-line)] px-5 py-4">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" style={{ color: accentColor }} />
            <span className="sg-font-display text-[15px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
              {title}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-6 text-[13px] leading-relaxed text-[var(--sg-copy)]">
            {message}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="sg-btn sg-btn-ghost flex-1 justify-center"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="sg-btn flex-1 justify-center"
              style={{
                backgroundColor: accentColor,
                color: "var(--sg-canvas)",
                borderColor: accentColor,
              }}
            >
              <Icon className="h-4 w-4" />
              {confirmText}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function RegistroSummaryCards({
  pendingCount,
  attendedCount,
  completedCount,
  criticalOpenCount,
}: {
  pendingCount: number;
  attendedCount: number;
  completedCount: number;
  criticalOpenCount: number;
}) {
  const cards = [
    {
      label: "Pendientes",
      value: pendingCount,
      accent: "var(--sg-warn)" as const,
      sub:
        criticalOpenCount > 0
          ? `${criticalOpenCount} críticos abiertos`
          : "Esperando atención",
      icon: ClipboardList,
    },
    {
      label: "En atención",
      value: attendedCount,
      accent: "var(--sg-accent)" as const,
      sub: "Documentos pendientes",
      icon: User,
    },
    {
      label: "Completados",
      value: completedCount,
      accent: "var(--sg-success)" as const,
      sub: "Flujo cerrado hoy",
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-4 border border-[var(--sg-line)] bg-[var(--sg-panel)] px-4 py-3.5"
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center border"
            style={{
              borderColor: card.accent,
              background: "var(--sg-panel-2)",
            }}
          >
            <card.icon className="h-5 w-5" style={{ color: card.accent }} />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="sg-font-mono text-[9px] uppercase tracking-[0.18em]"
              style={{ color: card.accent }}
            >
              {card.label}
            </div>
            <div className="mt-0.5 flex items-end justify-between gap-3">
              <span className="sg-font-display text-[32px] font-bold leading-none text-[var(--sg-ink)]">
                {card.value}
              </span>
              <span className="flex items-center gap-1.5 text-right text-[10px] leading-4 text-[var(--sg-muted)]">
                <Clock className="h-3 w-3" />
                {card.sub}
              </span>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

function formatMetricMinutes(
  value: number | null | undefined,
  empty = "—"
) {
  if (value == null) return empty;
  return `${value} min`;
}

function formatArrivalDelta(value: number | null) {
  if (value == null) return "Sin cita";
  if (value > 0) return `${value} min tarde`;
  if (value < 0) return `${Math.abs(value)} min antes`;
  return "A tiempo";
}

export function EditModal({
  reg,
  responsablesList,
  agentesList,
  onSave,
  onCancel,
}: {
  reg: RecentRegistration;
  responsablesList: string[];
  agentesList: string[];
  onSave: (data: EditPayload) => void;
  onCancel: () => void;
}) {
  const [razonSocial, setRazonSocial] = useState(reg.razonSocial || "");
  const [empresa, setEmpresa] = useState(reg.empresa || "");
  const [type, setType] = useState(reg.type || "Proveedor");
  const [tipoOperacion, setTipoOperacion] = useState(
    reg.tipoOperacion || "Carga"
  );
  const [responsable, setResponsable] = useState(
    reg.responsable || responsablesList[0] || ""
  );
  const [agente, setAgente] = useState(reg.agente || "");
  const [note, setNote] = useState(reg.observacion || "");
  const [hAtencion, setHAtencion] = useState<string>(reg.h_atencion || "");
  const [hDevDocs, setHDevDocs] = useState<string>(reg.h_dev_docs || "");
  const [horaCita, setHoraCita] = useState<string>(reg.hora_cita || "");
  const isComplete = !!reg.docsDelivered;
  const isAttended = !!reg.attended && !reg.docsDelivered;
  const arrivalDelta = getArrivalDeltaMinutes(reg);
  const waitInPlant = getWaitInPlantMinutes(reg);
  const scheduleDelay = getScheduleDelayMinutes(reg);
  const operationalDelay = getOperationalDelayMinutes(reg);
  const statusLabel = isComplete
    ? "Completado"
    : isAttended
      ? "En atención"
      : "Pendiente";
  const statusTone = isComplete
    ? "var(--sg-success)"
    : isAttended
      ? "var(--sg-accent)"
      : "var(--sg-warn)";
  const metricCards = [
    {
      label: "Llegada vs cita",
      value: formatArrivalDelta(arrivalDelta),
      tone:
        arrivalDelta == null
          ? "var(--sg-muted)"
          : arrivalDelta > 0
            ? "var(--sg-danger)"
            : arrivalDelta < 0
              ? "#6ba7ff"
              : "var(--sg-success)",
      sub: reg.hora_cita ? `Cita ${reg.hora_cita}` : "Sin cita",
    },
    {
      label: "Espera en planta",
      value: formatMetricMinutes(waitInPlant, "0 min"),
      tone: "var(--sg-ink)",
      sub: `Ingreso ${reg.time}`,
    },
    {
      label: "Demora total cita",
      value:
        scheduleDelay == null
          ? "Sin cita"
          : `${scheduleDelay > 0 ? "+" : ""}${scheduleDelay} min`,
      tone:
        scheduleDelay && scheduleDelay > 0
          ? "var(--sg-danger)"
          : "var(--sg-success)",
      sub: "Cumplimiento",
    },
    {
      label: "Demora operativa",
      value: formatMetricMinutes(operationalDelay, "0 min"),
      tone:
        operationalDelay >= 45 ? "var(--sg-danger)" : "var(--sg-success)",
      sub: "Atribuible a atención",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.75)] px-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
        className="max-h-[90vh] w-full max-w-[880px] overflow-y-auto border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[8px_8px_0_rgba(196,192,180,0.06)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--sg-line)] bg-[var(--sg-panel)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-[var(--sg-accent)] text-[var(--sg-accent)]">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <span className="sg-font-display text-[16px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                Detalle del registro
              </span>
              <p className="mt-0.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                Ingreso {reg.time} · {reg.type || "Proveedor"} ·{" "}
                {reg.tipoOperacion || "Carga"}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5">
          <section className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)]">
            <div className="flex flex-col gap-4 border-b border-[var(--sg-line)] p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="sg-font-display text-[20px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                  {reg.razonSocial || "Sin razón social"}
                </p>
                <p className="mt-1 text-[13px] uppercase tracking-[0.03em] text-[var(--sg-copy)]">
                  {reg.empresa || "Sin empresa"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[var(--sg-muted)]">
                  <span className="border border-[var(--sg-line)] px-2 py-1">
                    Resp. {reg.responsable || "—"}
                  </span>
                  <span className="border border-[var(--sg-line)] px-2 py-1">
                    Agente {reg.agente || "—"}
                  </span>
                </div>
              </div>
              <span
                className="sg-font-mono inline-flex items-center gap-2 self-start border px-3 py-1.5 text-[10px] uppercase tracking-widest"
                style={{
                  borderColor: statusTone,
                  color: statusTone,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {statusLabel}
              </span>
            </div>

            <div className="grid gap-0 sm:grid-cols-4">
              {metricCards.map((metric) => (
                <div
                  key={metric.label}
                  className="border-b border-[var(--sg-line)] px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
                >
                  <div className="sg-font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--sg-muted)]">
                    {metric.label}
                  </div>
                  <div
                    className="mt-2 text-[15px] font-bold"
                    style={{ color: metric.tone }}
                  >
                    {metric.value}
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--sg-muted)]">
                    {metric.sub}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
            Datos editables
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sg-field">
              <label className="sg-label">Razón Social / Vehículo *</label>
              <div className="relative">
                <Truck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                <input
                  type="text"
                  value={razonSocial}
                  onChange={(event) =>
                    setRazonSocial(event.target.value.toUpperCase())
                  }
                  className="sg-input pl-10 uppercase"
                  required
                />
              </div>
            </div>

            <div className="sg-field">
              <label className="sg-label">Empresa Destino / Cliente *</label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                <input
                  type="text"
                  value={empresa}
                  onChange={(event) =>
                    setEmpresa(event.target.value.toUpperCase())
                  }
                  className="sg-input pl-10 uppercase"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sg-field">
              <label className="sg-label">Tipo</label>
              <div className="relative">
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="sg-select appearance-none pr-10"
                >
                  <option value="Proveedor">Proveedor</option>
                  <option value="Propio">Propio</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
              </div>
            </div>
            <div className="sg-field">
              <label className="sg-label">Tipo de Operación</label>
              <div className="relative">
                <select
                  value={tipoOperacion}
                  onChange={(event) => setTipoOperacion(event.target.value)}
                  className="sg-select appearance-none pr-10"
                >
                  {[
                    "Carga",
                    "Descarga",
                    "Visita",
                    "Mantenimiento",
                    "Traslado entre plantas",
                    "Otro",
                  ].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sg-field">
              <label className="sg-label">Responsable de Almacén</label>
              <div className="relative">
                <Package className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                {responsablesList.length > 0 ? (
                  <>
                    <select
                      value={responsable}
                      onChange={(event) => setResponsable(event.target.value)}
                      className="sg-select appearance-none pl-10 pr-10"
                    >
                      {responsablesList.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                  </>
                ) : (
                  <input
                    type="text"
                    value={responsable}
                    onChange={(event) =>
                      setResponsable(event.target.value.toUpperCase())
                    }
                    placeholder="Nombre del responsable"
                    className="sg-input pl-10 uppercase"
                  />
                )}
              </div>
            </div>

            <div className="sg-field">
              <label className="sg-label">Agente Responsable</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                {agentesList.length > 0 ? (
                  <>
                    <select
                      value={agente}
                      onChange={(event) => setAgente(event.target.value)}
                      className="sg-select appearance-none pl-10 pr-10"
                    >
                      {agentesList.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                  </>
                ) : (
                  <input
                    type="text"
                    value={agente}
                    onChange={(event) =>
                      setAgente(event.target.value.toUpperCase())
                    }
                    className="sg-input pl-10 uppercase"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="sg-field">
            <label className="sg-label">Observación</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="sg-textarea min-h-[60px]"
              placeholder="Detalles adicionales..."
            />
          </div>

          <div className="grid gap-3 border-t border-[var(--sg-line)] pt-4">
            <div className="sg-font-mono mb-1 text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
              Horas — la hora de registro no se puede cambiar
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sg-field">
                <label className="sg-label text-[var(--sg-muted)]">
                  Ingreso fijo
                </label>
                <input
                  type="time"
                  value={reg.time || ""}
                  disabled
                  className="sg-input cursor-not-allowed bg-[var(--sg-panel-3)] opacity-50"
                />
              </div>

              <div className="sg-field">
                <label className="sg-label">Hora de Cita</label>
                <input
                  type="time"
                  value={horaCita}
                  onChange={(event) => setHoraCita(event.target.value)}
                  className="sg-input"
                />
              </div>

              <div className="sg-field">
                <label className="sg-label">H. Atención</label>
                <input
                  type="time"
                  value={hAtencion}
                  onChange={(event) => setHAtencion(event.target.value)}
                  className="sg-input"
                />
              </div>

              <div className="sg-field">
                <label className="sg-label">H. Documentos</label>
                <input
                  type="time"
                  value={hDevDocs}
                  onChange={(event) => setHDevDocs(event.target.value)}
                  className="sg-input"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="sg-btn sg-btn-ghost flex-1 justify-center"
            >
              Cancelar
            </button>
            <button
              onClick={() =>
                onSave({
                  razonSocial,
                  empresa,
                  type,
                  tipoOperacion,
                  responsable,
                  agente,
                  note,
                  hAtencion: hAtencion || null,
                  hDevDocs: hDevDocs || null,
                  horaCita: horaCita || null,
                })
              }
              disabled={!razonSocial || !empresa}
              className="sg-btn sg-btn-accent flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Guardar cambios
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function RegistroClientContent({
  gateLabel,
  plant,
  plants,
  gateOptions,
  plantLocked,
  citas,
  liveTime,
  responsablesList,
  agentesList,
  values,
  duplicateWarning,
  isPending,
  pendingCount,
  attendedCount,
  completedCount,
  abandonedRecords,
  delayedCount,
  recentRegistrations,
  closingIds,
  docsIds,
  deletingIds,
  userRole,
  isKiosk,
  onOpenImport,
  onToggleKiosk,
  onSubmit,
  onPlantChange,
  onRazonSocialChange,
  onEmpresaChange,
  onTypeChange,
  onTipoOperacionChange,
  onResponsableChange,
  onAgenteChange,
  onNoteChange,
  onVehicleSelect,
  onToast,
  onRefresh,
  onClear,
  onRefreshHistory,
  onClose,
  onActivate,
  onDocs,
  onEdit,
  onDelete,
  onCloseAbandoned,
}: {
  gateLabel: string;
  plant: string;
  plants: string[];
  gateOptions: GateAssignment[];
  plantLocked: boolean;
  citas: CitaRow[];
  liveTime: string;
  responsablesList: string[];
  agentesList: string[];
  values: {
    razonSocial: string;
    empresa: string;
    type: string;
    tipoOperacion: string;
    responsable: string;
    agente: string;
    note: string;
    horaCita: string;
  };
  duplicateWarning: RecentRegistration | null;
  isPending: boolean;
  pendingCount: number;
  attendedCount: number;
  completedCount: number;
  abandonedRecords: RecentRegistration[];
  delayedCount: number;
  recentRegistrations: RecentRegistration[];
  closingIds: Set<number>;
  docsIds: Set<number>;
  deletingIds: Set<number>;
  userRole: string | null;
  isKiosk: boolean;
  onOpenImport: () => void;
  onToggleKiosk: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onPlantChange: (value: string) => void;
  onRazonSocialChange: (value: string) => void;
  onEmpresaChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onTipoOperacionChange: (value: string) => void;
  onResponsableChange: (value: string) => void;
  onAgenteChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onVehicleSelect: (value: string) => Promise<void> | void;
  onToast: (message: string, durationMs?: number) => void;
  onRefresh: () => void;
  onClear: () => void;
  onRefreshHistory: () => void;
  onClose: (reg: RecentRegistration) => void;
  onActivate: (reg: RecentRegistration) => void | Promise<void>;
  onDocs: (reg: RecentRegistration) => void;
  onEdit: (reg: RecentRegistration) => void;
  onDelete: (id: number, razonSocial: string) => void;
  onCloseAbandoned: () => void | Promise<void>;
}) {
  const content = (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-5">
        <div className="flex items-center gap-4">
          <div className="sg-kicker">Registro Operativo</div>
          <span className="sg-live-pill">
            <span className="sg-live-dot sg-pulse" />
            {gateLabel || `Garita ${plant}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!isKiosk && userRole !== "guardia" ? (
            <button
              onClick={onOpenImport}
              className="sg-btn sg-btn-accent sg-btn-sm"
              title="Cargar registros desde Excel, CSV o imagen"
            >
              <Database className="h-3.5 w-3.5" />
              Cargar datos
            </button>
          ) : null}
          <button
            onClick={onToggleKiosk}
            className="sg-font-mono flex items-center gap-2 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-1.5 text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
            title={isKiosk ? "Modo escritorio" : "Modo garita (pantalla completa)"}
          >
            {isKiosk ? (
              <Monitor className="h-3.5 w-3.5" />
            ) : (
              <MonitorSmartphone className="h-3.5 w-3.5" />
            )}
            {isKiosk ? "Escritorio" : "Garita"}
          </button>
          <div
            className="sg-mono text-[11px] tracking-[0.12em] text-[var(--sg-muted)]"
            suppressHydrationWarning
          >
            {new Date().toLocaleDateString("es-PE", {
              weekday: "short",
              day: "2-digit",
              month: "short",
            })}{" "}
            · {liveTime}
          </div>
        </div>
      </div>

      <RegistroSummaryCards
        pendingCount={pendingCount}
        attendedCount={attendedCount}
        completedCount={completedCount}
        criticalOpenCount={abandonedRecords.length + delayedCount}
      />

      <div className="mt-3">
        <RegistroWizard
          pendingCount={pendingCount}
          attendedCount={attendedCount}
          completedCount={completedCount}
        />
      </div>

      <div
        className={`mt-4 grid gap-4 xl:items-stretch ${isKiosk ? "grid-cols-[400px_minmax(0,1fr)]" : "xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[460px_minmax(0,1fr)]"}`}
      >
        <div className="flex flex-col gap-5 xl:sticky xl:top-5">
          <CitasDelDia
            plant={plant}
            citas={citas}
            onToast={onToast}
            onRefresh={onRefresh}
          />
          <RegistroFormPanel
            plant={plant}
            plants={plants}
            gateOptions={gateOptions}
            plantLocked={plantLocked}
            citas={citas}
            liveTime={liveTime}
            responsablesList={responsablesList}
            agentesList={agentesList}
            values={values}
            duplicateWarning={duplicateWarning}
            isPending={isPending}
            onSubmit={onSubmit}
            onPlantChange={onPlantChange}
            onRazonSocialChange={onRazonSocialChange}
            onEmpresaChange={onEmpresaChange}
            onTypeChange={onTypeChange}
            onTipoOperacionChange={onTipoOperacionChange}
            onResponsableChange={onResponsableChange}
            onAgenteChange={onAgenteChange}
            onNoteChange={onNoteChange}
            onVehicleSelect={onVehicleSelect}
            onToast={onToast}
            onRefresh={onRefresh}
            onClear={onClear}
            showCitasPanel={false}
          />
        </div>

        <div className="min-w-0">
          <RegistroHistoryPanel
            recentRegistrations={recentRegistrations}
            abandonedRecords={abandonedRecords}
            closingIds={closingIds}
            docsIds={docsIds}
            deletingIds={deletingIds}
            userRole={userRole}
            compact={isKiosk}
            onRefresh={onRefreshHistory}
            onClose={onClose}
            onActivate={onActivate}
            onDocs={onDocs}
            onEdit={onEdit}
            onDelete={onDelete}
            onCloseAbandoned={onCloseAbandoned}
          />
        </div>
      </div>
    </>
  );

  return isKiosk ? (
    <KioskLayout plant={plant} onExit={onToggleKiosk}>
      <div className="mx-auto w-full max-w-[1280px] px-4 py-4 sm:px-6 sm:py-6">
        {content}
      </div>
    </KioskLayout>
  ) : (
    <AppLayout>{content}</AppLayout>
  );
}
