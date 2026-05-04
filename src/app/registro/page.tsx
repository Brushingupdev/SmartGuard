"use client";

import AppLayout from "@/components/AppLayout";
import KioskLayout from "@/components/KioskLayout";
import RegistroWizard from "@/components/RegistroWizard";
import PlacaInput from "@/components/PlacaInput";
import TarjetaRegistro from "@/components/TarjetaRegistro";
import { createAtencion, closeAtencion, closeAtencionDocs, updateAtencion, deleteAtencion, getRecentRegistrations, getResponsables, getUserPlants, searchSuggestions, closeAbandonedBatch, getVehicleProfile } from "@/app/actions";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  FileCheck2,
  History,
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
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { humanizeError } from "@/lib/humanizeError";

type RecentRegistration = Awaited<ReturnType<typeof getRecentRegistrations>>["records"][number];
type ModalIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

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

function SelectField({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="sg-field">
      <label className="sg-label">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`sg-select appearance-none pr-10 ${disabled ? "opacity-60 cursor-not-allowed bg-[var(--sg-panel-3)]" : ""}`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[var(--sg-panel-2)]">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
      </div>
    </div>
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
  const [tipoOperacion, setTipoOperacion] = useState(reg.reason || "Carga");
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

// ─── Badges ─────────────────────────────────────────────────────────────────

// ─── AutocompleteInput ───────────────────────────────────────────────────────

function AutocompleteInput({
  icon: Icon,
  value,
  onChange,
  placeholder,
  field,
  required,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  field: "razon_social" | "empresa";
  required?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (term: string) => {
    if (term.length < 2) { setSuggestions([]); setOpen(false); return; }
    const results = await searchSuggestions({ field, term });
    setSuggestions(results);
    setOpen(results.length > 0);
    setActiveIdx(-1);
  }, [field]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase();
    onChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  const handleSelect = (v: string) => {
    onChange(v);
    setSuggestions([]);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown")      { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); handleSelect(suggestions[activeIdx]); }
    else if (e.key === "Escape")    { setOpen(false); }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)] z-10" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="sg-input pl-10 uppercase w-full"
      />
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 border border-[var(--sg-accent)] bg-[var(--sg-panel)] shadow-[4px_4px_0_rgba(196,192,180,0.1)] max-h-[200px] overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => handleSelect(s)}
              className={`w-full text-left px-4 py-2.5 sg-font-mono text-[11px] uppercase truncate transition-colors ${
                i === activeIdx
                  ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]"
                  : "text-[var(--sg-copy)] hover:bg-[var(--sg-panel-2)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RegistroPage() {
  const [razonSocial, setRazonSocial] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [type, setType] = useState("Proveedor");
  const [tipoOperacion, setTipoOperacion] = useState("Carga");
  const [responsable, setResponsable] = useState<string>("");
  const [agente, setAgente] = useState("");
  const [plant, setPlant] = useState("");
  const [plants, setPlants] = useState<string[]>([]);
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
  const [liveTime, setLiveTime] = useState("--:--:--");
  const [recentRegistrations, setRecentRegistrations] = useState<RecentRegistration[]>([]);
  const [recentTotal, setRecentTotal] = useState(0);
  const [recentOffset, setRecentOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [plantAssigned, setPlantAssigned] = useState(false);
  const [userReady, setUserReady] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const [responsablesList, setResponsablesList] = useState<string[]>(RESPONSABLES_DEFAULT);
  const [isKiosk, setIsKiosk] = useState(false);
  const PAGE_SIZE = 10;

  // Refs para evitar stale closures en la suscripcion Realtime
  const plantRef = useRef(plant);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchRecentRef = useRef<((p: string, reset?: boolean) => Promise<void>) | null>(null);

  const fetchRecent = useCallback(async (currentPlant: string, reset = true) => {
    const offset = reset ? 0 : recentOffset + PAGE_SIZE;
    if (!reset) setLoadingMore(true);
    const { records, total } = await getRecentRegistrations(currentPlant, PAGE_SIZE, reset ? 0 : offset);
    if (reset) {
      setRecentRegistrations(records);
      setRecentOffset(0);
    } else {
      setRecentRegistrations((prev) => [...prev, ...records]);
      setRecentOffset(offset);
    }
    setRecentTotal(total);
    if (!reset) setLoadingMore(false);
    if (reset) setLastRefresh(new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, [recentOffset]);

  // Mantener refs actualizados para el Realtime (evita stale closures)
  useEffect(() => { plantRef.current = plant; }, [plant]);
  useEffect(() => { fetchRecentRef.current = fetchRecent; }, [fetchRecent]);

  useEffect(() => {
    // Cargar responsables desde Supabase
    getResponsables().then(list => {
      if (list.length > 0) {
        setResponsablesList(list);
        setResponsable(list[0]);
      }
    });

    getUserPlants().then(p => {
      setPlants(p);
      setPlant((prev) => prev || p[0] || "");
    });

    (async () => {
      const { createClient } = await import("@/utils/supabase/client");
      const client = createClient();
      const { data: { user } } = await client.auth.getUser();
      if (user?.email) {
        setUserRole((user.user_metadata?.role as string) ?? null);
        const prefix = user.email.split("@")[0];
        setAgente(prefix.toUpperCase().replace(/\./g, " ").replace(/_/g, " "));
        // Leer planta desde user_metadata
        const metaPlant = user.user_metadata?.plant as string | undefined;
        if (metaPlant) {
          setPlant(metaPlant);
          setPlantAssigned(true);
        }
      }
      setUserReady(true);
    })();

    const tick = () =>
      setLiveTime(
        new Date().toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!userReady || !plant) return;

    const refresh = async () => {
      await fetchRecent(plant, true);
    };

    void refresh();
  }, [plant, userReady, fetchRecent]);

  // Supabase Realtime — actualiza la lista al instante cuando hay cambios en atenciones.
  // Usamos refs (plantRef, fetchRecentRef) para que el callback siempre tenga la planta
  // actual sin necesidad de recrear la suscripcion cada vez que cambia la planta.
  useEffect(() => {
    if (!userReady) return;
    const cleanupRef = { fn: undefined as (() => void) | undefined };
    (async () => {
      const { createClient } = await import("@/utils/supabase/client");
      const client = createClient();
      const channel = client
        .channel("atenciones-registro-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "atenciones" }, () => {
          if (plantRef.current) fetchRecentRef.current?.(plantRef.current, true);
        })
        .subscribe();
      cleanupRef.fn = () => { client.removeChannel(channel); };
    })();
    return () => { cleanupRef.fn?.(); };
  }, [userReady]);

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
        setToastMsg("Ingreso registrado correctamente.");
        setShowToast(true);
        setRazonSocial("");
        setEmpresa("");
        setNote("");
        setHoraCita("");
        fetchRecent(plant, true);
        setTimeout(() => setShowToast(false), 3200);
      } else {
        setToastMsg(humanizeError(result.error));
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
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
      setToastMsg(`Atención cerrada · ${result.espera_min} min de espera`);
      setShowToast(true);
      fetchRecent(plant, true);
      setTimeout(() => setShowToast(false), 3200);
    } else {
      setToastMsg(humanizeError(result.error));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
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
          setToastMsg(`Documentos entregados · Tiempo total: ${result.tiempo_total_min} min`);
          setShowToast(true);
          fetchRecent(plant, true);
          setTimeout(() => setShowToast(false), 3200);
        } else {
          setToastMsg(humanizeError(result.error));
          setShowToast(true);
          setTimeout(() => setShowToast(false), 4000);
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
          setToastMsg("Registro eliminado.");
          setShowToast(true);
          fetchRecent(plant, true);
          setTimeout(() => setShowToast(false), 3200);
        } else {
          setToastMsg(humanizeError(result.error));
          setShowToast(true);
          setTimeout(() => setShowToast(false), 4000);
        }
      },
    });
  };

  const handleEditSave = async (data: { razonSocial: string; empresa: string; type: string; tipoOperacion: string; responsable: string; agente: string; note: string; hAtencion?: string | null; hDevDocs?: string | null; horaCita?: string | null }) => {
    if (!editingReg) return;
    const result = await updateAtencion(editingReg.id, data);
    setEditingReg(null);
    if (result.success) {
      setToastMsg("Registro actualizado correctamente.");
      setShowToast(true);
      fetchRecent(plant, true);
      setTimeout(() => setShowToast(false), 3200);
    } else {
      setToastMsg(humanizeError(result.error));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
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
    setToastMsg(`${result.count} registro${result.count !== 1 ? "s" : ""} cerrado${result.count !== 1 ? "s" : ""} como abandonado${result.count !== 1 ? "s" : ""}.`);
    setShowToast(true);
    fetchRecent(plant, true);
    setTimeout(() => setShowToast(false), 3200);
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
            Garita {plant}
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

      <div className="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)] xl:items-start mt-6">
        {/* ── FORM COLUMN ── */}
        <div className="flex flex-col gap-6">
          <section className="sg-panel p-4 sm:p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-[var(--sg-line)] pb-4">
              <h2 className="sg-font-display text-[22px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                Nuevo Ingreso
              </h2>
              <div className="sg-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]" suppressHydrationWarning>
                {liveTime.substring(0, 5)}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5">
              {/* Placa / Razón Social */}
              <PlacaInput
                value={razonSocial}
                onChange={setRazonSocial}
                placeholder="TRANSP. PIMENTEL C8E-819"
                autoFocus
                onSelect={async (v) => {
                  const profile = await getVehicleProfile(v);
                  if (!profile) return;
                  if (profile.empresa) setEmpresa(profile.empresa);
                  if (profile.tipo) setType(profile.tipo);
                  if (profile.tipoOperacion) setTipoOperacion(profile.tipoOperacion);
                }}
              />
              {duplicateWarning ? (
                <div className="flex items-center gap-3 border-l-[3px] border-[var(--sg-warn)] bg-[rgba(200,160,75,0.08)] px-4 py-3 text-[12px] text-[var(--sg-warn)]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <div>
                    <strong>Posible duplicado:</strong> Ya hay un ingreso pendiente registrado a las{" "}
                    <strong className="text-[var(--sg-ink)]">{duplicateWarning.time}</strong>.{" "}
                    Verifica antes de continuar.
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-[var(--sg-muted)] -mt-2">
                  Incluye nombre de empresa transportista y placa al final
                </p>
              )}

              {/* Empresa destino */}
              <div className="sg-field">
                <label className="sg-label">Empresa Destino / Cliente *</label>
                <AutocompleteInput
                  icon={Building2}
                  value={empresa}
                  onChange={setEmpresa}
                  placeholder="Ej: FAB. DE CHOCOLATES LA IBERICA SA"
                  field="empresa"
                  required
                />
              </div>

              {/* Planta fija */}
              {plantLocked ? (
                <div className="sg-field">
                  <label className="sg-label flex items-center gap-2">
                    Planta
                    <span className="sg-font-mono text-[8px] bg-[var(--sg-panel-3)] px-2 py-0.5 border border-[var(--sg-line)] text-[var(--sg-muted)] uppercase">
                      Asignado
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={plant}
                      disabled
                      className="sg-input opacity-60 cursor-not-allowed bg-[var(--sg-panel-3)]"
                    />
                  </div>
                </div>
              ) : (
                <SelectField
                  label="Planta"
                  value={plant}
                  onChange={setPlant}
                  options={plants.map(p => ({ value: p, label: p }))}
                />
              )}

              {/* Tipo + Operación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="Tipo"
                  value={type}
                  onChange={setType}
                  options={[
                    { value: "Proveedor", label: "Proveedor" },
                    { value: "Propio", label: "Propio" },
                    { value: "Cliente", label: "Cliente" },
                    { value: "Otro", label: "Otro" },
                  ]}
                />
                <SelectField
                  label="Tipo de Operación"
                  value={tipoOperacion}
                  onChange={setTipoOperacion}
                  options={[
                    { value: "Carga", label: "Carga" },
                    { value: "Descarga", label: "Descarga" },
                    { value: "Visita", label: "Visita" },
                    { value: "Mantenimiento", label: "Mantenimiento" },
                    { value: "Traslado entre plantas", label: "Traslado" },
                    { value: "Otro", label: "Otro" },
                  ]}
                />
              </div>

              {/* Responsable de Almacén */}
              <div className="sg-field">
                <label className="sg-label">Responsable de Almacén</label>
                <div className="relative">
                  <Package className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                  {responsablesList.length > 0 ? (
                    <>
                      <select
                        value={responsable}
                        onChange={(e) => setResponsable(e.target.value)}
                        className="sg-select appearance-none pl-10 pr-10"
                      >
                        {responsablesList.map((r) => (
                          <option key={r} value={r} className="bg-[var(--sg-panel-2)]">{r}</option>
                        ))}
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
                    placeholder="Nombre del guardia"
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
                  placeholder="Opcional: detalles del ingreso, incidencias..."
                  className="sg-textarea min-h-[72px]"
                />
              </div>

              {/* Hora de Cita (opcional) */}
              <div className="sg-field">
                <label className="sg-label flex items-center gap-2">
                  Hora de Cita
                  <span className="sg-font-mono text-[8px] bg-[var(--sg-panel-3)] px-2 py-0.5 border border-[var(--sg-line)] text-[var(--sg-muted)] uppercase">
                    Opcional
                  </span>
                </label>
                <input
                  type="time"
                  value={horaCita}
                  onChange={(e) => setHoraCita(e.target.value)}
                  className="sg-input"
                />
                <p className="text-[10px] text-[var(--sg-muted)]">
                  Si el vehículo tiene cita, la demora se mide desde esta hora
                </p>
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={isPending || duplicateWarning !== null}
                className={`sg-btn sg-btn-accent w-full justify-center h-14 text-[15px] font-bold tracking-[0.06em] ${
                  isPending || duplicateWarning ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isPending ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="flex items-center gap-3"
                  >
                    <CloudUpload className="h-5 w-5" />
                    Registrando...
                  </motion.span>
                ) : duplicateWarning ? (
                  <span className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5" />
                    Verificar duplicado antes de registrar
                  </span>
                ) : (
                  <>
                    <CloudUpload className="h-5 w-5" />
                    Registrar Ingreso
                  </>
                )}
              </motion.button>
            </form>
          </section>

          <div className="border border-[var(--sg-line)] bg-[#1B1C1D] p-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-[#D1B143] shrink-0" />
              <div className="text-[13px] text-[var(--sg-muted)] leading-relaxed">
                <strong className="font-bold text-[#E5E5E5]">Flujo de 3 pasos:</strong> Registrar ingreso → Marcar atención → Confirmar entrega de documentos.
              </div>
            </div>
          </div>
        </div>

        {/* ── RECENT HISTORY COLUMN ── */}
        <div className="flex flex-col gap-6">
          <section className="sg-panel flex flex-col min-h-[600px]">
            <div className="flex items-center justify-between border-b border-[var(--sg-line)] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-[var(--sg-panel-2)] text-[var(--sg-accent)]">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="sg-font-display text-[18px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                    Registros de Hoy
                  </h2>
                  <p className="text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">
                    {plant} · {recentRegistrations.length}/{recentTotal}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <button
                  onClick={() => fetchRecent(plant)}
                  className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)] hover:underline"
                >
                  Actualizar
                </button>
                {lastRefresh && (
                  <span className="sg-font-mono text-[9px] text-[var(--sg-muted)]" suppressHydrationWarning>
                    ↻ {lastRefresh}
                  </span>
                )}
              </div>
            </div>

            {abandonedRecords.length > 0 && (
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--sg-danger)] bg-[rgba(211,92,79,0.07)]">
                <div className="flex items-center gap-2 text-[11px] text-[var(--sg-danger)]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {abandonedRecords.length} vehículo{abandonedRecords.length !== 1 ? "s" : ""} con +4h sin atención
                </div>
                <button
                  onClick={handleCloseAbandoned}
                  className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-danger)] hover:opacity-70 transition-opacity"
                >
                  Cerrar todos →
                </button>
              </div>
            )}

            <div className="flex-1 overflow-auto p-3">
              <AnimatePresence mode="popLayout">
                {recentRegistrations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-[var(--sg-muted)]">
                    <Truck className="h-12 w-12 opacity-10 mb-4" />
                    <p className="sg-font-mono text-[12px] uppercase tracking-widest">Sin registros hoy</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {recentRegistrations.map((reg) => (
                      <TarjetaRegistro
                        key={reg.id}
                        reg={reg}
                        onClose={() => handleClose(reg)}
                        onDocs={reg.attended && !reg.docsDelivered ? () => handleDocs(reg) : undefined}
                        onEdit={() => setEditingReg(reg)}
                        onDelete={userRole !== "guardia" ? () => handleDelete(reg.id, reg.razonSocial) : undefined}
                        isAbandoned={abandonedRecords.some((a) => a.id === reg.id)}
                        closing={closingIds.has(reg.id)}
                        docsLoading={docsIds.has(reg.id)}
                        deleting={deletingIds.has(reg.id)}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Load more */}
            {recentRegistrations.length < recentTotal && (
              <div className="border-t border-[var(--sg-line)] p-4 flex justify-center">
                <button
                  onClick={() => fetchRecent(plant, false)}
                  disabled={loadingMore}
                  className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-accent)] transition-colors"
                >
                  {loadingMore ? "Cargando..." : `Cargar más (${recentTotal - recentRegistrations.length} restantes) →`}
                </button>
              </div>
            )}
          </section>
        </div>
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
