"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useLiveNow, getWaitSeconds, fmtLiveWait } from "@/hooks/useLiveTimer";
import VehicleDetailDrawer from "@/components/VehicleDetailDrawer";
import {
  AlertTriangle, Building2, Calendar, CheckCircle2,
  ChevronDown, Copy, FileCheck2, Link2,
  LogOut, Plus, QrCode, RefreshCw, Shield, Truck,
  Search, User, UserCheck, X, Zap,
} from "lucide-react";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { useRouter } from "next/navigation";
import {
  getSupervisorHoyData, getGuardiaEventosHoy,
  closeAtencion, closeAtencionDocs, activateCita, cancelarCita,
  preRegisterCita, type GuardiaEvento,
} from "@/app/actions";
import { isAbandonedRecord, isDelayedRecord } from "@/app/registro/status";
import { usePWATheme } from "@/contexts/PWAThemeContext";
import type { RecentRegistration, CitaRow } from "@/app/registro/types";
import { formatGateLabelFromPlant } from "@/lib/gates";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(t: string | null): string {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

type Level = "urgente" | "demorado" | "esperando" | "fresco" | "atendido" | "completo";

function getWaitMin(reg: RecentRegistration): number {
  if (!reg.time) return 0;
  const [h, m] = reg.time.split(":").map(Number);
  const arr = new Date(); arr.setHours(h, m, 0, 0);
  return Math.max(0, Math.floor((Date.now() - arr.getTime()) / 60000));
}

function getLevel(reg: RecentRegistration, now: Date): Level {
  if (reg.docsDelivered) return "completo";
  if (reg.attended) return "atendido";
  if (isAbandonedRecord(reg, now)) return "urgente";
  if (isDelayedRecord(reg, now)) return "demorado";
  if (getWaitMin(reg) <= 5) return "fresco";
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

type Tab = "inicio" | "vehiculos" | "citas" | "perfil";

// ── Link sheet para proveedores ────────────────────────────────────────────────

function LinkSheet({ plantas, companyId, onClose }: {
  plantas: string[];
  companyId: string;
  onClose: () => void;
}) {
  const [selectedPlant, setSelectedPlant] = useState(plantas[0] ?? "");
  const [copied, setCopied] = useState(false);

  const token = typeof window !== "undefined"
    ? btoa(companyId + "|" + selectedPlant)
    : "";
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/cita/${encodeURIComponent(token)}`
    : "";

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=0d0f0e&color=c8a84b&margin=10`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hola, puedes registrar tu cita de visita desde este enlace:\n${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)" }}
        onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{ background: "var(--pwa-surface)", borderTop: "2px solid var(--pwa-accent)", maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ background: "var(--pwa-border)" }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--pwa-border)" }}>
          <div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "var(--pwa-accent)", margin: 0 }}>
              Link para proveedores
            </p>
            <h3 style={{ fontFamily: "var(--sg-font-display)", fontSize: 17, fontWeight: 800,
              textTransform: "uppercase", color: "var(--pwa-ink)", margin: "3px 0 0" }}>
              Portal de citas
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none",
            cursor: "pointer", color: "var(--pwa-muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {/* Selector de planta */}
          {plantas.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
                textTransform: "uppercase", color: "var(--pwa-muted)" }}>
                Planta / portería
              </label>
              <div className="relative">
                <select value={selectedPlant} onChange={e => setSelectedPlant(e.target.value)}
                  className="w-full h-12 px-3 outline-none appearance-none text-[14px]"
                  style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
                    color: "var(--pwa-ink)", fontFamily: "var(--sg-font-display)",
                    fontWeight: 700, textTransform: "uppercase" }}>
                  {plantas.map(p => <option key={p} value={p}>{formatGateLabelFromPlant(p)}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: "var(--pwa-muted)" }} />
              </div>
            </div>
          )}

          {/* QR */}
          <div className="flex flex-col items-center gap-3 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR Code" width={160} height={160}
              className="rounded-sm" style={{ imageRendering: "pixelated" }} />
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--pwa-muted)", textAlign: "center" }}>
              {formatGateLabelFromPlant(selectedPlant)} — escanea para agendar
            </p>
          </div>

          {/* URL */}
          <div className="flex items-center gap-2 px-3 py-2.5"
            style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)" }}>
            <Link2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--pwa-accent)" }} />
            <p className="flex-1 truncate"
              style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
                color: "var(--pwa-ink-soft)", margin: 0 }}>
              {url}
            </p>
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleCopy}
              className="flex-1 h-12 flex items-center justify-center gap-2"
              style={{
                background: copied ? "rgba(107,189,138,0.15)" : "var(--pwa-surface-2)",
                border: `1px solid ${copied ? "#6bbd8a" : "var(--pwa-border)"}`,
                color: copied ? "#6bbd8a" : "var(--pwa-ink)",
                cursor: "pointer",
                fontFamily: "var(--sg-font-mono)", fontSize: 10,
                letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700,
              }}>
              <Copy className="h-4 w-4" />
              {copied ? "¡Copiado!" : "Copiar link"}
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleWhatsApp}
              className="flex-1 h-12 flex items-center justify-center gap-2"
              style={{
                background: "rgba(37,211,102,0.12)",
                border: "1px solid rgba(37,211,102,0.35)",
                color: "#25d366",
                cursor: "pointer",
                fontFamily: "var(--sg-font-mono)", fontSize: 10,
                letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700,
              }}>
              <QrCode className="h-4 w-4" /> WhatsApp
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Tab: Inicio — resumen por planta ──────────────────────────────────────────

function TabInicio({ records, plantas, onSelectPlanta }: {
  records: RecentRegistration[];
  plantas: string[];
  onSelectPlanta: (p: string) => void;
}) {
  const now = useLiveNow();
  const allPlantas = plantas.length > 0 ? plantas
    : [...new Set(records.map(r => r.planta).filter(Boolean))].sort();

  const totalPendientes = records.filter(r => !r.attended && !r.docsDelivered && r.hasArrived).length;
  const totalUrgentes   = records.filter(r => isAbandonedRecord(r, now)).length;
  const totalAtendidos  = records.filter(r => r.attended && !r.docsDelivered).length;
  const totalCompletos  = records.filter(r => r.docsDelivered).length;

  return (
    <div className="flex flex-col mt-4 gap-4">
      {/* KPI chips */}
      <div className="flex gap-2 px-4">
        {[
          { l: "ACCESOS HOY", v: records.length,   c: "var(--pwa-ink)" },
          { l: "PENDIENTES",  v: totalPendientes,  c: totalPendientes > 0 ? "var(--pwa-accent)" : "var(--pwa-muted)" },
          { l: "URGENTES",    v: totalUrgentes,    c: totalUrgentes > 0 ? "#d35c4f" : "var(--pwa-muted)" },
        ].map(s => (
          <div key={s.l} className="flex flex-col flex-1 px-3 py-2.5"
            style={{ background: "var(--pwa-surface)" }}>
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 22, fontWeight: 800,
              color: s.c, lineHeight: 1 }}>{s.v}</span>
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 7, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--pwa-muted)", marginTop: 2 }}>{s.l}</span>
          </div>
        ))}
      </div>

      {/* Alerta urgentes */}
      <AnimatePresence>
        {totalUrgentes > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden mx-4">
            <div className="flex items-center gap-2 px-4 py-2.5"
              style={{ background: "rgba(211,92,79,0.1)", borderLeft: "3px solid #d35c4f" }}>
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#d35c4f" }} />
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "#d35c4f", margin: 0 }}>
                {totalUrgentes} vehículo{totalUrgentes !== 1 ? "s" : ""} con +45 min sin atención
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tarjetas por planta */}
      <div className="flex flex-col gap-3 mx-4">
        {allPlantas.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3"
            style={{ border: "1px dashed var(--pwa-border)" }}>
            <Truck className="h-10 w-10 opacity-10" style={{ color: "var(--pwa-muted)" }} />
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
              Sin actividad hoy
            </p>
          </div>
        ) : (
          allPlantas.map(planta => {
            const plantaRecords = records.filter(r => r.planta === planta);
            const urgentes  = plantaRecords.filter(r => isAbandonedRecord(r, now)).length;
            const pendientes = plantaRecords.filter(r => !r.attended && !r.docsDelivered && r.hasArrived).length;
            const activos   = plantaRecords.filter(r => r.attended && !r.docsDelivered).length;
            const completos = plantaRecords.filter(r => r.docsDelivered).length;
            const total     = plantaRecords.length;

            return (
              <motion.button
                key={planta}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectPlanta(planta)}
                className="w-full text-left overflow-hidden"
                style={{
                  background: "var(--pwa-surface)",
                  border: `1px solid ${urgentes > 0 ? "rgba(211,92,79,0.4)" : "var(--pwa-border)"}`,
                  cursor: "pointer",
                }}
              >
                {/* Barra de urgencia */}
                {urgentes > 0 && (
                  <motion.div className="h-0.5 w-full"
                    style={{ background: "#d35c4f" }}
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }} />
                )}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="h-4 w-4 shrink-0"
                      style={{ color: urgentes > 0 ? "#d35c4f" : "var(--pwa-accent)" }} />
                    <div className="min-w-0">
                      <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 14, fontWeight: 700,
                        textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}
                        className="truncate">
                        {formatGateLabelFromPlant(planta)}
                      </p>
                      <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.12em",
                        textTransform: "uppercase", color: "var(--pwa-muted)", margin: "2px 0 0" }}>
                        {total} vehículo{total !== 1 ? "s" : ""} hoy
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {urgentes > 0 && (
                      <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11,
                        fontWeight: 800, color: "#d35c4f" }}>{urgentes} urg.</span>
                    )}
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex gap-2">
                        <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
                          color: "#c4c0b4" }}>{pendientes} pend.</span>
                        <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
                          color: "#6ba7ff" }}>{activos} aten.</span>
                        <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
                          color: "#6bbd8a" }}>{completos} ok</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Tab: Vehículos — lista filtrable por planta ───────────────────────────────

function TabVehiculos({ records, plantas, filterPlant, onFilterChange, onTap, onAction, onDocs }: {
  records: RecentRegistration[];
  plantas: string[];
  filterPlant: string;
  onFilterChange: (p: string) => void;
  onTap: (r: RecentRegistration) => void;
  onAction: (r: RecentRegistration) => void;
  onDocs: (r: RecentRegistration) => void;
}) {
  const now = useLiveNow();
  const [searchTerm, setSearchTerm] = useState("");
  const allPlantas = [...new Set(records.map(r => r.planta).filter(Boolean))].sort();
  const term = searchTerm.trim().toUpperCase();
  const filtered = records.filter((r) => {
    const matchesPlant = filterPlant === "Todos" || r.planta === filterPlant;
    if (!matchesPlant) return false;
    if (!term) return true;
    const searchable = [
      r.razonSocial,
      r.empresa,
      r.planta,
      formatGateLabelFromPlant(r.planta ?? ""),
      r.responsable,
      r.agente,
      r.time,
    ]
      .filter(Boolean)
      .join(" ")
      .toUpperCase();
    return searchable.includes(term);
  });
  const emptyTitle = term || filterPlant !== "Todos" ? "Sin coincidencias" : "Sin vehículos";
  const emptyDetail = term
    ? `Ajusta la búsqueda o cambia de puerta`
    : filterPlant !== "Todos"
      ? `No hay registros activos en ${formatGateLabelFromPlant(filterPlant)}`
      : "Los registros del día aparecerán aquí";

  const sorted = filtered
    .map(r => ({ r, level: getLevel(r, now), wm: getWaitMin(r) }))
    .sort((a, b) => LEVEL_CFG[a.level].order - LEVEL_CFG[b.level].order || b.wm - a.wm);

  return (
    <div className="flex flex-col mt-4 gap-3">
      {/* Filtros de planta */}
      {allPlantas.length > 1 && (
        <div className="flex gap-2 px-4 overflow-x-auto pb-1">
          {["Todos", ...allPlantas].map(p => (
            <button key={p} onClick={() => onFilterChange(p)}
              className="shrink-0 px-3 py-1.5 transition-all"
              style={{
                background: filterPlant === p ? "var(--pwa-accent)" : "var(--pwa-surface-2)",
                border: `1px solid ${filterPlant === p ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
                color: filterPlant === p ? "var(--pwa-accent-fg)" : "var(--pwa-muted)",
                cursor: "pointer", borderRadius: 999,
                fontFamily: "var(--sg-font-mono)", fontSize: 9,
                letterSpacing: "0.12em", textTransform: "uppercase",
                fontWeight: filterPlant === p ? 700 : 400,
              }}>
              {p === "Todos" ? "Todos" : formatGateLabelFromPlant(p)}
            </button>
          ))}
        </div>
      )}

      <div className="px-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)", minHeight: 44 }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: "var(--pwa-muted)" }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar empresa, puerta o responsable"
            className="h-11 flex-1 bg-transparent outline-none"
            style={{
              color: "var(--pwa-ink)",
              fontFamily: "var(--sg-font-mono)",
              fontSize: 11,
              letterSpacing: "0.04em",
            }}
          />
          {searchTerm ? (
            <button
              onClick={() => setSearchTerm("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pwa-muted)" }}
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Lista */}
      <div className="mx-4" style={{ border: "1px solid var(--pwa-border)" }}>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2"
            style={{ background: "var(--pwa-surface)" }}>
            <Truck className="h-8 w-8 opacity-10" style={{ color: "var(--pwa-muted)" }} />
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
              {emptyTitle}
            </p>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0, opacity: 0.7, textAlign: "center" }}>
              {emptyDetail}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sorted.map(({ r, level }) => {
              const cfg = LEVEL_CFG[level];
              const waitSecs = getWaitSeconds(r.time, now);
              return (
                <motion.div key={r.id} layout
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  onClick={() => onTap(r)}
                  className="flex gap-0 cursor-pointer active:opacity-80"
                  style={{ background: cfg.bg, borderBottom: "1px solid var(--pwa-border)" }}>
                  <div className="w-1 shrink-0" style={{ background: cfg.color }} />
                  <div className="flex flex-1 items-start gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 14, fontWeight: 700,
                        textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}
                        className="truncate">{r.razonSocial}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {r.planta && (
                          <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                            letterSpacing: "0.1em", textTransform: "uppercase",
                            color: "var(--pwa-accent)", opacity: 0.7 }}>
                            {formatGateLabelFromPlant(r.planta)}
                          </span>
                        )}
                        {r.responsable && (
                          <span className="flex items-center gap-1"
                            style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                              color: "var(--pwa-muted)" }}>
                            <UserCheck className="h-3 w-3" />
                            {r.responsable.split(" ")[0]}
                          </span>
                        )}
                        {r.agente && (
                          <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                            color: "var(--pwa-muted)", opacity: 0.7 }}>
                            {r.agente.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {!r.docsDelivered ? (
                        <div className="flex items-center gap-1.5">
                          <motion.div className="h-1.5 w-1.5 rounded-full"
                            style={{ background: cfg.color }}
                            animate={{ opacity: [1, 0.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }} />
                          <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 12,
                            fontWeight: 800, color: cfg.color }}>
                            {fmtLiveWait(waitSecs)}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11,
                          color: "var(--pwa-muted)" }}>{fmtTime(r.time)}</span>
                      )}
                      {level === "completo" ? (
                        <span className="flex items-center gap-1"
                          style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8,
                            letterSpacing: "0.12em", textTransform: "uppercase", color: "#6bbd8a" }}>
                          <CheckCircle2 className="h-3 w-3" /> OK
                        </span>
                      ) : level === "atendido" ? (
                        <motion.button whileTap={{ scale: 0.9 }}
                          onClick={e => { e.stopPropagation(); onDocs(r); }}
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
                          onClick={e => { e.stopPropagation(); onAction(r); }}
                          className="flex items-center gap-1 px-2.5 py-1.5"
                          style={{
                            background: level === "urgente" ? "rgba(211,92,79,0.15)" : "var(--pwa-surface-2)",
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
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ── Tab: Citas ────────────────────────────────────────────────────────────────

function TabCitasSupervisor({ citas, plantas, companyId, responsables, onActivate, onCancel, onRefresh }: {
  citas: (CitaRow & { planta: string })[];
  plantas: string[];
  companyId: string;
  responsables: string[];
  onActivate: (id: number) => void;
  onCancel: (id: number) => void;
  onRefresh: () => void;
}) {
  const [showLink, setShowLink]   = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [filterPlant, setFilter]  = useState("Todos");
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const filtered = filterPlant === "Todos" ? citas : citas.filter(c => c.planta === filterPlant);
  const retrasadas = filtered.filter(c => {
    const [h, m] = c.horaCita.split(":").map(Number);
    return c.estado === "esperado" && (h * 60 + m) < nowMin - 10;
  });
  const proximas  = filtered.filter(c => !retrasadas.includes(c) && c.estado === "esperado");
  const llegaron  = filtered.filter(c => c.estado === "activo" || c.estado === "atendido");
  const groups    = [
    { key: "retrasadas", label: "Retrasadas", color: "#d35c4f", items: retrasadas },
    { key: "llegaron",   label: "Llegaron",   color: "#6ba7ff", items: llegaron  },
    { key: "proximas",   label: "Próximas",   color: "#6bbd8a", items: proximas  },
  ].filter(g => g.items.length > 0);

  return (
    <div className="flex flex-col mt-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between mx-4">
        <div>
          <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 22, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "-0.02em",
            color: "var(--pwa-ink)", margin: 0, lineHeight: 1 }}>
            CITAS
          </p>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.08em",
            color: "var(--pwa-muted)", margin: "4px 0 0" }}>
            {now.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowLink(true)}
            className="flex items-center gap-1.5 px-3 py-2"
            style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
              color: "var(--pwa-muted)", cursor: "pointer", borderRadius: 6,
              fontFamily: "var(--sg-font-mono)", fontSize: 9,
              letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <QrCode className="h-4 w-4" /> Link
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2.5"
            style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
              border: "none", cursor: "pointer", borderRadius: 6,
              fontFamily: "var(--sg-font-mono)", fontSize: 9,
              letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
            <Plus className="h-4 w-4" /> Nueva
          </motion.button>
        </div>
      </div>

      {/* Filtros de planta */}
      {plantas.length > 1 && (
        <div className="flex gap-2 px-4 overflow-x-auto pb-1">
          {["Todos", ...plantas].map(p => (
            <button key={p} onClick={() => setFilter(p)}
              className="shrink-0 px-3 py-1.5"
              style={{
                background: filterPlant === p ? "var(--pwa-accent)" : "var(--pwa-surface-2)",
                border: `1px solid ${filterPlant === p ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
                color: filterPlant === p ? "var(--pwa-accent-fg)" : "var(--pwa-muted)",
                cursor: "pointer", borderRadius: 999,
                fontFamily: "var(--sg-font-mono)", fontSize: 9,
                letterSpacing: "0.12em", textTransform: "uppercase",
                fontWeight: filterPlant === p ? 700 : 400,
              }}>
              {p === "Todos" ? "Todos" : formatGateLabelFromPlant(p)}
            </button>
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-12 mx-4 gap-3"
          style={{ border: "1px dashed var(--pwa-border)" }}>
          <Calendar className="h-10 w-10 opacity-10" style={{ color: "var(--pwa-muted)" }} />
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "var(--pwa-muted)" }}>
            Sin citas programadas
          </p>
          <button onClick={() => setShowForm(true)}
            style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--pwa-accent)",
              background: "none", border: "none", cursor: "pointer" }}>
            + Programar la primera
          </button>
        </div>
      )}

      {/* Grupos */}
      {groups.map(group => (
        <div key={group.key} className="mx-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-0.5" style={{ background: group.color }} />
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
              textTransform: "uppercase", color: group.color }}>
              {group.label} · {group.items.length}
            </span>
          </div>
          <div className="flex flex-col" style={{ border: "1px solid var(--pwa-border)" }}>
            {group.items.map(cita => {
              const name = cita.razonSocial !== "—" ? cita.razonSocial : cita.empresa !== "—" ? cita.empresa : "Cita";
              return (
                <div key={cita.id} className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: "1px solid var(--pwa-border)", background: "var(--pwa-surface)" }}>
                  <div className="flex items-center justify-center h-11 w-14 shrink-0"
                    style={{ background: `${group.color}15`, border: `1px solid ${group.color}40` }}>
                    <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 13,
                      fontWeight: 700, color: group.color }}>
                      {cita.horaCita.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 13, fontWeight: 700,
                      textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}
                      className="truncate">{name}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {(cita as CitaRow & { planta: string }).planta && (
                        <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8,
                          letterSpacing: "0.1em", textTransform: "uppercase",
                          color: "var(--pwa-accent)", opacity: 0.7 }}>
                          {formatGateLabelFromPlant((cita as CitaRow & { planta: string }).planta)}
                        </span>
                      )}
                      {cita.responsable && (
                        <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                          color: "var(--pwa-muted)" }}>
                          {cita.responsable.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </div>
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

      {/* Link sheet */}
      {showLink && (
        <LinkSheet
          plantas={plantas.length > 0 ? plantas : [...new Set(citas.map(c => c.planta).filter(Boolean))]}
          companyId={companyId}
          onClose={() => setShowLink(false)}
        />
      )}

      {/* Nueva cita (reutilizando NuevaCitaInline) */}
      {showForm && (
        <NuevaCitaInline
          plantas={plantas}
          responsables={responsables}
          companyId={companyId}
          onSave={onRefresh}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ── Nueva cita inline (supervisor puede elegir planta) ────────────────────────

function NuevaCitaInline({ plantas, responsables, companyId, onSave, onClose }: {
  plantas: string[];
  responsables: string[];
  companyId: string;
  onSave: () => void;
  onClose: () => void;
}) {
  const [planta,       setPlanta]       = useState(plantas[0] ?? "");
  const [hora,         setHora]         = useState("");
  const [fecha,        setFecha]        = useState("");
  const [razonSocial,  setRazonSocial]  = useState("");
  const [responsable,  setResponsable]  = useState(responsables[0] ?? "");
  const [tipoOp,       setTipoOp]       = useState("Descarga");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const handleSave = async () => {
    if (!hora || !razonSocial.trim()) { setError("Hora y razón social son obligatorios"); return; }
    setSaving(true);
    const result = await preRegisterCita({
      horaCita: hora, fecha: fecha || undefined,
      plant: planta, razonSocial: razonSocial.trim(),
      empresa: razonSocial.trim(), responsable,
      type: "Proveedor", tipoOperacion: tipoOp, agente: "Supervisor", note: "",
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
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ background: "var(--pwa-border)" }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--pwa-border)" }}>
          <h3 style={{ fontFamily: "var(--sg-font-display)", fontSize: 18, fontWeight: 800,
            textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}>
            Nueva cita
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none",
            cursor: "pointer", color: "var(--pwa-muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {/* Planta */}
          {plantas.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
                textTransform: "uppercase", color: "var(--pwa-muted)" }}>Planta</label>
              <div className="relative">
                <select value={planta} onChange={e => setPlanta(e.target.value)}
                  className="w-full h-12 px-3 outline-none appearance-none text-[14px]"
                  style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
                    color: "var(--pwa-ink)", fontFamily: "var(--sg-font-display)",
                    fontWeight: 700, textTransform: "uppercase" }}>
                  {plantas.map(p => <option key={p} value={p}>{formatGateLabelFromPlant(p)}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: "var(--pwa-muted)" }} />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            {[{ label: "Hora *", type: "time", val: hora, set: setHora },
              { label: "Fecha", type: "date", val: fecha, set: setFecha }].map(f => (
              <div key={f.label} className="flex flex-col gap-1.5 flex-1">
                <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
                  textTransform: "uppercase", color: "var(--pwa-muted)" }}>{f.label}</label>
                <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                  className="w-full h-12 px-3 outline-none"
                  style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
                    color: "var(--pwa-ink)", fontFamily: "var(--sg-font-mono)", fontSize: 14, fontWeight: 700 }}
                  onFocus={e => e.target.style.borderColor = "var(--pwa-accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--pwa-border)"} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-muted)" }}>Vehículo / Razón social *</label>
            <input type="text" value={razonSocial}
              onChange={e => setRazonSocial(e.target.value.toUpperCase())}
              placeholder="TRANSPORTES ABC SAC..."
              className="w-full h-12 px-3 outline-none text-[14px] font-bold uppercase"
              style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
                color: "var(--pwa-ink)", fontFamily: "var(--sg-font-display)" }}
              onFocus={e => e.target.style.borderColor = "var(--pwa-accent)"}
              onBlur={e => e.target.style.borderColor = "var(--pwa-border)"} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-muted)" }}>Responsable</label>
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
          <div className="flex gap-2">
            {["Carga","Descarga","Servicio","Otro"].map(t => (
              <button key={t} onClick={() => setTipoOp(t)} className="flex-1 py-2.5"
                style={{
                  background: tipoOp === t ? "color-mix(in srgb, var(--pwa-accent) 12%, transparent)" : "var(--pwa-surface-2)",
                  border: `1px solid ${tipoOp === t ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
                  color: tipoOp === t ? "var(--pwa-accent)" : "var(--pwa-muted)", cursor: "pointer",
                  fontFamily: "var(--sg-font-mono)", fontSize: 9,
                  letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: tipoOp === t ? 700 : 400,
                }}>
                {t}
              </button>
            ))}
          </div>
          {error && (
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--pwa-danger)" }}>{error}</p>
          )}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
            disabled={saving || !hora || !razonSocial.trim()}
            className="w-full h-13 flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
              fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.2em",
              textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer", height: 52 }}>
            {saving ? "Guardando..." : <><Calendar className="h-4 w-4" /> Programar cita</>}
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Tab: Perfil supervisor ────────────────────────────────────────────────────

function TabPerfilSupervisor({ supervisorName, records, onLogout }: {
  supervisorName: string;
  records: RecentRegistration[];
  onLogout: () => void;
}) {
  const { theme, setTheme, themes } = usePWATheme();
  const initials = supervisorName.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
  const now = useLiveNow();
  const urgentes = records.filter(r => isAbandonedRecord(r, now)).length;

  return (
    <div className="flex flex-col pb-6">
      {/* Card */}
      <div className="mx-4 mt-4 p-5 relative overflow-hidden"
        style={{ background: "var(--pwa-surface)", borderTop: "3px solid var(--pwa-accent)" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 140, height: 140,
          background: "radial-gradient(circle at top right, color-mix(in srgb, var(--pwa-accent) 8%, transparent), transparent)",
          pointerEvents: "none" }} />
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--pwa-accent) 14%, transparent)",
              border: "2px solid var(--pwa-accent)", color: "var(--pwa-accent)",
              fontFamily: "var(--sg-font-display)", fontSize: 24, fontWeight: 800 }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 18, fontWeight: 800,
              textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}
              className="truncate">{supervisorName}</p>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-accent)", margin: "4px 0 0" }}>
              Supervisor
            </p>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--pwa-muted)", margin: "2px 0 0" }}>
              {urgentes > 0 ? `⚠ ${urgentes} urgente${urgentes !== 1 ? "s" : ""}` : "Turno activo · todo OK"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats globales */}
      <div className="mx-4 mt-4">
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.22em",
          textTransform: "uppercase", color: "var(--pwa-muted)", marginBottom: 8 }}>
          Resumen del día
        </p>
        <div className="grid grid-cols-4 gap-px" style={{ background: "var(--pwa-border)" }}>
          {[
            { label: "Total",     value: records.length,                                    color: "var(--pwa-accent)" },
            { label: "Urgentes",  value: urgentes,                                           color: "#d35c4f"           },
            { label: "Atendidos", value: records.filter(r => r.attended).length,             color: "#6ba7ff"           },
            { label: "Completos", value: records.filter(r => r.docsDelivered).length,        color: "#6bbd8a"           },
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
              className="flex flex-col items-center gap-2 flex-1 py-3"
              style={{
                background: theme === t.key ? "color-mix(in srgb, var(--pwa-accent) 10%, transparent)" : "var(--pwa-surface-2)",
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

      {/* Logout */}
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

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  supervisorName: string;
  companyId: string;
  initialRecords: RecentRegistration[];
  initialCitas: (CitaRow & { planta: string })[];
  initialPlantas: string[];
  initialEventos: GuardiaEvento[];
  responsables: string[];
}

export default function PWASupervisorHome({
  supervisorName, companyId,
  initialRecords, initialCitas, initialPlantas,
  initialEventos, responsables,
}: Props) {
  const router = useRouter();
  const [tab, setTab]               = useState<Tab>("inicio");
  const [records, setRecords]       = useState(initialRecords);
  const [citas, setCitas]           = useState(initialCitas);
  const [plantas, setPlantas]       = useState(initialPlantas);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReg, setSelectedReg] = useState<RecentRegistration | null>(null);
  const [filterPlant, setFilterPlant] = useState<string>("Todos");
  const liveNow = useLiveNow();

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const data = await getSupervisorHoyData();
    setRecords(data.records as RecentRegistration[]);
    setCitas(data.citas as (CitaRow & { planta: string })[]);
    setPlantas(data.plantas);
    if (!silent) setRefreshing(false);
  }, []);

  // Auto-refresh cada 30s
  useEffect(() => {
    const id = setInterval(() => refresh(true), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Supabase Realtime — todas las plantas
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("pwa-supervisor")
      .on("postgres_changes", { event: "*", schema: "public", table: "atenciones" },
        () => { void refresh(true); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  const handleClose = async (reg: RecentRegistration) => {
    await closeAtencion({ id: reg.id, motivoDemora: "" });
    await refresh(true);
  };
  const handleDocs = async (reg: RecentRegistration) => {
    await closeAtencionDocs({ id: reg.id });
    await refresh(true);
  };
  const handleActivateCita = async (id: number) => {
    await activateCita({ id });
    await refresh(true);
  };
  const handleCancelCita = async (id: number) => {
    await cancelarCita({ id });
    await refresh(true);
  };
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/pwa");
  };

  const urgentes = records.filter(r => isAbandonedRecord(r, liveNow)).length;
  const citasPendientes = citas.filter(c => c.estado === "esperado").length;
  const initials = supervisorName.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();

  const tabsDef: { key: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { key: "inicio",    icon: <Shield className="h-[18px] w-[18px]" />,   label: "Inicio",
      badge: urgentes > 0 ? urgentes : undefined },
    { key: "vehiculos", icon: <Truck className="h-[18px] w-[18px]" />,    label: "Accesos" },
    { key: "citas",     icon: <Calendar className="h-[18px] w-[18px]" />, label: "Citas",
      badge: citasPendientes > 0 ? citasPendientes : undefined },
    { key: "perfil",    icon: <User className="h-[18px] w-[18px]" />,     label: "Perfil" },
  ];

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
              Supervisor · {plantas.length} planta{plantas.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Acciones + avatar */}
        <div className="flex items-center gap-2 shrink-0">
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

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {tab === "inicio" && (
            <motion.div key="inicio"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabInicio
                records={records}
                plantas={plantas}
                onSelectPlanta={p => { setFilterPlant(p); setTab("vehiculos"); }}
              />
            </motion.div>
          )}
          {tab === "vehiculos" && (
            <motion.div key="vehiculos"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabVehiculos
                records={records}
                plantas={plantas}
                filterPlant={filterPlant}
                onFilterChange={setFilterPlant}
                onTap={setSelectedReg}
                onAction={handleClose}
                onDocs={handleDocs}
              />
            </motion.div>
          )}
          {tab === "citas" && (
            <motion.div key="citas"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabCitasSupervisor
                citas={citas}
                plantas={plantas}
                companyId={companyId}
                responsables={responsables}
                onActivate={handleActivateCita}
                onCancel={handleCancelCita}
                onRefresh={() => refresh(false)}
              />
            </motion.div>
          )}
          {tab === "perfil" && (
            <motion.div key="perfil"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabPerfilSupervisor
                supervisorName={supervisorName}
                records={records}
                onLogout={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* VehicleDetailDrawer */}
      <VehicleDetailDrawer
        reg={selectedReg}
        waitSeconds={selectedReg ? getWaitSeconds(selectedReg.time, liveNow) : 0}
        onClose={() => setSelectedReg(null)}
        onMarkAttended={() => { if (selectedReg) handleClose(selectedReg); }}
        onMarkDocs={() => { if (selectedReg) handleDocs(selectedReg); }}
      />

      {/* Pill Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-end px-4"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)", paddingTop: 8 }}>
        <div className="flex items-center w-full gap-1"
          style={{ height: 58, background: "var(--pwa-surface)", borderRadius: 34,
            border: "1px solid var(--pwa-border)", padding: "4px" }}>
          {tabsDef.map(t => {
            const isActive = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
                style={{ borderRadius: 28,
                  background: isActive ? "var(--pwa-accent)" : "transparent",
                  border: "none", cursor: "pointer",
                  color: isActive ? "var(--pwa-accent-fg)" : "var(--pwa-muted)" }}>
                <div className="relative">
                  {t.icon}
                  {t.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1"
                      style={{ background: "#d35c4f", color: "#fff",
                        fontFamily: "var(--sg-font-mono)", fontSize: 9, fontWeight: 700 }}>
                      {t.badge}
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
                  letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
