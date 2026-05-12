import { searchSuggestions } from "@/app/actions";
import CitasDelDia from "@/components/CitasDelDia";
import PlacaInput from "@/components/PlacaInput";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ClipboardList,
  CloudUpload,
  Package,
  Shield,
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
  agentesList: string[];
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
  onVehicleSelect: (value: string) => Promise<void> | void;
  onToast: (message: string, durationMs?: number) => void;
  onRefresh: () => void;
  onClear?: () => void;
  showCitasPanel?: boolean;
}

function SelectField({
  label,
  options,
  value,
  onChange,
  disabled,
  icon: Icon,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="sg-field">
      <label className="mb-1.5 block text-[11px] font-medium text-[var(--sg-copy)]">{label}</label>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
        ) : null}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`sg-select h-10 appearance-none ${Icon ? "pl-9" : "pl-3"} pr-10 text-[13px] ${disabled ? "cursor-not-allowed bg-[var(--sg-panel-3)] opacity-60" : ""}`}
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
      <Icon className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
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
        className="sg-input h-10 w-full pl-9 text-[13px] uppercase"
      />
      {open ? (
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
      ) : null}
    </div>
  );
}

function AgenteDropup({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (options.length === 0) {
    return (
      <div className="relative">
        <Shield className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="SUPERVISOR"
          className="sg-input h-10 pl-9 text-[13px] uppercase"
        />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <Shield className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)] z-10" />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="sg-select h-10 w-full appearance-none pl-9 pr-8 text-[13px] text-left flex items-center"
      >
        <span className="truncate">{value || <span className="text-[var(--sg-muted)]">Seleccionar agente</span>}</span>
      </button>
      <ChevronDown
        className={`pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)] transition-transform ${open ? "rotate-180" : ""}`}
      />
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 z-50 border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-lg max-h-52 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full px-4 py-2 text-left sg-font-mono text-[11px] uppercase tracking-wide transition-colors ${
                opt === value
                  ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]"
                  : "text-[var(--sg-copy)] hover:bg-[var(--sg-panel-2)]"
              }`}
            >
              {opt}
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
  agentesList,
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
  onVehicleSelect,
  onToast,
  onRefresh,
  onClear,
  showCitasPanel = true,
}: RegistroFormPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      {showCitasPanel ? (
        <CitasDelDia
          plant={plant}
          citas={citas}
          onToast={onToast}
          onRefresh={onRefresh}
        />
      ) : null}

      <section className="sg-panel p-5">
        <div className="mb-4 flex items-center justify-between border-b border-[var(--sg-line)] pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-[var(--sg-accent)] bg-[rgba(200,168,75,0.08)] text-[var(--sg-accent)]">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h2 className="sg-font-display text-[16px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
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
          <div className="grid gap-4 border-t border-[var(--sg-line)] pt-4">
            <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)]">
              Datos del Vehículo
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sg-field">
                <label className="mb-1.5 block text-[11px] font-medium text-[var(--sg-copy)]">Razón social / Vehículo *</label>
                <PlacaInput
                  value={values.razonSocial}
                  onChange={onRazonSocialChange}
                  placeholder="ANSP. PIMENTEL C8E-819"
                  autoFocus
                  onSelect={onVehicleSelect}
                  compact
                  hideLabel
                />
              </div>

              <div className="sg-field">
                <label className="mb-1.5 block text-[11px] font-medium text-[var(--sg-copy)]">Empresa destino / Cliente *</label>
                <AutocompleteInput
                  icon={Building2}
                  value={values.empresa}
                  onChange={onEmpresaChange}
                  placeholder="FAB. DE CHOCOLATES LA IBERICA SA"
                  field="empresa"
                  required
                />
              </div>
            </div>

            {duplicateWarning ? (
              <div className="flex items-center gap-3 border-l-[3px] border-[var(--sg-warn)] bg-[rgba(200,160,75,0.08)] px-4 py-3 text-[12px] text-[var(--sg-warn)]">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <div>
                  <strong>Posible duplicado:</strong> Ya hay un ingreso pendiente registrado a las{" "}
                  <strong className="text-[var(--sg-ink)]">{duplicateWarning.time}</strong>. Verifica antes de continuar.
                </div>
              </div>
            ) : null}

            <p className="text-[10px] text-[var(--sg-muted)]">
              Incluye nombre de empresa transportista y placa al final
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {plantLocked ? (
                <div className="sg-field">
                  <label className="mb-1.5 block text-[11px] font-medium text-[var(--sg-copy)]">Sede / Puerta *</label>
                  <input
                    type="text"
                    value={formatGateLabelFromPlant(plant, gateOptions)}
                    disabled
                    className="sg-input h-10 cursor-not-allowed bg-[var(--sg-panel-3)] text-[13px] opacity-60"
                  />
                </div>
              ) : (
                <SelectField
                  label="Sede / Puerta *"
                  value={plant}
                  onChange={onPlantChange}
                  icon={Building2}
                  options={plants.map((currentPlant) => ({
                    value: currentPlant,
                    label: formatGateLabelFromPlant(currentPlant, gateOptions),
                  }))}
                />
              )}

                <SelectField
                  label="Tipo *"
                  value={values.type}
                  onChange={onTypeChange}
                  icon={Package}
                  options={[
                    { value: "Proveedor", label: "Proveedor" },
                    { value: "Propio", label: "Propio" },
                  { value: "Cliente", label: "Cliente" },
                  { value: "Otro", label: "Otro" },
                ]}
              />

                <SelectField
                  label="Operación *"
                  value={values.tipoOperacion}
                  onChange={onTipoOperacionChange}
                  icon={ChevronDown}
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

          <div className="grid gap-4 border-t border-[var(--sg-line)] pt-4">
            <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)]">
              Responsables
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sg-field">
                <label className="mb-1.5 block text-[11px] font-medium text-[var(--sg-copy)]">Responsable de almacén *</label>
                <div className="relative">
                  <Package className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                  {responsablesList.length > 0 ? (
                    <>
                      <select
                        value={values.responsable}
                        onChange={(event) => onResponsableChange(event.target.value)}
                        className="sg-select h-10 appearance-none pl-9 pr-8 text-[13px]"
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
                        className="sg-input h-10 pl-9 text-[13px] uppercase"
                      />
                    )}
                </div>
              </div>

              <div className="sg-field">
                <label className="mb-1.5 block text-[11px] font-medium text-[var(--sg-copy)]">Agente responsable *</label>
                <AgenteDropup
                  value={values.agente}
                  options={agentesList}
                  onChange={onAgenteChange}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="sg-field">
              <label className="mb-1.5 block text-[11px] font-medium text-[var(--sg-copy)]">Observación</label>
              <input
                type="text"
                value={values.note}
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="Agrega información relevante (opcional)..."
                className="sg-input h-10 text-[13px]"
              />
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3 border-t border-[var(--sg-line)] pt-4">
            <button
              type="submit"
              disabled={isPending}
              className={`sg-btn sg-btn-accent h-10 min-w-[200px] justify-center px-5 text-[12px] font-bold tracking-[0.1em] ${
                isPending ? "cursor-not-allowed opacity-70" : ""
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
                  Revisar duplicado y confirmar
                </span>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4" />
                  Registrar ingreso
                </>
              )}
            </button>

            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="ml-auto sg-font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-accent)]"
              >
                Limpiar
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
