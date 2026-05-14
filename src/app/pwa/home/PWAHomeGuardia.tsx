"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Calendar, CheckCircle2, Clock,
  FileCheck2, Home, LogOut, Palette, Plus,
  RefreshCw, Truck, User, UserCheck, Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getRecentRegistrations, getCitasDelDia,
  closeAtencion, closeAtencionDocs, activateCita,
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

type Tab = "inicio" | "citas" | "turno";

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

// ── Bottom Tab Bar ────────────────────────────────────────────────────────────

function TabBar({ active, onChange, urgentes, citasPendientes }: {
  active: Tab;
  onChange: (t: Tab) => void;
  urgentes: number;
  citasPendientes: number;
}) {
  const tabs: { key: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { key: "inicio", icon: <Home className="h-5 w-5" />, label: "Inicio",
      badge: urgentes > 0 ? urgentes : undefined },
    { key: "citas",  icon: <Calendar className="h-5 w-5" />, label: "Citas",
      badge: citasPendientes > 0 ? citasPendientes : undefined },
    { key: "turno",  icon: <User className="h-5 w-5" />, label: "Mi turno" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 flex items-stretch z-40"
      style={{ background: "var(--pwa-surface)", borderTop: "1px solid var(--pwa-border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-3 relative transition-opacity active:opacity-70"
          style={{ background: "none", border: "none", cursor: "pointer",
            color: active === tab.key ? "var(--pwa-accent)" : "var(--pwa-muted)" }}>
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
          <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8,
            letterSpacing: "0.14em", textTransform: "uppercase" }}>
            {tab.label}
          </span>
          {active === tab.key && (
            <motion.div layoutId="tab-indicator"
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: "var(--pwa-accent)" }} />
          )}
        </button>
      ))}

      {/* FAB Registrar */}
      <div className="flex items-center justify-center px-4">
        <RegisterFABInline />
      </div>
    </div>
  );
}

function RegisterFABInline() {
  const router = useRouter();
  return (
    <motion.button whileTap={{ scale: 0.92 }}
      onClick={() => router.push("/pwa/registro")}
      className="flex items-center gap-1.5 h-10 px-4"
      style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
        border: "none", cursor: "pointer",
        fontFamily: "var(--sg-font-mono)", fontSize: 10,
        letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
      <Plus className="h-4 w-4" /> Registrar
    </motion.button>
  );
}

// ── Vehicle Card ──────────────────────────────────────────────────────────────

function VehicleCard({ reg, level, waitMin, onAction }: {
  reg: RecentRegistration;
  level: Level;
  waitMin: number;
  onAction: () => void;
}) {
  const cfg = LEVEL_CFG[level];

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
      className="flex gap-0 overflow-hidden"
      style={{ background: cfg.bg, borderBottom: "1px solid var(--pwa-border)" }}>

      {/* Acento lateral */}
      <div className="w-1 shrink-0" style={{ background: cfg.color }} />

      {/* Contenido */}
      <div className="flex flex-1 items-start gap-3 px-4 py-3.5">
        <div className="flex-1 min-w-0">
          {/* Empresa */}
          <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.01em",
            color: "var(--pwa-ink)", margin: 0 }} className="truncate">
            {reg.razonSocial}
          </p>

          {/* Meta info */}
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

        {/* Derecha: tiempo + acción */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Tiempo */}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" style={{ color: cfg.color }} />
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 12,
              fontWeight: 700, color: cfg.color }}>
              {level === "completo" ? fmtTime(reg.time) : fmtWait(waitMin)}
            </span>
          </div>

          {/* Estado/Acción */}
          {level === "completo" ? (
            <span className="flex items-center gap-1"
              style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8,
                letterSpacing: "0.12em", textTransform: "uppercase", color: "#6bbd8a" }}>
              <CheckCircle2 className="h-3 w-3" /> Completo
            </span>
          ) : level === "atendido" ? (
            <motion.button whileTap={{ scale: 0.93 }} onClick={onAction}
              className="flex items-center gap-1 px-2.5 py-1.5"
              style={{ background: "rgba(107,167,255,0.15)", border: "1px solid rgba(107,167,255,0.4)",
                color: "#6ba7ff", cursor: "pointer",
                fontFamily: "var(--sg-font-mono)", fontSize: 9,
                letterSpacing: "0.12em", textTransform: "uppercase" }}>
              <FileCheck2 className="h-3 w-3" /> Docs
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.93 }} onClick={onAction}
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

function TabInicio({ records, onRefresh, refreshing, onClose, onDocs }: {
  records: RecentRegistration[];
  onRefresh: () => void;
  refreshing: boolean;
  onClose: (reg: RecentRegistration) => void;
  onDocs: (reg: RecentRegistration) => void;
}) {
  const now = new Date();
  const rows = records
    .map(reg => ({ reg, level: getLevel(reg, now), waitMin: getWaitMin(reg) }))
    .sort((a, b) => LEVEL_CFG[a.level].order - LEVEL_CFG[b.level].order || b.waitMin - a.waitMin);

  const urgentes   = rows.filter(r => r.level === "urgente").length;
  const pendientes = rows.filter(r => ["urgente","demorado","esperando","fresco"].includes(r.level)).length;
  const atendidos  = rows.filter(r => r.level === "atendido").length;
  const completos  = rows.filter(r => r.level === "completo").length;

  return (
    <div className="flex flex-col">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-px mx-4 mt-4 mb-3"
        style={{ background: "var(--pwa-border)" }}>
        {[
          { label: "Pendientes", value: pendientes, color: pendientes > 0 ? "var(--pwa-accent)" : "var(--pwa-muted)" },
          { label: "Urgentes",   value: urgentes,   color: urgentes > 0 ? "#d35c4f" : "var(--pwa-muted)" },
          { label: "Atendidos",  value: atendidos,  color: "#6ba7ff" },
          { label: "Completos",  value: completos,  color: "#6bbd8a" },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center justify-center py-3 gap-0.5"
            style={{ background: "var(--pwa-surface)" }}>
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 22,
              fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 7,
              letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
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
            {rows.map(({ reg, level, waitMin }) => (
              <VehicleCard
                key={reg.id}
                reg={reg}
                level={level}
                waitMin={waitMin}
                onAction={() => level === "atendido" ? onDocs(reg) : onClose(reg)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ── Tab: Citas ────────────────────────────────────────────────────────────────

function TabCitas({ citas, onActivate, onRefresh }: {
  citas: CitaRow[];
  onActivate: (id: number) => void;
  onRefresh: () => void;
}) {
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

  if (citas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 mx-4">
        <Calendar className="h-10 w-10 opacity-10" style={{ color: "var(--pwa-muted)" }} />
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "var(--pwa-muted)" }}>
          Sin citas programadas hoy
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mx-4 mt-4">
      {groups.map(group => (
        <div key={group.key}>
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
                <div key={cita.id} className="flex items-center gap-4 px-4 py-3.5"
                  style={{ borderBottom: "1px solid var(--pwa-border)", background: "var(--pwa-surface)" }}>
                  {/* Hora */}
                  <div className="flex items-center justify-center h-10 w-14 shrink-0"
                    style={{ background: `${group.color}15`, border: `1px solid ${group.color}40` }}>
                    <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 13,
                      fontWeight: 700, color: group.color }}>
                      {cita.horaCita.slice(0, 5)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 14,
                      fontWeight: 700, textTransform: "uppercase", color: "var(--pwa-ink)",
                      margin: 0 }} className="truncate">{name}</p>
                    {cita.responsable && (
                      <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: "var(--pwa-muted)", margin: "3px 0 0" }}>
                        {cita.responsable}
                      </p>
                    )}
                  </div>

                  {/* Acción */}
                  {cita.estado === "esperado" && (
                    <motion.button whileTap={{ scale: 0.93 }}
                      onClick={() => onActivate(cita.id)}
                      className="flex items-center gap-1.5 px-3 py-2 shrink-0"
                      style={{ background: `${group.color}15`,
                        border: `1px solid ${group.color}60`,
                        color: group.color, cursor: "pointer",
                        fontFamily: "var(--sg-font-mono)", fontSize: 9,
                        letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      <CheckCircle2 className="h-3 w-3" /> Llegó
                    </motion.button>
                  )}
                  {(cita.estado === "activo" || cita.estado === "atendido") && (
                    <span className="flex items-center gap-1 px-2 py-1.5 shrink-0"
                      style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                        letterSpacing: "0.1em", textTransform: "uppercase", color: "#6ba7ff" }}>
                      <Zap className="h-3 w-3" /> Activo
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Mi Turno ─────────────────────────────────────────────────────────────

function TabTurno({ guardName, plant, records, onLogout }: {
  guardName: string;
  plant: string;
  records: RecentRegistration[];
  onLogout: () => void;
}) {
  const initials = guardName.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
  const misRegistros = records.filter(r => r.agente === guardName);
  const misPendientes = misRegistros.filter(r => !r.attended && !r.docsDelivered).length;
  const misCompletados = misRegistros.filter(r => r.docsDelivered).length;
  const misAtendidos = misRegistros.filter(r => r.attended && !r.docsDelivered).length;

  const avgEspera = misRegistros.length > 0
    ? Math.round(misRegistros.filter(r => r.espera_min).reduce((s, r) => s + (r.espera_min ?? 0), 0)
        / misRegistros.filter(r => r.espera_min).length) || 0
    : 0;

  return (
    <div className="flex flex-col gap-5 mx-4 mt-4 pb-4">

      {/* Perfil del guardia */}
      <div className="flex items-center gap-4 p-5"
        style={{ background: "var(--pwa-surface)", borderTop: "3px solid var(--pwa-accent)" }}>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center"
          style={{ background: "color-mix(in srgb, var(--pwa-accent) 12%, transparent)",
            border: "2px solid var(--pwa-accent)", color: "var(--pwa-accent)",
            fontFamily: "var(--sg-font-display)", fontSize: 22, fontWeight: 800 }}>
          {initials}
        </div>
        <div className="min-w-0">
          <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 18, fontWeight: 800,
            textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }} className="truncate">
            {guardName}
          </p>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "var(--pwa-muted)", margin: "4px 0 0" }}>
            {formatGateLabelFromPlant(plant)} · Guardia
          </p>
        </div>
      </div>

      {/* Mis stats de hoy */}
      <div>
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
          textTransform: "uppercase", color: "var(--pwa-muted)", marginBottom: 10 }}>
          Mi actividad de hoy
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Registré", value: misRegistros.length, color: "var(--pwa-accent)" },
            { label: "Pendientes", value: misPendientes, color: misPendientes > 0 ? "#d4864a" : "var(--pwa-muted)" },
            { label: "Atendidos", value: misAtendidos,  color: "#6ba7ff" },
            { label: "Completados", value: misCompletados, color: "#6bbd8a" },
          ].map(s => (
            <div key={s.label} className="flex flex-col gap-1 p-4"
              style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)" }}>
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 28,
                fontWeight: 800, color: s.color, lineHeight: 1 }}>
                {s.value}
              </span>
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tiempo promedio */}
      {misRegistros.length > 0 && (
        <div className="flex items-center gap-4 p-4"
          style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)" }}>
          <Clock className="h-5 w-5 shrink-0" style={{ color: "var(--pwa-accent)" }} />
          <div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.16em",
              textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
              Promedio de espera de tus registros
            </p>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 20, fontWeight: 800,
              color: "var(--pwa-ink)", margin: "4px 0 0" }}>
              {avgEspera > 0 ? `${avgEspera} min` : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Botón cerrar sesión */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={onLogout}
        className="flex items-center justify-center gap-2 w-full py-3"
        style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
          cursor: "pointer", color: "var(--pwa-muted)",
          fontFamily: "var(--sg-font-mono)", fontSize: 10,
          letterSpacing: "0.16em", textTransform: "uppercase" }}>
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </motion.button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  plant: string;
  guardName: string;
  initialRecords: RecentRegistration[];
  initialCitas: CitaRow[];
}

export default function PWAHomeGuardia({ plant, guardName, initialRecords, initialCitas }: Props) {
  const router = useRouter();
  const [tab, setTab]             = useState<Tab>("inicio");
  const [records, setRecords]     = useState(initialRecords);
  const [citas, setCitas]         = useState(initialCitas);
  const [refreshing, setRefreshing] = useState(false);
  const [closingIds, setClosingIds] = useState<Set<number>>(new Set());
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const [{ records: fresh }, freshCitas] = await Promise.all([
      getRecentRegistrations(plant, 100),
      getCitasDelDia(plant),
    ]);
    setRecords(fresh);
    setCitas(freshCitas);
    if (!silent) setRefreshing(false);
  }, [plant]);

  useEffect(() => {
    const id = setInterval(() => refresh(true), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

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
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--pwa-surface)", borderBottom: "1px solid var(--pwa-border)" }}>

        {/* Avatar guardia */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center"
          style={{ background: "color-mix(in srgb, var(--pwa-accent) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--pwa-accent) 30%, transparent)",
            color: "var(--pwa-accent)", fontFamily: "var(--sg-font-display)",
            fontSize: 12, fontWeight: 800 }}>
          {initials}
        </div>

        {/* Nombre + planta */}
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 14, fontWeight: 700,
            textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }} className="truncate">
            {guardName.split(" ")[0]}
          </p>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "var(--pwa-accent)", margin: 0 }}>
            {plantLabel || "SmartGuard"}
          </p>
        </div>

        {/* Acciones header */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <button onClick={() => refresh(false)} disabled={refreshing}
            style={{ background: "none", border: "none", cursor: "pointer",
              color: "var(--pwa-muted)" }}>
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}>
              <RefreshCw className="h-4 w-4" />
            </motion.div>
          </button>
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
              />
            </motion.div>
          )}
          {tab === "citas" && (
            <motion.div key="citas"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabCitas
                citas={citas}
                onActivate={handleActivateCita}
                onRefresh={() => refresh(false)}
              />
            </motion.div>
          )}
          {tab === "turno" && (
            <motion.div key="turno"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabTurno
                guardName={guardName}
                plant={plant}
                records={records}
                onLogout={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
