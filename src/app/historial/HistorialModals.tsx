"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Clock,
  FileSpreadsheet,
  FileText,
  Pencil,
  RefreshCw,
  Save,
  Timer,
  Truck,
  Upload,
  User,
  X,
} from "lucide-react";
import {
  PLATFORM_FIELDS,
  type ExcelMapping,
  type ImportedExcelRow,
} from "@/utils/excel-import";
import { formatGateLabelFromPlant } from "@/lib/gates";
import type { ImportPreview } from "../actions/atenciones";
import type {
  EditRecordPayload,
  HistorialRecord,
} from "./historialTypes";
import { getOperationalMetric, getWaitLabel } from "./historialUtils";

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
        {label}
      </span>
      <span
        className={`text-[13px] text-[var(--sg-ink)] ${mono ? "sg-font-mono tracking-[0.08em]" : ""}`}
      >
        {value ?? <span className="text-[var(--sg-muted)]">—</span>}
      </span>
    </div>
  );
}

export function RecordDetailModal({
  record,
  onClose,
}: {
  record: HistorialRecord;
  onClose: () => void;
}) {
  const waitLabel = getWaitLabel(getOperationalMetric(record));

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.78)] px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[12px_12px_0_rgba(196,192,180,0.06)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--sg-line)] bg-[var(--sg-panel)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center bg-[var(--sg-accent)]">
              <FileText className="h-3.5 w-3.5 text-[var(--sg-canvas)]" />
            </div>
            <div>
              <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.14em] text-[var(--sg-ink)]">
                Registro #{record.id}
              </div>
              <div className="sg-font-mono mt-0.5 text-[10px] text-[var(--sg-muted)]">
                {record.fecha} · {formatGateLabelFromPlant(record.planta ?? "")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`sg-badge ${waitLabel.badge}`}>{waitLabel.text}</span>
            <button
              onClick={onClose}
              className="text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5">
          <section className="border border-[var(--sg-line)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-[var(--sg-accent)]" />
              <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
                Vehículo / Empresa
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Razón Social" value={record.razon_social} />
              <Field label="Empresa" value={record.empresa} />
              <Field label="Tipo" value={record.tipo} />
              <Field label="Tipo de operación" value={record.tipo_operacion} />
            </div>
          </section>

          <section className="border border-[var(--sg-line)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-[var(--sg-accent)]" />
              <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
                Tiempos de atención
              </span>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-4">
              <Field label="H. Registro" value={record.h_registro?.substring(0, 5)} mono />
              <Field label="H. Cita" value={record.hora_cita?.substring(0, 5)} mono />
              <Field label="H. Atención" value={record.h_atencion?.substring(0, 5)} mono />
              <Field label="H. Dev. Docs" value={record.h_dev_docs?.substring(0, 5)} mono />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
                  Espera en planta
                </span>
                <span
                  className="sg-font-mono text-[20px] font-bold"
                  style={{ color: waitLabel.color }}
                >
                  {record.espera_min != null ? `${record.espera_min} min` : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
                  Demora sobre cita
                </span>
                <span className="sg-font-mono text-[20px] font-bold text-[var(--sg-ink)]">
                  {record.demora_cita_min != null
                    ? `${record.demora_cita_min} min`
                    : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
                  Tiempo total
                </span>
                <span className="sg-font-mono text-[20px] font-bold text-[var(--sg-ink)]">
                  {record.tiempo_total_min != null
                    ? `${record.tiempo_total_min} min`
                    : "—"}
                </span>
              </div>
              <Field label="Segmento" value={record.segmento_espera} />
            </div>
          </section>

          <section className="border border-[var(--sg-line)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-[var(--sg-accent)]" />
              <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
                Personal
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Responsable de almacén" value={record.responsable} />
              <Field label="Agente responsable" value={record.agente} />
            </div>
          </section>

          {(record.motivo_demora || record.observacion || record.es_demora) ? (
            <section className="border border-[var(--sg-warn)] bg-[rgba(200,168,75,0.04)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Timer className="h-3.5 w-3.5 text-[var(--sg-warn)]" />
                <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-warn)]">
                  Demora / Incidencia
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {record.motivo_demora ? (
                  <Field label="Motivo de demora" value={record.motivo_demora} />
                ) : null}
                {record.observacion ? (
                  <Field label="Observación" value={record.observacion} />
                ) : null}
              </div>
            </section>
          ) : null}

          {record.observacion && !record.motivo_demora && !record.es_demora ? (
            <section className="border border-[var(--sg-line)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-[var(--sg-muted)]" />
                <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
                  Observación
                </span>
              </div>
              <Field label="" value={record.observacion} />
            </section>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--sg-line)] px-5 py-4">
          <div className="sg-font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sg-muted)]">
            Puerta {formatGateLabelFromPlant(record.planta ?? "")} · ID {record.id}
          </div>
          <button onClick={onClose} className="sg-btn sg-btn-ghost sg-btn-sm">
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function EditRecordModal({
  record,
  saving,
  onCancel,
  onSave,
}: {
  record: HistorialRecord;
  saving: boolean;
  onCancel: () => void;
  onSave: (record: HistorialRecord, data: EditRecordPayload) => void;
}) {
  const [razonSocial, setRazonSocial] = useState(record.razon_social ?? "");
  const [empresa, setEmpresa] = useState(record.empresa ?? "");
  const [type, setType] = useState(record.tipo ?? "Proveedor");
  const [tipoOperacion, setTipoOperacion] = useState(
    record.tipo_operacion ?? record.motivo_demora ?? "Ingreso"
  );
  const [responsable, setResponsable] = useState(record.responsable ?? "");
  const [agente, setAgente] = useState(record.agente ?? "");
  const [note, setNote] = useState(record.observacion ?? "");
  const [hAtencion, setHAtencion] = useState(
    record.h_atencion?.substring(0, 5) ?? ""
  );
  const [hDevDocs, setHDevDocs] = useState(
    record.h_dev_docs?.substring(0, 5) ?? ""
  );
  const [horaCita, setHoraCita] = useState(
    record.hora_cita?.substring(0, 5) ?? ""
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(3,5,4,0.78)] px-4 py-8 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        className="w-full max-w-[640px] border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[12px_12px_0_rgba(196,192,180,0.06)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--sg-line)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center bg-[var(--sg-accent)]">
              <Pencil className="h-3.5 w-3.5 text-[var(--sg-canvas)]" />
            </div>
            <div>
              <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.14em] text-[var(--sg-ink)]">
                Editar registro #{record.id}
              </div>
              <div className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                {record.fecha} · {formatGateLabelFromPlant(record.planta ?? "")}
              </div>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="sg-field md:col-span-2">
            <label className="sg-label">Razón social / vehículo *</label>
            <input
              value={razonSocial}
              onChange={(event) => setRazonSocial(event.target.value.toUpperCase())}
              className="sg-input"
            />
          </div>
          <div className="sg-field">
            <label className="sg-label">Empresa destino / cliente *</label>
            <input
              value={empresa}
              onChange={(event) => setEmpresa(event.target.value.toUpperCase())}
              className="sg-input"
            />
          </div>
          <div className="sg-field">
            <label className="sg-label">Tipo *</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="sg-select"
            >
              {["Proveedor", "Propio", "Cliente", "Otro"].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="sg-field">
            <label className="sg-label">Tipo de operación *</label>
            <input
              value={tipoOperacion}
              onChange={(event) => setTipoOperacion(event.target.value)}
              className="sg-input"
            />
          </div>
          <div className="sg-field">
            <label className="sg-label">Responsable</label>
            <input
              value={responsable}
              onChange={(event) => setResponsable(event.target.value)}
              className="sg-input"
            />
          </div>
          <div className="sg-field">
            <label className="sg-label">Agente</label>
            <input
              value={agente}
              onChange={(event) => setAgente(event.target.value)}
              className="sg-input"
            />
          </div>
          <div className="sg-field">
            <label className="sg-label">H. atención</label>
            <input
              type="time"
              value={hAtencion}
              onChange={(event) => setHAtencion(event.target.value)}
              className="sg-input"
            />
          </div>
          <div className="sg-field">
            <label className="sg-label">H. dev. docs</label>
            <input
              type="time"
              value={hDevDocs}
              onChange={(event) => setHDevDocs(event.target.value)}
              className="sg-input"
            />
          </div>
          <div className="sg-field md:col-span-2">
            <label className="sg-label">Hora de cita</label>
            <input
              type="time"
              value={horaCita}
              onChange={(event) => setHoraCita(event.target.value)}
              className="sg-input"
            />
          </div>
          <div className="sg-field md:col-span-2">
            <label className="sg-label">Observación</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="sg-textarea min-h-[80px]"
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-[var(--sg-line)] px-5 py-4">
          <button
            onClick={onCancel}
            className="sg-btn sg-btn-ghost flex-1 justify-center"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              onSave(record, {
                razonSocial,
                empresa,
                type,
                tipoOperacion,
                responsable,
                agente,
                note,
                hAtencion: hAtencion || null,
                hDevDocs: hDevDocs || null,
                horaCita: horaCita || null,
              })
            }
            disabled={saving}
            className="sg-btn sg-btn-accent flex-1 justify-center disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar cambios
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function HistorialImportModal({
  open,
  importParsing,
  importLoading,
  importFileName,
  importValidRows,
  importInvalid,
  importMapping,
  importHeaders,
  importResult,
  importPreview,
  importPreviewLoading,
  onClose,
  onFileChange,
  onMappingChange,
  onImportConfirm,
  onResetFile,
}: {
  open: boolean;
  importParsing: boolean;
  importLoading: boolean;
  importFileName: string | null;
  importValidRows: ImportedExcelRow[];
  importInvalid: number;
  importMapping: ExcelMapping;
  importHeaders: string[];
  importResult: { imported: number } | null;
  importPreview: ImportPreview | null;
  importPreviewLoading: boolean;
  onClose: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onMappingChange: (field: string, col: string | null) => void;
  onImportConfirm: () => void;
  onResetFile: () => void;
}) {
  const importFileRef = useRef<HTMLInputElement>(null);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-5 overflow-y-auto border border-[var(--sg-line)] bg-[var(--sg-panel)] p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-[var(--sg-accent)]" />
                <h2 className="sg-font-display text-[16px] font-bold">
                  Importar datos históricos
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {importResult ? (
              <div className="flex items-center gap-3 border border-[var(--sg-success)] bg-[rgba(107,189,138,0.08)] p-4 text-[var(--sg-success)]">
                <FileSpreadsheet className="h-5 w-5 shrink-0" />
                <p className="text-[13px]">
                  <strong>{importResult.imported.toLocaleString()}</strong>{" "}
                  registros importados correctamente.
                </p>
              </div>
            ) : null}

            {!importFileName && !importResult ? (
              <div>
                <p className="mb-3 text-[12px] text-[var(--sg-muted)]">
                  Sube un archivo <strong>.xlsx</strong> o <strong>.csv</strong>{" "}
                  con registros históricos. Campos requeridos:{" "}
                  <strong>fecha</strong> y <strong>razón social</strong>.
                </p>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={onFileChange}
                  className="hidden"
                  id="import-file-input"
                />
                <label
                  htmlFor="import-file-input"
                  className="flex h-24 cursor-pointer items-center justify-center gap-3 border-2 border-dashed border-[var(--sg-line)] text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
                >
                  {importParsing ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        ease: "linear",
                      }}
                    >
                      <RefreshCw className="h-5 w-5" />
                    </motion.span>
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  <span className="sg-font-mono text-[11px] uppercase tracking-widest">
                    {importParsing
                      ? "Leyendo archivo..."
                      : "Seleccionar archivo Excel o CSV"}
                  </span>
                </label>
              </div>
            ) : null}

            {importFileName && !importResult ? (
              <>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="truncate text-[var(--sg-muted)]">
                    {importFileName}
                  </span>
                  <div className="flex shrink-0 gap-3">
                    <span className="font-bold text-[var(--sg-success)]">
                      {importValidRows.length.toLocaleString()} válidas
                    </span>
                    {importInvalid > 0 ? (
                      <span className="text-[var(--sg-danger)]">
                        {importInvalid} inválidas
                      </span>
                    ) : null}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">
                    Mapeo de columnas
                  </p>
                  <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {PLATFORM_FIELDS.map((field) => (
                      <div key={field.key} className="flex items-center gap-2">
                        <span
                          className={`w-36 shrink-0 text-[11px] ${field.required ? "text-[var(--sg-ink)]" : "text-[var(--sg-muted)]"}`}
                        >
                          {field.label}
                          {field.required ? (
                            <span className="ml-0.5 text-[var(--sg-danger)]">*</span>
                          ) : null}
                        </span>
                        <select
                          value={importMapping[field.key] ?? ""}
                          onChange={(event) =>
                            onMappingChange(field.key, event.target.value || null)
                          }
                          className="sg-select min-w-0 flex-1 text-[11px]"
                        >
                          <option value="">— sin mapear —</option>
                          {importHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {importPreviewLoading ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-[var(--sg-muted)]">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        ease: "linear",
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </motion.span>
                    <span className="sg-font-mono text-[10px] uppercase tracking-widest">
                      Analizando datos...
                    </span>
                  </div>
                ) : null}

                {importPreview && !importPreviewLoading ? (
                  <div className="flex flex-col gap-3 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4">
                    <p className="sg-font-mono mb-1 text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                      Resumen antes de importar
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="sg-font-mono text-[18px] font-bold text-[var(--sg-ink)]">
                          {importPreview.validCount}
                        </span>
                        <span className="text-[10px] text-[var(--sg-muted)]">
                          filas válidas
                        </span>
                      </div>
                      {importPreview.duplicateCount > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="sg-font-mono text-[18px] font-bold text-[var(--sg-warn)]">
                            {importPreview.duplicateCount}
                          </span>
                          <span className="text-[10px] text-[var(--sg-warn)]">
                            duplicados
                          </span>
                        </div>
                      ) : null}
                      {importPreview.newResponsables.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="sg-font-mono text-[18px] font-bold text-[var(--sg-accent)]">
                            {importPreview.newResponsables.length}
                          </span>
                          <span className="text-[10px] text-[var(--sg-accent)]">
                            responsables nuevos
                          </span>
                        </div>
                      ) : null}
                      {importPreview.newAgentes.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="sg-font-mono text-[18px] font-bold text-[var(--sg-accent)]">
                            {importPreview.newAgentes.length}
                          </span>
                          <span className="text-[10px] text-[var(--sg-accent)]">
                            agentes nuevos
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {importPreview.invalidPlants.length > 0 ? (
                      <div className="border-l-2 border-[var(--sg-danger)] bg-[rgba(211,92,79,0.06)] px-3 py-2">
                        <p className="mb-1 text-[11px] font-semibold text-[var(--sg-danger)]">
                          ⚠ Plantas no registradas ({importPreview.invalidPlants.length})
                        </p>
                        <p className="mb-1 text-[10px] text-[var(--sg-muted)]">
                          Sedes configuradas:{" "}
                          {importPreview.companyPlants.join(", ") || "Ninguna"}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {importPreview.invalidPlants.map((plant) => (
                            <span
                              key={plant}
                              className="sg-font-mono px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-[var(--sg-danger)] border border-[var(--sg-danger)]"
                            >
                              {plant}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {importPreview.newResponsables.length > 0 ? (
                      <div>
                        <p className="mb-1 text-[10px] text-[var(--sg-muted)]">
                          Responsables que se agregarán automáticamente:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {importPreview.newResponsables.map((responsable) => (
                            <span
                              key={responsable}
                              className="sg-font-mono px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-[var(--sg-accent)] border border-[var(--sg-accent)]"
                            >
                              {responsable}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {importPreview.newAgentes.length > 0 ? (
                      <div>
                        <p className="mb-1 text-[10px] text-[var(--sg-muted)]">
                          Agentes que se agregarán automáticamente:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {importPreview.newAgentes.map((agente) => (
                            <span
                              key={agente}
                              className="sg-font-mono px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-[var(--sg-accent)] border border-[var(--sg-accent)]"
                            >
                              {agente}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex gap-3 border-t border-[var(--sg-line)] pt-2">
                  <button
                    onClick={onResetFile}
                    className="sg-btn sg-btn-ghost sg-btn-sm flex-1"
                  >
                    Cambiar archivo
                  </button>
                  <button
                    onClick={onImportConfirm}
                    disabled={
                      importValidRows.length === 0 ||
                      importLoading ||
                      importPreviewLoading ||
                      (importPreview ? importPreview.invalidPlants.length > 0 : false)
                    }
                    className="sg-btn sg-btn-sm flex flex-1 items-center justify-center gap-2 bg-[var(--sg-accent)] text-[var(--sg-canvas)] disabled:opacity-40"
                  >
                    {importLoading ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.8,
                          ease: "linear",
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </motion.span>
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Importar{" "}
                    {importValidRows.length > 0
                      ? `${importValidRows.length.toLocaleString()} registros`
                      : ""}
                  </button>
                </div>
              </>
            ) : null}

            {importResult ? (
              <button
                onClick={onClose}
                className="sg-btn sg-btn-ghost sg-btn-sm w-full"
              >
                Cerrar
              </button>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
