"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { useLiveNow } from "@/hooks/useLiveTimer";
import {
  activateCita,
  cancelarCita,
  closeAtencion,
  closeAtencionDocs,
  getCitasDelDia,
  getGuardiaEventosHoy,
  getRecentRegistrations,
  type GuardiaEvento,
} from "@/app/actions";
import { formatGateLabelFromPlant, type GateAssignment } from "@/lib/gates";
import { isDelayedRecord } from "@/app/registro/status";
import { clearGuardSession } from "@/app/pwa/storage";
import type { CitaRow, RecentRegistration } from "@/app/registro/types";
import { humanizeError } from "@/lib/humanizeError";
import type { ActionSheetTone } from "./PWAHomeGuardiaShared";
import { INACTIVITY_MS, type GuardiaHomeTab } from "./pwaHomeUtils";

export interface GuardiaHomeControllerParams {
  plant: string;
  plants: string[];
  gateOptions: GateAssignment[];
  initialRecords: RecentRegistration[];
  initialCitas: CitaRow[];
  initialEventos: GuardiaEvento[];
}

interface PendingConfirmState {
  title: string;
  message: ReactNode;
  confirmText: string;
  confirmTone?: ActionSheetTone;
  action: () => void | Promise<void>;
}

export function useGuardiaHomeController({
  plant,
  plants,
  gateOptions,
  initialRecords,
  initialCitas,
  initialEventos,
}: GuardiaHomeControllerParams) {
  const router = useRouter();
  const [tab, setTab] = useState<GuardiaHomeTab>("inicio");
  const [records, setRecords] = useState(initialRecords);
  const [citas, setCitas] = useState(initialCitas);
  const [eventos, setEventos] = useState(initialEventos);
  const [activePlant, setActivePlant] = useState(() => {
    if (plant && plants.includes(plant)) return plant;
    return plants[0] || "";
  });
  const [, setRefreshing] = useState(false);
  const [, setClosingIds] = useState<Set<number>>(new Set());
  const [selectedReg, setSelectedReg] = useState<RecentRegistration | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingDelayRecord, setPendingDelayRecord] = useState<RecentRegistration | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmState | null>(null);
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveNow = useLiveNow();

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
    events.forEach((eventName) => window.addEventListener(eventName, resetInactivity, { passive: true }));
    return () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
      events.forEach((eventName) => window.removeEventListener(eventName, resetInactivity));
    };
  }, [resetInactivity]);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const [{ records: fresh }, freshCitas, freshEventos] = await Promise.all([
      getRecentRegistrations(plants, 100),
      getCitasDelDia(plants),
      getGuardiaEventosHoy(plants),
    ]);
    setRecords(fresh);
    setCitas(freshCitas);
    setEventos(freshEventos);
    if (!silent) setRefreshing(false);
  }, [plants]);

  const showToast = useCallback((message: string, duration = 3200) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, duration);
  }, []);

  useEffect(() => {
    const id = setInterval(() => refresh(true), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    let channel = supabase.channel(`pwa-guard-${plants.join("-") || "default"}`);
    plants.forEach((currentPlant) => {
      channel = channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "atenciones", filter: `planta=eq.${currentPlant}` },
          () => { void refresh(true); },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "guardia_eventos", filter: `planta=eq.${currentPlant}` },
          () => { void refresh(true); },
        );
    });
    channel.subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [plants, refresh]);

  const runClose = useCallback(async (reg: RecentRegistration, motivo?: string) => {
    setClosingIds((current) => new Set(current).add(reg.id));
    const result = await closeAtencion(reg.id, motivo);
    setClosingIds((current) => {
      const next = new Set(current);
      next.delete(reg.id);
      return next;
    });
    if (result.success) {
      showToast(`Atención cerrada · ${result.espera_min} min de espera`);
      await refresh(true);
      if (selectedReg?.id === reg.id) setSelectedReg(null);
      return;
    }
    showToast(humanizeError(result.error), 4200);
  }, [refresh, selectedReg, showToast]);

  const handleClose = useCallback(async (reg: RecentRegistration) => {
    const [hh, mm] = reg.time.split(":").map(Number);
    const startMin = hh * 60 + mm;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const diff = nowMin - startMin < 0 ? nowMin - startMin + 1440 : nowMin - startMin;

    if (diff >= 30 || isDelayedRecord(reg, now)) {
      setPendingDelayRecord(reg);
      return;
    }

    setPendingConfirm({
      title: "Confirmar atención",
      message: (
        <>
          ¿Iniciar la atención para <strong style={{ color: "var(--pwa-ink)" }}>{reg.razonSocial}</strong> en {formatGateLabelFromPlant(reg.planta, gateOptions)}?
        </>
      ),
      confirmText: "Iniciar atención",
      confirmTone: "accent",
      action: () => runClose(reg),
    });
  }, [gateOptions, runClose]);

  const handleDocs = useCallback(async (reg: RecentRegistration) => {
    setPendingConfirm({
      title: "Finalizar flujo",
      message: (
        <>
          ¿Confirmar entrega de documentos y salida para <strong style={{ color: "var(--pwa-ink)" }}>{reg.razonSocial}</strong>?
        </>
      ),
      confirmText: "Entregar docs",
      confirmTone: "info",
      action: async () => {
        setClosingIds((current) => new Set(current).add(reg.id));
        const result = await closeAtencionDocs(reg.id);
        setClosingIds((current) => {
          const next = new Set(current);
          next.delete(reg.id);
          return next;
        });
        if (result.success) {
          showToast(`Documentos entregados · ${result.tiempo_total_min} min total`);
          await refresh(true);
          if (selectedReg?.id === reg.id) setSelectedReg(null);
          return;
        }
        showToast(humanizeError(result.error), 4200);
      },
    });
  }, [refresh, selectedReg, showToast]);

  const handleActivateCita = useCallback(async (id: number) => {
    const result = await activateCita({ id });
    if (result.success) {
      showToast("Llegada confirmada.");
      await refresh(true);
      return;
    }
    showToast(humanizeError(result.error), 4200);
  }, [refresh, showToast]);

  const handleCancelCita = useCallback(async (id: number) => {
    const result = await cancelarCita({ id });
    if (result.success) {
      showToast("Cita cancelada.");
      await refresh(true);
      return;
    }
    showToast(humanizeError(result.error), 4200);
  }, [refresh, showToast]);

  const handleLogout = useCallback(() => {
    clearGuardSession();
    router.replace("/pwa");
  }, [router]);

  const handleDelayConfirm = useCallback(async (motivo: string) => {
    const record = pendingDelayRecord;
    if (!record) return;
    setPendingDelayRecord(null);
    await runClose(record, motivo);
  }, [pendingDelayRecord, runClose]);

  const handlePendingConfirm = useCallback(async () => {
    const action = pendingConfirm?.action;
    setPendingConfirm(null);
    if (action) await action();
  }, [pendingConfirm]);

  return {
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
  };
}
