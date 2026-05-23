"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { easeOut } from "./onboardingUtils";

const STEP_LABELS = [
  { icon: Building2, label: "Empresa" },
  { icon: ShieldCheck, label: "Acceso" },
  { icon: Users, label: "Personal" },
  { icon: UserPlus, label: "Guardias" },
  { icon: FileSpreadsheet, label: "Datos" },
  { icon: CheckCircle2, label: "Confirmar" },
];

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center bg-[var(--sg-accent)]" style={{ width: size, height: size }}>
      <svg viewBox="0 0 16 16" className="fill-[var(--sg-canvas)]" style={{ width: size * 0.57, height: size * 0.57 }}>
        <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
      </svg>
    </div>
  );
}

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEP_LABELS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`flex h-8 w-8 items-center justify-center border transition-colors ${
                done
                  ? "border-[var(--sg-success)] bg-[rgba(107,189,138,0.12)]"
                  : active
                    ? "border-[var(--sg-accent)] bg-[rgba(200,168,75,0.12)]"
                    : "border-[var(--sg-line)] bg-transparent"
              }`}>
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--sg-success)]" />
                ) : (
                  <step.icon className="h-4 w-4" style={{ color: active ? "var(--sg-accent)" : "var(--sg-muted)" }} />
                )}
              </div>
              <span
                className="sg-font-mono hidden text-[9px] uppercase tracking-widest sm:block"
                style={{ color: active ? "var(--sg-accent)" : done ? "var(--sg-success)" : "var(--sg-muted)" }}
              >
                {step.label}
              </span>
            </div>
            {index < STEP_LABELS.length - 1 && (
              <div
                className="mx-2 h-px w-6 transition-colors sm:w-10"
                style={{ background: done ? "var(--sg-success)" : "var(--sg-line)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DoneScreen({
  companyName,
  responsablesCount,
  guardiasCount,
  importedRowsCount,
}: {
  companyName: string;
  responsablesCount: number;
  guardiasCount: number;
  importedRowsCount: number;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sg-canvas)] px-5 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="w-full max-w-[480px] text-center"
      >
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center border border-[var(--sg-success)] bg-[rgba(107,189,138,0.12)]">
            <CheckCircle2 className="h-8 w-8 text-[var(--sg-success)]" />
          </div>
        </div>
        <div className="sg-kicker mb-3">Registro completado</div>
        <h1 className="sg-display mb-4 text-[38px]">¡Bienvenida,<br /><em>{companyName}</em>!</h1>
        <p className="mb-8 text-[14px] font-light leading-relaxed text-[var(--sg-copy)]">
          Tu cuenta de supervisor ha sido creada correctamente.
          {responsablesCount > 0 && <> Se cargaron <strong className="text-[var(--sg-ink)]">{responsablesCount}</strong> responsables.</>}
          {guardiasCount > 0 && <> Se crearon <strong className="text-[var(--sg-ink)]">{guardiasCount}</strong> cuenta{guardiasCount !== 1 ? "s" : ""} de guardia.</>}
          {importedRowsCount > 0 && <> Se importaron <strong className="text-[var(--sg-ink)]">{importedRowsCount.toLocaleString()}</strong> registros históricos.</>}
          <br />Inicia sesión con el correo y contraseña que registraste.
        </p>
        <Link href="/login" className="sg-btn sg-btn-accent w-full justify-center">
          Ir al inicio de sesión <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/" className="mt-4 block sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]">
          ← Volver al inicio
        </Link>
      </motion.div>
    </div>
  );
}

export function ResumeBanner({
  savedStep,
  onReset,
}: {
  savedStep: number;
  onReset: () => void;
}) {
  return (
    <div className="border-b border-[var(--sg-warn)] bg-[rgba(200,160,75,0.06)] px-5 py-2.5">
      <div className="sg-shell flex max-w-[680px] items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] text-[var(--sg-warn)]">
          <RefreshCw className="h-3.5 w-3.5" />
          Progreso guardado — continuarás en el paso {savedStep + 1}
        </div>
        <button
          onClick={onReset}
          className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-danger)]"
        >
          Empezar de nuevo
        </button>
      </div>
    </div>
  );
}

export function OnboardingNavigation({
  step,
  canProceed,
  onBack,
  onSkip,
  onNext,
}: {
  step: number;
  canProceed: boolean;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <button onClick={onBack} disabled={step === 0} className="sg-btn sg-btn-ghost sg-btn-sm disabled:opacity-30">
        <ArrowLeft className="h-4 w-4" /> Atrás
      </button>

      <div className="flex items-center gap-3">
        {(step === 2 || step === 3 || step === 4) && (
          <button
            onClick={onSkip}
            className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
          >
            Omitir →
          </button>
        )}
        {step < 5 && (
          <button onClick={onNext} disabled={!canProceed} className="sg-btn sg-btn-primary sg-btn-sm disabled:opacity-30">
            Continuar <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
