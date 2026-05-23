"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Plus,
  Shield,
  User,
  UserCheck,
} from "lucide-react";
import { useState, type ComponentType, type MouseEvent, type ReactNode } from "react";
import { fmtLiveWait, getWaitSeconds } from "@/hooks/useLiveTimer";
import { formatGateLabelFromPlant, type GateAssignment } from "@/lib/gates";
import type { RecentRegistration } from "@/app/registro/types";
import {
  fmtTime,
  LEVEL_CFG,
  MOTIVOS_DEMORA,
  type GuardiaHomeTab,
  type Level,
} from "./pwaHomeUtils";

const SCREEN_INDEX: Record<GuardiaHomeTab, string> = {
  inicio: "1",
  citas: "3",
  eventos: "4",
  rendimiento: "5",
  perfil: "6",
};

export type ActionSheetTone = "accent" | "danger" | "info";

export function TabBar({ active, onChange }: {
  active: GuardiaHomeTab;
  onChange: (tab: GuardiaHomeTab) => void;
}) {
  const router = useRouter();
  const leftTabs: { key: GuardiaHomeTab; icon: ReactNode; label: string }[] = [
    { key: "inicio", icon: <Shield className="h-[18px] w-[18px]" />, label: "Inicio" },
    { key: "citas", icon: <Calendar className="h-[18px] w-[18px]" />, label: "Citas" },
  ];
  const rightTabs: { key: GuardiaHomeTab; icon: ReactNode; label: string }[] = [
    { key: "eventos", icon: <BookOpen className="h-[18px] w-[18px]" />, label: "Bitácora" },
    { key: "perfil", icon: <User className="h-[18px] w-[18px]" />, label: "Perfil" },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 14px)", paddingTop: 8 }}
    >
      <div
        className="grid w-full grid-cols-[1fr_1fr_auto_1fr_1fr] items-end gap-1 px-3 pt-3"
        style={{
          background: "rgba(19,23,20,0.96)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          boxShadow: "0 -8px 28px rgba(0,0,0,0.32)",
          backdropFilter: "blur(10px)",
        }}
      >
        {leftTabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="flex flex-col items-center justify-center gap-1 h-full relative pb-3"
              style={{
                borderRadius: 0,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: isActive ? "var(--pwa-accent)" : "var(--pwa-ink-soft)",
              }}
            >
              {tab.icon}
              <span
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                {tab.label}
              </span>
              <div
                className="absolute bottom-0 left-1/2 h-[2px] w-8 -translate-x-1/2"
                style={{ background: isActive ? "var(--pwa-accent)" : "transparent" }}
              />
            </button>
          );
        })}

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => router.push("/pwa/registro")}
          className="flex flex-col items-center justify-center gap-0.5 shrink-0"
          style={{
            width: 54,
            height: 54,
            borderRadius: 27,
            marginBottom: 10,
            background: "var(--pwa-accent)",
            border: "none",
            cursor: "pointer",
            color: "var(--pwa-accent-fg)",
            boxShadow: "0 8px 24px rgba(200,168,75,0.28)",
          }}
        >
          <Plus className="h-5 w-5" />
          <span
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 7,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Nuevo
          </span>
        </motion.button>

        {rightTabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="flex flex-col items-center justify-center gap-1 h-full relative pb-3"
              style={{
                borderRadius: 0,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: isActive ? "var(--pwa-accent)" : "var(--pwa-ink-soft)",
              }}
            >
              {tab.icon}
              <span
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                {tab.label}
              </span>
              <div
                className="absolute bottom-0 left-1/2 h-[2px] w-8 -translate-x-1/2"
                style={{ background: isActive ? "var(--pwa-accent)" : "transparent" }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ScreenHeader({
  tab,
  title,
  trailing,
}: {
  tab: GuardiaHomeTab;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="mx-4 mt-4 mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)" }}
        >
          <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, fontWeight: 700 }}>
            {SCREEN_INDEX[tab]}
          </span>
        </div>
        <p
          style={{
            fontFamily: "var(--sg-font-display)",
            fontSize: 17,
            fontWeight: 800,
            color: "var(--pwa-ink)",
            margin: 0,
          }}
        >
          {title}
        </p>
      </div>
      {trailing}
    </div>
  );
}

export function ToastNotice({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          className="fixed left-4 right-4 top-4 z-[70] px-4 py-3"
          style={{
            background: "rgba(19,23,20,0.96)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 10px 26px rgba(0,0,0,0.32)",
            color: "var(--pwa-ink)",
          }}
        >
          <p style={{ fontFamily: "var(--sg-font-body)", fontSize: 13, margin: 0 }}>{message}</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ActionSheet({
  title,
  message,
  confirmText,
  confirmTone = "accent",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: ReactNode;
  confirmText: string;
  confirmTone?: ActionSheetTone;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const toneColor =
    confirmTone === "danger" ? "#d35c4f" : confirmTone === "info" ? "#6ba7ff" : "var(--pwa-accent)";
  const toneFg = confirmTone === "accent" ? "var(--pwa-accent-fg)" : "#fff";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80]"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(3px)" }}
        onClick={onCancel}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[81] flex flex-col"
        style={{ background: "var(--pwa-surface)", borderTop: `2px solid ${toneColor}` }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ background: "var(--pwa-border)" }} />
        </div>
        <div className="px-5 pb-5 pt-3">
          <p
            style={{
              fontFamily: "var(--sg-font-display)",
              fontSize: 18,
              fontWeight: 800,
              textTransform: "uppercase",
              color: "var(--pwa-ink)",
              margin: 0,
            }}
          >
            {title}
          </p>
          <div
            style={{
              fontFamily: "var(--sg-font-body)",
              fontSize: 13,
              color: "var(--pwa-ink-soft)",
              marginTop: 12,
              lineHeight: 1.55,
            }}
          >
            {message}
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-12"
              style={{
                background: "var(--pwa-surface-2)",
                border: "1px solid var(--pwa-border)",
                color: "var(--pwa-muted)",
                cursor: "pointer",
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-12"
              style={{
                background: toneColor,
                border: "none",
                color: toneFg,
                cursor: "pointer",
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function DelayReasonSheet({
  reg,
  onConfirm,
  onCancel,
}: {
  reg: RecentRegistration;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState<string>(MOTIVOS_DEMORA[0]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80]"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(3px)" }}
        onClick={onCancel}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[81] flex flex-col"
        style={{ background: "var(--pwa-surface)", borderTop: "2px solid #d4864a" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ background: "var(--pwa-border)" }} />
        </div>
        <div className="px-5 pb-5 pt-3">
          <p
            style={{
              fontFamily: "var(--sg-font-display)",
              fontSize: 18,
              fontWeight: 800,
              textTransform: "uppercase",
              color: "var(--pwa-ink)",
              margin: 0,
            }}
          >
            Demora detectada
          </p>
          <p
            style={{
              fontFamily: "var(--sg-font-body)",
              fontSize: 13,
              color: "var(--pwa-ink-soft)",
              margin: "12px 0 0",
              lineHeight: 1.55,
            }}
          >
            El vehículo <strong style={{ color: "var(--pwa-ink)" }}>{reg.razonSocial}</strong> ya superó el umbral de espera. Indica el motivo antes de iniciar la atención.
          </p>
          <div className="mt-4 flex flex-col gap-1.5">
            <label
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
              }}
            >
              Motivo de demora
            </label>
            <div className="relative">
              <select
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                className="w-full h-12 appearance-none px-3 outline-none"
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
                {MOTIVOS_DEMORA.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--pwa-muted)" }}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-12"
              style={{
                background: "var(--pwa-surface-2)",
                border: "1px solid var(--pwa-border)",
                color: "var(--pwa-muted)",
                cursor: "pointer",
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(motivo)}
              className="flex-1 h-12"
              style={{
                background: "#d4864a",
                border: "none",
                color: "#14110a",
                cursor: "pointer",
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Confirmar cierre
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function PlantScopeSelector({
  plants,
  activePlant,
  gateOptions,
  onChange,
}: {
  plants: string[];
  activePlant: string;
  gateOptions: GateAssignment[];
  onChange: (plant: string) => void;
}) {
  if (plants.length <= 1) return null;

  return (
    <div className="mx-4 mb-3 flex gap-2 overflow-x-auto pb-1">
      {plants.map((plant) => {
        const active = plant === activePlant;
        return (
          <button
            key={plant}
            onClick={() => onChange(plant)}
            className="shrink-0 px-3 py-1.5"
            style={{
              background: active ? "var(--pwa-accent)" : "var(--pwa-surface-2)",
              border: `1px solid ${active ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
              color: active ? "var(--pwa-accent-fg)" : "var(--pwa-muted)",
              cursor: "pointer",
              borderRadius: 999,
              fontFamily: "var(--sg-font-mono)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: active ? 700 : 400,
            }}
          >
            {formatGateLabelFromPlant(plant, gateOptions)}
          </button>
        );
      })}
    </div>
  );
}

export function VehicleCard({
  reg,
  level,
  now,
  onAction,
  onTap,
}: {
  reg: RecentRegistration;
  level: Level;
  now: Date;
  onAction: (event: MouseEvent) => void;
  onTap: () => void;
}) {
  const cfg = LEVEL_CFG[level];
  const waitSecs = getWaitSeconds(reg.time, now);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      onClick={onTap}
      className="flex gap-0 overflow-hidden cursor-pointer active:opacity-80"
      style={{ background: cfg.bg, borderBottom: "1px solid var(--pwa-border)" }}
    >
      <motion.div
        className="w-1 shrink-0"
        style={{ background: cfg.color }}
        animate={level === "urgente" ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
        transition={level === "urgente" ? { repeat: Infinity, duration: 1.2 } : {}}
      />

      <div className="flex flex-1 items-start gap-3 px-4 py-3.5">
        <div className="flex-1 min-w-0">
          <p
            className="truncate"
            style={{
              fontFamily: "var(--sg-font-display)",
              fontSize: 15,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.01em",
              color: "var(--pwa-ink)",
              margin: 0,
            }}
          >
            {reg.razonSocial}
          </p>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {reg.empresa && reg.empresa !== reg.razonSocial ? (
              <span
                className="truncate max-w-[140px]"
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--pwa-muted)",
                }}
              >
                {reg.empresa}
              </span>
            ) : null}
            {reg.responsable ? (
              <span
                className="flex items-center gap-1"
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--pwa-muted)",
                }}
              >
                <UserCheck className="h-3 w-3 shrink-0" />
                {reg.responsable.split(" ")[0]}
              </span>
            ) : null}
            {reg.tipoOperacion ? (
              <span
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: cfg.color,
                  opacity: 0.8,
                }}
              >
                {reg.tipoOperacion}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {!reg.docsDelivered ? (
            <div className="flex items-center gap-1.5">
              <motion.div
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: cfg.color }}
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <span
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 13,
                  fontWeight: 800,
                  color: cfg.color,
                  letterSpacing: "-0.01em",
                }}
              >
                {fmtLiveWait(waitSecs)}
              </span>
            </div>
          ) : (
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11, color: "var(--pwa-muted)" }}>
              {fmtTime(reg.time)}
            </span>
          )}

          {level === "completo" ? (
            <span
              className="flex items-center gap-1"
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 8,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#6bbd8a",
              }}
            >
              <CheckCircle2 className="h-3 w-3" /> OK
            </span>
          ) : level === "atendido" ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onAction}
              className="flex items-center gap-1 px-2.5 py-1.5"
              style={{
                background: "rgba(107,167,255,0.15)",
                border: "1px solid rgba(107,167,255,0.4)",
                color: "#6ba7ff",
                cursor: "pointer",
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <FileCheck2 className="h-3 w-3" /> Docs
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onAction}
              className="flex items-center gap-1 px-2.5 py-1.5"
              style={{
                background: level === "urgente" ? "rgba(211,92,79,0.15)" : "var(--pwa-surface-2)",
                border: `1px solid ${level === "urgente" ? "rgba(211,92,79,0.4)" : "var(--pwa-border)"}`,
                color: level === "urgente" ? "#d35c4f" : "var(--pwa-ink-soft)",
                cursor: "pointer",
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <CheckCircle2 className="h-3 w-3" /> Atendí
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function HomeOverviewCard({
  icon: Icon,
  title,
  primary,
  secondary,
  secondaryValue,
  secondaryLabel,
  accent,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  primary: string;
  secondary: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  accent: string;
  onClick?: () => void;
}) {
  const isDualMetric = Boolean(secondaryValue && secondaryLabel);
  const content = (
    <div
      className="px-4 py-4"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0.006))",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 12,
        boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
      }}
    >
      <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 13, fontWeight: 700, color: "var(--pwa-ink)", margin: 0 }}>
        {title}
      </p>
      <div className="mt-4 flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${accent}12`, border: `1px solid ${accent}24`, color: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p
                style={{
                  fontFamily: "var(--sg-font-display)",
                  fontSize: isDualMetric ? 24 : 28,
                  fontWeight: 800,
                  color: "var(--pwa-ink)",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {primary}
              </p>
              <p
                style={{
                  fontFamily: "var(--sg-font-body)",
                  fontSize: 12,
                  color: isDualMetric ? "var(--pwa-ink-soft)" : accent,
                  margin: "6px 0 0",
                }}
              >
                {secondary}
              </p>
            </div>
            {isDualMetric ? (
              <>
                <div className="h-10 w-px shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />
                <div className="min-w-0 flex-1">
                  <p
                    style={{
                      fontFamily: "var(--sg-font-display)",
                      fontSize: 24,
                      fontWeight: 800,
                      color: secondaryLabel?.includes("Retras") ? "#d35c4f" : "var(--pwa-ink)",
                      margin: 0,
                      lineHeight: 1,
                    }}
                  >
                    {secondaryValue}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--sg-font-body)",
                      fontSize: 12,
                      color: secondaryLabel?.includes("Retras") ? "#d35c4f" : "var(--pwa-ink-soft)",
                      margin: "6px 0 0",
                    }}
                  >
                    {secondaryLabel}
                  </p>
                </div>
              </>
            ) : null}
            <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.45)" }} />
          </div>
        </div>
      </div>
    </div>
  );

  if (!onClick) return content;

  return (
    <button onClick={onClick} className="text-left transition-opacity active:opacity-80">
      {content}
    </button>
  );
}
