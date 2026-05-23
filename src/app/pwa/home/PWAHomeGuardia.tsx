"use client";

import { motion, AnimatePresence } from "framer-motion";
import { getWaitSeconds } from "@/hooks/useLiveTimer";
import VehicleDetailDrawer from "@/components/VehicleDetailDrawer";
import type { GuardiaEvento } from "@/app/actions";
import { type GateAssignment } from "@/lib/gates";
import type { RecentRegistration, CitaRow } from "@/app/registro/types";
import {
  ActionSheet,
  DelayReasonSheet,
  TabBar,
  ToastNotice,
} from "./PWAHomeGuardiaShared";
import { TabCitas } from "./PWAHomeGuardiaCitas";
import { TabEventos } from "./PWAHomeGuardiaEventos";
import { TabInicio } from "./PWAHomeGuardiaInicio";
import { TabPerfil, TabRendimiento } from "./PWAHomeGuardiaProfile";
import { useGuardiaHomeController } from "./useGuardiaHomeController";

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  companyId: string;
  plant: string;
  plants: string[];
  gateOptions: GateAssignment[];
  guardName: string;
  initialRecords: RecentRegistration[];
  initialCitas: CitaRow[];
  initialEventos: GuardiaEvento[];
  responsables: string[];
}

export default function PWAHomeGuardia({ companyId, plant, plants, gateOptions, guardName, initialRecords, initialCitas, initialEventos, responsables }: Props) {
  const {
    tab,
    setTab,
    records,
    citas,
    eventos,
    activePlant,
    setActivePlant,
    selectedReg,
    setSelectedReg,
    toastMessage,
    pendingDelayRecord,
    setPendingDelayRecord,
    pendingConfirm,
    setPendingConfirm,
    liveNow,
    refresh,
    handleClose,
    handleDocs,
    handleActivateCita,
    handleCancelCita,
    handleLogout,
    handleDelayConfirm,
    handlePendingConfirm,
  } = useGuardiaHomeController({
    plant,
    plants,
    gateOptions,
    initialRecords,
    initialCitas,
    initialEventos,
  });

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
                plants={plants}
                activePlant={activePlant}
                gateOptions={gateOptions}
                records={records}
                citas={citas}
                onRefresh={() => refresh(false)}
                onClose={handleClose}
                onDocs={handleDocs}
                onTap={setSelectedReg}
                onOpenCitas={() => setTab("citas")}
                onOpenEventos={() => setTab("eventos")}
                onOpenRendimiento={() => setTab("rendimiento")}
                onPlantChange={setActivePlant}
              />
            </motion.div>
          )}
          {tab === "citas" && (
            <motion.div key="citas"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabCitas
                citas={citas}
                plants={plants}
                activePlant={activePlant}
                gateOptions={gateOptions}
                agente={guardName}
                responsables={responsables}
                companyId={companyId}
                onActivate={handleActivateCita}
                onCancel={handleCancelCita}
                onRefresh={() => refresh(false)}
                onPlantChange={setActivePlant}
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
                planta={activePlant}
                plants={plants}
                gateOptions={gateOptions}
                onRefresh={() => refresh(true)}
                onPlantChange={setActivePlant}
              />
            </motion.div>
          )}
          {tab === "rendimiento" && (
            <motion.div key="rendimiento"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TabRendimiento
                guardName={guardName}
                plant={activePlant}
                records={records}
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
                plant={activePlant}
                plants={plants}
                gateOptions={gateOptions}
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

      {pendingDelayRecord ? (
        <DelayReasonSheet
          reg={pendingDelayRecord}
          onCancel={() => setPendingDelayRecord(null)}
          onConfirm={handleDelayConfirm}
        />
      ) : null}

      {pendingConfirm ? (
        <ActionSheet
          title={pendingConfirm.title}
          message={pendingConfirm.message}
          confirmText={pendingConfirm.confirmText}
          confirmTone={pendingConfirm.confirmTone}
          onCancel={() => setPendingConfirm(null)}
          onConfirm={handlePendingConfirm}
        />
      ) : null}

      <ToastNotice message={toastMessage} />

      {/* Bottom Tab Bar */}
      <TabBar
        active={tab}
        onChange={setTab}
      />
    </div>
  );
}
