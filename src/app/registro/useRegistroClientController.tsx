"use client";

import {
  activateCita,
  closeAbandonedBatch,
  closeAtencion,
  closeAtencionDocs,
  createAtencion,
  deleteAtencion,
  getVehicleProfile,
  updateAtencion,
} from "@/app/actions";
import { FileCheck2, Timer, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { humanizeError } from "@/lib/humanizeError";
import { formatGateLabelFromPlant } from "@/lib/gates";
import { usePWA } from "@/hooks/usePWA";
import { useRegistroData } from "./useRegistroData";
import { isAbandonedRecord, isDelayedRecord } from "./status";
import type { RecentRegistration } from "./types";
import type {
  ConfirmActionState,
  RegistroClientProps,
} from "./registroClientTypes";

type EditPayload = {
  razonSocial: string;
  empresa: string;
  type: string;
  tipoOperacion: string;
  responsable: string;
  agente: string;
  note: string;
  hAtencion?: string | null;
  hDevDocs?: string | null;
  horaCita?: string | null;
};

const RESPONSABLES_DEFAULT: string[] = [];
const LOAD_LIMIT = 200;

export function useRegistroClientController({
  initialAgente,
  initialPlant,
  initialPlants,
  initialGateOptions,
  initialResponsablesList,
  initialAgentesList,
  initialRecentRegistrations,
  initialRecentTotal,
  initialCitas,
  initialUserRole,
  initialPlantAssigned,
  initialLastRefresh,
}: RegistroClientProps) {
  const responsablesList =
    initialResponsablesList.length > 0
      ? initialResponsablesList
      : RESPONSABLES_DEFAULT;
  const agentesList =
    initialAgentesList.length > 0 ? initialAgentesList : [initialAgente];

  const [razonSocial, setRazonSocial] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [type, setType] = useState("Proveedor");
  const [tipoOperacion, setTipoOperacion] = useState("Carga");
  const [responsable, setResponsable] = useState<string>(
    responsablesList[0] ?? ""
  );
  const [agente, setAgente] = useState(initialAgente);
  const [plant, setPlant] = useState(initialPlant);
  const [note, setNote] = useState("");
  const [horaCita, setHoraCita] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [closingIds, setClosingIds] = useState<Set<number>>(new Set());
  const [docsIds, setDocsIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [pendingClose, setPendingClose] =
    useState<RecentRegistration | null>(null);
  const [pendingDuplicateConfirm, setPendingDuplicateConfirm] =
    useState<RecentRegistration | null>(null);
  const [editingReg, setEditingReg] = useState<RecentRegistration | null>(null);
  const [pendingConfirm, setPendingConfirm] =
    useState<ConfirmActionState | null>(null);
  const [isPending, startTransition] = useTransition();

  const userRole = initialUserRole;
  const plantAssigned = initialPlantAssigned;
  const userReady = true;
  const isPWA = usePWA();
  const [isKiosk, setIsKiosk] = useState(isPWA);
  const gateLabel = formatGateLabelFromPlant(plant, initialGateOptions);

  const { citas, liveTime, recentRegistrations, refreshCitas, refreshRecent } =
    useRegistroData({
      plant,
      initialRecentRegistrations,
      initialRecentTotal,
      initialCitas,
      initialLastRefresh,
      loadLimit: LOAD_LIMIT,
      userReady,
    });

  const showTemporaryToast = (message: string, durationMs = 3200) => {
    setToastMsg(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), durationMs);
  };

  const refreshRegistroPanels = () => {
    void refreshRecent(plant);
    void refreshCitas(plant);
  };

  const clearForm = () => {
    setRazonSocial("");
    setEmpresa("");
    setType("Proveedor");
    setTipoOperacion("Carga");
    setNote("");
    setHoraCita("");
    setResponsable(responsablesList[0] ?? "");
    setAgente(agentesList[0] ?? initialAgente);
  };

  const handleVehicleSelect = async (value: string) => {
    const profile = await getVehicleProfile(value);
    if (!profile) return;
    if (profile.empresa) setEmpresa(profile.empresa);
    if (profile.tipo) setType(profile.tipo);
    if (profile.tipoOperacion) setTipoOperacion(profile.tipoOperacion);
  };

  const submitRegistro = (forceDuplicate = false) => {
    startTransition(async () => {
      const result = await createAtencion({
        razonSocial,
        empresa,
        plant,
        type,
        tipoOperacion,
        responsable,
        agente,
        note,
        forceDuplicate,
        horaCita: horaCita || null,
      });

      if (result.success) {
        setPendingDuplicateConfirm(null);
        clearForm();
        showTemporaryToast(
          `Ingreso registrado · ${gateLabel} · ${result.time?.substring(0, 5) ?? liveTime.substring(0, 5)}`
        );
        refreshRegistroPanels();
      } else {
        showTemporaryToast(humanizeError(result.error), 4000);
      }
    });
  };

  const duplicateWarning =
    razonSocial.trim().length < 3
      ? null
      : recentRegistrations.find(
          (record) =>
            !record.attended &&
            record.razonSocial
              .toUpperCase()
              .includes(razonSocial.trim().toUpperCase())
        ) ?? null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (duplicateWarning) {
      setPendingDuplicateConfirm(duplicateWarning);
      return;
    }
    submitRegistro(false);
  };

  const doClose = async (id: number, motivo: string | undefined) => {
    setPendingClose(null);
    setClosingIds((prev) => new Set(prev).add(id));
    const result = await closeAtencion(id, motivo);
    setClosingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (result.success) {
      showTemporaryToast(
        `Atención cerrada · ${result.espera_min} min de espera`
      );
      void refreshRecent(plant);
    } else {
      showTemporaryToast(humanizeError(result.error), 4000);
    }
  };

  const handleClose = (reg: RecentRegistration) => {
    const [hh, mm] = reg.time.split(":").map(Number);
    const startMin = hh * 60 + mm;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const diff =
      nowMin - startMin < 0 ? nowMin - startMin + 1440 : nowMin - startMin;

    if (diff >= 30) {
      setPendingClose(reg);
      return;
    }

    setPendingConfirm({
      title: "Confirmar Atención",
      message: (
        <>
          ¿Estás seguro de iniciar la atención para{" "}
          <strong className="text-[var(--sg-ink)]">{reg.razonSocial}</strong>?
        </>
      ),
      icon: Timer,
      color: "var(--sg-accent)",
      btnText: "Iniciar atención",
      action: () => {
        void doClose(reg.id, undefined);
      },
    });
  };

  const handleActivateScheduled = async (reg: RecentRegistration) => {
    const result = await activateCita({ id: reg.id });
    if (result.success) {
      showTemporaryToast("Vehículo registrado. Llegada confirmada.");
      refreshRegistroPanels();
      return;
    }
    showTemporaryToast(humanizeError(result.error), 4000);
  };

  const handleDocs = (reg: RecentRegistration) => {
    setPendingConfirm({
      title: "Confirmar Entrega de Docs",
      message: (
        <>
          ¿Confirmar que se entregaron los documentos y dar salida a{" "}
          <strong className="text-[var(--sg-ink)]">{reg.razonSocial}</strong>?
        </>
      ),
      icon: FileCheck2,
      color: "var(--sg-success)",
      btnText: "Finalizar flujo",
      action: async () => {
        setDocsIds((prev) => new Set(prev).add(reg.id));
        const result = await closeAtencionDocs(reg.id);
        setDocsIds((prev) => {
          const next = new Set(prev);
          next.delete(reg.id);
          return next;
        });

        if (result.success) {
          showTemporaryToast(
            `Documentos entregados · Tiempo total: ${result.tiempo_total_min} min`
          );
          void refreshRecent(plant);
        } else {
          showTemporaryToast(humanizeError(result.error), 4000);
        }
      },
    });
  };

  const handleDelete = (id: number, razonSocialValue: string) => {
    setPendingConfirm({
      title: "Eliminar Registro",
      message: (
        <>
          ¿Estás seguro de eliminar el registro de{" "}
          <strong className="text-[var(--sg-ink)]">{razonSocialValue}</strong>?
          Esta acción no se puede deshacer.
        </>
      ),
      icon: Trash2,
      color: "var(--sg-danger)",
      btnText: "Eliminar",
      action: async () => {
        setDeletingIds((prev) => new Set(prev).add(id));
        const result = await deleteAtencion(id);
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        if (result.success) {
          showTemporaryToast("Registro eliminado.");
          void refreshRecent(plant);
        } else {
          showTemporaryToast(humanizeError(result.error), 4000);
        }
      },
    });
  };

  const handleEditSave = async (data: EditPayload) => {
    if (!editingReg) return;
    const result = await updateAtencion(editingReg.id, data);

    if (result.success) {
      setEditingReg(null);
      showTemporaryToast("Registro actualizado correctamente.");
      void refreshRecent(plant);
    } else {
      showTemporaryToast(humanizeError(result.error), 4000);
    }
  };

  const abandonedRecords = recentRegistrations.filter((record) =>
    isAbandonedRecord(record, new Date())
  );

  const handleCloseAbandoned = async () => {
    const ids = abandonedRecords.map((record) => record.id);
    const result = await closeAbandonedBatch(ids);
    showTemporaryToast(
      `${result.count} registro${result.count !== 1 ? "s" : ""} cerrado${result.count !== 1 ? "s" : ""} como abandonado${result.count !== 1 ? "s" : ""}.`
    );
    void refreshRecent(plant);
  };

  const pendingCount = recentRegistrations.filter((record) => !record.attended)
    .length;
  const attendedCount = recentRegistrations.filter(
    (record) => record.attended && !record.docsDelivered
  ).length;
  const completedCount = recentRegistrations.filter(
    (record) => record.docsDelivered
  ).length;
  const delayedCount = recentRegistrations.filter(
    (record) => isDelayedRecord(record) && !isAbandonedRecord(record)
  ).length;

  return {
    gateLabel,
    plant,
    plants: initialPlants,
    gateOptions: initialGateOptions,
    plantLocked: plantAssigned,
    citas,
    liveTime,
    responsablesList,
    agentesList,
    values: {
      razonSocial,
      empresa,
      type,
      tipoOperacion,
      responsable,
      agente,
      note,
      horaCita,
    },
    duplicateWarning,
    isPending,
    pendingCount,
    attendedCount,
    completedCount,
    abandonedRecords,
    delayedCount,
    recentRegistrations,
    closingIds,
    docsIds,
    deletingIds,
    userRole,
    isKiosk,
    pendingClose,
    pendingDuplicateConfirm,
    editingReg,
    pendingConfirm,
    showToast,
    toastMsg,
    onToggleKiosk: () => setIsKiosk((value) => !value),
    onSubmit: handleSubmit,
    onPlantChange: setPlant,
    onRazonSocialChange: setRazonSocial,
    onEmpresaChange: setEmpresa,
    onTypeChange: setType,
    onTipoOperacionChange: setTipoOperacion,
    onResponsableChange: setResponsable,
    onAgenteChange: setAgente,
    onNoteChange: setNote,
    onVehicleSelect: handleVehicleSelect,
    onToast: showTemporaryToast,
    onRefresh: refreshRegistroPanels,
    onClear: clearForm,
    onRefreshHistory: () => void refreshRecent(plant),
    onClose: handleClose,
    onActivate: handleActivateScheduled,
    onDocs: handleDocs,
    onEdit: setEditingReg,
    onDelete: handleDelete,
    onCloseAbandoned: handleCloseAbandoned,
    onConfirmPendingClose: (motivo: string) =>
      pendingClose ? void doClose(pendingClose.id, motivo) : undefined,
    onCancelPendingClose: () => setPendingClose(null),
    onConfirmDuplicate: () => submitRegistro(true),
    onCancelDuplicate: () => setPendingDuplicateConfirm(null),
    onSaveEdit: handleEditSave,
    onCancelEdit: () => setEditingReg(null),
    onCancelPendingConfirm: () => setPendingConfirm(null),
    onConfirmPendingAction: () => {
      if (!pendingConfirm) return;
      pendingConfirm.action();
      setPendingConfirm(null);
    },
  };
}
