"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import {
  ArrowLeft, ArrowRight, Camera, Check,
  CheckCircle2, ChevronDown, Truck, User, Building2,
  Package, UserCheck, Palette,
} from "lucide-react";
import { createAtencion } from "@/app/actions";
import type { GateAssignment } from "@/lib/gates";
import { formatGateLabelFromPlant } from "@/lib/gates";
import { usePWATheme } from "@/contexts/PWAThemeContext";
import { useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WizardData {
  razonSocial: string;
  empresa: string;
  tipoOperacion: string;
  responsable: string;
  agente: string;
  plant: string;
  photoPreview: string | null;
}

interface Props {
  defaultPlant: string;
  defaultAgente: string;
  responsables: string[];
  agentes: string[];
  gateOptions: GateAssignment[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIPO_OPERACIONES = [
  { key: "Carga",       icon: Package,   label: "Carga"       },
  { key: "Descarga",    icon: Truck,     label: "Descarga"    },
  { key: "Servicio",    icon: UserCheck, label: "Servicio"    },
  { key: "Otro",        icon: Building2, label: "Otro"        },
];

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 px-6 pt-6">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="h-1 rounded-full flex-1"
          animate={{
            background: i < current
              ? "var(--pwa-accent)"
              : i === current
              ? "var(--pwa-accent)"
              : "var(--pwa-border)",
            opacity: i <= current ? 1 : 0.4,
          }}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
}

function StepHeader({
  step,
  total,
  label,
  sublabel,
  onBack,
}: {
  step: number;
  total: number;
  label: string;
  sublabel?: string;
  onBack?: () => void;
}) {
  return (
    <div className="px-6 pt-5 pb-2">
      <div className="flex items-center justify-between mb-4">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 transition-opacity active:opacity-60"
            style={{
              color: "var(--pwa-muted)",
              fontFamily: "var(--sg-font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Atrás
          </button>
        ) : <div />}
        <span
          style={{
            fontFamily: "var(--sg-font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--pwa-muted)",
          }}
        >
          {step + 1} / {total}
        </span>
      </div>

      <motion.div
        key={label}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        <h2
          style={{
            fontFamily: "var(--sg-font-display)",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            color: "var(--pwa-ink)",
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          {label}
        </h2>
        {sublabel && (
          <p
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--pwa-muted)",
              marginTop: 6,
            }}
          >
            {sublabel}
          </p>
        )}
      </motion.div>
    </div>
  );
}

function NextButton({
  onClick,
  disabled,
  label = "Siguiente",
  loading = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  loading?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.97 }}
      className="w-full h-14 flex items-center justify-center gap-2 transition-opacity disabled:opacity-30"
      style={{
        background: "var(--pwa-accent)",
        color: "var(--pwa-accent-fg)",
        fontFamily: "var(--sg-font-mono)",
        fontSize: 12,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        fontWeight: 700,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {loading ? (
        <motion.div
          className="h-5 w-5 rounded-full border-2"
          style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "var(--pwa-accent-fg)" }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        />
      ) : (
        <>
          {label}
          {label === "Siguiente" && <ArrowRight className="h-4 w-4" />}
          {label === "Registrar" && <Check className="h-4 w-4" />}
        </>
      )}
    </motion.button>
  );
}

function BigTextInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={2}
      className="w-full resize-none outline-none p-4 text-[18px] font-bold uppercase tracking-wide transition-all"
      style={{
        background: "var(--pwa-surface)",
        border: "1px solid var(--pwa-border)",
        color: "var(--pwa-ink)",
        fontFamily: "var(--sg-font-display)",
        lineHeight: 1.4,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "var(--pwa-accent)";
        e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--pwa-accent) 15%, transparent)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "var(--pwa-border)";
        e.target.style.boxShadow = "none";
      }}
    />
  );
}

function DropdownPicker({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-14 pl-4 pr-10 outline-none appearance-none text-[15px] transition-all"
        style={{
          background: "var(--pwa-surface)",
          border: "1px solid var(--pwa-border)",
          color: value ? "var(--pwa-ink)" : "var(--pwa-muted)",
          fontFamily: "var(--sg-font-display)",
          fontWeight: value ? 700 : 400,
          textTransform: value ? "uppercase" : "none",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2"
        style={{ color: "var(--pwa-muted)" }}
      />
    </div>
  );
}

function TipoGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TIPO_OPERACIONES.map(({ key, icon: Icon, label }) => {
        const active = value === key;
        return (
          <motion.button
            key={key}
            onClick={() => onChange(key)}
            whileTap={{ scale: 0.96 }}
            className="flex flex-col items-center justify-center gap-3 h-24 transition-all"
            style={{
              background: active ? "var(--pwa-accent)" : "var(--pwa-surface)",
              border: `1px solid ${active ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
              color: active ? "var(--pwa-accent-fg)" : "var(--pwa-ink-soft)",
              cursor: "pointer",
            }}
          >
            <Icon className="h-6 w-6" style={{ opacity: active ? 1 : 0.6 }} />
            <span
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: active ? 700 : 400,
              }}
            >
              {label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

function ThemeSwitcher() {
  const { theme, setTheme, themes } = usePWATheme();
  return (
    <div className="flex items-center gap-2">
      <Palette className="h-3.5 w-3.5" style={{ color: "var(--pwa-muted)" }} />
      <div className="flex gap-1.5">
        {themes.map((t) => (
          <button
            key={t.key}
            onClick={() => setTheme(t.key)}
            title={t.label}
            className="h-5 w-5 rounded-full border-2 transition-all"
            style={{
              background: t.key === "dark" ? "#0d0f0e" : t.key === "light" ? "#f2f0eb" : "#000",
              borderColor: theme === t.key ? "var(--pwa-accent)" : "var(--pwa-border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

export default function PWARegistroWizard({
  defaultPlant,
  defaultAgente,
  responsables,
  agentes,
  gateOptions,
}: Props) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<WizardData>({
    razonSocial: "",
    empresa: "",
    tipoOperacion: "Descarga",
    responsable: responsables[0] ?? "",
    agente: defaultAgente,
    plant: defaultPlant || gateOptions[0]?.plant || "",
    photoPreview: null,
  });

  const update = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const plantLabel = gateOptions.find((g) => g.plant === data.plant)
    ? formatGateLabelFromPlant(data.plant)
    : data.plant;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await createAtencion({
        razonSocial: data.razonSocial,
        empresa: data.empresa || data.razonSocial,
        type: "Proveedor",
        tipoOperacion: data.tipoOperacion,
        responsable: data.responsable,
        agente: data.agente,
        note: "",
        plant: data.plant,
        horaCita: null,
        forceCreate: false,
      });
      if (result.success) {
        setDone(true);
      } else {
        setError(result.error ?? "Error al registrar");
        setSubmitting(false);
      }
    } catch {
      setError("Error inesperado");
      setSubmitting(false);
    }
  };

  // ── Pantalla de éxito ──────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="flex flex-col min-h-screen min-h-[100dvh] items-center justify-center px-6 gap-6">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="flex h-20 w-20 items-center justify-center"
          style={{ border: "2px solid var(--pwa-success)" }}
        >
          <CheckCircle2 className="h-10 w-10" style={{ color: "var(--pwa-success)" }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h2
            style={{
              fontFamily: "var(--sg-font-display)",
              fontSize: 28,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              color: "var(--pwa-ink)",
            }}
          >
            Registrado
          </h2>
          <p
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--pwa-muted)",
              marginTop: 8,
            }}
          >
            {data.razonSocial} · {plantLabel}
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={() => {
            setDone(false);
            setStep(0);
            setData((d) => ({
              ...d,
              razonSocial: "",
              empresa: "",
              tipoOperacion: "Descarga",
              photoPreview: null,
            }));
          }}
          className="w-full h-14 mt-4"
          style={{
            background: "var(--pwa-accent)",
            color: "var(--pwa-accent-fg)",
            fontFamily: "var(--sg-font-mono)",
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          Nuevo registro →
        </motion.button>
      </div>
    );
  }

  // ── Steps ──────────────────────────────────────────────────────────────────

  const stepVariants = {
    enter:  { opacity: 0, x: 40  },
    center: { opacity: 1, x: 0   },
    exit:   { opacity: 0, x: -40 },
  };

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]">
      <StepProgress current={step} total={TOTAL_STEPS} />

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease }}
            className="flex flex-col flex-1"
          >

            {/* ── Step 0: Vehículo + Empresa (fusionados) ── */}
            {step === 0 && (
              <div className="flex flex-col flex-1">
                <StepHeader
                  step={0}
                  total={TOTAL_STEPS}
                  label="¿Quién llega?"
                  sublabel="Razón social y empresa destino"
                />
                <div className="px-6 flex flex-col gap-4 flex-1 pt-4">
                  <div>
                    <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      color: "var(--pwa-muted)", marginBottom: 8 }}>
                      Vehículo / Transportista
                    </p>
                    <BigTextInput
                      value={data.razonSocial}
                      onChange={(v) => update("razonSocial", v)}
                      placeholder="TRANSP. EMPRESA ABC..."
                      autoFocus
                    />
                  </div>
                  <div>
                    <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      color: "var(--pwa-muted)", marginBottom: 8 }}>
                      Empresa destino (opcional)
                    </p>
                    <BigTextInput
                      value={data.empresa}
                      onChange={(v) => update("empresa", v)}
                      placeholder="EMPRESA DESTINO..."
                    />
                  </div>
                  {/* Foto */}
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="flex items-center gap-3 h-14 px-4 transition-colors"
                    style={{
                      background: "var(--pwa-surface)",
                      border: "1px dashed var(--pwa-border)",
                      color: "var(--pwa-muted)",
                      fontFamily: "var(--sg-font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    <Camera className="h-5 w-5" />
                    {data.photoPreview ? "Foto capturada ✓" : "Foto de placa (opcional)"}
                  </button>
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) update("photoPreview", URL.createObjectURL(file));
                      e.target.value = "";
                    }}
                  />
                  {data.photoPreview && (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={data.photoPreview} alt="placa" className="w-full h-32 object-cover" style={{ border: "1px solid var(--pwa-accent)" }} />
                      <button
                        onClick={() => update("photoPreview", null)}
                        className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center text-white text-sm"
                        style={{ background: "var(--pwa-danger)", cursor: "pointer", border: "none" }}
                      >✕</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 1: Tipo + Responsable (fusionados) ── */}
            {step === 1 && (
              <div className="flex flex-col flex-1">
                <StepHeader
                  step={1}
                  total={TOTAL_STEPS}
                  label="Operación"
                  sublabel="Tipo y responsable de atención"
                  onBack={() => setStep(0)}
                />
                <div className="px-6 flex flex-col gap-5 flex-1 pt-4">
                  <div>
                    <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      color: "var(--pwa-muted)", marginBottom: 10 }}>
                      Tipo de operación
                    </p>
                    <TipoGrid
                      value={data.tipoOperacion}
                      onChange={(v) => update("tipoOperacion", v)}
                    />
                  </div>
                  <div style={{ borderTop: "1px solid var(--pwa-border)", paddingTop: 16 }}>
                    <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      color: "var(--pwa-muted)", marginBottom: 8 }}>
                      Responsable de almacén
                    </p>
                    <DropdownPicker
                      value={data.responsable}
                      onChange={(v) => update("responsable", v)}
                      options={responsables}
                      placeholder="Selecciona responsable..."
                    />
                  </div>
                  <div style={{ borderTop: "1px solid var(--pwa-border)", paddingTop: 16 }}>
                    <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      color: "var(--pwa-muted)", marginBottom: 8 }}>
                      Guardia que registra
                    </p>
                    <DropdownPicker
                      value={data.agente}
                      onChange={(v) => update("agente", v)}
                      options={agentes}
                      placeholder="Agente..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Confirmar ── */}
            {step === 2 && (
              <div className="flex flex-col flex-1">
                <StepHeader
                  step={2}
                  total={TOTAL_STEPS}
                  label="Confirmar"
                  sublabel="Revisa y registra el ingreso"
                  onBack={() => setStep(1)}
                />
                <div className="px-6 flex flex-col gap-3 flex-1 pt-4">
                  {/* Summary */}
                  <div
                    className="flex flex-col divide-y"
                    style={{
                      background: "var(--pwa-surface)",
                      border: "1px solid var(--pwa-border)",
                    }}
                  >
                    {[
                      { icon: Truck,     label: "Vehículo",      value: data.razonSocial },
                      { icon: Building2, label: "Empresa",        value: data.empresa || "—" },
                      { icon: Package,   label: "Tipo",           value: data.tipoOperacion },
                      { icon: UserCheck, label: "Responsable",    value: data.responsable || "—" },
                      { icon: User,      label: "Guardia",        value: data.agente },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3 px-4 py-3.5">
                        <Icon className="h-5 w-5 shrink-0" style={{ color: "var(--pwa-accent)" }} />
                        <div className="min-w-0 flex-1">
                          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)", marginBottom: 2 }}>{label}</p>
                          <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 700, textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Error */}
                  {error && (
                    <div
                      className="px-4 py-3 text-[13px]"
                      style={{
                        borderLeft: "3px solid var(--pwa-danger)",
                        color: "var(--pwa-danger)",
                        background: "color-mix(in srgb, var(--pwa-danger) 8%, transparent)",
                        fontFamily: "var(--sg-font-mono)",
                        fontSize: 11,
                      }}
                    >
                      {error}
                    </div>
                  )}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-6 pb-8 pt-4 flex flex-col gap-3">
        {step < 2 ? (
          <NextButton
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 0 && !data.razonSocial.trim()) ||
              (step === 1 && !data.responsable)
            }
          />
        ) : (
          <NextButton
            label="Registrar"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!data.razonSocial.trim()}
          />
        )}

        {/* Theme switcher */}
        <div className="flex items-center justify-center">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  );
}
