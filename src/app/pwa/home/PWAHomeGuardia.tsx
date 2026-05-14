"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useLiveNow, getWaitSeconds, fmtLiveWait } from "@/hooks/useLiveTimer";
import VehicleDetailDrawer from "@/components/VehicleDetailDrawer";
import {
  AlertTriangle, BookOpen, Calendar, Camera,
  CheckCircle2, ChevronDown, FileCheck2, LogOut,
  Palette, Plus, RefreshCw, Send, Shield, Truck, User, UserCheck, X, Zap,
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

type Tab = "inicio" | "citas" | "eventos" | "perfil";

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

function TabBar({ active, onChange, urgentes, citasPendientes }: {
  active: Tab;
  onChange: (t: Tab) => void;
  urgentes: number;
  citasPendientes: number;
}) {
  const router = useRouter();

  const leftTabs: { key: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { key: "inicio",  icon: <Shield className="h-[18px] w-[18px]" />, label: "Inicio",
      badge: urgentes > 0 ? urgentes : undefined },
    { key: "citas",   icon: <Calendar className="h-[18px] w-[18px]" />, label: "Citas",
      badge: citasPendientes > 0 ? citasPendientes : undefined },
  ];
  const rightTabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "eventos", icon: <BookOpen className="h-[18px] w-[18px]" />, label: "Bitácora" },
    { key: "perfil",  icon: <User className="h-[18px] w-[18px]" />,     label: "Perfil" },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-end px-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)", paddingTop: 8 }}
    >
      <div className="flex items-center w-full gap-1"
        style={{ height: 58, background: "var(--pwa-surface)", borderRadius: 34,
          border: "1px solid var(--pwa-border)", padding: "4px" }}>

        {/* Tabs izquierda */}
        {leftTabs.map(tab => {
          const isActive = active === tab.key;
          return (
            <button key={tab.key} onClick={() => onChange(tab.key)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
              style={{ borderRadius: 28, background: isActive ? "var(--pwa-accent)" : "transparent",
                border: "none", cursor: "pointer",
                color: isActive ? "var(--pwa-accent-fg)" : "var(--pwa-muted)" }}>
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1"
                    style={{ background: "#d35c4f", color: "#fff",
                      fontFamily: "var(--sg-font-mono)", fontSize: 9, fontWeight: 700 }}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 }}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Botón central Registrar */}
        <motion.button whileTap={{ scale: 0.88 }}
          onClick={() => router.push("/pwa/registro")}
          className="flex flex-col items-center justify-center gap-0.5 shrink-0"
          style={{ width: 50, height: 50, borderRadius: 25,
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
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              style={{ borderRadius: 28, background: isActive ? "var(--pwa-accent)" : "transparent",
                border: "none", cursor: "pointer",
                color: isActive ? "var(--pwa-accent-fg)" : "var(--pwa-muted)" }}>
              {tab.icon}
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
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

function TabInicio({ records, onRefresh, refreshing, onClose, onDocs, onTap }: {
  records: RecentRegistration[];
  onRefresh: () => void;
  refreshing: boolean;
  onClose: (reg: RecentRegistration) => void;
  onDocs: (reg: RecentRegistration) => void;
  onTap: (reg: RecentRegistration) => void;
}) {
  const now = useLiveNow();
  const rows = records
    .map(reg => ({ reg, level: getLevel(reg, now), waitMin: getWaitMin(reg) }))
    .sort((a, b) => LEVEL_CFG[a.level].order - LEVEL_CFG[b.level].order || b.waitMin - a.waitMin);

  const urgentes   = rows.filter(r => r.level === "urgente").length;
  const pendientes = rows.filter(r => ["urgente","demorado","esperando","fresco"].includes(r.level)).length;
  const atendidos  = rows.filter(r => r.level === "atendido").length;
  const completos  = rows.filter(r => r.level === "completo").length;

  return (
    <div className="flex flex-col">
      {/* KPI chips */}
      <div className="flex gap-2 px-4 mt-4 mb-3">
        {[
          { label: "HOY",        value: rows.length, color: "var(--pwa-ink)" },
          { label: "PENDIENTES", value: pendientes,  color: pendientes > 0 ? "var(--pwa-accent)" : "var(--pwa-muted)" },
          { label: "URGENTES",   value: urgentes,    color: urgentes > 0 ? "#d35c4f" : "var(--pwa-muted)" },
          { label: "COMPLETOS",  value: completos,   color: "#6bbd8a" },
        ].map(s => (
          <div key={s.label} className="flex flex-col flex-1 px-3 py-2.5"
            style={{ background: "var(--pwa-surface)" }}>
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 22,
              fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 7,
              letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--pwa-muted)",
              marginTop: 2 }}>
              {s.label}
            </span>
          </div>
        ))}
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
        style={{ border: "1px solid var(--pwa-border)" }}>
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
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const retrasadas = citas.filter(c => {
    const parts = c.horaCita.split(":").map(Number);
    const citaMin = parts[0] * 60 + parts[1];
    return c.estado === "esperado" && citaMin < nowMin - 10;
  });
  const proximas = citas.filter(c => !retrasadas.includes(c) && c.estado === "esperado");
  const llegaron = citas.filter(c => c.estado === "activo" || c.estado === "atendido");

  const groups = [
    { key: "retrasadas", label: "Retrasadas", color: "#d35c4f", items: retrasadas },
    { key: "llegaron",   label: "Llegaron",   color: "#6ba7ff", items: llegaron  },
    { key: "proximas",   label: "Próximas",   color: "#6bbd8a", items: proximas  },
  ].filter(g => g.items.length > 0);

  return (
    <div className="flex flex-col mt-4">
      {/* Header con botón nueva cita */}
      <div className="flex items-center justify-between mx-4 mb-4">
        <div>
          <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 16, fontWeight: 800,
            textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}>
            Citas del día
          </p>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "var(--pwa-muted)", margin: "3px 0 0" }}>
            {citas.length} programada{citas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2.5"
          style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
            border: "none", cursor: "pointer",
            fontFamily: "var(--sg-font-mono)", fontSize: 10,
            letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
          <Plus className="h-4 w-4" /> Nueva cita
        </motion.button>
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

      {/* Grupos de citas */}
      {groups.map(group => (
        <div key={group.key} className="mx-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-0.5" style={{ background: group.color }} />
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
              textTransform: "uppercase", color: group.color }}>
              {group.label} · {group.items.length}
            </span>
          </div>
          <div className="flex flex-col" style={{ border: "1px solid var(--pwa-border)" }}>
            {group.items.map(cita => {
              const name = cita.razonSocial !== "—" ? cita.razonSocial
                : cita.empresa !== "—" ? cita.empresa : "Cita programada";
              return (
                <div key={cita.id} className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: "1px solid var(--pwa-border)", background: "var(--pwa-surface)" }}>
                  {/* Hora */}
                  <div className="flex items-center justify-center h-11 w-14 shrink-0"
                    style={{ background: `${group.color}15`, border: `1px solid ${group.color}40` }}>
                    <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 13,
                      fontWeight: 700, color: group.color, lineHeight: 1 }}>
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
                          color: group.color, opacity: 0.7 }}>
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
                          style={{ background: `${group.color}15`, border: `1px solid ${group.color}50`,
                            color: group.color, cursor: "pointer",
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
      ))}

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
    <div className="flex flex-col gap-4 mx-4 mt-4">

      {/* Formulario */}
      <div className="flex flex-col gap-3 p-4"
        style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)" }}>

        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
          textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
          Nuevo reporte
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
            Reportes de hoy · {eventos.length}
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

// ── Tab: Perfil ───────────────────────────────────────────────────────────────

function TabPerfil({ guardName, plant, records, eventos, onLogout }: {
  guardName: string;
  plant: string;
  records: RecentRegistration[];
  eventos: GuardiaEvento[];
  onLogout: () => void;
}) {
  const { theme, setTheme, themes } = usePWATheme();
  const initials = guardName.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();

  const misRegistros   = records.filter(r => r.agente === guardName);
  const misPendientes  = misRegistros.filter(r => !r.attended && !r.docsDelivered).length;
  const misCompletados = misRegistros.filter(r => r.docsDelivered).length;
  const misAtendidos   = misRegistros.filter(r => r.attended && !r.docsDelivered).length;
  const misEventos     = eventos.length;

  const avgEspera = misRegistros.filter(r => r.espera_min).length > 0
    ? Math.round(
        misRegistros.filter(r => r.espera_min).reduce((s, r) => s + (r.espera_min ?? 0), 0) /
        misRegistros.filter(r => r.espera_min).length
      )
    : 0;

  // Mejor desempeño: % completados sobre total
  const pctOk = misRegistros.length > 0
    ? Math.round((misCompletados / misRegistros.length) * 100)
    : 0;

  return (
    <div className="flex flex-col pb-6">
      {/* Card de perfil */}
      <div className="mx-4 mt-4 p-5 relative overflow-hidden"
        style={{ background: "var(--pwa-surface)", borderTop: "3px solid var(--pwa-accent)" }}>
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

      {/* Stats de hoy */}
      <div className="mx-4 mt-4">
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.22em",
          textTransform: "uppercase", color: "var(--pwa-muted)", marginBottom: 8 }}>
          Mi actividad hoy
        </p>
        <div className="grid grid-cols-4 gap-px" style={{ background: "var(--pwa-border)" }}>
          {[
            { label: "Registré",   value: misRegistros.length,  color: "var(--pwa-accent)"  },
            { label: "Atendidos",  value: misAtendidos,          color: "#6ba7ff"             },
            { label: "Completos",  value: misCompletados,        color: "#6bbd8a"             },
            { label: "Reportes",   value: misEventos,            color: "#d4864a"             },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-4 gap-1"
              style={{ background: "var(--pwa-surface)" }}>
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 22,
                fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</span>
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 7,
                letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--pwa-muted)",
                textAlign: "center" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Métricas de rendimiento */}
      {misRegistros.length > 0 && (
        <div className="mx-4 mt-4 flex gap-3">
          <div className="flex-1 flex flex-col gap-1 p-4"
            style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)" }}>
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--pwa-muted)" }}>
              Espera promedio
            </span>
            <span style={{ fontFamily: "var(--sg-font-display)", fontSize: 22, fontWeight: 800,
              color: avgEspera > 45 ? "#d35c4f" : avgEspera > 25 ? "#d4864a" : "#6bbd8a",
              lineHeight: 1 }}>
              {avgEspera > 0 ? `${avgEspera}m` : "—"}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-1 p-4"
            style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)" }}>
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--pwa-muted)" }}>
              Completados
            </span>
            <span style={{ fontFamily: "var(--sg-font-display)", fontSize: 22, fontWeight: 800,
              color: pctOk >= 80 ? "#6bbd8a" : pctOk >= 50 ? "#d4864a" : "#d35c4f",
              lineHeight: 1 }}>
              {pctOk}%
            </span>
          </div>
        </div>
      )}

      {/* Pendientes de atención */}
      {misPendientes > 0 && (
        <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-3"
          style={{ background: "color-mix(in srgb, #d4864a 8%, transparent)",
            border: "1px solid rgba(212,134,74,0.35)" }}>
          <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#d4864a" }} />
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#d4864a", margin: 0 }}>
            Tienes {misPendientes} vehículo{misPendientes !== 1 ? "s" : ""} pendiente{misPendientes !== 1 ? "s" : ""}
          </p>
        </div>
      )}

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
          style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
            cursor: "pointer", color: "var(--pwa-muted)",
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

  const plantLabel = formatGateLabelFromPlant(plant);
  const initials = guardName.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]"
      style={{ background: "var(--pwa-bg)" }}>

      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ background: "var(--pwa-surface)", borderBottom: "1px solid var(--pwa-border)" }}>

        {/* Logo + brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--pwa-accent) 10%, transparent)",
              border: "1px solid var(--pwa-accent)" }}>
            <Shield className="h-3.5 w-3.5" style={{ color: "var(--pwa-accent)" }} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "-0.01em",
              color: "var(--pwa-ink)", margin: 0, lineHeight: 1 }}>
              Smart<span style={{ color: "var(--pwa-accent)" }}>Guard</span>
            </p>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.16em",
              textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
              {plantLabel || "Guardia"}
            </p>
          </div>
        </div>

        {/* Acciones + avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <button onClick={() => refresh(false)} disabled={refreshing}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pwa-muted)" }}>
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}>
              <RefreshCw className="h-4 w-4" />
            </motion.div>
          </button>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
              fontFamily: "var(--sg-font-display)", fontSize: 11, fontWeight: 800 }}>
            {initials}
          </div>
        </div>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {tab === "inicio" && (
            <motion.div key="inicio"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabInicio
                records={records}
                onRefresh={() => refresh(false)}
                refreshing={refreshing}
                onClose={handleClose}
                onDocs={handleDocs}
                onTap={setSelectedReg}
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
        urgentes={urgentes}
        citasPendientes={citasPendientes}
      />
    </div>
  );
}
