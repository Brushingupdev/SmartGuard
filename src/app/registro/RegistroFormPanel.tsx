import { searchSuggestions } from "@/app/actions";
import CitasDelDia from "@/components/CitasDelDia";
import PlacaInput from "@/components/PlacaInput";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  ChevronDown,
  ClipboardList,
  CloudUpload,
  Package,
  User,
} from "lucide-react";
import { formatGateLabelFromPlant, type GateAssignment } from "@/lib/gates";
import type { CitaRow, RecentRegistration } from "./types";

interface RegistroFormValues {
  razonSocial: string;
  empresa: string;
  type: string;
  tipoOperacion: string;
  responsable: string;
  agente: string;
  note: string;
  horaCita: string;
}

interface RegistroFormPanelProps {
  plant: string;
  plants: string[];
  gateOptions: GateAssignment[];
  plantLocked: boolean;
  citas: CitaRow[];
  liveTime: string;
  responsablesList: string[];
  values: RegistroFormValues;
  duplicateWarning: RecentRegistration | null;
  isPending: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onPlantChange: (value: string) => void;
  onRazonSocialChange: (value: string) => void;
  onEmpresaChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onTipoOperacionChange: (value: string) => void;
  onResponsableChange: (value: string) => void;
  onAgenteChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onHoraCitaChange: (value: string) => void;
  onVehicleSelect: (value: string) => Promise<void> | void;
  onToast: (message: string, durationMs?: number) => void;
  onRefresh: () => void;
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
          className={`sg-select appearance-none pr-10 ${disabled ? "cursor-not-allowed bg-[var(--sg-panel-3)] opacity-60" : ""}`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-[var(--sg-panel-2)]">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
      </div>
    </div>
  );
}

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
  onChange: (value: string) => void;
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
    if (term.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const results = await searchSuggestions({ field, term });
    setSuggestions(results);
    setOpen(results.length > 0);
    setActiveIdx(-1);
  }, [field]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value.toUpperCase();
    onChange(nextValue);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(nextValue), 300);
  };

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setSuggestions([]);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIdx((index) => Math.min(index + 1, suggestions.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIdx((index) => Math.max(index - 1, -1));
      return;
    }
    if (event.key === "Enter" && activeIdx >= 0) {
      event.preventDefault();
      handleSelect(suggestions[activeIdx]);
      return;
    }
    if (event.key === "Escape") setOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="sg-input w-full pl-10 uppercase"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[200px] overflow-y-auto border border-[var(--sg-accent)] bg-[var(--sg-panel)] shadow-[4px_4px_0_rgba(196,192,180,0.1)]">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={() => handleSelect(suggestion)}
              className={`w-full truncate px-4 py-2.5 text-left sg-font-mono text-[11px] uppercase transition-colors ${
                index === activeIdx
                  ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]"
                  : "text-[var(--sg-copy)] hover:bg-[var(--sg-panel-2)]"
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RegistroFormPanel({
  plant,
  plants,
  gateOptions,
  plantLocked,
  citas,
  liveTime,
  responsablesList,
  values,
  duplicateWarning,
  isPending,
  onSubmit,
  onPlantChange,
  onRazonSocialChange,
  onEmpresaChange,
  onTypeChange,
  onTipoOperacionChange,
  onResponsableChange,
  onAgenteChange,
  onNoteChange,
  onHoraCitaChange,
  onVehicleSelect,
  onToast,
  onRefresh,
}: RegistroFormPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <CitasDelDia
        plant={plant}
        citas={citas}
        onToast={onToast}
        onRefresh={onRefresh}
      />

      <section className="sg-panel p-5">
        <div className="mb-5 flex items-center justify-between border-b border-[var(--sg-line)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-[var(--sg-accent)] text-[var(--sg-canvas)]">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="sg-font-display text-[18px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                Nuevo Ingreso
              </h2>
              <p className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                Complete los campos obligatorios
              </p>
            </div>
          </div>
          <div className="sg-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]" suppressHydrationWarning>
            {liveTime.substring(0, 5)}
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4">
            <div className="mb-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)]">
              Datos del Vehículo
            </div>

            <PlacaInput
              value={values.razonSocial}
              onChange={onRazonSocialChange}
              placeholder="TRANSP. PIMENTEL C8E-819"
              autoFocus
              onSelect={onVehicleSelect}
            />
            {duplicateWarning ? (
              <div className="flex items-center gap-3 border-l-[3px] border-[var(--sg-warn)] bg-[rgba(200,160,75,0.08)] px-4 py-3 text-[12px] text-[var(--sg-warn)]">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <div>
                  <strong>Posible duplicado:</strong> Ya hay un ingreso pendiente registrado a las{" "}
                  <strong className="text-[var(--sg-ink)]">{duplicateWarning.time}</strong>. Verifica antes de continuar.
                </div>
              </div>
            ) : (
              <p className="-mt-2 text-[10px] text-[var(--sg-muted)]">
                Incluye nombre de empresa transportista y placa al final
              </p>
            )}

            <div className="sg-field">
              <label className="sg-label">Empresa Destino / Cliente *</label>
              <AutocompleteInput
                icon={Building2}
                value={values.empresa}
                onChange={onEmpresaChange}
                placeholder="Ej: FAB. DE CHOCOLATES LA IBERICA SA"
                field="empresa"
                required
              />
            </div>

            {plantLocked ? (
              <div className="sg-field">
                <label className="sg-label flex items-center gap-2">
                  Sede / Puerta
                  <span className="sg-font-mono border border-[var(--sg-line)] bg-[var(--sg-panel-3)] px-2 py-0.5 text-[8px] uppercase text-[var(--sg-muted)]">
                    Asignado
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatGateLabelFromPlant(plant, gateOptions)}
                    disabled
                    className="sg-input cursor-not-allowed bg-[var(--sg-panel-3)] opacity-60"
                  />
                </div>
              </div>
            ) : (
              <SelectField
                label="Sede / Puerta"
                value={plant}
                onChange={onPlantChange}
                options={plants.map((currentPlant) => ({
                  value: currentPlant,
                  label: formatGateLabelFromPlant(currentPlant, gateOptions),
                }))}
              />
            )}
          </div>

          <div className="grid gap-4 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4">
            <div className="mb-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)]">
              Clasificación
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Tipo"
                value={values.type}
                onChange={onTypeChange}
                options={[
                  { value: "Proveedor", label: "Proveedor" },
                  { value: "Propio", label: "Propio" },
                  { value: "Cliente", label: "Cliente" },
                  { value: "Otro", label: "Otro" },
                ]}
              />
              <SelectField
                label="Operación"
                value={values.tipoOperacion}
                onChange={onTipoOperacionChange}
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
          </div>

          <div className="grid gap-4 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4">
            <div className="mb-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)]">
              Responsables
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sg-field">
                <label className="sg-label text-[10px]">Responsable de Almacén</label>
                <div className="relative">
                  <Package className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                  {responsablesList.length > 0 ? (
                    <>
                      <select
                        value={values.responsable}
                        onChange={(event) => onResponsableChange(event.target.value)}
                        className="sg-select appearance-none pl-9 pr-8 text-[12px]"
                      >
                        {responsablesList.map((responsable) => (
                          <option key={responsable} value={responsable} className="bg-[var(--sg-panel-2)]">
                            {responsable}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                    </>
                  ) : (
                    <input
                      type="text"
                      value={values.responsable}
                      onChange={(event) => onResponsableChange(event.target.value.toUpperCase())}
                      placeholder="Nombre del responsable"
                      className="sg-input pl-9 text-[12px] uppercase"
                    />
                  )}
                </div>
              </div>

              <div className="sg-field">
                <label className="sg-label text-[10px]">Agente Responsable</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                  <input
                    type="text"
                    value={values.agente}
                    onChange={(event) => onAgenteChange(event.target.value.toUpperCase())}
                    placeholder="Nombre del guardia"
                    className="sg-input pl-9 text-[12px] uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sg-field">
              <label className="sg-label text-[10px]">Observación</label>
              <textarea
                value={values.note}
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="Opcional..."
                className="sg-textarea min-h-[60px] text-[12px]"
              />
            </div>

            <div className="sg-field">
              <label className="sg-label flex items-center gap-2 text-[10px]">
                Hora de Cita
                <span className="sg-font-mono border border-[var(--sg-line)] bg-[var(--sg-panel-3)] px-1.5 py-px text-[7px] uppercase text-[var(--sg-muted)]">
                  Opcional
                </span>
              </label>
              <input
                type="time"
                value={values.horaCita}
                onChange={(event) => onHoraCitaChange(event.target.value)}
                className="sg-input text-[12px]"
              />
              <p className="mt-1 text-[9px] text-[var(--sg-muted)]">
                Formato 24h — 2 PM = 14:00
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || duplicateWarning !== null}
            className={`sg-btn sg-btn-accent mt-2 h-12 w-full justify-center text-[14px] font-bold tracking-[0.06em] ${
              isPending || duplicateWarning ? "cursor-not-allowed opacity-70" : ""
            }`}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <CloudUpload className="h-4 w-4" />
                Registrando...
              </span>
            ) : duplicateWarning ? (
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Verificar duplicado
              </span>
            ) : (
              <>
                <CloudUpload className="h-4 w-4" />
                Registrar Ingreso
              </>
            )}
          </button>
        </form>
      </section>

      <div className="border border-[var(--sg-line)] bg-[#1B1C1D] p-5">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-[#D1B143]" />
          <div className="text-[13px] leading-relaxed text-[var(--sg-muted)]">
            <strong className="font-bold text-[#E5E5E5]">Flujo de 3 pasos:</strong> Registrar ingreso → Marcar atención → Confirmar entrega de documentos.
          </div>
        </div>
      </div>
    </div>
  );
}
