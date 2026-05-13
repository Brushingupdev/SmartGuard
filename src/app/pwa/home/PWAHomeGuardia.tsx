"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Clock, FileCheck2,
  LogOut, Palette, Plus, RefreshCw, Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getRecentRegistrations, closeAtencion, closeAtencionDocs } from "@/app/actions";
import { formatGateLabelFromPlant } from "@/lib/gates";
import { isAbandonedRecord, isDelayedRecord } from "@/app/registro/status";
import { usePWATheme } from "@/contexts/PWAThemeContext";
import { logout } from "@/app/login/actions";
import type { RecentRegistration } from "@/app/registro/types";

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

type Level = "urgente" | "demorado" | "esperando" | "fresco" | "atendido" | "completo";

function getLevel(reg: RecentRegistration, now: Date): Level {
  if (reg.docsDelivered) return "completo";
  if (reg.attended)      return "atendido";
  if (isAbandonedRecord(reg, now)) return "urgente";
  if (isDelayedRecord(reg, now))   return "demorado";
  if (getWaitMin(reg) <= 5)        return "fresco";
  return "esperando";
}

const LEVEL: Record<Level, { dot: string; label: string; order: number }> = {
  urgente:   { dot: "#d35c4f", label: "Urgente",    order: 0 },
  demorado:  { dot: "#d4864a", label: "Demorado",   order: 1 },
  esperando: { dot: "#c4c0b4", label: "Esperando",  order: 2 },
  fresco:    { dot: "#6bbd8a", label: "Llegó",      order: 3 },
  atendido:  { dot: "#6ba7ff", label: "Atendido",   order: 4 },
  completo:  { dot: "#6bbd8a", label: "Completo",   order: 5 },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ThemeBar() {
  const { theme, setTheme, themes } = usePWATheme();
  return (
    <div className="flex items-center gap-1.5">
      {themes.map((t) => (
        <button
          key={t.key}
          onClick={() => setTheme(t.key)}
          title={t.label}
          className="h-4 w-4 rounded-full border-2 transition-all"
          style={{
            background: t.key === "dark" ? "#0d0f0e" : t.key === "light" ? "#f2f0eb" : "#000",
            borderColor: theme === t.key ? "var(--pwa-accent)" : "var(--pwa-border)",
          }}
        />
      ))}
    </div>
  );
}

function StatChip({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center flex-1 py-3 gap-0.5"
      style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)" }}
    >
      <span
        style={{
          fontFamily: "var(--sg-font-mono)",
          fontSize: 22,
          fontWeight: 800,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "var(--sg-font-mono)",
          fontSize: 8,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--pwa-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function VehicleRow({
  reg,
  level,
  waitMin,
  onClose,
  onDocs,
}: {
  reg: RecentRegistration;
  level: Level;
  waitMin: number;
  onClose: () => void;
  onDocs: () => void;
}) {
  const cfg = LEVEL[level];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 px-4 py-3"
      style={{
        borderBottom: "1px solid var(--pwa-border)",
        background: level === "urgente"
          ? "color-mix(in srgb, #d35c4f 6%, var(--pwa-surface))"
          : "var(--pwa-surface)",
      }}
    >
      {/* Dot */}
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{
          background: cfg.dot,
          boxShadow: level === "urgente" ? `0 0 8px ${cfg.dot}` : "none",
        }}
      />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p
          className="truncate"
          style={{
            fontFamily: "var(--sg-font-display)",
            fontSize: 14,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "var(--pwa-ink)",
            margin: 0,
          }}
        >
          {reg.razonSocial}
        </p>
        <p
          className="truncate"
          style={{
            fontFamily: "var(--sg-font-mono)",
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--pwa-muted)",
            margin: 0,
            marginTop: 2,
          }}
        >
          {reg.responsable || "—"} {reg.empresa ? `· ${reg.empresa}` : ""}
        </p>
      </div>

      {/* Tiempo + acción */}
      <div className="flex items-center gap-2 shrink-0">
        {!reg.docsDelivered && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" style={{ color: cfg.dot }} />
            <span
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 11,
                fontWeight: 700,
                color: cfg.dot,
              }}
            >
              {fmtWait(waitMin)}
            </span>
          </div>
        )}

        {/* Acción principal */}
        {level === "completo" && (
          <CheckCircle2 className="h-4 w-4 opacity-40" style={{ color: "var(--pwa-success)" }} />
        )}
        {level === "atendido" && (
          <button
            onClick={onDocs}
            className="flex items-center gap-1 px-2.5 py-1.5 transition-opacity active:opacity-60"
            style={{
              background: "color-mix(in srgb, #6ba7ff 15%, transparent)",
              border: "1px solid #6ba7ff55",
              color: "#6ba7ff",
              fontFamily: "var(--sg-font-mono)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            <FileCheck2 className="h-3 w-3" />
            Docs
          </button>
        )}
        {(level === "urgente" || level === "demorado" || level === "esperando" || level === "fresco") && (
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 transition-opacity active:opacity-60"
            style={{
              background: level === "urgente"
                ? "color-mix(in srgb, #d35c4f 15%, transparent)"
                : "var(--pwa-surface-2)",
              border: `1px solid ${level === "urgente" ? "#d35c4f55" : "var(--pwa-border)"}`,
              color: level === "urgente" ? "#d35c4f" : "var(--pwa-ink-soft)",
              fontFamily: "var(--sg-font-mono)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Atendí
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  plant: string;
  guardName: string;
  initialRecords: RecentRegistration[];
}

export default function PWAHomeGuardia({ plant, guardName, initialRecords }: Props) {
  const router = useRouter();
  const [records, setRecords] = useState(initialRecords);
  const [refreshing, setRefreshing] = useState(false);
  const [closingIds, setClosingIds] = useState<Set<number>>(new Set());

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const { records: fresh } = await getRecentRegistrations(plant, 50);
    setRecords(fresh);
    if (!silent) setRefreshing(false);
  }, [plant]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const id = setInterval(() => refresh(true), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleClose = async (reg: RecentRegistration) => {
    setClosingIds((prev) => new Set(prev).add(reg.id));
    await closeAtencion({ id: reg.id, motivoDemora: "" });
    await refresh(true);
    setClosingIds((prev) => { const s = new Set(prev); s.delete(reg.id); return s; });
  };

  const handleDocs = async (reg: RecentRegistration) => {
    setClosingIds((prev) => new Set(prev).add(reg.id));
    await closeAtencionDocs({ id: reg.id });
    await refresh(true);
    setClosingIds((prev) => { const s = new Set(prev); s.delete(reg.id); return s; });
  };

  const now = new Date();

  const rows = records
    .map((reg) => ({
      reg,
      level: getLevel(reg, now),
      waitMin: getWaitMin(reg),
    }))
    .sort((a, b) => LEVEL[a.level].order - LEVEL[b.level].order || b.waitMin - a.waitMin);

  // Stats
  const urgentes  = rows.filter((r) => r.level === "urgente").length;
  const pendientes = rows.filter((r) => ["urgente", "demorado", "esperando", "fresco"].includes(r.level)).length;
  const atendidos  = rows.filter((r) => r.level === "atendido").length;
  const completos  = rows.filter((r) => r.level === "completo").length;

  return (
    <div
      className="flex flex-col min-h-screen min-h-[100dvh]"
      style={{ background: "var(--pwa-bg)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{
          background: "var(--pwa-surface)",
          borderBottom: "1px solid var(--pwa-border)",
        }}
      >
        <div className="min-w-0">
          <p
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--pwa-accent)",
              margin: 0,
            }}
          >
            {formatGateLabelFromPlant(plant)}
          </p>
          <p
            className="truncate"
            style={{
              fontFamily: "var(--sg-font-display)",
              fontSize: 15,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--pwa-ink)",
              margin: 0,
            }}
          >
            {guardName}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ThemeBar />
          <button
            onClick={() => refresh(false)}
            disabled={refreshing}
            className="transition-opacity active:opacity-60"
            style={{ color: "var(--pwa-muted)", background: "none", border: "none" }}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}
            >
              <RefreshCw className="h-4 w-4" />
            </motion.div>
          </button>
          <form action={logout}>
            <button
              type="submit"
              className="transition-opacity active:opacity-60"
              style={{ color: "var(--pwa-muted)", background: "none", border: "none" }}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-px px-4 pt-4" style={{ background: "var(--pwa-bg)" }}>
        <StatChip value={pendientes} label="Pendientes" color={pendientes > 0 ? "var(--pwa-accent)" : "var(--pwa-muted)"} />
        <StatChip value={urgentes}   label="Urgentes"   color={urgentes > 0 ? "#d35c4f" : "var(--pwa-muted)"} />
        <StatChip value={atendidos}  label="Atendidos"  color="#6ba7ff" />
        <StatChip value={completos}  label="Completos"  color="var(--pwa-success)" />
      </div>

      {/* Alerta urgentes */}
      <AnimatePresence>
        {urgentes > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mx-4 mt-3"
          >
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{
                background: "color-mix(in srgb, #d35c4f 10%, transparent)",
                border: "1px solid #d35c4f55",
              }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#d35c4f" }} />
              <p
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#d35c4f",
                  margin: 0,
                }}
              >
                {urgentes} vehículo{urgentes !== 1 ? "s" : ""} con +45 min sin atención
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista */}
      <div className="flex-1 mx-4 mt-3 overflow-hidden" style={{ border: "1px solid var(--pwa-border)" }}>
        {rows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-16"
            style={{ background: "var(--pwa-surface)" }}
          >
            <Truck className="h-10 w-10 opacity-15" style={{ color: "var(--pwa-muted)" }} />
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
                margin: 0,
              }}
            >
              Sin vehículos hoy
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {rows.map(({ reg, level, waitMin }) => (
              <VehicleRow
                key={reg.id}
                reg={reg}
                level={closingIds.has(reg.id) ? "completo" : level}
                waitMin={waitMin}
                onClose={() => handleClose(reg)}
                onDocs={() => handleDocs(reg)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Spacer para el FAB */}
      <div className="h-24" />

      {/* FAB — Nuevo registro */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => router.push("/pwa/registro")}
        className="fixed bottom-6 right-6 flex items-center gap-2.5 h-14 px-6 shadow-lg"
        style={{
          background: "var(--pwa-accent)",
          color: "var(--pwa-accent-fg)",
          fontFamily: "var(--sg-font-mono)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 24px color-mix(in srgb, var(--pwa-accent) 40%, transparent)",
          zIndex: 50,
        }}
      >
        <Plus className="h-5 w-5" />
        Registrar
      </motion.button>
    </div>
  );
}
