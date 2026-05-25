"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { getWaitSeconds, useLiveNow } from "@/hooks/useLiveTimer";
import VehicleDetailDrawer from "@/components/VehicleDetailDrawer";
import {
  Calendar,
  RefreshCw,
  Shield,
  Truck,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  activateCita,
  cancelarCita,
  closeAtencion,
  closeAtencionDocs,
  getSupervisorDataByPeriod,
  getGuardiaEventosHoy,
  type GuardiaEvento,
} from "@/app/actions";
import { isAbandonedRecord } from "@/app/registro/status";
import type { CitaRow, RecentRegistration } from "@/app/registro/types";
import { humanizeError } from "@/lib/humanizeError";
import { TabCitasSupervisor } from "./PWASupervisorCitas";
import { TabInicio } from "./PWASupervisorInicio";
import { TabPerfilSupervisor } from "./PWASupervisorProfile";
import { TabVehiculos } from "./PWASupervisorVehiculos";
import type { Tab } from "./pwaSupervisorUtils";

interface Props {
  supervisorName: string;
  companyId: string;
  initialRecords: RecentRegistration[];
  initialCitas: (CitaRow & { planta: string })[];
  initialPlantas: string[];
  initialEventos: GuardiaEvento[];
  initialPeriod: {
    from: string;
    to: string;
    label: string;
    isToday: boolean;
  };
  responsables: string[];
}

export default function PWASupervisorHome({
  supervisorName,
  companyId,
  initialRecords,
  initialCitas,
  initialPlantas,
  initialEventos,
  initialPeriod,
  responsables,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("inicio");
  const [records, setRecords] = useState(initialRecords);
  const [citas, setCitas] = useState(initialCitas);
  const [plantas, setPlantas] = useState(initialPlantas);
  const [eventos, setEventos] = useState(initialEventos);
  const [activePeriod, setActivePeriod] = useState<"today" | "week-1" | "week-2" | "week-3">("today");
  const [periodMeta, setPeriodMeta] = useState(initialPeriod);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReg, setSelectedReg] = useState<RecentRegistration | null>(
    null
  );
  const [filterPlant, setFilterPlant] = useState<string>("Todos");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const liveNow = useLiveNow();

  const showToast = useCallback((message: string, duration = 3200) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, duration);
  }, []);

  const refresh = useCallback(async (
    silent = false,
    period: "today" | "week-1" | "week-2" | "week-3" = activePeriod,
  ) => {
    if (!silent) setRefreshing(true);
    const data = await getSupervisorDataByPeriod(period);
    const nuevosEventos = await getGuardiaEventosHoy(data.plantas);
    setRecords(data.records as RecentRegistration[]);
    setCitas(data.citas as (CitaRow & { planta: string })[]);
    setPlantas(data.plantas);
    setEventos(nuevosEventos);
    setPeriodMeta(data.period);
    if (!silent) setRefreshing(false);
  }, [activePeriod]);

  useEffect(() => {
    const id = setInterval(() => {
      void refresh(true);
    }, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("pwa-supervisor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atenciones" },
        () => {
          void refresh(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guardia_eventos" },
        () => {
          void refresh(true);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const handleClose = async (reg: RecentRegistration) => {
    const result = await closeAtencion(reg.id, "");
    if (result.success) {
      showToast(`Atención cerrada · ${result.espera_min} min`);
      await refresh(true);
      return;
    }
    showToast(humanizeError(result.error), 4200);
  };

  const handleDocs = async (reg: RecentRegistration) => {
    const result = await closeAtencionDocs(reg.id);
    if (result.success) {
      showToast(`Documentos entregados · ${result.tiempo_total_min} min`);
      await refresh(true);
      return;
    }
    showToast(humanizeError(result.error), 4200);
  };

  const handleActivateCita = async (id: number) => {
    const result = await activateCita({ id });
    if (result.success) {
      showToast("Llegada confirmada.");
      await refresh(true);
      return;
    }
    showToast(humanizeError(result.error), 4200);
  };

  const handleCancelCita = async (id: number) => {
    const result = await cancelarCita({ id });
    if (result.success) {
      showToast("Cita cancelada.");
      await refresh(true);
      return;
    }
    showToast(humanizeError(result.error), 4200);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/pwa");
  };

  const urgentes = records.filter((record) =>
    isAbandonedRecord(record, liveNow)
  ).length;
  const citasPendientes = citas.filter((cita) => cita.estado === "esperado").length;
  const initials = supervisorName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const tabsDef: {
    key: Tab;
    icon: React.ReactNode;
    label: string;
    badge?: number;
  }[] = [
    {
      key: "inicio",
      icon: <Shield className="h-[18px] w-[18px]" />,
      label: "Inicio",
      badge: urgentes > 0 ? urgentes : undefined,
    },
    {
      key: "vehiculos",
      icon: <Truck className="h-[18px] w-[18px]" />,
      label: "Accesos",
    },
    {
      key: "citas",
      icon: <Calendar className="h-[18px] w-[18px]" />,
      label: "Citas",
      badge: citasPendientes > 0 ? citasPendientes : undefined,
    },
    {
      key: "perfil",
      icon: <User className="h-[18px] w-[18px]" />,
      label: "Perfil",
    },
  ];

  return (
    <div
      className="flex min-h-screen min-h-[100dvh] flex-col"
      style={{ background: "var(--pwa-bg)" }}
    >
      <AnimatePresence>
        {toastMessage ? (
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
            <p
              style={{
                fontFamily: "var(--sg-font-body)",
                fontSize: 13,
                margin: 0,
              }}
            >
              {toastMessage}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{
          background: "var(--pwa-surface)",
          borderBottom: "1px solid var(--pwa-border)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center"
            style={{
              background:
                "color-mix(in srgb, var(--pwa-accent) 10%, transparent)",
              border: "1px solid var(--pwa-accent)",
            }}
          >
            <Shield
              className="h-3.5 w-3.5"
              style={{ color: "var(--pwa-accent)" }}
            />
          </div>
          <div>
            <p
              style={{
                fontFamily: "var(--sg-font-display)",
                fontSize: 15,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "-0.01em",
                color: "var(--pwa-ink)",
                margin: 0,
                lineHeight: 1,
              }}
            >
              Smart<span style={{ color: "var(--pwa-accent)" }}>Guard</span>
            </p>
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 8,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
                margin: 0,
              }}
            >
              Supervisor · {plantas.length} planta{plantas.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => {
              void refresh(false);
            }}
            disabled={refreshing}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--pwa-muted)",
            }}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={
                refreshing
                  ? { repeat: Infinity, duration: 0.8, ease: "linear" }
                  : {}
              }
            >
              <RefreshCw className="h-4 w-4" />
            </motion.div>
          </button>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "var(--pwa-accent)",
              color: "var(--pwa-accent-fg)",
              fontFamily: "var(--sg-font-display)",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {initials}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {tab === "inicio" ? (
            <motion.div
              key="inicio"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TabInicio
                records={records}
                plantas={plantas}
                eventos={eventos}
                onSelectPlanta={(plant) => {
                  setFilterPlant(plant);
                  setTab("vehiculos");
                }}
              />
            </motion.div>
          ) : null}
          {tab === "vehiculos" ? (
            <motion.div
              key="vehiculos"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TabVehiculos
                records={records}
                filterPlant={filterPlant}
                activePeriod={activePeriod}
                periodMeta={periodMeta}
                onFilterChange={setFilterPlant}
                onPeriodChange={(period) => {
                  setSelectedReg(null);
                  setActivePeriod(period);
                  void refresh(false, period);
                }}
                onTap={setSelectedReg}
                onAction={(reg) => {
                  void handleClose(reg);
                }}
                onDocs={(reg) => {
                  void handleDocs(reg);
                }}
              />
            </motion.div>
          ) : null}
          {tab === "citas" ? (
            <motion.div
              key="citas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TabCitasSupervisor
                citas={citas}
                plantas={plantas}
                companyId={companyId}
                responsables={responsables}
                onActivate={(id) => {
                  void handleActivateCita(id);
                }}
                onCancel={(id) => {
                  void handleCancelCita(id);
                }}
                onRefresh={() => {
                  void refresh(false);
                }}
              />
            </motion.div>
          ) : null}
          {tab === "perfil" ? (
            <motion.div
              key="perfil"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TabPerfilSupervisor
                supervisorName={supervisorName}
                records={records}
                onLogout={() => {
                  void handleLogout();
                }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <VehicleDetailDrawer
        reg={selectedReg}
        waitSeconds={
          selectedReg
            ? getWaitSeconds(selectedReg.time, liveNow, selectedReg.fecha)
            : 0
        }
        onClose={() => setSelectedReg(null)}
        onMarkAttended={() => {
          if (selectedReg) void handleClose(selectedReg);
        }}
        onMarkDocs={() => {
          if (selectedReg) void handleDocs(selectedReg);
        }}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex items-end px-4"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
          paddingTop: 8,
        }}
      >
        <div
          className="flex h-[58px] w-full items-center gap-1"
          style={{
            background: "var(--pwa-surface)",
            borderRadius: 34,
            border: "1px solid var(--pwa-border)",
            padding: "4px",
          }}
        >
          {tabsDef.map((item) => {
            const isActive = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className="relative flex h-full flex-1 flex-col items-center justify-center gap-0.5"
                style={{
                  borderRadius: 28,
                  background: isActive ? "var(--pwa-accent)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: isActive
                    ? "var(--pwa-accent-fg)"
                    : "var(--pwa-muted)",
                }}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge !== undefined ? (
                    <span
                      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1"
                      style={{
                        background: "#d35c4f",
                        color: "#fff",
                        fontFamily: "var(--sg-font-mono)",
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span
                  style={{
                    fontFamily: "var(--sg-font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
