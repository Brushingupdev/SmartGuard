"use client";

import { AlertTriangle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  ConfirmActionModal,
  EditModal,
  MotivoDemoraModal,
  RegistroClientContent,
  Toast,
} from "./RegistroClientUI";
import type { RegistroClientProps } from "./registroClientTypes";
import RegistroImportModal from "./RegistroImportModal";
import { useRegistroClientController } from "./useRegistroClientController";

export default function RegistroClient(props: RegistroClientProps) {
  const controller = useRegistroClientController(props);
  const [showImport, setShowImport] = useState(false);

  return (
    <>
      <RegistroClientContent
        gateLabel={controller.gateLabel}
        plant={controller.plant}
        plants={controller.plants}
        gateOptions={controller.gateOptions}
        plantLocked={controller.plantLocked}
        citas={controller.citas}
        liveTime={controller.liveTime}
        responsablesList={controller.responsablesList}
        agentesList={controller.agentesList}
        values={controller.values}
        duplicateWarning={controller.duplicateWarning}
        isPending={controller.isPending}
        pendingCount={controller.pendingCount}
        attendedCount={controller.attendedCount}
        completedCount={controller.completedCount}
        abandonedRecords={controller.abandonedRecords}
        delayedCount={controller.delayedCount}
        recentRegistrations={controller.recentRegistrations}
        closingIds={controller.closingIds}
        docsIds={controller.docsIds}
        deletingIds={controller.deletingIds}
        userRole={controller.userRole}
        isKiosk={controller.isKiosk}
        onOpenImport={() => setShowImport(true)}
        onToggleKiosk={controller.onToggleKiosk}
        onSubmit={controller.onSubmit}
        onPlantChange={controller.onPlantChange}
        onRazonSocialChange={controller.onRazonSocialChange}
        onEmpresaChange={controller.onEmpresaChange}
        onTypeChange={controller.onTypeChange}
        onTipoOperacionChange={controller.onTipoOperacionChange}
        onResponsableChange={controller.onResponsableChange}
        onAgenteChange={controller.onAgenteChange}
        onNoteChange={controller.onNoteChange}
        onVehicleSelect={controller.onVehicleSelect}
        onToast={controller.onToast}
        onRefresh={controller.onRefresh}
        onClear={controller.onClear}
        onRefreshHistory={controller.onRefreshHistory}
        onClose={controller.onClose}
        onActivate={controller.onActivate}
        onDocs={controller.onDocs}
        onEdit={controller.onEdit}
        onDelete={controller.onDelete}
        onCloseAbandoned={controller.onCloseAbandoned}
      />

      {!controller.isKiosk && controller.userRole !== "guardia" ? (
        <RegistroImportModal
          open={showImport}
          onClose={() => setShowImport(false)}
          currentPlant={controller.plant}
          plants={controller.plants}
          onImported={() => {
            controller.onRefreshHistory();
            controller.onRefresh();
          }}
        />
      ) : null}

      <AnimatePresence>
        {controller.pendingClose && (
          <MotivoDemoraModal
            reg={controller.pendingClose}
            onConfirm={controller.onConfirmPendingClose}
            onCancel={controller.onCancelPendingClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {controller.pendingDuplicateConfirm && (
          <ConfirmActionModal
            title="Posible duplicado"
            message={
              <>
                Ya existe un ingreso pendiente de{" "}
                <strong className="text-[var(--sg-ink)]">
                  {controller.pendingDuplicateConfirm.razonSocial}
                </strong>{" "}
                a las{" "}
                <strong className="text-[var(--sg-ink)]">
                  {controller.pendingDuplicateConfirm.time}
                </strong>
                . Si confirmas, registraremos un segundo ingreso para la misma
                puerta.
              </>
            }
            icon={AlertTriangle}
            accentColor="var(--sg-warn)"
            confirmText="Registrar de todos modos"
            onCancel={controller.onCancelDuplicate}
            onConfirm={controller.onConfirmDuplicate}
          />
        )}
        {controller.editingReg && (
          <EditModal
            reg={controller.editingReg}
            responsablesList={controller.responsablesList}
            agentesList={controller.agentesList}
            onSave={controller.onSaveEdit}
            onCancel={controller.onCancelEdit}
          />
        )}
        {controller.pendingConfirm && (
          <ConfirmActionModal
            title={controller.pendingConfirm.title}
            message={controller.pendingConfirm.message}
            icon={controller.pendingConfirm.icon}
            accentColor={controller.pendingConfirm.color}
            confirmText={controller.pendingConfirm.btnText}
            onCancel={controller.onCancelPendingConfirm}
            onConfirm={controller.onConfirmPendingAction}
          />
        )}
      </AnimatePresence>

      <Toast show={controller.showToast} message={controller.toastMsg} />
    </>
  );
}
