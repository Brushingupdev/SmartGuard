"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLiveNow } from "@/hooks/useLiveTimer";
import type { CitaRow, RecentRegistration } from "@/app/registro/types";
import { AlertTriangle, ArrowRight, Bell, Calendar, Plus, Truck } from "lucide-react";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { type GateAssignment } from "@/lib/gates";
import {
  HomeOverviewCard,
  PlantScopeSelector,
  ScreenHeader,
  VehicleCard,
} from "./PWAHomeGuardiaShared";
import { getLevel, getWaitMin, LEVEL_CFG } from "./pwaHomeUtils";

export function TabInicio({
  plants,
  activePlant,
  gateOptions,
  records,
  citas,
  onRefresh,
  onClose,
  onDocs,
  onTap,
  onOpenCitas,
  onOpenEventos,
  onOpenRendimiento,
  onPlantChange,
}: {
  plants: string[];
  activePlant: string;
  gateOptions: GateAssignment[];
  records: RecentRegistration[];
  citas: CitaRow[];
  onRefresh: () => void;
  onClose: (reg: RecentRegistration) => void;
  onDocs: (reg: RecentRegistration) => void;
  onTap: (reg: RecentRegistration) => void;
  onOpenCitas: () => void;
  onOpenEventos: () => void;
  onOpenRendimiento: () => void;
  onPlantChange: (plant: string) => void;
}) {
  const router = useRouter();
  const now = useLiveNow();
  const scopedRecords = records.filter((reg) => reg.planta === activePlant);
  const scopedCitas = citas.filter((cita) => cita.planta === activePlant);
  const rows = scopedRecords
    .map((reg) => ({ reg, level: getLevel(reg, now), waitMin: getWaitMin(reg) }))
    .sort((a, b) => LEVEL_CFG[a.level].order - LEVEL_CFG[b.level].order || b.waitMin - a.waitMin);

  const urgentes = rows.filter((r) => r.level === "urgente").length;
  const pendientes = rows.filter((r) => ["urgente", "demorado", "esperando", "fresco"].includes(r.level)).length;
  const completos = rows.filter((r) => r.level === "completo").length;
  const rendimiento = rows.length > 0 ? Math.round((completos / rows.length) * 100) : 0;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const citasPendientes = scopedCitas.filter((c) => c.estado === "esperado").length;
  const citasRetrasadas = scopedCitas.filter((c) => {
    if (c.estado !== "esperado") return false;
    const [hour, minute] = c.horaCita.split(":").map(Number);
    return (hour * 60 + minute) < nowMinutes - 10;
  }).length;

  return (
    <div className="flex flex-col">
      <ScreenHeader
        tab="inicio"
        title="Inicio"
        trailing={<button style={{ background: "none", border: "none", color: "var(--pwa-ink-soft)", cursor: "pointer" }}><Bell className="h-4 w-4" /></button>}
      />

      <PlantScopeSelector
        plants={plants}
        activePlant={activePlant}
        gateOptions={gateOptions}
        onChange={onPlantChange}
      />

      <PushSubscribeButton variant="card" showMode="inactive" />

      <div className="mx-4 mt-1 flex flex-col gap-3">
        <HomeOverviewCard
          icon={Truck}
          title="Vehículos pendientes"
          primary={String(pendientes)}
          secondary="Por ingresar"
          secondaryValue={String(Math.max(urgentes, citasRetrasadas))}
          secondaryLabel="En espera"
          accent="var(--pwa-success)"
          onClick={() => onRefresh()}
        />
        <HomeOverviewCard
          icon={Calendar}
          title="Próximas citas (hoy)"
          primary={String(citasPendientes)}
          secondary="Programadas"
          secondaryValue={String(citasRetrasadas)}
          secondaryLabel="Retrasadas"
          accent="var(--pwa-accent)"
          onClick={onOpenCitas}
        />
        <HomeOverviewCard
          icon={AlertTriangle}
          title="Retrasos (hoy)"
          primary={String(citasRetrasadas)}
          secondary="Citas retrasadas"
          accent="#d35c4f"
          onClick={onOpenEventos}
        />
      </div>

      <div className="mx-4 mt-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push(`/pwa/registro?plant=${encodeURIComponent(activePlant)}`)}
          className="flex h-[54px] w-full items-center justify-center gap-2"
          style={{
            background: "var(--pwa-accent)",
            color: "var(--pwa-accent-fg)",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--sg-font-mono)",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 700,
            borderRadius: 10,
          }}
        >
          <Plus className="h-4 w-4" />
          Registrar vehículo
        </motion.button>
      </div>

      <div className="mx-4 mt-4">
        <button onClick={onOpenRendimiento} className="w-full text-left transition-opacity active:opacity-80">
          <div className="flex items-center gap-3 px-4 py-4" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.005))", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, boxShadow: "0 10px 24px rgba(0,0,0,0.16)" }}>
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

      <AnimatePresence>
        {urgentes > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mx-4 mb-3 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "rgba(211,92,79,0.1)", borderLeft: "3px solid #d35c4f" }}>
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#d35c4f" }} />
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#d35c4f", margin: 0 }}>
                {urgentes} vehículo{urgentes !== 1 ? "s" : ""} con +45 min sin atención
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-4 overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, boxShadow: "0 10px 24px rgba(0,0,0,0.16)" }}>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14" style={{ background: "var(--pwa-surface)" }}>
            <Truck className="h-10 w-10 opacity-10" style={{ color: "var(--pwa-muted)" }} />
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
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
                onAction={(event) => {
                  event.stopPropagation();
                  if (level === "atendido") {
                    onDocs(reg);
                    return;
                  }
                  onClose(reg);
                }}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
