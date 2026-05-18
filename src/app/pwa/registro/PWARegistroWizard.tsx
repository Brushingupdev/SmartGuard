"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Home,
  MapPin,
  Plus,
  Shield,
  Truck,
  User,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createAtencion, getVehicleProfile } from "@/app/actions";
import type { GateAssignment } from "@/lib/gates";
import { formatGateLabelFromPlant, gateFromPlant } from "@/lib/gates";
import { usePWATheme } from "@/contexts/PWAThemeContext";
import type { RecentRegistration } from "@/app/registro/types";
import { humanizeError } from "@/lib/humanizeError";

interface Props {
  defaultPlant: string;
  defaultAgente: string;
  responsables: string[];
  agentes: string[];
  gateOptions: GateAssignment[];
  initialRecentRecords: RecentRegistration[];
}

interface FormState {
  razonSocial: string;
  empresa: string;
  tipoOperacion: string;
  responsable: string;
  agente: string;
  plant: string;
  note: string;
  photoPreview: string | null;
}

const TIPO_OPERACIONES = ["Carga", "Descarga", "Servicio", "Otro"] as const;

function ThemeSwitcher() {
  const { theme, setTheme, themes } = usePWATheme();
  return (
    <div className="flex items-center gap-1.5">
      {themes.map((item) => (
        <button
          key={item.key}
          onClick={() => setTheme(item.key)}
          title={item.label}
          className="h-6 w-6 rounded-full border-2 transition-all"
          style={{
            background: item.key === "dark" ? "#0d0f0e" : item.key === "light" ? "#f2f0eb" : "#000000",
            borderColor: theme === item.key ? "var(--pwa-accent)" : "var(--pwa-border)",
            cursor: "pointer",
          }}
        />
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: "var(--sg-font-mono)",
        fontSize: 8,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--pwa-muted)",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function ScreenHeader({
  index,
  title,
  trailing,
}: {
  index: string;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="mx-4 mt-4 mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)" }}>
          <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, fontWeight: 700 }}>{index}</span>
        </div>
        <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 17, fontWeight: 800, color: "var(--pwa-ink)", margin: 0 }}>
          {title}
        </p>
      </div>
      {trailing}
    </div>
  );
}

function SurfaceCard({
  children,
  accent = false,
  className = "",
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: "var(--pwa-surface)",
        border: `1px solid ${accent ? "color-mix(in srgb, var(--pwa-accent) 30%, var(--pwa-border))" : "var(--pwa-border)"}`,
      }}
    >
      {accent && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 120,
            height: 120,
            background: "radial-gradient(circle at top right, color-mix(in srgb, var(--pwa-accent) 10%, transparent), transparent)",
            pointerEvents: "none",
          }}
        />
      )}
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: LucideIcon;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel>{label}</SectionLabel>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--pwa-muted)" }} />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="h-12 w-full pl-10 pr-3 outline-none"
          style={{
            background: "var(--pwa-surface-2)",
            border: "1px solid var(--pwa-border)",
            color: "var(--pwa-ink)",
            fontFamily: "var(--sg-font-display)",
            fontSize: 14,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        />
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel>{label}</SectionLabel>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none px-3 py-3 outline-none"
        style={{
          background: "var(--pwa-surface-2)",
          border: "1px solid var(--pwa-border)",
          color: "var(--pwa-ink)",
          fontFamily: "var(--sg-font-body)",
          fontSize: 13,
        }}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel>{label}</SectionLabel>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--pwa-muted)" }} />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full appearance-none pl-10 pr-10 outline-none"
          style={{
            background: "var(--pwa-surface-2)",
            border: "1px solid var(--pwa-border)",
            color: "var(--pwa-ink)",
            fontFamily: "var(--sg-font-display)",
            fontSize: 14,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--pwa-muted)" }} />
      </div>
    </div>
  );
}

function TipoOperacionRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel>Tipo de operacion</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        {TIPO_OPERACIONES.map((item) => {
          const active = item === value;
          return (
            <button
              key={item}
              onClick={() => onChange(item)}
              className="h-11 transition-all"
              style={{
                background: active ? "var(--pwa-accent)" : "var(--pwa-surface-2)",
                border: `1px solid ${active ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
                color: active ? "var(--pwa-accent-fg)" : "var(--pwa-muted)",
                cursor: "pointer",
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: active ? 700 : 500,
              }}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MetricChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className="px-3 py-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${tone === "accent" ? "color-mix(in srgb, var(--pwa-accent) 35%, var(--pwa-border))" : "var(--pwa-border)"}`,
      }}
    >
      <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 20, fontWeight: 800, color: tone === "accent" ? "var(--pwa-accent)" : "var(--pwa-ink)", margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 7, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: "7px 0 0" }}>
        {label}
      </p>
    </div>
  );
}

function RecentRecordRow({ record, gateOptions }: { record: RecentRegistration; gateOptions: GateAssignment[] }) {
  const isClosed = record.docsDelivered;
  const isAttended = record.attended;
  const statusColor = isClosed ? "#6bbd8a" : isAttended ? "#6ba7ff" : "var(--pwa-accent)";
  const statusLabel = isClosed ? "Completo" : isAttended ? "En atencion" : "Registrado";

  return (
    <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--pwa-border)" }}>
      <div className="h-10 w-1 shrink-0" style={{ background: statusColor }} />
      <div className="min-w-0 flex-1">
        <p
          className="truncate"
          style={{
            fontFamily: "var(--sg-font-display)",
            fontSize: 14,
            fontWeight: 800,
            textTransform: "uppercase",
            color: "var(--pwa-ink)",
            margin: 0,
          }}
        >
          {record.razonSocial || record.empresa || "Ingreso"}
        </p>
        <p
          className="truncate"
          style={{
            fontFamily: "var(--sg-font-mono)",
            fontSize: 8,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--pwa-muted)",
            margin: "6px 0 0",
          }}
        >
          {formatGateLabelFromPlant(record.planta, gateOptions)} · {record.time}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: statusColor, margin: 0 }}>
          {statusLabel}
        </p>
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 7, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: "6px 0 0" }}>
          {record.reason}
        </p>
      </div>
    </div>
  );
}

export default function PWARegistroWizard({
  defaultPlant,
  defaultAgente,
  responsables,
  agentes,
  gateOptions,
  initialRecentRecords,
}: Props) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [timeLabel, setTimeLabel] = useState<string>("");
  const [recentRecords, setRecentRecords] = useState<RecentRegistration[]>(initialRecentRecords);

  const [data, setData] = useState<FormState>({
    razonSocial: "",
    empresa: "",
    tipoOperacion: "Descarga",
    responsable: responsables[0] ?? "",
    agente: defaultAgente,
    plant: defaultPlant || gateOptions[0]?.plant || "",
    note: "",
    photoPreview: null,
  });

  const plantOptions = useMemo(
    () => gateOptions.map((gate) => ({ value: gate.plant, label: formatGateLabelFromPlant(gate.plant, gateOptions) })),
    [gateOptions],
  );

  const activeGate = gateOptions.find((item) => item.plant === data.plant) ?? gateFromPlant(data.plant);
  const plantLabel = formatGateLabelFromPlant(data.plant, gateOptions);
  const filledFields = [data.razonSocial, data.empresa, data.responsable, data.agente].filter((value) => value.trim()).length;
  const duplicateWarning = useMemo(() => {
    const term = data.razonSocial.trim().toUpperCase();
    if (term.length < 3) return null;
    return (
      recentRecords.find((record) =>
        record.planta === data.plant &&
        !record.attended &&
        !record.docsDelivered &&
        record.razonSocial.toUpperCase().includes(term)
      ) ?? null
    );
  }, [data.plant, data.razonSocial, recentRecords]);

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    if ((key === "razonSocial" || key === "plant") && duplicateConfirmed) {
      setDuplicateConfirmed(false);
    }
    if (error) setError(null);
    setData((current) => ({ ...current, [key]: value }));
  };

  const handleVehiclePrefill = async () => {
    const term = data.razonSocial.trim();
    if (term.length < 3) return;
    setPrefillLoading(true);
    try {
      const profile = await getVehicleProfile(term);
      if (!profile) return;
      setData((current) => ({
        ...current,
        empresa: current.empresa.trim() || profile.empresa || current.empresa,
        tipoOperacion: profile.tipoOperacion || current.tipoOperacion,
      }));
    } finally {
      setPrefillLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!data.razonSocial.trim()) return;
    if (duplicateWarning && !duplicateConfirmed) {
      setDuplicateConfirmed(true);
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const result = await createAtencion({
        razonSocial: data.razonSocial.trim(),
        empresa: data.empresa.trim() || data.razonSocial.trim(),
        type: "Proveedor",
        tipoOperacion: data.tipoOperacion,
        responsable: data.responsable,
        agente: data.agente,
        note: data.note.trim(),
        plant: data.plant,
        horaCita: null,
        forceDuplicate: duplicateConfirmed,
      });

      if (result.success) {
        const createdTime = result.time ?? "";
        const newRecord: RecentRegistration = {
          id: Date.now(),
          razonSocial: data.razonSocial.trim(),
          empresa: data.empresa.trim() || data.razonSocial.trim(),
          planta: data.plant,
          type: "Proveedor",
          time: createdTime || "--:--",
          reason: data.tipoOperacion,
          tipoOperacion: data.tipoOperacion,
          responsable: data.responsable,
          agente: data.agente,
          observacion: data.note.trim(),
          attended: false,
          h_atencion: null,
          espera_min: 0,
          demora_cita_min: null,
          docsDelivered: false,
          h_dev_docs: null,
          tiempo_total_min: null,
          hora_cita: null,
          estado: "activo",
          hasArrived: true,
          scheduledOnly: false,
        };
        setTimeLabel(createdTime);
        setRecentRecords((current) => [newRecord, ...current].slice(0, 8));
        setDuplicateConfirmed(false);
        setDone(true);
      } else {
        setError(humanizeError(result.error));
      }
    } catch {
      setError(humanizeError("Error inesperado"));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] flex-col" style={{ background: "var(--pwa-bg)" }}>
        <div className="flex items-center justify-between px-5 pt-5">
          <button
            onClick={() => router.replace("/pwa/home")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--sg-font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--pwa-muted)",
            }}
          >
            <Home className="h-4 w-4" /> Inicio
          </button>
          <ThemeSwitcher />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-5 py-6">
          <SurfaceCard accent className="w-full max-w-[380px] p-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "rgba(107,189,138,0.12)", border: "2px solid rgba(107,189,138,0.35)" }}>
              <CheckCircle2 className="h-10 w-10" style={{ color: "#6bbd8a" }} />
            </div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6bbd8a", textAlign: "center", margin: "18px 0 0" }}>
              Ingreso registrado
            </p>
            <h2 style={{ fontFamily: "var(--sg-font-display)", fontSize: 26, fontWeight: 800, textTransform: "uppercase", color: "var(--pwa-ink)", textAlign: "center", margin: "8px 0 0" }}>
              {data.razonSocial}
            </h2>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)", textAlign: "center", margin: "8px 0 0" }}>
              {plantLabel} {timeLabel ? `· ${timeLabel}` : ""}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <MetricChip label="Operacion" value={data.tipoOperacion.slice(0, 3).toUpperCase()} tone="accent" />
              <MetricChip label="Responsable" value={data.responsable ? data.responsable.split(" ")[0].toUpperCase() : "--"} />
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setDone(false);
                  setData((current) => ({
                    ...current,
                    razonSocial: "",
                    empresa: "",
                    tipoOperacion: "Descarga",
                    note: "",
                    photoPreview: null,
                  }));
                }}
                className="flex h-[54px] items-center justify-center gap-2"
                style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)", border: "none", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}
              >
                <Plus className="h-4 w-4" /> Nuevo registro
              </motion.button>
              <button
                onClick={() => router.replace("/pwa/home")}
                className="flex h-[48px] items-center justify-center gap-2"
                style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)", color: "var(--pwa-muted)", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}
              >
                <ArrowLeft className="h-4 w-4" /> Volver al inicio
              </button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col" style={{ background: "var(--pwa-bg)" }}>
      <ScreenHeader
        index="2"
        title="Registrar"
        trailing={<button onClick={() => router.replace("/pwa/home")} style={{ background: "none", border: "none", color: "var(--pwa-muted)", cursor: "pointer" }}><ArrowLeft className="h-4 w-4" /></button>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <SurfaceCard accent className="p-5" >
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
            Ubicación
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <MetricChip label="Planta" value={activeGate.site.slice(0, 3).toUpperCase()} />
            <MetricChip label="Puerta" value={activeGate.gate.slice(0, 3).toUpperCase()} tone="accent" />
            <MetricChip label="Hoy" value={String(recentRecords.length)} />
          </div>
        </SurfaceCard>

        <div className="mt-4 grid gap-4">
          <SurfaceCard className="p-4">
            <SectionLabel>Ubicación</SectionLabel>
            <div className="mt-3 grid gap-3">
              <SelectField
                label="Planta"
                value={data.plant}
                onChange={(value) => handleChange("plant", value)}
                options={plantOptions}
                icon={MapPin}
              />
              <div className="flex flex-col gap-1.5">
                <SectionLabel>Puerta</SectionLabel>
                <div className="h-12 w-full px-4 flex items-center" style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)" }}>
                  <span style={{ fontFamily: "var(--sg-font-display)", fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "var(--pwa-ink)" }}>
                    {activeGate.gate}
                  </span>
                </div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-4">
            <SectionLabel>Datos del ingreso</SectionLabel>
            <div className="mt-3 grid gap-3">
              <TextField
                label="Vehiculo / razon social"
                value={data.razonSocial}
                onChange={(value) => handleChange("razonSocial", value)}
                placeholder="ABC-1234 O TRANSPORTES ABC"
                icon={Truck}
                autoFocus
              />
              {prefillLoading ? (
                <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: "-2px 0 0" }}>
                  Buscando datos previos...
                </p>
              ) : null}
              <TextField
                label="Empresa / transportista"
                value={data.empresa}
                onChange={(value) => handleChange("empresa", value)}
                placeholder="EMPRESA DESTINO"
                icon={Building2}
              />
              <button
                type="button"
                onClick={handleVehiclePrefill}
                disabled={prefillLoading || data.razonSocial.trim().length < 3}
                className="flex h-10 items-center justify-center gap-2 disabled:opacity-45"
                style={{
                  background: "var(--pwa-surface-2)",
                  border: "1px solid var(--pwa-border)",
                  color: "var(--pwa-muted)",
                  cursor: "pointer",
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                <Clock3 className="h-4 w-4" />
                {prefillLoading ? "Buscando..." : "Usar historial similar"}
              </button>
              <TipoOperacionRow value={data.tipoOperacion} onChange={(value) => handleChange("tipoOperacion", value)} />
            </div>
          </SurfaceCard>

          {duplicateWarning ? (
            <div
              className="px-4 py-3"
              style={{
                background: duplicateConfirmed ? "rgba(212,134,74,0.12)" : "rgba(200,160,75,0.08)",
                borderLeft: `3px solid ${duplicateConfirmed ? "#d4864a" : "var(--pwa-accent)"}`,
              }}
            >
              <p style={{ fontFamily: "var(--sg-font-body)", fontSize: 12, color: duplicateConfirmed ? "#d4864a" : "var(--pwa-accent)", margin: 0 }}>
                <strong>Posible duplicado:</strong> ya hay un ingreso pendiente a las <strong style={{ color: "var(--pwa-ink)" }}>{duplicateWarning.time}</strong> en {formatGateLabelFromPlant(duplicateWarning.planta, gateOptions)}.
                {duplicateConfirmed ? " Se enviará como duplicado confirmado." : " Verifica antes de continuar."}
              </p>
            </div>
          ) : null}

          <SurfaceCard className="p-4">
            <SectionLabel>Responsables del turno</SectionLabel>
            <div className="mt-3 grid gap-3">
              <SelectField
                label="Responsable de almacen"
                value={data.responsable}
                onChange={(value) => handleChange("responsable", value)}
                options={responsables.map((item) => ({ value: item, label: item }))}
                icon={UserCheck}
              />
              <SelectField
                label="Guardia que registra"
                value={data.agente}
                onChange={(value) => handleChange("agente", value)}
                options={agentes.map((item) => ({ value: item, label: item }))}
                icon={User}
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-4">
            <SectionLabel>Observacion y evidencia</SectionLabel>
            <div className="mt-3 grid gap-3">
              <TextAreaField
                label="Observacion"
                value={data.note}
                onChange={(value) => handleChange("note", value)}
                placeholder="Detalle adicional del ingreso si aplica..."
              />
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex h-11 items-center justify-center gap-2 px-4"
                  style={{ background: "var(--pwa-surface-2)", border: "1px dashed var(--pwa-border)", color: "var(--pwa-muted)", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" }}
                >
                  <Camera className="h-4 w-4" />
                  {data.photoPreview ? "Foto adjunta" : "Tomar foto"}
                </button>
                {data.photoPreview ? (
                  <div className="overflow-hidden" style={{ border: "1px solid var(--pwa-border)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.photoPreview} alt="Foto de evidencia" className="h-20 w-full object-cover sm:w-24" />
                  </div>
                ) : null}
              </div>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => handleChange("photoPreview", String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </div>
          </SurfaceCard>

          <div className="grid gap-3">
            {error ? (
              <div className="px-4 py-3" style={{ background: "rgba(211,92,79,0.08)", borderLeft: "3px solid #d35c4f" }}>
                <p style={{ fontFamily: "var(--sg-font-body)", fontSize: 12, color: "#d35c4f", margin: 0 }}>
                  {error}
                </p>
              </div>
            ) : null}

            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={submitting || !data.razonSocial.trim()}
              onClick={handleSubmit}
              className="flex h-[56px] w-full items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)", border: "none", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, borderRadius: 10 }}
            >
              {submitting ? (
                <>
                  <Shield className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  {duplicateWarning && !duplicateConfirmed ? "Confirmar duplicado" : "Registrar vehiculo"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </div>

          <SurfaceCard className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <SectionLabel>Historial rapido</SectionLabel>
                <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 16, fontWeight: 800, textTransform: "uppercase", color: "var(--pwa-ink)", margin: "8px 0 0" }}>
                  Registros de hoy
                </p>
              </div>
              <div className="flex items-center gap-2" style={{ color: "var(--pwa-muted)" }}>
                <Clock3 className="h-4 w-4" />
                <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  {recentRecords.length} recientes
                </span>
              </div>
            </div>

            {recentRecords.length === 0 ? (
              <div className="px-4 py-10" style={{ borderTop: "1px solid var(--pwa-border)" }}>
                <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0, textAlign: "center" }}>
                  Sin registros todavia en esta puerta
                </p>
              </div>
            ) : (
              recentRecords.map((record) => (
                <RecentRecordRow key={record.id} record={record} gateOptions={gateOptions} />
              ))
            )}
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
