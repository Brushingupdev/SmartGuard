"use client";

import AppLayout from "@/components/AppLayout";
import KioskLayout from "@/components/KioskLayout";
import RegistroWizard from "@/components/RegistroWizard";
import {
  createAtencion,
  closeAtencion,
  closeAtencionDocs,
  updateAtencion,
  deleteAtencion,
  closeAbandonedBatch,
  getVehicleProfile,
} from "@/app/actions";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Monitor,
  MonitorSmartphone,
  Package,
  Pencil,
  Save,
  Timer,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { humanizeError } from "@/lib/humanizeError";
import { formatGateLabelFromPlant, type GateAssignment } from "@/lib/gates";
import { useRegistroData } from "./useRegistroData";
import RegistroFormPanel from "./RegistroFormPanel";
import RegistroHistoryPanel from "./RegistroHistoryPanel";
import type { CitaRow, RecentRegistration } from "./types";
type ModalIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

interface RegistroClientProps {
  initialAgente: string;
  initialPlant: string;
  initialPlants: string[];
  initialGateOptions: GateAssignment[];
  initialResponsablesList: string[];
  initialRecentRegistrations: RecentRegistration[];
  initialRecentTotal: number;
  initialCitas: CitaRow[];
  initialUserRole: string;
  initialPlantAssigned: boolean;
  initialLastRefresh: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Toast({ show, message }: { show: boolean; message: string }) {
  const isError = message.toLowerCase().includes("error") || message.toLowerCase().includes("inválid") || message.toLowerCase().includes("permi");
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 22, scale: 0.96 }}
          className={`fixed bottom-6 right-6 z-[70] border bg-[var(--sg-panel)] px-5 py-4 shadow-[6px_6px_0_rgba(196,192,180,0.08)] ${isError ? "border-[var(--sg-danger)]" : "border-[var(--sg-success)]"}`}
        >
          <div className="flex items-center gap-3 text-sm text-[var(--sg-ink)]">
            <CheckCircle2 className={`h-5 w-5 ${isError ? "text-[var(--sg-danger)]" : "text-[var(--sg-success)]"}`} />
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const MOTIVOS_DEMORA = [
  "Documentación incompleta",
  "Revisión manual requerida",
  "Falla de sistema",
  "Exceso de vehículos",
  "Verificación de carga",
  "Problema con conductor",
  "Otro",
];

// Lista por defecto — se sobreescribe con los datos de Supabase al cargar
const RESPONSABLES_DEFAULT: string[] = [];

function MotivoDemoraModal({
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.75)] backdrop-blur-sm px-4"
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
          <button onClick={onCancel} className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-[13px] text-[var(--sg-copy)] mb-4">
            El vehículo registrado a las{" "}
            <strong className="text-[var(--sg-ink)]">{reg.time}</strong> tiene demora.
            Indica el motivo antes de cerrar la atención.
          </p>

          <div className="sg-field mb-4">
            <label className="sg-label">Motivo de demora *</label>
            <div className="relative">
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="sg-select appearance-none pr-8"
              >
                {MOTIVOS_DEMORA.map((m) => (
                  <option key={m} value={m} className="bg-[var(--sg-panel-2)]">{m}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel} className="sg-btn sg-btn-ghost flex-1 justify-center">
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

function ConfirmActionModal({
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
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(3,5,4,0.75)] backdrop-blur-sm px-4"
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
          <button onClick={onCancel} className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="text-[13px] text-[var(--sg-copy)] mb-6 leading-relaxed">
            {message}
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel} className="sg-btn sg-btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="sg-btn flex-1 justify-center"
              style={{ backgroundColor: accentColor, color: "var(--sg-canvas)", borderColor: accentColor }}
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

function EditModal({
  reg,
  responsablesList,
  onSave,
  onCancel,
}: {
  reg: RecentRegistration;
  responsablesList: string[];
  onSave: (data: { razonSocial: string; empresa: string; type: string; tipoOperacion: string; responsable: string; agente: string; note: string; hAtencion?: string | null; hDevDocs?: string | null; horaCita?: string | null }) => void;
  onCancel: () => void;
}) {
  const [razonSocial, setRazonSocial] = useState(reg.razonSocial || "");
  const [empresa, setEmpresa] = useState(reg.empresa || "");
  const [type, setType] = useState(reg.type || "Proveedor");
  const [tipoOperacion, setTipoOperacion] = useState(reg.tipoOperacion || "Carga");
  const [responsable, setResponsable] = useState(reg.responsable || responsablesList[0] || "");
  const [agente, setAgente] = useState(reg.agente || "");
  const [note, setNote] = useState(reg.observacion || "");
  const [hAtencion, setHAtencion] = useState<string>(reg.h_atencion || "");
  const [hDevDocs, setHDevDocs] = useState<string>(reg.h_dev_docs || "");
  const [horaCita, setHoraCita] = useState<string>(reg.hora_cita || "");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.75)] backdrop-blur-sm px-4"
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
        className="w-full max-w-[500px] border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[8px_8px_0_rgba(196,192,180,0.06)] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--sg-line)] px-5 py-4 sticky top-0 bg-[var(--sg-panel)] z-10">
          <div className="flex items-center gap-3">
            <Pencil className="h-4 w-4 text-[var(--sg-accent)]" />
            <span className="sg-font-display text-[15px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
              Editar Registro · {reg.time}
            </span>
          </div>
          <button onClick={onCancel} className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 grid gap-4">
          {/* Razón Social */}
          <div className="sg-field">
            <label className="sg-label">Razón Social / Vehículo *</label>
            <div className="relative">
              <Truck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
              <input
                type="text"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value.toUpperCase())}
                className="sg-input pl-10 uppercase"
                required
              />
            </div>
          </div>

          {/* Empresa */}
          <div className="sg-field">
            <label className="sg-label">Empresa Destino / Cliente *</label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
              <input
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value.toUpperCase())}
                className="sg-input pl-10 uppercase"
                required
              />
            </div>
          </div>

          {/* Tipo + Operación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sg-field">
              <label className="sg-label">Tipo</label>
              <div className="relative">
                <select value={type} onChange={(e) => setType(e.target.value)} className="sg-select appearance-none pr-10">
                  <option value="Proveedor">Proveedor</option>
                  <option value="Propio">Propio</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
              </div>
            </div>
            <div className="sg-field">
              <label className="sg-label">Tipo de Operación</label>
              <div className="relative">
                <select value={tipoOperacion} onChange={(e) => setTipoOperacion(e.target.value)} className="sg-select appearance-none pr-10">
                  {["Carga","Descarga","Visita","Mantenimiento","Traslado entre plantas","Otro"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
              </div>
            </div>
          </div>

          {/* Responsable */}
          <div className="sg-field">
            <label className="sg-label">Responsable de Almacén</label>
            <div className="relative">
              <Package className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
              {responsablesList.length > 0 ? (
                <>
                  <select value={responsable} onChange={(e) => setResponsable(e.target.value)} className="sg-select appearance-none pl-10 pr-10">
                    {responsablesList.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                </>
              ) : (
                <input
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value.toUpperCase())}
                  placeholder="Nombre del responsable"
                  className="sg-input pl-10 uppercase"
                />
              )}
            </div>
          </div>

          {/* Agente */}
          <div className="sg-field">
            <label className="sg-label">Agente Responsable</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
              <input
                type="text"
                value={agente}
                onChange={(e) => setAgente(e.target.value.toUpperCase())}
                className="sg-input pl-10 uppercase"
              />
            </div>
          </div>

          {/* Observación */}
          <div className="sg-field">
            <label className="sg-label">Observación</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="sg-textarea min-h-[60px]"
              placeholder="Detalles adicionales..."
            />
          </div>

          {/* Horas editables */}
          <div className="border-t border-[var(--sg-line)] pt-4 grid gap-3">
            <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] mb-1">
              Horas — la hora de registro no se puede cambiar
            </div>

            {/* Hora de registro (solo lectura) */}
            <div className="sg-field">
              <label className="sg-label text-[var(--sg-muted)]">Hora de registro (fija)</label>
              <input
                type="time"
                value={reg.time || ""}
                disabled
                className="sg-input opacity-50 cursor-not-allowed bg-[var(--sg-panel-3)]"
              />
            </div>

            {/* Hora de cita */}
            <div className="sg-field">
              <label className="sg-label flex items-center gap-2">
                Hora de Cita
                <span className="sg-font-mono text-[8px] bg-[var(--sg-panel-3)] px-2 py-0.5 border border-[var(--sg-line)] text-[var(--sg-muted)] uppercase">
                  Opcional
                </span>
                <span className="sg-font-mono text-[8px] bg-[rgba(200,168,75,0.12)] px-2 py-0.5 border border-[var(--sg-accent)] text-[var(--sg-accent)] uppercase">
                  Formato 24h — 2 PM = 14:00
                </span>
              </label>
              <input
                type="time"
                value={horaCita}
                onChange={(e) => setHoraCita(e.target.value)}
                className="sg-input"
              />
            </div>

            {/* H. Atención */}
            <div className="sg-field">
              <label className="sg-label">H. Atención</label>
              <input
                type="time"
                value={hAtencion}
                onChange={(e) => setHAtencion(e.target.value)}
                className="sg-input"
              />
              {hAtencion && reg.time && (
                <p className="mt-1 text-[10px] text-[var(--sg-muted)]">
                  Espera recalculada al guardar
                </p>
              )}
            </div>

            {/* H. Dev. Documentos */}
            <div className="sg-field">
              <label className="sg-label">H. Dev. Documentos</label>
              <input
                type="time"
                value={hDevDocs}
                onChange={(e) => setHDevDocs(e.target.value)}
                className="sg-input"
              />
              {hDevDocs && reg.time && (
                <p className="mt-1 text-[10px] text-[var(--sg-muted)]">
                  Tiempo total recalculado al guardar
                </p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="sg-btn sg-btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button
              onClick={() => onSave({
                razonSocial, empresa, type, tipoOperacion, responsable, agente, note,
                hAtencion: hAtencion || null,
                hDevDocs: hDevDocs || null,
                horaCita: horaCita || null,
              })}
              disabled={!razonSocial || !empresa}
              className="sg-btn sg-btn-accent flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RegistroClient({
  initialAgente,
  initialPlant,
  initialPlants,
  initialGateOptions,
  initialResponsablesList,
  initialRecentRegistrations,
  initialRecentTotal,
  initialCitas,
  initialUserRole,
  initialPlantAssigned,
  initialLastRefresh,
}: RegistroClientProps) {
  const bootstrapResponsablesList =
    initialResponsablesList.length > 0 ? initialResponsablesList : RESPONSABLES_DEFAULT;

  const [razonSocial, setRazonSocial] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [type, setType] = useState("Proveedor");
  const [tipoOperacion, setTipoOperacion] = useState("Carga");
  const [responsable, setResponsable] = useState<string>(bootstrapResponsablesList[0] ?? "");
  const [agente, setAgente] = useState(initialAgente);
  const [plant, setPlant] = useState(initialPlant);
  const gateLabel = formatGateLabelFromPlant(plant, initialGateOptions);
  const [plants] = useState<string[]>(initialPlants);
  const [note, setNote] = useState("");
  const [horaCita, setHoraCita] = useState("");

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const [closingIds, setClosingIds] = useState<Set<number>>(new Set());
  const [docsIds, setDocsIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [pendingClose, setPendingClose] = useState<RecentRegistration | null>(null);
  const [editingReg, setEditingReg] = useState<RecentRegistration | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    message: React.ReactNode;
    icon: ModalIcon;
    color: string;
    btnText: string;
    action: () => void;
  } | null>(null);
  const [userRole] = useState<string | null>(initialUserRole);
  const [plantAssigned] = useState(initialPlantAssigned);
  const [userReady] = useState(true);
  const [responsablesList] = useState<string[]>(bootstrapResponsablesList);
  const [isKiosk, setIsKiosk] = useState(false);
  const LOAD_LIMIT = 200;

  const {
    citas,
    lastRefresh,
    liveTime,
    recentRegistrations,
    recentTotal,
    refreshCitas,
    refreshRecent,
  } = useRegistroData({
    plant,
    initialRecentRegistrations,
    initialRecentTotal,
    initialCitas,
    initialLastRefresh,
    loadLimit: LOAD_LIMIT,
    userReady,
  });

  const showTemporaryToast = (message: string, durationMs = 3200) => {
    setToastMsg(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), durationMs);
  };

  const refreshRegistroPanels = () => {
    void refreshRecent(plant);
    void refreshCitas(plant);
  };

  const handleVehicleSelect = async (value: string) => {
    const profile = await getVehicleProfile(value);
    if (!profile) return;
    if (profile.empresa) setEmpresa(profile.empresa);
    if (profile.tipo) setType(profile.tipo);
    if (profile.tipoOperacion) setTipoOperacion(profile.tipoOperacion);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await createAtencion({
        razonSocial,
        empresa,
        plant,
        type,
        tipoOperacion,
        responsable,
        agente,
        note,
        horaCita: horaCita || null,
      });
      if (result.success) {
        showTemporaryToast("Ingreso registrado correctamente.");
        setRazonSocial("");
        setEmpresa("");
        setType("Proveedor");
        setTipoOperacion("Carga");
        setResponsable("");
        setAgente("");
        setNote("");
        setHoraCita("");
        refreshRegistroPanels();
      } else {
        showTemporaryToast(humanizeError(result.error), 4000);
      }
    });
  };

  const handleClose = (reg: RecentRegistration) => {
    const [hh, mm] = reg.time.split(":").map(Number);
    const startMin = hh * 60 + mm;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const diff = nowMin - startMin < 0 ? nowMin - startMin + 1440 : nowMin - startMin;
    if (diff >= 30) {
      setPendingClose(reg);
    } else {
      setPendingConfirm({
        title: "Confirmar Atención",
        message: (
          <>
            ¿Estás seguro de iniciar la atención para <strong className="text-[var(--sg-ink)]">{reg.razonSocial}</strong>?
          </>
        ),
        icon: Timer,
        color: "var(--sg-accent)",
        btnText: "Iniciar atención",
        action: () => doClose(reg.id, undefined),
      });
    }
  };

  const doClose = async (id: number, motivo: string | undefined) => {
    setPendingClose(null);
    setClosingIds((prev) => new Set(prev).add(id));
    const result = await closeAtencion(id, motivo);
    setClosingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    if (result.success) {
      showTemporaryToast(`Atención cerrada · ${result.espera_min} min de espera`);
      void refreshRecent(plant);
    } else {
      showTemporaryToast(humanizeError(result.error), 4000);
    }
  };

  const handleDocs = (reg: RecentRegistration) => {
    setPendingConfirm({
      title: "Confirmar Entrega de Docs",
      message: (
        <>
          ¿Confirmar que se entregaron los documentos y dar salida a <strong className="text-[var(--sg-ink)]">{reg.razonSocial}</strong>?
        </>
      ),
      icon: FileCheck2,
      color: "var(--sg-success)",
      btnText: "Finalizar flujo",
      action: async () => {
        setDocsIds((prev) => new Set(prev).add(reg.id));
        const result = await closeAtencionDocs(reg.id);
        setDocsIds((prev) => { const s = new Set(prev); s.delete(reg.id); return s; });
        if (result.success) {
          showTemporaryToast(`Documentos entregados · Tiempo total: ${result.tiempo_total_min} min`);
          void refreshRecent(plant);
        } else {
          showTemporaryToast(humanizeError(result.error), 4000);
        }
      },
    });
  };

  const handleDelete = (id: number, razonSocial: string) => {
    setPendingConfirm({
      title: "Eliminar Registro",
      message: (
        <>
          ¿Estás seguro de eliminar el registro de <strong className="text-[var(--sg-ink)]">{razonSocial}</strong>?
          Esta acción no se puede deshacer.
        </>
      ),
      icon: Trash2,
      color: "var(--sg-danger)",
      btnText: "Eliminar",
      action: async () => {
        setDeletingIds((prev) => new Set(prev).add(id));
        const result = await deleteAtencion(id);
        setDeletingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        if (result.success) {
          showTemporaryToast("Registro eliminado.");
          void refreshRecent(plant);
        } else {
          showTemporaryToast(humanizeError(result.error), 4000);
        }
      },
    });
  };

  const handleEditSave = async (data: { razonSocial: string; empresa: string; type: string; tipoOperacion: string; responsable: string; agente: string; note: string; hAtencion?: string | null; hDevDocs?: string | null; horaCita?: string | null }) => {
    if (!editingReg) return;
    const result = await updateAtencion(editingReg.id, data);
    if (result.success) {
      setEditingReg(null);
      showTemporaryToast("Registro actualizado correctamente.");
      void refreshRecent(plant);
    } else {
      showTemporaryToast(humanizeError(result.error), 4000);
    }
  };

  // Detección de duplicados — cliente, sin llamada extra
  const duplicateWarning = useMemo(() => {
    if (razonSocial.trim().length < 3) return null;
    const term = razonSocial.trim().toUpperCase();
    return recentRegistrations.find(r => !r.attended && r.razonSocial.toUpperCase().includes(term)) ?? null;
  }, [razonSocial, recentRegistrations]);

  // Detección de abandonados (pendientes con +4h)
  const abandonedRecords = useMemo(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return recentRegistrations.filter(r => {
      if (r.attended) return false;
      const [hh, mm] = r.time.split(":").map(Number);
      let diff = nowMin - (hh * 60 + mm);
      if (diff < 0) diff += 1440;
      return diff >= 240;
    });
  }, [recentRegistrations]);

  const handleCloseAbandoned = async () => {
    const ids = abandonedRecords.map((r) => r.id);
    const result = await closeAbandonedBatch(ids);
    showTemporaryToast(`${result.count} registro${result.count !== 1 ? "s" : ""} cerrado${result.count !== 1 ? "s" : ""} como abandonado${result.count !== 1 ? "s" : ""}.`);
    void refreshRecent(plant);
  };

  const plantLocked = plantAssigned;

  const pendingCount = recentRegistrations.filter((r) => !r.attended).length;
  const attendedCount = recentRegistrations.filter((r) => r.attended && !r.docsDelivered).length;
  const completedCount = recentRegistrations.filter((r) => r.docsDelivered).length;

  const content = (
    <>
      {/* Topbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-5">
        <div className="flex items-center gap-4">
          <div className="sg-kicker">Registro Operativo</div>
          <span className="sg-live-pill">
            <span className="sg-live-dot sg-pulse" />
            {gateLabel || `Garita ${plant}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsKiosk(v => !v)}
            className="flex items-center gap-2 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-1.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] transition-colors"
            title={isKiosk ? "Modo escritorio" : "Modo garita (pantalla completa)"}
          >
            {isKiosk ? <Monitor className="h-3.5 w-3.5" /> : <MonitorSmartphone className="h-3.5 w-3.5" />}
            {isKiosk ? "Escritorio" : "Garita"}
          </button>
          <div className="sg-mono text-[11px] text-[var(--sg-muted)] tracking-[0.12em]" suppressHydrationWarning>
            {new Date().toLocaleDateString("es-PE", { weekday: "short", day: "2-digit", month: "short" })} · {liveTime}
          </div>
        </div>
      </div>

      {/* Wizard progress */}
      <RegistroWizard pendingCount={pendingCount} attendedCount={attendedCount} completedCount={completedCount} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)] xl:items-start">
        <RegistroFormPanel
          plant={plant}
          plants={plants}
          gateOptions={initialGateOptions}
          plantLocked={plantLocked}
          citas={citas}
          liveTime={liveTime}
          responsablesList={responsablesList}
          values={{
            razonSocial,
            empresa,
            type,
            tipoOperacion,
            responsable,
            agente,
            note,
            horaCita,
          }}
          duplicateWarning={duplicateWarning}
          isPending={isPending}
          onSubmit={handleSubmit}
          onPlantChange={setPlant}
          onRazonSocialChange={setRazonSocial}
          onEmpresaChange={setEmpresa}
          onTypeChange={setType}
          onTipoOperacionChange={setTipoOperacion}
          onResponsableChange={setResponsable}
          onAgenteChange={setAgente}
          onNoteChange={setNote}
          onHoraCitaChange={setHoraCita}
          onVehicleSelect={handleVehicleSelect}
          onToast={showTemporaryToast}
          onRefresh={refreshRegistroPanels}
        />

        <RegistroHistoryPanel
          plant={plant}
          recentRegistrations={recentRegistrations}
          recentTotal={recentTotal}
          lastRefresh={lastRefresh}
          abandonedRecords={abandonedRecords}
          closingIds={closingIds}
          docsIds={docsIds}
          deletingIds={deletingIds}
          userRole={userRole}
          onRefresh={() => void refreshRecent(plant)}
          onClose={handleClose}
          onDocs={handleDocs}
          onEdit={setEditingReg}
          onDelete={handleDelete}
          onCloseAbandoned={handleCloseAbandoned}
        />
      </div>

      <AnimatePresence>
        {pendingClose && (
          <MotivoDemoraModal
            reg={pendingClose}
            onConfirm={(motivo) => doClose(pendingClose.id, motivo)}
            onCancel={() => setPendingClose(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingReg && (
          <EditModal
            reg={editingReg}
            responsablesList={responsablesList}
            onSave={handleEditSave}
            onCancel={() => setEditingReg(null)}
          />
        )}
        {pendingConfirm && (
          <ConfirmActionModal
            title={pendingConfirm.title}
            message={pendingConfirm.message}
            icon={pendingConfirm.icon}
            accentColor={pendingConfirm.color}
            confirmText={pendingConfirm.btnText}
            onCancel={() => setPendingConfirm(null)}
            onConfirm={() => {
              pendingConfirm.action();
              setPendingConfirm(null);
            }}
          />
        )}
      </AnimatePresence>

      <Toast show={showToast} message={toastMsg} />
    </>
  );

  return (
    isKiosk ? (
      <KioskLayout plant={plant} onExit={() => setIsKiosk(false)}>
        <div className="max-w-[900px] mx-auto w-full px-4 py-6 sm:px-6 sm:py-8">
          {content}
        </div>
      </KioskLayout>
    ) : (
      <AppLayout>
        {content}
      </AppLayout>
    )
  );
}
