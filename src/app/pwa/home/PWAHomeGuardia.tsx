"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useLiveNow, getWaitSeconds, fmtLiveWait } from "@/hooks/useLiveTimer";
import VehicleDetailDrawer from "@/components/VehicleDetailDrawer";
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpen, Calendar, Camera,
  CheckCircle2, ChevronDown, FileCheck2, LogOut,
  MapPin, Palette, Plus, RefreshCw, Send, Shield, Truck, User, UserCheck, X, Zap,
} from "lucide-react";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { useRouter } from "next/navigation";
import {
  getRecentRegistrations, getCitasDelDia,
  closeAtencion, closeAtencionDocs, activateCita, cancelarCita,
  preRegisterCita, crearGuardiaEvento, getGuardiaEventosHoy,
  type GuardiaEvento,
} from "@/app/actions";
import { formatGateLabelFromPlant } from "@/lib/gates";
import { isAbandonedRecord, isDelayedRecord } from "@/app/registro/status";
import { usePWATheme } from "@/contexts/PWAThemeContext";
import { clearGuardSession } from "@/app/pwa/storage";
import type { RecentRegistration, CitaRow } from "@/app/registro/types";

const INACTIVITY_MS = 5 * 60 * 1000;
const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWaitMin(reg: RecentRegistration): number {
  if (!reg.time) return 0;
  const [h, m] = reg.time.split(":").map(Number);
  const now = new Date();
  const arr = new Date();
  arr.setHours(h, m, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - arr.getTime()) / 60000));
}

function fmtWait(min: number): string {
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}

function fmtTime(time: string | null): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m).padStart(2, "0")} ${period}`;
}

type Level = "urgente" | "demorado" | "esperando" | "fresco" | "atendido" | "completo";

function getLevel(reg: RecentRegistration, now: Date): Level {
  if (reg.docsDelivered) return "completo";
  if (reg.attended)      return "atendido";
  if (isAbandonedRecord(reg, now)) return "urgente";
  if (isDelayedRecord(reg, now))   return "demorado";
  if (getWaitMin(reg) <= 5)        return "fresco";
  return "esperando";
}

const LEVEL_CFG: Record<Level, { color: string; bg: string; label: string; order: number }> = {
  urgente:   { color: "#d35c4f", bg: "rgba(211,92,79,0.08)",   label: "Urgente",    order: 0 },
  demorado:  { color: "#d4864a", bg: "rgba(212,134,74,0.06)",  label: "Demorado",   order: 1 },
  esperando: { color: "#c4c0b4", bg: "transparent",            label: "Esperando",  order: 2 },
  fresco:    { color: "#6bbd8a", bg: "rgba(107,189,138,0.06)", label: "Llegó",      order: 3 },
  atendido:  { color: "#6ba7ff", bg: "rgba(107,167,255,0.06)", label: "En atención",order: 4 },
  completo:  { color: "#6bbd8a", bg: "transparent",            label: "Completo",   order: 5 },
};

type Tab = "inicio" | "citas" | "eventos" | "rendimiento" | "perfil";

const SCREEN_INDEX: Record<Tab, string> = {
  inicio: "1",
  citas: "3",
  eventos: "4",
  rendimiento: "5",
  perfil: "6",
};

// ── Theme toggle ──────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme, themes } = usePWATheme();
  const next = themes[(themes.findIndex(t => t.key === theme) + 1) % themes.length];
  return (
    <button onClick={() => setTheme(next.key)}
      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pwa-muted)" }}>
      <Palette className="h-4 w-4" />
    </button>
  );
}

// ── Bottom Tab Bar (pill style) ───────────────────────────────────────────────

function TabBar({ active, onChange }: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const router = useRouter();

  const leftTabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "inicio",  icon: <Shield className="h-[18px] w-[18px]" />, label: "Inicio" },
    { key: "citas",   icon: <Calendar className="h-[18px] w-[18px]" />, label: "Citas" },
  ];
  const rightTabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "eventos", icon: <BookOpen className="h-[18px] w-[18px]" />, label: "Bitácora" },
    { key: "perfil",  icon: <User className="h-[18px] w-[18px]" />,     label: "Perfil" },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 14px)", paddingTop: 8 }}
    >
      <div
        className="grid w-full grid-cols-[1fr_1fr_auto_1fr_1fr] items-end gap-1 px-3 pt-3"
        style={{
          background: "var(--pwa-surface)",
          border: "1px solid var(--pwa-border)",
          borderRadius: 20,
        }}
      >

        {leftTabs.map(tab => {
          const isActive = active === tab.key;
          return (
            <button key={tab.key} onClick={() => onChange(tab.key)}
              className="flex flex-col items-center justify-center gap-1 h-full relative pb-3"
              style={{ borderRadius: 0, background: "transparent",
                border: "none", cursor: "pointer",
                color: isActive ? "var(--pwa-accent)" : "var(--pwa-ink-soft)" }}>
              {tab.icon}
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
                {tab.label}
              </span>
              <div
                className="absolute bottom-0 left-1/2 h-[2px] w-8 -translate-x-1/2"
                style={{ background: isActive ? "var(--pwa-accent)" : "transparent" }}
              />
            </button>
          );
        })}

        <motion.button whileTap={{ scale: 0.88 }}
          onClick={() => router.push("/pwa/registro")}
          className="flex flex-col items-center justify-center gap-0.5 shrink-0"
          style={{ width: 54, height: 54, borderRadius: 27, marginBottom: 10,
            background: "var(--pwa-accent)", border: "none", cursor: "pointer",
            color: "var(--pwa-accent-fg)" }}>
          <Plus className="h-5 w-5" />
          <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 7,
            letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
            Nuevo
          </span>
        </motion.button>

        {/* Tabs derecha */}
        {rightTabs.map(tab => {
          const isActive = active === tab.key;
          return (
            <button key={tab.key} onClick={() => onChange(tab.key)}
              className="flex flex-col items-center justify-center gap-1 h-full relative pb-3"
              style={{ borderRadius: 0, background: "transparent",
                border: "none", cursor: "pointer",
                color: isActive ? "var(--pwa-accent)" : "var(--pwa-ink-soft)" }}>
              {tab.icon}
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
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

function ScreenHeader({
  tab,
  title,
  trailing,
}: {
  tab: Tab;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="mx-4 mt-4 mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)" }}
        >
          <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, fontWeight: 700 }}>
            {SCREEN_INDEX[tab]}
          </span>
        </div>
        <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 17, fontWeight: 800, color: "var(--pwa-ink)", margin: 0 }}>
          {title}
        </p>
      </div>
      {trailing}
    </div>
  );
}

function TabButton({ tab, active, onChange }: {
  tab: { key: Tab; icon: React.ReactNode; label: string; badge?: number };
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const isActive = active === tab.key;
  return (
    <button
      onClick={() => onChange(tab.key)}
      className="flex flex-col items-center justify-center gap-1 flex-1 py-3 relative"
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: isActive ? "var(--pwa-accent)" : "var(--pwa-muted)",
      }}
    >
      <div className="relative">
        {tab.icon}
        {tab.badge !== undefined && (
          <span
            className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1"
            style={{ background: "#d35c4f", color: "#fff",
              fontFamily: "var(--sg-font-mono)", fontSize: 9, fontWeight: 700 }}
          >
            {tab.badge}
          </span>
        )}
      </div>
      <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8,
        letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {tab.label}
      </span>
      {isActive && (
        <motion.div layoutId="tab-indicator"
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: "var(--pwa-accent)" }} />
      )}
    </button>
  );
}

// ── Vehicle Card ──────────────────────────────────────────────────────────────

function VehicleCard({ reg, level, now, onAction, onTap }: {
  reg: RecentRegistration;
  level: Level;
  now: Date;
  onAction: (e: React.MouseEvent) => void;
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
      {/* Acento lateral — pulsa si es urgente */}
      <motion.div
        className="w-1 shrink-0"
        style={{ background: cfg.color }}
        animate={level === "urgente"
          ? { opacity: [1, 0.3, 1] }
          : { opacity: 1 }}
        transition={level === "urgente"
          ? { repeat: Infinity, duration: 1.2 }
          : {}}
      />

      {/* Contenido */}
      <div className="flex flex-1 items-start gap-3 px-4 py-3.5">
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.01em",
            color: "var(--pwa-ink)", margin: 0 }} className="truncate">
            {reg.razonSocial}
          </p>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {reg.empresa && reg.empresa !== reg.razonSocial && (
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
                letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--pwa-muted)" }}
                className="truncate max-w-[140px]">
                {reg.empresa}
              </span>
            )}
            {reg.responsable && (
              <span className="flex items-center gap-1"
                style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
                  letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
                <UserCheck className="h-3 w-3 shrink-0" />
                {reg.responsable.split(" ")[0]}
              </span>
            )}
            {reg.tipoOperacion && (
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: cfg.color, opacity: 0.8 }}>
                {reg.tipoOperacion}
              </span>
            )}
          </div>
        </div>

        {/* Derecha: timer en vivo + acción */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Timer en vivo */}
          {!reg.docsDelivered ? (
            <div className="flex items-center gap-1.5">
              <motion.div
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: cfg.color }}
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 13,
                fontWeight: 800, color: cfg.color, letterSpacing: "-0.01em" }}>
                {fmtLiveWait(waitSecs)}
              </span>
            </div>
          ) : (
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11,
              color: "var(--pwa-muted)" }}>
              {fmtTime(reg.time)}
            </span>
          )}

          {/* Acción */}
          {level === "completo" ? (
            <span className="flex items-center gap-1"
              style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8,
                letterSpacing: "0.12em", textTransform: "uppercase", color: "#6bbd8a" }}>
              <CheckCircle2 className="h-3 w-3" /> OK
            </span>
          ) : level === "atendido" ? (
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={onAction}
              className="flex items-center gap-1 px-2.5 py-1.5"
              style={{ background: "rgba(107,167,255,0.15)",
                border: "1px solid rgba(107,167,255,0.4)",
                color: "#6ba7ff", cursor: "pointer",
                fontFamily: "var(--sg-font-mono)", fontSize: 9,
                letterSpacing: "0.12em", textTransform: "uppercase" }}>
              <FileCheck2 className="h-3 w-3" /> Docs
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={onAction}
              className="flex items-center gap-1 px-2.5 py-1.5"
              style={{
                background: level === "urgente"
                  ? "rgba(211,92,79,0.15)" : "var(--pwa-surface-2)",
                border: `1px solid ${level === "urgente" ? "rgba(211,92,79,0.4)" : "var(--pwa-border)"}`,
                color: level === "urgente" ? "#d35c4f" : "var(--pwa-ink-soft)",
                cursor: "pointer",
                fontFamily: "var(--sg-font-mono)", fontSize: 9,
                letterSpacing: "0.12em", textTransform: "uppercase",
              }}>
              <CheckCircle2 className="h-3 w-3" /> Atendí
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Tab: Inicio ───────────────────────────────────────────────────────────────

function QuickActionCard({
  icon: Icon,
  label,
  meta,
  onClick,
  tone = "accent",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  meta: string;
  onClick: () => void;
  tone?: "accent" | "success" | "info" | "muted";
}) {
  const tones = {
    accent: { border: "var(--pwa-accent)", bg: "color-mix(in srgb, var(--pwa-accent) 10%, transparent)", fg: "var(--pwa-accent)" },
    success: { border: "#6bbd8a", bg: "rgba(107,189,138,0.1)", fg: "#6bbd8a" },
    info: { border: "#6ba7ff", bg: "rgba(107,167,255,0.1)", fg: "#6ba7ff" },
    muted: { border: "var(--pwa-border)", bg: "var(--pwa-surface-2)", fg: "var(--pwa-ink)" },
  } as const;

  const current = tones[tone];

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 p-4 text-left transition-opacity active:opacity-80"
      style={{ background: "var(--pwa-surface)", borderTop: `3px solid ${current.border}` }}
    >
      <div className="flex h-10 w-10 items-center justify-center" style={{ background: current.bg, color: current.fg }}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 14, fontWeight: 800, textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}>
          {label}
        </p>
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: "4px 0 0" }}>
          {meta}
        </p>
      </div>
    </button>
  );
}

function HomeOverviewCard({
  icon: Icon,
  title,
  primary,
  secondary,
  accent,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  primary: string;
  secondary: string;
  accent: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-4" style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)" }}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}35`, color: accent }}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
          {title}
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 24, fontWeight: 800, color: "var(--pwa-ink)", margin: 0, lineHeight: 1 }}>
              {primary}
            </p>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, margin: "6px 0 0" }}>
              {secondary}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "var(--pwa-muted)" }} />
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

function TabInicio({ plant, records, citasPendientes, citasRetrasadas, onRefresh, refreshing, onClose, onDocs, onTap, onOpenCitas, onOpenEventos, onOpenRendimiento }: {
  plant: string;
  records: RecentRegistration[];
  citasPendientes: number;
  citasRetrasadas: number;
  onRefresh: () => void;
  refreshing: boolean;
  onClose: (reg: RecentRegistration) => void;
  onDocs: (reg: RecentRegistration) => void;
  onTap: (reg: RecentRegistration) => void;
  onOpenCitas: () => void;
  onOpenEventos: () => void;
  onOpenRendimiento: () => void;
}) {
  const router = useRouter();
  const now = useLiveNow();
  const rows = records
    .map(reg => ({ reg, level: getLevel(reg, now), waitMin: getWaitMin(reg) }))
    .sort((a, b) => LEVEL_CFG[a.level].order - LEVEL_CFG[b.level].order || b.waitMin - a.waitMin);

  const urgentes   = rows.filter(r => r.level === "urgente").length;
  const pendientes = rows.filter(r => ["urgente","demorado","esperando","fresco"].includes(r.level)).length;
  const completos  = rows.filter(r => r.level === "completo").length;
  const rendimiento = rows.length > 0 ? Math.round((completos / rows.length) * 100) : 0;

  return (
    <div className="flex flex-col">
      <ScreenHeader
        tab="inicio"
        title="Inicio"
        trailing={<button onClick={() => onRefresh()} style={{ background: "none", border: "none", color: "var(--pwa-ink-soft)", cursor: "pointer" }}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /></button>}
      />
      <div className="mx-4 p-4" style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)", borderRadius: 14 }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
              Vehículos pendientes
            </p>
            <h2 style={{ fontFamily: "var(--sg-font-display)", fontSize: 18, fontWeight: 800, textTransform: "uppercase", color: "var(--pwa-ink)", margin: "8px 0 0" }}>
              {pendientes} por ingresar
            </h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(107,189,138,0.1)", color: "#6bbd8a", border: "1px solid rgba(107,189,138,0.2)" }}>
            <Truck className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 34, fontWeight: 800, margin: 0, lineHeight: 1, color: "var(--pwa-ink)" }}>{rows.length}</p>
            <p style={{ fontFamily: "var(--sg-font-body)", fontSize: 13, margin: "6px 0 0", color: "var(--pwa-ink-soft)" }}>Por ingresar</p>
          </div>
          <div>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 34, fontWeight: 800, margin: 0, lineHeight: 1, color: citasRetrasadas > 0 ? "#d35c4f" : "var(--pwa-ink)" }}>{Math.max(urgentes, citasRetrasadas)}</p>
            <p style={{ fontFamily: "var(--sg-font-body)", fontSize: 13, margin: "6px 0 0", color: citasRetrasadas > 0 ? "#d35c4f" : "var(--pwa-ink-soft)" }}>En espera</p>
          </div>
        </div>
      </div>

      <div className="mx-4 flex flex-col gap-3">
        <HomeOverviewCard
          icon={Truck}
          title="Vehículos pendientes"
          primary={String(pendientes)}
          secondary={pendientes === 1 ? "por atender" : "por atender"}
        accent="var(--pwa-success)"
          onClick={() => onRefresh()}
        />
        <HomeOverviewCard
          icon={Calendar}
          title="Próximas citas"
          primary={String(citasPendientes)}
          secondary={citasRetrasadas > 0 ? `${citasRetrasadas} retrasada${citasRetrasadas !== 1 ? "s" : ""}` : "sin retrasos"}
          accent={citasRetrasadas > 0 ? "var(--pwa-danger)" : "var(--pwa-accent)"}
          onClick={onOpenCitas}
        />
        <HomeOverviewCard
          icon={AlertTriangle}
          title="Retrasos del día"
          primary={String(urgentes)}
          secondary={urgentes > 0 ? "atención inmediata" : "sin críticos"}
          accent={urgentes > 0 ? "var(--pwa-danger)" : "var(--pwa-muted)"}
          onClick={onOpenEventos}
        />
      </div>

      <div className="mx-4 mt-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/pwa/registro")}
          className="flex h-[54px] w-full items-center justify-center gap-2"
          style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)", border: "none", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, borderRadius: 10 }}
        >
          <Plus className="h-4 w-4" />
          Registrar vehículo
        </motion.button>
      </div>

      <div className="mx-4 mt-4">
        <button onClick={onOpenRendimiento} className="w-full text-left transition-opacity active:opacity-80">
          <div className="flex items-center gap-3 px-4 py-4" style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)" }}>
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ border: "2px solid rgba(107,189,138,0.35)" }}>
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, fontWeight: 700, color: "#6bbd8a" }}>{rendimiento}%</span>
            </div>
            <div className="min-w-0 flex-1">
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
                Mi rendimiento (hoy)
              </p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <div>
                  <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 16, fontWeight: 800, textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}>
                    {rendimiento >= 70 ? "Buen desempeño" : "Revisar pendientes"}
                  </p>
                  <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6bbd8a", margin: "6px 0 0" }}>
                    ver detalle
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "var(--pwa-muted)" }} />
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        <QuickActionCard icon={BookOpen} label="Bitácora" meta="Reportar novedades" onClick={onOpenEventos} tone="info" />
        <QuickActionCard icon={RefreshCw} label="Actualizar" meta={refreshing ? "Sincronizando" : "Traer cambios"} onClick={onRefresh} tone="muted" />
      </div>

      {/* Alerta urgentes */}
      <AnimatePresence>
        {urgentes > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden mx-4 mb-3">
            <div className="flex items-center gap-2 px-4 py-2.5"
              style={{ background: "rgba(211,92,79,0.1)", borderLeft: "3px solid #d35c4f" }}>
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#d35c4f" }} />
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "#d35c4f", margin: 0 }}>
                {urgentes} vehículo{urgentes !== 1 ? "s" : ""} con +45 min sin atención
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de vehículos */}
      <div className="mx-4 overflow-hidden"
        style={{ border: "1px solid var(--pwa-border)", borderRadius: 14 }}>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14"
            style={{ background: "var(--pwa-surface)" }}>
            <Truck className="h-10 w-10 opacity-10" style={{ color: "var(--pwa-muted)" }} />
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
              Sin vehículos hoy
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {rows.map(({ reg, level }) => (
              <VehicleCard
                key={reg.id}
                reg={reg}
                level={level}
                now={now}
                onTap={() => onTap(reg)}
                onAction={(e) => { e.stopPropagation(); level === "atendido" ? onDocs(reg) : onClose(reg); }}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ── Nueva cita — bottom sheet ─────────────────────────────────────────────────

function NuevaCitaSheet({ plant, agente, responsables, onSave, onClose }: {
  plant: string;
  agente: string;
  responsables: string[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [hora,        setHora]        = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [responsable, setResponsable] = useState(responsables[0] ?? "");
  const [tipoOp,      setTipoOp]      = useState("Descarga");
  const [fecha,       setFecha]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleSave = async () => {
    if (!hora || !razonSocial.trim()) { setError("Hora y razón social son obligatorios"); return; }
    setSaving(true);
    const result = await preRegisterCita({
      horaCita: hora,
      fecha: fecha || undefined,
      plant,
      razonSocial: razonSocial.trim(),
      empresa: razonSocial.trim(),
      responsable,
      type: "Proveedor",
      tipoOperacion: tipoOp,
      agente,
      note: "",
    });
    setSaving(false);
    if (result.success) { onSave(); onClose(); }
    else setError(result.error ?? "Error al guardar");
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
        onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{ background: "var(--pwa-surface)", borderTop: "2px solid var(--pwa-accent)", maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ background: "var(--pwa-border)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--pwa-border)" }}>
          <div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "var(--pwa-accent)", margin: 0 }}>
              Nueva cita
            </p>
            <h3 style={{ fontFamily: "var(--sg-font-display)", fontSize: 18, fontWeight: 800,
              textTransform: "uppercase", color: "var(--pwa-ink)", margin: "4px 0 0" }}>
              Programar vehículo
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none",
            cursor: "pointer", color: "var(--pwa-muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

          {/* Hora + Fecha en una fila */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
                textTransform: "uppercase", color: "var(--pwa-muted)" }}>
                Hora de llegada *
              </label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                className="w-full h-12 px-3 outline-none text-[16px] font-bold"
                style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
                  color: "var(--pwa-ink)", fontFamily: "var(--sg-font-mono)" }}
                onFocus={e => e.target.style.borderColor = "var(--pwa-accent)"}
                onBlur={e => e.target.style.borderColor = "var(--pwa-border)"} />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
                textTransform: "uppercase", color: "var(--pwa-muted)" }}>
                Fecha (hoy si vacío)
              </label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full h-12 px-3 outline-none text-[13px]"
                style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
                  color: "var(--pwa-ink)", fontFamily: "var(--sg-font-mono)" }}
                onFocus={e => e.target.style.borderColor = "var(--pwa-accent)"}
                onBlur={e => e.target.style.borderColor = "var(--pwa-border)"} />
            </div>
          </div>

          {/* Razón social */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-muted)" }}>
              Vehículo / Razón social *
            </label>
            <input type="text" value={razonSocial}
              onChange={e => setRazonSocial(e.target.value.toUpperCase())}
              placeholder="TRANSPORTES ABC SAC..."
              className="w-full h-12 px-3 outline-none text-[14px] font-bold uppercase"
              style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
                color: "var(--pwa-ink)", fontFamily: "var(--sg-font-display)" }}
              onFocus={e => e.target.style.borderColor = "var(--pwa-accent)"}
              onBlur={e => e.target.style.borderColor = "var(--pwa-border)"} />
          </div>

          {/* Responsable */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-muted)" }}>
              Responsable de almacén
            </label>
            <div className="relative">
              <select value={responsable} onChange={e => setResponsable(e.target.value)}
                className="w-full h-12 px-3 outline-none appearance-none text-[14px]"
                style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
                  color: "var(--pwa-ink)", fontFamily: "var(--sg-font-display)",
                  fontWeight: 700, textTransform: "uppercase" }}>
                {responsables.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--pwa-muted)" }} />
            </div>
          </div>

          {/* Tipo operación */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-muted)" }}>
              Tipo de operación
            </label>
            <div className="flex gap-2">
              {["Carga", "Descarga", "Servicio", "Otro"].map(t => (
                <button key={t} onClick={() => setTipoOp(t)}
                  className="flex-1 py-2.5 transition-all"
                  style={{
                    background: tipoOp === t
                      ? "color-mix(in srgb, var(--pwa-accent) 12%, transparent)"
                      : "var(--pwa-surface-2)",
                    border: `1px solid ${tipoOp === t ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
                    color: tipoOp === t ? "var(--pwa-accent)" : "var(--pwa-muted)",
                    cursor: "pointer",
                    fontFamily: "var(--sg-font-mono)", fontSize: 9,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    fontWeight: tipoOp === t ? 700 : 400,
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--pwa-danger)" }}>{error}</p>
          )}

          {/* Submit */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
            disabled={saving || !hora || !razonSocial.trim()}
            className="w-full h-13 flex items-center justify-center gap-2 mt-1 transition-opacity disabled:opacity-40"
            style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
              fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.2em",
              textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer",
              height: 52 }}>
            {saving ? "Guardando..." : <><Calendar className="h-4 w-4" /> Programar cita</>}
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Tab: Citas ────────────────────────────────────────────────────────────────

function TabCitas({ citas, plant, agente, responsables, onActivate, onCancel, onRefresh }: {
  citas: CitaRow[];
  plant: string;
  agente: string;
  responsables: string[];
  onActivate: (id: number) => void;
  onCancel: (id: number) => void;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [activeView, setActiveView] = useState<"proximas" | "retrasadas" | "llegaron">("proximas");
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const retrasadas = citas.filter(c => {
    const parts = c.horaCita.split(":").map(Number);
    const citaMin = parts[0] * 60 + parts[1];
    return c.estado === "esperado" && citaMin < nowMin - 10;
  });
  const proximas = citas.filter(c => !retrasadas.includes(c) && c.estado === "esperado");
  const llegaron = citas.filter(c => c.estado === "activo" || c.estado === "atendido");

  const groups = {
    proximas: { label: "Próximas", color: "#6bbd8a", items: proximas },
    retrasadas: { label: "Retrasadas", color: "#d35c4f", items: retrasadas },
    llegaron: { label: "Llegaron", color: "#6ba7ff", items: llegaron },
  } as const;
  const currentGroup = groups[activeView];

  return (
    <div className="flex flex-col mt-4">
      <ScreenHeader tab="citas" title="Citas" />
      <div className="mx-4 p-5 relative overflow-hidden" style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)", borderRadius: 14 }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 140, height: 140, background: "radial-gradient(circle at top right, color-mix(in srgb, var(--pwa-accent) 8%, transparent), transparent)", pointerEvents: "none" }} />
        <div>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-accent)", margin: 0 }}>
            Citas
          </p>
          <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 22, fontWeight: 800,
            textTransform: "uppercase", color: "var(--pwa-ink)", margin: "6px 0 0" }}>
            Citas del día
          </p>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "var(--pwa-muted)", margin: "6px 0 0" }}>
            {formatGateLabelFromPlant(plant)} · {citas.length} programada{citas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Próximas", value: proximas.length, color: "#6bbd8a" },
            { label: "Retrasadas", value: retrasadas.length, color: "#d35c4f" },
            { label: "Llegaron", value: llegaron.length, color: "#6ba7ff" },
          ].map((item) => (
            <div key={item.label} className="px-3 py-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--pwa-border)" }}>
              <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 22, fontWeight: 800, color: item.color, margin: 0, lineHeight: 1 }}>
                {item.value}
              </p>
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: "6px 0 0" }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowForm(true)}
          className="flex h-[52px] w-full items-center justify-center gap-2 mt-4"
          style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)", border: "none", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
          <Plus className="h-4 w-4" /> Nueva cita
        </motion.button>
      </div>

      <div className="flex gap-2 px-4 mt-4 overflow-x-auto pb-1">
        {(["proximas", "retrasadas", "llegaron"] as const).map((key) => {
          const group = groups[key];
          return (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className="shrink-0 px-4 py-2 transition-all"
              style={{
                background: activeView === key ? "var(--pwa-surface)" : "var(--pwa-surface-2)",
                border: `1px solid ${activeView === key ? group.color : "var(--pwa-border)"}`,
                color: activeView === key ? group.color : "var(--pwa-muted)",
                cursor: "pointer",
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: activeView === key ? 700 : 500,
              }}
            >
              {group.label} {group.items.length > 0 ? `(${group.items.length})` : ""}
            </button>
          );
        })}
      </div>

      {/* Lista vacía */}
      {citas.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-14 mx-4"
          style={{ border: "1px dashed var(--pwa-border)" }}>
          <Calendar className="h-10 w-10 opacity-10" style={{ color: "var(--pwa-muted)" }} />
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "var(--pwa-muted)" }}>
            Sin citas programadas hoy
          </p>
          <button onClick={() => setShowForm(true)}
            style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--pwa-accent)",
              background: "none", border: "none", cursor: "pointer" }}>
            + Programar la primera
          </button>
        </div>
      )}

      {citas.length > 0 && (
        <div className="mx-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-0.5" style={{ background: currentGroup.color }} />
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: currentGroup.color }}>
              {currentGroup.label} · {currentGroup.items.length}
            </span>
          </div>
          <div className="flex flex-col" style={{ border: "1px solid var(--pwa-border)" }}>
            {currentGroup.items.length === 0 ? (
              <div className="px-4 py-10" style={{ background: "var(--pwa-surface)" }}>
                <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0, textAlign: "center" }}>
                  Sin citas en esta vista
                </p>
              </div>
            ) : currentGroup.items.map(cita => {
              const name = cita.razonSocial !== "—" ? cita.razonSocial
                : cita.empresa !== "—" ? cita.empresa : "Cita programada";
              return (
                <div key={cita.id} className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: "1px solid var(--pwa-border)", background: "var(--pwa-surface)" }}>
                  {/* Hora */}
                  <div className="flex items-center justify-center h-11 w-14 shrink-0"
                    style={{ background: `${currentGroup.color}15`, border: `1px solid ${currentGroup.color}40` }}>
                    <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 13,
                      fontWeight: 700, color: currentGroup.color, lineHeight: 1 }}>
                      {cita.horaCita.slice(0, 5)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 14,
                      fontWeight: 700, textTransform: "uppercase", color: "var(--pwa-ink)",
                      margin: 0 }} className="truncate">{name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {cita.responsable && (
                        <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                          letterSpacing: "0.1em", textTransform: "uppercase",
                          color: "var(--pwa-muted)" }}>
                          {cita.responsable.split(" ")[0]}
                        </span>
                      )}
                      {cita.tipoOperacion && (
                        <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                          letterSpacing: "0.1em", textTransform: "uppercase",
                          color: currentGroup.color, opacity: 0.7 }}>
                          {cita.tipoOperacion}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {cita.estado === "esperado" && (
                      <>
                        <motion.button whileTap={{ scale: 0.9 }}
                          onClick={() => onActivate(cita.id)}
                          className="flex items-center gap-1 px-2.5 py-2"
                          style={{ background: `${currentGroup.color}15`, border: `1px solid ${currentGroup.color}50`,
                            color: currentGroup.color, cursor: "pointer",
                            fontFamily: "var(--sg-font-mono)", fontSize: 9,
                            letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          <CheckCircle2 className="h-3 w-3" /> Llegó
                        </motion.button>
                        <button onClick={() => onCancel(cita.id)}
                          style={{ background: "none", border: "none", cursor: "pointer",
                            color: "var(--pwa-muted)", padding: "4px" }}>
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {(cita.estado === "activo" || cita.estado === "atendido") && (
                      <span className="flex items-center gap-1"
                        style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                          letterSpacing: "0.1em", textTransform: "uppercase", color: "#6ba7ff" }}>
                        <Zap className="h-3 w-3" /> Activo
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom sheet nueva cita */}
      {showForm && (
        <NuevaCitaSheet
          plant={plant}
          agente={agente}
          responsables={responsables}
          onSave={onRefresh}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ── Botón de emergencia ───────────────────────────────────────────────────────

function EmergencyButton({ onPress }: { onPress: () => void }) {
  const [confirm, setConfirm] = useState(false);

  if (confirm) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-6"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      >
        <div className="w-full max-w-[320px] flex flex-col gap-5 p-6"
          style={{ background: "var(--pwa-surface)", borderTop: "4px solid #d35c4f" }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0" style={{ color: "#d35c4f" }} />
            <div>
              <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 18, fontWeight: 800,
                textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}>
                ¿Confirmar emergencia?
              </p>
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "var(--pwa-muted)", margin: "4px 0 0" }}>
                Se notificará al supervisor inmediatamente
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConfirm(false)}
              className="flex-1 h-12"
              style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
                color: "var(--pwa-muted)", cursor: "pointer",
                fontFamily: "var(--sg-font-mono)", fontSize: 11,
                letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Cancelar
            </button>
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => { setConfirm(false); onPress(); }}
              className="flex-1 h-12 flex items-center justify-center gap-2"
              style={{ background: "#d35c4f", color: "#fff", border: "none", cursor: "pointer",
                fontFamily: "var(--sg-font-mono)", fontSize: 11,
                letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
              <AlertTriangle className="h-4 w-4" /> Sí, emergencia
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => setConfirm(true)}
      className="fixed bottom-24 right-4 z-30 flex items-center gap-2 h-11 px-4"
      style={{
        background: "#d35c4f",
        border: "none", cursor: "pointer",
        color: "#fff",
        fontFamily: "var(--sg-font-mono)", fontSize: 10,
        letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700,
        boxShadow: "0 4px 20px rgba(211,92,79,0.5)",
      }}
      animate={{ boxShadow: ["0 4px 20px rgba(211,92,79,0.4)", "0 4px 28px rgba(211,92,79,0.7)", "0 4px 20px rgba(211,92,79,0.4)"] }}
      transition={{ repeat: Infinity, duration: 2 }}
    >
      <AlertTriangle className="h-4 w-4" />
      Emergencia
    </motion.button>
  );
}

// ── Tab: Bitácora/Eventos ─────────────────────────────────────────────────────

const TIPO_OPTIONS = [
  { key: "incidente", label: "Incidente",   color: "#d4864a", desc: "Situación anormal" },
  { key: "novedad",   label: "Novedad",     color: "#6ba7ff", desc: "Observación del turno" },
] as const;

function TabEventos({ eventos, agente, planta, onRefresh }: {
  eventos: GuardiaEvento[];
  agente: string;
  planta: string;
  onRefresh: () => void;
}) {
  const [tipo, setTipo]       = useState<"incidente" | "novedad">("incidente");
  const [desc, setDesc]       = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!desc.trim()) return;
    setSending(true);
    const result = await crearGuardiaEvento({
      tipo, descripcion: desc.trim(),
      foto_url: photoUrl,
      agente, planta,
    });
    setSending(false);
    if (result.success) {
      setDesc("");
      setPhotoUrl(null);
      setSent(true);
      setTimeout(() => setSent(false), 2500);
      onRefresh();
    }
  };

  function fmtEvento(ts: string): string {
    return new Date(ts).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col gap-4 mx-4">
      <ScreenHeader tab="eventos" title="Bitácora" />

      {/* Formulario */}
      <div className="flex flex-col gap-3 p-4"
        style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)", borderRadius: 14 }}>

        <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 700,
          color: "var(--pwa-ink)", margin: 0 }}>
          Nuevo incidente
        </p>

        {/* Tipo */}
        <div className="flex gap-2">
          {TIPO_OPTIONS.map(t => (
            <button key={t.key} onClick={() => setTipo(t.key)}
              className="flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-all"
              style={{
                background: tipo === t.key ? `${t.color}18` : "var(--pwa-surface-2)",
                border: `1px solid ${tipo === t.key ? t.color : "var(--pwa-border)"}`,
                cursor: "pointer",
              }}>
              <span style={{ fontFamily: "var(--sg-font-display)", fontSize: 12, fontWeight: 700,
                textTransform: "uppercase", color: tipo === t.key ? t.color : "var(--pwa-ink-soft)" }}>
                {t.label}
              </span>
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "var(--pwa-muted)" }}>
                {t.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Descripción */}
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Describe lo que ocurrió..."
          rows={3}
          className="w-full outline-none resize-none p-3 text-[14px]"
          style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
            color: "var(--pwa-ink)", fontFamily: "var(--sg-font-body)" }}
          onFocus={e => e.target.style.borderColor = tipo === "incidente" ? "#d4864a" : "#6ba7ff"}
          onBlur={e => e.target.style.borderColor = "var(--pwa-border)"}
        />

        {/* Foto */}
        <div className="flex items-center gap-3">
          <button onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 transition-opacity active:opacity-60"
            style={{ background: "var(--pwa-surface-2)", border: "1px dashed var(--pwa-border)",
              color: "var(--pwa-muted)", cursor: "pointer",
              fontFamily: "var(--sg-font-mono)", fontSize: 9,
              letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <Camera className="h-3.5 w-3.5" />
            {photoUrl ? "Foto ✓" : "Adjuntar foto"}
          </button>
          {photoUrl && (
            <button onClick={() => setPhotoUrl(null)}
              style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, color: "var(--pwa-danger)",
                letterSpacing: "0.1em", textTransform: "uppercase", background: "none", border: "none",
                cursor: "pointer" }}>
              Eliminar
            </button>
          )}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) setPhotoUrl(URL.createObjectURL(f));
              e.target.value = "";
            }} />
        </div>
        {photoUrl && (
          <div className="relative overflow-hidden" style={{ border: "1px solid var(--pwa-border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="evidencia" className="h-28 w-full object-cover" />
            <button
              onClick={() => setPhotoUrl(null)}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center"
              style={{ background: "rgba(0,0,0,0.72)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer" }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 14, fontWeight: 700, margin: 0, color: "var(--pwa-ink)" }}>
              ¿Urgente?
            </p>
            <p style={{ fontFamily: "var(--sg-font-body)", fontSize: 12, margin: "4px 0 0", color: "var(--pwa-ink-soft)" }}>
              Marcar si requiere atención inmediata
            </p>
          </div>
          <button
            onClick={() => setTipo((current) => (current === "incidente" ? "novedad" : "incidente"))}
            className="relative h-7 w-12 rounded-full"
            style={{ background: tipo === "incidente" ? "#d35c4f" : "rgba(255,255,255,0.12)", border: "none", cursor: "pointer" }}
          >
            <span className="absolute top-[2px] h-6 w-6 rounded-full bg-white transition-all" style={{ left: tipo === "incidente" ? 22 : 2 }} />
          </button>
        </div>

        {/* Enviar */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSend}
          disabled={sending || !desc.trim()}
          className="w-full h-12 flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          style={{
            background: sent ? "#6bbd8a" : TIPO_OPTIONS.find(t => t.key === tipo)?.color,
            color: "#000", border: "none", cursor: "pointer",
            fontFamily: "var(--sg-font-mono)", fontSize: 11,
            letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700,
          }}>
          {sent
            ? <><CheckCircle2 className="h-4 w-4" /> Reportado</>
            : sending
            ? "Enviando..."
            : <><Send className="h-4 w-4" /> Enviar reporte</>
          }
        </motion.button>
      </div>

      {/* Historial del día */}
      {eventos.length > 0 && (
        <div>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "var(--pwa-muted)", marginBottom: 8 }}>
            Historial reciente
          </p>
          <div className="flex flex-col" style={{ border: "1px solid var(--pwa-border)" }}>
            {eventos.map(ev => {
              const color = ev.tipo === "emergencia" ? "#d35c4f"
                : ev.tipo === "incidente" ? "#d4864a" : "#6ba7ff";
              return (
                <div key={ev.id} className="flex gap-3 px-4 py-3"
                  style={{ borderBottom: "1px solid var(--pwa-border)",
                    background: "var(--pwa-surface)" }}>
                  <div className="w-0.5 shrink-0 rounded-full" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                        letterSpacing: "0.14em", textTransform: "uppercase", color, fontWeight: 600 }}>
                        {ev.tipo}
                      </span>
                      <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                        color: "var(--pwa-muted)" }}>
                        {fmtEvento(ev.created_at)}
                      </span>
                    </div>
                    <p style={{ fontFamily: "var(--sg-font-body)", fontSize: 13,
                      color: "var(--pwa-ink)", margin: 0 }}>
                      {ev.descripcion}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {eventos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-10"
          style={{ opacity: 0.5 }}>
          <BookOpen className="h-8 w-8" style={{ color: "var(--pwa-muted)" }} />
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "var(--pwa-muted)" }}>
            Sin reportes hoy
          </p>
        </div>
      )}
    </div>
  );
}

// ── Tab: Mi rendimiento ───────────────────────────────────────────────────────

function TabRendimiento({ guardName, plant, records, eventos, onOpenPerfil }: {
  guardName: string;
  plant: string;
  records: RecentRegistration[];
  eventos: GuardiaEvento[];
  onOpenPerfil: () => void;
}) {
  const misRegistros = records.filter((r) => r.agente === guardName);
  const misPendientes = misRegistros.filter((r) => !r.attended && !r.docsDelivered).length;
  const misCompletados = misRegistros.filter((r) => r.docsDelivered).length;
  const misDemoras = misRegistros.filter((r) => isDelayedRecord(r)).length;
  const misEventos = eventos.length;

  const avgEspera = misRegistros.filter((r) => r.espera_min != null).length > 0
    ? Math.round(
        misRegistros
          .filter((r) => r.espera_min != null)
          .reduce((sum, r) => sum + (r.espera_min ?? 0), 0) /
        misRegistros.filter((r) => r.espera_min != null).length,
      )
    : 0;

  const pctOk = misRegistros.length > 0
    ? Math.round((misCompletados / misRegistros.length) * 100)
    : 0;

  const hourlyBuckets = Array.from({ length: 4 }, (_, index) => {
    const bucketStart = index * 6;
    const bucketEnd = bucketStart + 5;
    const count = misRegistros.filter((record) => {
      const hour = Number(record.time.split(":")[0] ?? 0);
      return hour >= bucketStart && hour <= bucketEnd;
    }).length;
    return { label: `${String(bucketStart).padStart(2, "0")}-${String(bucketEnd).padStart(2, "0")}`, count };
  });

  const recentOwn = misRegistros.slice(0, 5);

  return (
    <div className="flex flex-col pb-6">
      <ScreenHeader
        tab="rendimiento"
        title="Mi rendimiento"
        trailing={<div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--pwa-border)" }}><span style={{ fontFamily: "var(--sg-font-body)", fontSize: 12, color: "var(--pwa-ink-soft)" }}>Hoy</span></div>}
      />

      <div className="mx-4 p-4" style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)", borderRadius: 14 }}>
        <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 700, color: "var(--pwa-ink)", margin: 0 }}>
          Resumen del día
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: "Registros", value: misRegistros.length, meta: "Total", color: "var(--pwa-ink)" },
          { label: "Citas atendidas", value: misCompletados, meta: `De ${misRegistros.length || 0}`, color: "var(--pwa-ink)" },
          { label: "Tiempo promedio", value: avgEspera > 0 ? `${String(Math.floor(avgEspera / 60)).padStart(2, "0")}:${String(avgEspera % 60).padStart(2, "0")}` : "00:00", meta: "min", color: "var(--pwa-ink)" },
          { label: "Retrasos", value: misDemoras, meta: "Citas", color: misDemoras > 0 ? "#d35c4f" : "var(--pwa-ink)" },
        ].map((metric) => (
          <div key={metric.label} className="flex flex-col gap-1 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--pwa-border)" }}>
            <span style={{ fontFamily: "var(--sg-font-body)", fontSize: 12, color: "var(--pwa-ink-soft)" }}>{metric.label}</span>
            <span style={{ fontFamily: "var(--sg-font-display)", fontSize: 24, fontWeight: 800, color: metric.color, lineHeight: 1 }}>
              {metric.value}
            </span>
            <span style={{ fontFamily: "var(--sg-font-body)", fontSize: 12, color: "var(--pwa-ink-soft)" }}>
              {metric.meta}
            </span>
          </div>
        ))}
      </div>
      </div>

      <div className="mx-4 mt-4" style={{ border: "1px solid var(--pwa-border)", borderRadius: 14, overflow: "hidden" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--pwa-surface)" }}>
          <div>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 800, textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}>
              Historial personal
            </p>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: "4px 0 0" }}>
              Última actividad del turno
            </p>
          </div>
          <button onClick={onOpenPerfil} className="flex items-center gap-1" style={{ background: "none", border: "none", color: "var(--pwa-accent)", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Perfil <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {recentOwn.length === 0 ? (
          <div className="px-4 py-8" style={{ background: "var(--pwa-surface)" }}>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
              Aún no tienes registros asignados hoy
            </p>
          </div>
        ) : (
          recentOwn.map((record) => (
            <div key={record.id} className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: "var(--pwa-surface)", borderTop: "1px solid var(--pwa-border)" }}>
              <div className="min-w-0">
                <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }} className="truncate">
                  {record.razonSocial}
                </p>
                <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: "4px 0 0" }}>
                  {record.empresa || "Sin empresa"} · {record.tipoOperacion || "Operación"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11, color: "var(--pwa-accent)", margin: 0 }}>
                  {record.time}
                </p>
                <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: record.docsDelivered ? "#6bbd8a" : record.attended ? "#6ba7ff" : "var(--pwa-muted)", margin: "4px 0 0" }}>
                  {record.docsDelivered ? "Completo" : record.attended ? "Atendido" : "Pendiente"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Tab: Perfil ───────────────────────────────────────────────────────────────

function ProfileOption({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value?: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderTop: "1px solid var(--pwa-border)", background: "var(--pwa-surface)" }}>
      <div>
        <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: tone === "danger" ? "var(--pwa-danger)" : "var(--pwa-ink)", margin: 0 }}>
          {label}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {value ? (
          <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
            {value}
          </span>
        ) : null}
        <ArrowRight className="h-3.5 w-3.5" style={{ color: tone === "danger" ? "var(--pwa-danger)" : "var(--pwa-muted)" }} />
      </div>
    </div>
  );
}

function TabPerfil({ guardName, plant, records, eventos, onLogout, onOpenRendimiento }: {
  guardName: string;
  plant: string;
  records: RecentRegistration[];
  eventos: GuardiaEvento[];
  onLogout: () => void;
  onOpenRendimiento: () => void;
}) {
  const { theme, setTheme, themes } = usePWATheme();
  const initials = guardName.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();

  const misRegistros = records.filter(r => r.agente === guardName);
  const misEventos = eventos.length;

  return (
    <div className="flex flex-col pb-6">
      <ScreenHeader tab="perfil" title="Perfil" />
      {/* Card de perfil */}
      <div className="mx-4 p-5 relative overflow-hidden"
        style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)", borderRadius: 14 }}>
        {/* Glow */}
        <div style={{ position: "absolute", top: 0, right: 0, width: 140, height: 140,
          background: "radial-gradient(circle at top right, color-mix(in srgb, var(--pwa-accent) 8%, transparent), transparent)",
          pointerEvents: "none" }} />

        <div className="flex items-center gap-4">
          {/* Avatar grande */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--pwa-accent) 14%, transparent)",
              border: "2px solid var(--pwa-accent)", color: "var(--pwa-accent)",
              fontFamily: "var(--sg-font-display)", fontSize: 24, fontWeight: 800 }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 18, fontWeight: 800,
              textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}
              className="truncate">{guardName}</p>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-accent)", margin: "4px 0 0" }}>
              {formatGateLabelFromPlant(plant)}
            </p>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--pwa-muted)", margin: "2px 0 0" }}>
              Guardia · Turno activo
            </p>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4 p-4" style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)", borderRadius: 14 }}>
        <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 700, color: "var(--pwa-ink)", margin: 0 }}>
          Información
        </p>
        <div className="mt-4 grid gap-3">
          {[
            ["Turno", "Matutino (06:00 - 14:00)"],
            ["Planta asignada", plant.split(" ")[0] || plant],
            ["Puerta asignada", formatGateLabelFromPlant(plant)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0" style={{ borderColor: "var(--pwa-border)" }}>
              <span style={{ fontFamily: "var(--sg-font-body)", fontSize: 13, color: "var(--pwa-ink-soft)" }}>{label}</span>
              <span style={{ fontFamily: "var(--sg-font-body)", fontSize: 13, color: "var(--pwa-ink)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4" style={{ border: "1px solid var(--pwa-border)" }}>
        <div className="px-4 py-3" style={{ background: "var(--pwa-surface)" }}>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
            Opciones
          </p>
        </div>
        <button onClick={onOpenRendimiento} className="w-full text-left">
          <ProfileOption label="Mi rendimiento" value="detalle del día" />
        </button>
        <ProfileOption label="Ajustes visuales" value="tema actual" />
        <ProfileOption label="Ayuda" value="guía rápida" />
      </div>

      {/* Push notifications */}
      <div className="mx-4 mt-4">
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.22em",
          textTransform: "uppercase", color: "var(--pwa-muted)", marginBottom: 8 }}>
          Notificaciones
        </p>
        <PushSubscribeButton />
      </div>

      {/* Apariencia */}
      <div className="mx-4 mt-4 p-4"
        style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)" }}>
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "var(--pwa-muted)", margin: "0 0 12px" }}>
          Apariencia
        </p>
        <div className="flex gap-3">
          {themes.map(t => (
            <button key={t.key} onClick={() => setTheme(t.key)}
              className="flex flex-col items-center gap-2 flex-1 py-3 transition-all"
              style={{
                background: theme === t.key
                  ? "color-mix(in srgb, var(--pwa-accent) 10%, transparent)" : "var(--pwa-surface-2)",
                border: `1px solid ${theme === t.key ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
                cursor: "pointer",
              }}>
              <div className="h-5 w-5 rounded-full border-2"
                style={{
                  background: t.key === "dark" ? "#0d0f0e" : t.key === "light" ? "#f2f0eb" : "#000",
                  borderColor: theme === t.key ? "var(--pwa-accent)" : "var(--pwa-border)",
                }} />
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: theme === t.key ? "var(--pwa-accent)" : "var(--pwa-muted)" }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cerrar sesión */}
      <div className="mx-4 mt-4">
        <motion.button whileTap={{ scale: 0.97 }} onClick={onLogout}
          className="flex items-center justify-center gap-2 w-full py-3.5"
          style={{ background: "transparent", border: "1px solid rgba(211,92,79,0.65)",
            cursor: "pointer", color: "#ff6a5f", borderRadius: 10,
            fontFamily: "var(--sg-font-mono)", fontSize: 10,
            letterSpacing: "0.16em", textTransform: "uppercase" }}>
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </motion.button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  plant: string;
  guardName: string;
  initialRecords: RecentRegistration[];
  initialCitas: CitaRow[];
  initialEventos: GuardiaEvento[];
  responsables: string[];
}

export default function PWAHomeGuardia({ plant, guardName, initialRecords, initialCitas, initialEventos, responsables }: Props) {
  const router = useRouter();
  const [tab, setTab]               = useState<Tab>("inicio");
  const [records, setRecords]       = useState(initialRecords);
  const [citas, setCitas]           = useState(initialCitas);
  const [eventos, setEventos]       = useState(initialEventos);
  const [refreshing, setRefreshing] = useState(false);
  const [closingIds, setClosingIds] = useState<Set<number>>(new Set());
  const [selectedReg, setSelectedReg] = useState<RecentRegistration | null>(null);
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveNow = useLiveNow();

  // Auto-logout por inactividad
  const resetInactivity = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => {
      clearGuardSession();
      router.replace("/pwa");
    }, INACTIVITY_MS);
  }, [router]);

  useEffect(() => {
    resetInactivity();
    const events = ["touchstart", "click", "keydown"];
    events.forEach(e => window.addEventListener(e, resetInactivity, { passive: true }));
    return () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      events.forEach(e => window.removeEventListener(e, resetInactivity));
    };
  }, [resetInactivity]);

  // Auto-refresh silencioso
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const [{ records: fresh }, freshCitas, freshEventos] = await Promise.all([
      getRecentRegistrations(plant, 100),
      getCitasDelDia(plant),
      getGuardiaEventosHoy(plant),
    ]);
    setRecords(fresh);
    setCitas(freshCitas);
    setEventos(freshEventos);
    if (!silent) setRefreshing(false);
  }, [plant]);

  const handleEmergencia = async () => {
    await crearGuardiaEvento({
      tipo: "emergencia",
      descripcion: "EMERGENCIA activada desde el PWA",
      agente: guardName,
      planta: plant,
    });
    await refresh(true);
  };

  // Auto-refresh cada 30s (fallback)
  useEffect(() => {
    const id = setInterval(() => refresh(true), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Supabase Realtime — actualización instantánea
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`pwa-guard-${plant}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atenciones", filter: `planta=eq.${plant}` },
        () => { void refresh(true); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [plant, refresh]);

  const handleClose = async (reg: RecentRegistration) => {
    setClosingIds(p => new Set(p).add(reg.id));
    await closeAtencion({ id: reg.id, motivoDemora: "" });
    await refresh(true);
    setClosingIds(p => { const s = new Set(p); s.delete(reg.id); return s; });
  };

  const handleDocs = async (reg: RecentRegistration) => {
    setClosingIds(p => new Set(p).add(reg.id));
    await closeAtencionDocs({ id: reg.id });
    await refresh(true);
    setClosingIds(p => { const s = new Set(p); s.delete(reg.id); return s; });
  };

  const handleActivateCita = async (id: number) => {
    await activateCita({ id });
    await refresh(true);
  };

  const handleCancelCita = async (id: number) => {
    await cancelarCita({ id });
    await refresh(true);
  };

  const handleLogout = () => {
    clearGuardSession();
    router.replace("/pwa");
  };

  const now = new Date();
  const urgentes = records.filter(r => isAbandonedRecord(r, now)).length;
  const citasPendientes = citas.filter(c => c.estado === "esperado").length;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const citasRetrasadas = citas.filter((c) => {
    if (c.estado !== "esperado") return false;
    const [hour, minute] = c.horaCita.split(":").map(Number);
    return (hour * 60 + minute) < nowMinutes - 10;
  }).length;

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]"
      style={{ background: "var(--pwa-bg)" }}>
      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {tab === "inicio" && (
            <motion.div key="inicio"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabInicio
                plant={plant}
                records={records}
                citasPendientes={citasPendientes}
                citasRetrasadas={citasRetrasadas}
                onRefresh={() => refresh(false)}
                refreshing={refreshing}
                onClose={handleClose}
                onDocs={handleDocs}
                onTap={setSelectedReg}
                onOpenCitas={() => setTab("citas")}
                onOpenEventos={() => setTab("eventos")}
                onOpenRendimiento={() => setTab("rendimiento")}
              />
            </motion.div>
          )}
          {tab === "citas" && (
            <motion.div key="citas"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabCitas
                citas={citas}
                plant={plant}
                agente={guardName}
                responsables={responsables}
                onActivate={handleActivateCita}
                onCancel={handleCancelCita}
                onRefresh={() => refresh(false)}
              />
            </motion.div>
          )}
          {tab === "eventos" && (
            <motion.div key="eventos"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabEventos
                eventos={eventos}
                agente={guardName}
                planta={plant}
                onRefresh={() => refresh(true)}
              />
            </motion.div>
          )}
          {tab === "rendimiento" && (
            <motion.div key="rendimiento"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabRendimiento
                guardName={guardName}
                plant={plant}
                records={records}
                eventos={eventos}
                onOpenPerfil={() => setTab("perfil")}
              />
            </motion.div>
          )}
          {tab === "perfil" && (
            <motion.div key="perfil"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabPerfil
                guardName={guardName}
                plant={plant}
                records={records}
                eventos={eventos}
                onLogout={handleLogout}
                onOpenRendimiento={() => setTab("rendimiento")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vehicle detail drawer */}
      <VehicleDetailDrawer
        reg={selectedReg}
        waitSeconds={selectedReg ? getWaitSeconds(selectedReg.time, liveNow) : 0}
        onClose={() => setSelectedReg(null)}
        onMarkAttended={() => { if (selectedReg) handleClose(selectedReg); }}
        onMarkDocs={() => { if (selectedReg) handleDocs(selectedReg); }}
      />

      {/* Bottom Tab Bar */}
      <TabBar
        active={tab}
        onChange={setTab}
      />
    </div>
  );
}
