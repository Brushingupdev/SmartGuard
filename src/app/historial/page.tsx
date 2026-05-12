"use client";

import AppLayout from "@/components/AppLayout";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Pencil,
  RefreshCw,
  Search,
  Save,
  Timer,
  Truck,
  Upload,
  User,
  X,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { getAtenciones, getAtencionesForExport, getHistorialStats, getUserPlants, getUserProfile, getCompaniesMap, getCompanies } from "../actions";
import { importAtenciones, updateAtencion, previewImportAtenciones, type ImportPreview } from "../actions/atenciones";
import { prepareExcelImport, processRows, PLATFORM_FIELDS, type ExcelRow, type ExcelMapping } from "@/utils/excel-import";
import { formatGateLabelFromPlant } from "@/lib/gates";

const fmt = new Intl.NumberFormat("en-US");

interface HistorialRecord {
  id: number;
  fecha: string | null;
  h_registro: string | null;
  h_atencion: string | null;
  h_dev_docs: string | null;
  razon_social: string | null;
  empresa: string | null;
  company_id: string | null;
  planta: string | null;
  tipo: string | null;
  tipo_operacion: string | null;
  hora_cita?: string | null;
  motivo_demora: string | null;
  espera_min: number | null;
  demora_cita_min?: number | null;
  tiempo_total_min: number | null;
  segmento_espera: string | null;
  responsable: string | null;
  agente: string | null;
  observacion: string | null;
  es_demora: number | boolean | null;
}

function getOperationalMetric(record: Pick<HistorialRecord, "demora_cita_min" | "espera_min">): number | null {
  return record.demora_cita_min ?? record.espera_min ?? null;
}

function getWaitLabel(wait: number | null) {
  if (wait == null) return { text: "Pendiente", badge: "sg-badge-muted", color: "var(--sg-muted)" };
  if (wait >= 90) return { text: "Crítico",  badge: "sg-badge-deny", color: "var(--sg-danger)" };
  if (wait >= 45) return { text: "Alto",     badge: "sg-badge-warn", color: "#e07b3a" };
  if (wait >= 30) return { text: "Moderado", badge: "sg-badge-info", color: "var(--sg-info)" };
  return           { text: "Normal",  badge: "sg-badge-ok",   color: "var(--sg-success)" };
}

function exportCSV(rows: HistorialRecord[]) {
  const headers = ["ID", "Fecha", "H.Registro", "H.Atencion", "H.Dev.Docs", "Razon_Social", "Empresa", "Puerta", "Tipo", "Tipo_Operacion", "Motivo_Demora", "Espera_Planta_Min", "Demora_Cita_Min", "Tiempo_Total_Min", "Segmento", "Responsable", "Agente", "Observacion"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.id, r.fecha, r.h_registro ?? "", r.h_atencion ?? "", r.h_dev_docs ?? "",
      `"${(r.razon_social ?? "").replace(/"/g, '""')}"`,
      `"${(r.empresa ?? "").replace(/"/g, '""')}"`,
      formatGateLabelFromPlant(r.planta ?? ""), r.tipo ?? "", r.tipo_operacion ?? "", r.motivo_demora ?? "",
      r.espera_min ?? "", r.demora_cita_min ?? "", r.tiempo_total_min ?? "", r.segmento_espera ?? "",
      r.responsable ?? "", r.agente ?? "",
      `"${(r.observacion ?? "").replace(/"/g, '""')}"`,
    ].join(","));
  }
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `historial_smartguard_${new Date().toLocaleDateString("en-CA")}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Detail Modal ───────────────────────────────────────────────────────────

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">{label}</span>
      <span className={`text-[13px] text-[var(--sg-ink)] ${mono ? "sg-font-mono tracking-[0.08em]" : ""}`}>
        {value ?? <span className="text-[var(--sg-muted)]">—</span>}
      </span>
    </div>
  );
}

function RecordDetailModal({ record, onClose }: { record: HistorialRecord; onClose: () => void }) {
  const wl = getWaitLabel(getOperationalMetric(record));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.78)] backdrop-blur-sm px-4 py-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[640px] border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[12px_12px_0_rgba(196,192,180,0.06)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--sg-line)] px-5 py-4 sticky top-0 bg-[var(--sg-panel)] z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center bg-[var(--sg-accent)]">
              <FileText className="h-3.5 w-3.5 text-[var(--sg-canvas)]" />
            </div>
            <div>
              <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.14em] text-[var(--sg-ink)]">
                Registro #{record.id}
              </div>
              <div className="sg-font-mono text-[10px] text-[var(--sg-muted)] mt-0.5">
                {record.fecha} · {formatGateLabelFromPlant(record.planta ?? "")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`sg-badge ${wl.badge}`}>{wl.text}</span>
            <button
              onClick={onClose}
              className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-5">

          {/* Empresa / Razón social */}
          <section className="border border-[var(--sg-line)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-3.5 w-3.5 text-[var(--sg-accent)]" />
              <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Vehículo / Empresa</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Razón Social" value={record.razon_social} />
              <Field label="Empresa" value={record.empresa} />
              <Field label="Tipo" value={record.tipo} />
              <Field label="Tipo de operación" value={record.tipo_operacion} />
            </div>
          </section>

          {/* Tiempos */}
          <section className="border border-[var(--sg-line)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-3.5 w-3.5 text-[var(--sg-accent)]" />
              <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Tiempos de atención</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Field label="H. Registro" value={record.h_registro?.substring(0, 5)} mono />
              <Field label="H. Cita" value={record.hora_cita?.substring(0, 5)} mono />
              <Field label="H. Atención" value={record.h_atencion?.substring(0, 5)} mono />
              <Field label="H. Dev. Docs" value={record.h_dev_docs?.substring(0, 5)} mono />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Espera en planta</span>
                <span className="sg-font-mono text-[20px] font-bold" style={{ color: wl.color }}>
                  {record.espera_min != null ? `${record.espera_min} min` : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Demora sobre cita</span>
                <span className="sg-font-mono text-[20px] font-bold text-[var(--sg-ink)]">
                  {record.demora_cita_min != null ? `${record.demora_cita_min} min` : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Tiempo total</span>
                <span className="sg-font-mono text-[20px] font-bold text-[var(--sg-ink)]">
                  {record.tiempo_total_min != null ? `${record.tiempo_total_min} min` : "—"}
                </span>
              </div>
              <Field label="Segmento" value={record.segmento_espera} />
            </div>
          </section>

          {/* Personal */}
          <section className="border border-[var(--sg-line)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-3.5 w-3.5 text-[var(--sg-accent)]" />
              <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Personal</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Responsable de almacén" value={record.responsable} />
              <Field label="Agente responsable" value={record.agente} />
            </div>
          </section>

          {/* Demora / Observación */}
          {(record.motivo_demora || record.observacion || record.es_demora) && (
            <section className="border border-[var(--sg-warn)] bg-[rgba(200,168,75,0.04)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Timer className="h-3.5 w-3.5 text-[var(--sg-warn)]" />
                <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-warn)]">Demora / Incidencia</span>
              </div>
              <div className="flex flex-col gap-3">
                {record.motivo_demora && <Field label="Motivo de demora" value={record.motivo_demora} />}
                {record.observacion   && <Field label="Observación" value={record.observacion} />}
              </div>
            </section>
          )}

          {/* Observación sin demora */}
          {record.observacion && !record.motivo_demora && !record.es_demora && (
            <section className="border border-[var(--sg-line)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-3.5 w-3.5 text-[var(--sg-muted)]" />
                <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Observación</span>
              </div>
              <Field label="" value={record.observacion} />
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-[var(--sg-line)] px-5 py-4 flex items-center justify-between">
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

function EditRecordModal({
  record,
  saving,
  onCancel,
  onSave,
}: {
  record: HistorialRecord;
  saving: boolean;
  onCancel: () => void;
  onSave: (record: HistorialRecord, data: {
    razonSocial: string;
    empresa: string;
    type: string;
    tipoOperacion: string;
    responsable: string;
    agente: string;
    note: string;
    hAtencion: string | null;
    hDevDocs: string | null;
    horaCita: string | null;
  }) => void;
}) {
  const [razonSocial, setRazonSocial] = useState(record.razon_social ?? "");
  const [empresa, setEmpresa] = useState(record.empresa ?? "");
  const [type, setType] = useState(record.tipo ?? "Proveedor");
  const [tipoOperacion, setTipoOperacion] = useState(record.tipo_operacion ?? record.motivo_demora ?? "Ingreso");
  const [responsable, setResponsable] = useState(record.responsable ?? "");
  const [agente, setAgente] = useState(record.agente ?? "");
  const [note, setNote] = useState(record.observacion ?? "");
  const [hAtencion, setHAtencion] = useState(record.h_atencion?.substring(0, 5) ?? "");
  const [hDevDocs, setHDevDocs] = useState(record.h_dev_docs?.substring(0, 5) ?? "");
  const [horaCita, setHoraCita] = useState(record.hora_cita?.substring(0, 5) ?? "");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
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
        onClick={e => e.stopPropagation()}
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
          <button onClick={onCancel} className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="sg-field md:col-span-2">
            <label className="sg-label">Razón social / vehículo *</label>
            <input value={razonSocial} onChange={e => setRazonSocial(e.target.value.toUpperCase())} className="sg-input" />
          </div>
          <div className="sg-field">
            <label className="sg-label">Empresa destino / cliente *</label>
            <input value={empresa} onChange={e => setEmpresa(e.target.value.toUpperCase())} className="sg-input" />
          </div>
          <div className="sg-field">
            <label className="sg-label">Tipo *</label>
            <select value={type} onChange={e => setType(e.target.value)} className="sg-select">
              {["Proveedor", "Propio", "Cliente", "Otro"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="sg-field">
            <label className="sg-label">Tipo de operación *</label>
            <input value={tipoOperacion} onChange={e => setTipoOperacion(e.target.value)} className="sg-input" />
          </div>
          <div className="sg-field">
            <label className="sg-label">Responsable</label>
            <input value={responsable} onChange={e => setResponsable(e.target.value)} className="sg-input" />
          </div>
          <div className="sg-field">
            <label className="sg-label">Agente</label>
            <input value={agente} onChange={e => setAgente(e.target.value)} className="sg-input" />
          </div>
          <div className="sg-field">
            <label className="sg-label">H. atención</label>
            <input type="time" value={hAtencion} onChange={e => setHAtencion(e.target.value)} className="sg-input" />
          </div>
          <div className="sg-field">
            <label className="sg-label">H. dev. docs</label>
            <input type="time" value={hDevDocs} onChange={e => setHDevDocs(e.target.value)} className="sg-input" />
          </div>
          <div className="sg-field md:col-span-2">
            <label className="sg-label">Hora de cita</label>
            <input type="time" value={horaCita} onChange={e => setHoraCita(e.target.value)} className="sg-input" />
          </div>
          <div className="sg-field md:col-span-2">
            <label className="sg-label">Observación</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="sg-textarea min-h-[80px]" />
          </div>
        </div>

        <div className="flex gap-3 border-t border-[var(--sg-line)] px-5 py-4">
          <button onClick={onCancel} className="sg-btn sg-btn-ghost flex-1 justify-center">
            Cancelar
          </button>
          <button
            onClick={() => onSave(record, {
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
            })}
            disabled={saving}
            className="sg-btn sg-btn-accent flex-1 justify-center disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HistorialPage() {
  // Admin
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [userRole,      setUserRole]      = useState<string | null>(null);
  const [companiesMap,  setCompaniesMap]  = useState<Record<string, string>>({});
  const [companiesList, setCompaniesList] = useState<{ id: string; name: string }[]>([]);
  const [filterCompany, setFilterCompany] = useState("");

  // Filters
  const [search, setSearch]     = useState("");
  const [plant, setPlant]       = useState("Todos");
  const [plants, setPlants]     = useState<string[]>([]);
  const [segment, setSegment]   = useState("Todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage]         = useState(1);
  const perPage = 12;

  // Data
  const [records, setRecords]   = useState<HistorialRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);

  // Stats
  const [stats, setStats] = useState<{ total: number; avg: number; max: number; plants: number } | null>(null);

  // Sort — "id" | "espera_min" | "fecha"
  const [sortBy,  setSortBy]  = useState<"id" | "espera_min" | "fecha">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Detail modal
  const [selectedRecord, setSelectedRecord] = useState<HistorialRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<HistorialRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Import modal
  const [showImport,      setShowImport]      = useState(false);
  const [importParsing,   setImportParsing]   = useState(false);
  const [importLoading,   setImportLoading]   = useState(false);
  const [importFileName,  setImportFileName]  = useState<string | null>(null);
  const [importValidRows, setImportValidRows] = useState<import("@/utils/excel-import").ImportedExcelRow[]>([]);
  const [importInvalid,   setImportInvalid]   = useState(0);
  const [importMapping,   setImportMapping]   = useState<ExcelMapping>({});
  const [importHeaders,   setImportHeaders]   = useState<string[]>([]);
  const [importRawRows,   setImportRawRows]   = useState<ExcelRow[]>([]);
  const [importResult,    setImportResult]    = useState<{ imported: number } | null>(null);
  const [importPreview,   setImportPreview]   = useState<ImportPreview | null>(null);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const activeFilters = [plant !== "Todos", segment !== "Todos", !!dateFrom, !!dateTo].filter(Boolean).length;

  const toggleSortFecha = () => {
    if (sortBy !== "fecha") { setSortBy("fecha"); setSortDir("desc"); }
    else if (sortDir === "desc") { setSortDir("asc"); }
    else { setSortBy("id"); setSortDir("desc"); }
    setPage(1);
  };

  const toggleSortEspera = () => {
    if (sortBy !== "espera_min") { setSortBy("espera_min"); setSortDir("desc"); }
    else if (sortDir === "desc") { setSortDir("asc"); }
    else { setSortBy("id"); setSortDir("desc"); }
    setPage(1);
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await getAtenciones({
        page, search, perPage, plant, segment, dateFrom, dateTo,
        sortBy,
        sortDir,
        filterCompanyId: filterCompany,
      });
      setRecords(data || []);
      if (count !== null) setTotalCount(count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, plant, segment, dateFrom, dateTo, sortBy, sortDir, filterCompany]);

  useEffect(() => {
    getHistorialStats().then(setStats);
    getUserPlants().then(setPlants);
    getUserProfile().then(p => {
      setUserRole(p?.role ?? null);
      if (p?.isAdmin) {
        setIsAdmin(true);
        getCompaniesMap().then(setCompaniesMap);
        getCompanies().then(list => setCompaniesList(list as { id: string; name: string }[]));
      }
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchRecords, 280);
    return () => clearTimeout(t);
  }, [fetchRecords]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  const resetFilters = () => {
    setPlant("Todos"); setSegment("Todos"); setDateFrom(""); setDateTo(""); setSearch(""); setPage(1);
    setSortBy("id"); setSortDir("desc"); setFilterCompany("");
  };

  const handleExport = async () => {
    setExporting(true);
    const rows = await getAtencionesForExport(
      search, plant, segment, dateFrom, dateTo,
      sortBy,
      sortDir,
    );
    exportCSV(rows);
    setExporting(false);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportParsing(true);
    setImportResult(null);
    setImportPreview(null);
    try {
      const XLSX = await import("@e965/xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: false });

      // Leer todas las hojas y dejar que prepareExcelImport elija la correcta
      // (maneja columnas vacías al inicio y selecciona la hoja con datos reales)
      const sheets = wb.SheetNames.map(name => ({
        name,
        rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null }) as ExcelRow[],
      }));
      const prepared = prepareExcelImport(sheets, file.name);
      if (!prepared || prepared.headers.length === 0) {
        alert("No se encontró una hoja con datos válidos. Verifica que el Excel tenga columnas Fecha y Razón Social.");
        setImportParsing(false);
        return;
      }
      setImportFileName(file.name);
      setImportHeaders(prepared.headers);
      setImportRawRows(prepared.rows);
      setImportMapping(prepared.mapping);
      setImportValidRows(prepared.valid);
      setImportInvalid(prepared.invalid);

      // Generar preview automáticamente
      if (prepared.valid.length > 0) {
        setImportPreviewLoading(true);
        const previewResult = await previewImportAtenciones(prepared.valid);
        setImportPreviewLoading(false);
        if (previewResult.preview) {
          setImportPreview(previewResult.preview);
        }
      }
    } catch { alert("No se pudo leer el archivo. Asegúrate de que sea un Excel o CSV válido."); }
    setImportParsing(false);
    if (importFileRef.current) importFileRef.current.value = "";
  };

  const handleMappingChange = (field: string, col: string | null) => {
    const newMapping = { ...importMapping, [field]: col };
    setImportMapping(newMapping);
    const { valid, invalid } = processRows(importRawRows, importHeaders, newMapping);
    setImportValidRows(valid);
    setImportInvalid(invalid);
  };

  const handleImportConfirm = async () => {
    if (!importValidRows.length) return;
    setImportLoading(true);
    const result = await importAtenciones(importValidRows);
    setImportLoading(false);
    if (result.success) {
      setImportResult({ imported: result.imported });
      setImportValidRows([]);
      setImportFileName(null);
      void fetchRecords();
    } else {
      alert(result.error ?? "Error al importar");
    }
  };

  const canEditRecords = Boolean(userRole && userRole !== "guardia");

  const handleEditSave = async (
    record: HistorialRecord,
    data: {
      razonSocial: string;
      empresa: string;
      type: string;
      tipoOperacion: string;
      responsable: string;
      agente: string;
      note: string;
      hAtencion: string | null;
      hDevDocs: string | null;
      horaCita: string | null;
    }
  ) => {
    setSavingEdit(true);
    const result = await updateAtencion(record.id, data);
    setSavingEdit(false);
    if (!result.success) {
      alert(result.error ?? "No se pudo actualizar el registro");
      return;
    }
    setEditingRecord(null);
    setSelectedRecord(null);
    void fetchRecords();
  };

  const closeImport = () => {
    setShowImport(false);
    setImportFileName(null);
    setImportValidRows([]);
    setImportInvalid(0);
    setImportResult(null);
    setImportPreview(null);
    setImportPreviewLoading(false);
  };

  return (
    <AppLayout>
      <AnimatePresence>
        {selectedRecord && (
          <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
        )}
        {editingRecord && (
          <EditRecordModal
            record={editingRecord}
            saving={savingEdit}
            onCancel={() => setEditingRecord(null)}
            onSave={handleEditSave}
          />
        )}
      </AnimatePresence>

      {/* ── Modal de importación Excel ─────────────────────────────────────── */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={e => { if (e.target === e.currentTarget) closeImport(); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[var(--sg-panel)] border border-[var(--sg-line)] p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-[var(--sg-accent)]" />
                  <h2 className="sg-font-display text-[16px] font-bold">Importar datos históricos</h2>
                </div>
                <button onClick={closeImport} className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Resultado exitoso */}
              {importResult && (
                <div className="flex items-center gap-3 p-4 border border-[var(--sg-success)] bg-[rgba(107,189,138,0.08)] text-[var(--sg-success)]">
                  <FileSpreadsheet className="h-5 w-5 shrink-0" />
                  <p className="text-[13px]"><strong>{importResult.imported.toLocaleString()}</strong> registros importados correctamente.</p>
                </div>
              )}

              {/* Upload */}
              {!importFileName && !importResult && (
                <div>
                  <p className="text-[12px] text-[var(--sg-muted)] mb-3">
                    Sube un archivo <strong>.xlsx</strong> o <strong>.csv</strong> con registros históricos.
                    Campos requeridos: <strong>fecha</strong> y <strong>razón social</strong>.
                  </p>
                  <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" id="import-file-input" />
                  <label
                    htmlFor="import-file-input"
                    className="flex items-center justify-center gap-3 h-24 border-2 border-dashed border-[var(--sg-line)] hover:border-[var(--sg-accent)] cursor-pointer transition-colors text-[var(--sg-muted)] hover:text-[var(--sg-accent)]"
                  >
                    {importParsing
                      ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}><RefreshCw className="h-5 w-5" /></motion.span>
                      : <Upload className="h-5 w-5" />}
                    <span className="sg-font-mono text-[11px] uppercase tracking-widest">
                      {importParsing ? "Leyendo archivo..." : "Seleccionar archivo Excel o CSV"}
                    </span>
                  </label>
                </div>
              )}

              {/* Preview y mapeo */}
              {importFileName && !importResult && (
                <>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[var(--sg-muted)] truncate">{importFileName}</span>
                    <div className="flex gap-3 shrink-0">
                      <span className="text-[var(--sg-success)] font-bold">{importValidRows.length.toLocaleString()} válidas</span>
                      {importInvalid > 0 && <span className="text-[var(--sg-danger)]">{importInvalid} inválidas</span>}
                    </div>
                  </div>

                  {/* Mapeo de columnas */}
                  <div>
                    <p className="text-[11px] text-[var(--sg-muted)] uppercase tracking-widest mb-2">Mapeo de columnas</p>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {PLATFORM_FIELDS.map(f => (
                        <div key={f.key} className="flex items-center gap-2">
                          <span className={`text-[11px] w-36 shrink-0 ${f.required ? "text-[var(--sg-ink)]" : "text-[var(--sg-muted)]"}`}>
                            {f.label}{f.required && <span className="text-[var(--sg-danger)] ml-0.5">*</span>}
                          </span>
                          <select
                            value={importMapping[f.key] ?? ""}
                            onChange={e => handleMappingChange(f.key, e.target.value || null)}
                            className="sg-select text-[11px] flex-1 min-w-0"
                          >
                            <option value="">— sin mapear —</option>
                            {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preview de importación */}
                  {importPreviewLoading && (
                    <div className="flex items-center justify-center gap-2 py-4 text-[var(--sg-muted)]">
                      <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                        <RefreshCw className="h-4 w-4" />
                      </motion.span>
                      <span className="sg-font-mono text-[10px] uppercase tracking-widest">Analizando datos...</span>
                    </div>
                  )}

                  {importPreview && !importPreviewLoading && (
                    <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4 flex flex-col gap-3">
                      <p className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] mb-1">Resumen antes de importar</p>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="sg-font-mono text-[18px] font-bold text-[var(--sg-ink)]">{importPreview.validCount}</span>
                          <span className="text-[10px] text-[var(--sg-muted)]">filas válidas</span>
                        </div>
                        {importPreview.duplicateCount > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="sg-font-mono text-[18px] font-bold text-[var(--sg-warn)]">{importPreview.duplicateCount}</span>
                            <span className="text-[10px] text-[var(--sg-warn)]">duplicados</span>
                          </div>
                        )}
                        {importPreview.newResponsables.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="sg-font-mono text-[18px] font-bold text-[var(--sg-accent)]">{importPreview.newResponsables.length}</span>
                            <span className="text-[10px] text-[var(--sg-accent)]">responsables nuevos</span>
                          </div>
                        )}
                        {importPreview.newAgentes.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="sg-font-mono text-[18px] font-bold text-[var(--sg-accent)]">{importPreview.newAgentes.length}</span>
                            <span className="text-[10px] text-[var(--sg-accent)]">agentes nuevos</span>
                          </div>
                        )}
                      </div>

                      {/* Plantas inválidas */}
                      {importPreview.invalidPlants.length > 0 && (
                        <div className="border-l-2 border-[var(--sg-danger)] bg-[rgba(211,92,79,0.06)] px-3 py-2">
                          <p className="text-[11px] text-[var(--sg-danger)] font-semibold mb-1">
                            ⚠ Plantas no registradas ({importPreview.invalidPlants.length})
                          </p>
                          <p className="text-[10px] text-[var(--sg-muted)] mb-1">
                            Sedes configuradas: {importPreview.companyPlants.join(", ") || "Ninguna"}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {importPreview.invalidPlants.map(p => (
                              <span key={p} className="sg-font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-[var(--sg-danger)] text-[var(--sg-danger)]">{p}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Responsables nuevos */}
                      {importPreview.newResponsables.length > 0 && (
                        <div>
                          <p className="text-[10px] text-[var(--sg-muted)] mb-1">Responsables que se agregarán automáticamente:</p>
                          <div className="flex flex-wrap gap-1">
                            {importPreview.newResponsables.map(r => (
                              <span key={r} className="sg-font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-[var(--sg-accent)] text-[var(--sg-accent)]">{r}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Agentes nuevos */}
                      {importPreview.newAgentes.length > 0 && (
                        <div>
                          <p className="text-[10px] text-[var(--sg-muted)] mb-1">Agentes que se agregarán automáticamente:</p>
                          <div className="flex flex-wrap gap-1">
                            {importPreview.newAgentes.map(a => (
                              <span key={a} className="sg-font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-[var(--sg-accent)] text-[var(--sg-accent)]">{a}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-3 pt-2 border-t border-[var(--sg-line)]">
                    <button
                      onClick={() => { setImportFileName(null); setImportValidRows([]); setImportInvalid(0); setImportPreview(null); }}
                      className="sg-btn sg-btn-ghost sg-btn-sm flex-1"
                    >
                      Cambiar archivo
                    </button>
                    <button
                      onClick={handleImportConfirm}
                      disabled={importValidRows.length === 0 || importLoading || importPreviewLoading || (importPreview ? importPreview.invalidPlants.length > 0 : false)}
                      className="sg-btn sg-btn-sm flex-1 flex items-center justify-center gap-2 bg-[var(--sg-accent)] text-[var(--sg-canvas)] disabled:opacity-40"
                    >
                      {importLoading
                        ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}><RefreshCw className="h-3.5 w-3.5" /></motion.span>
                        : <Upload className="h-3.5 w-3.5" />}
                      Importar {importValidRows.length > 0 && `${importValidRows.length.toLocaleString()} registros`}
                    </button>
                  </div>
                </>
              )}

              {importResult && (
                <button onClick={closeImport} className="sg-btn sg-btn-ghost sg-btn-sm w-full">Cerrar</button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-5">
        <div className="flex items-center gap-4">
          <div className="sg-kicker">Historial</div>
          <span className="sg-live-pill">
            <span className="sg-live-dot sg-pulse" />
            Trazabilidad
          </span>
        </div>
        <div className="sg-mono text-[11px] text-[var(--sg-muted)] tracking-[0.12em]">
          {stats ? fmt.format(stats.total) : "—"} eventos históricos
        </div>
      </div>

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-2 gap-0 border border-[var(--sg-line)] md:grid-cols-4">
        {[
          { label: "Eventos disponibles",  val: stats ? fmt.format(stats.total) : "—",   suffix: "" },
          { label: "Demora promedio",       val: stats ? stats.avg.toString() : "—",       suffix: " min" },
          { label: "Puertas monitoreadas", val: stats ? stats.plants.toString() : "—",    suffix: "" },
          { label: "Demora máxima",         val: stats ? fmt.format(stats.max) : "—",      suffix: " min" },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`sg-stat ${i < 2 ? "border-b border-[var(--sg-line)] md:border-b-0" : ""} ${i === 0 || i === 2 ? "border-r border-[var(--sg-line)]" : ""}`}
          >
            <div>
              <span className="sg-stat-num" style={{ fontSize: 32 }}>{s.val}</span>
              <span className="sg-stat-suffix" style={{ fontSize: 20 }}>{s.suffix}</span>
            </div>
            <div className="sg-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar + Table */}
      <section className="sg-panel overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-[var(--sg-line)] px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 min-w-[200px] items-center gap-2 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 lg:max-w-[360px]">
              <Search className="h-4 w-4 shrink-0 text-[var(--sg-muted)]" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Razón Social o Empresa..."
                className="h-10 w-full bg-transparent text-[13px] text-[var(--sg-ink)] outline-none placeholder:text-[var(--sg-muted)]"
              />
              {search && (
                <button onClick={() => { setSearch(""); setPage(1); }} className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`sg-btn sg-btn-ghost sg-btn-sm flex items-center gap-2 ${activeFilters ? "border-[var(--sg-accent)] text-[var(--sg-accent)]" : ""}`}
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                Filtros {activeFilters > 0 && <span className="ml-1 h-4 w-4 rounded-full bg-[var(--sg-accent)] text-[var(--sg-canvas)] text-[9px] flex items-center justify-center font-bold">{activeFilters}</span>}
              </button>

              {activeFilters > 0 && (
                <button onClick={resetFilters} className="sg-btn sg-btn-ghost sg-btn-sm flex items-center gap-1.5 text-[var(--sg-muted)] hover:text-[var(--sg-danger)]">
                  <X className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              )}

              <button
                onClick={() => setShowImport(true)}
                className="sg-btn sg-btn-ghost sg-btn-sm flex items-center gap-2"
              >
                <Upload className="h-3.5 w-3.5" />
                Importar Excel
              </button>

              <button
                onClick={handleExport}
                disabled={exporting || loading}
                className="sg-btn sg-btn-ghost sg-btn-sm flex items-center gap-2"
              >
                {exporting ? (
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </motion.span>
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Exportar CSV
              </button>
            </div>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--sg-line)] lg:grid-cols-4"
            >
              {isAdmin && (
                <div className="sg-field col-span-2 lg:col-span-1">
                  <label className="sg-label">Empresa cliente</label>
                  <div className="relative">
                    <select value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setPage(1); }} className="sg-select appearance-none pr-8">
                      <option value="">Todas las empresas</option>
                      {companiesList.map(c => <option key={c.id} value={c.id} className="bg-[var(--sg-panel-2)]">{c.name}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                  </div>
                </div>
              )}
              <div className="sg-field">
                <label className="sg-label">Puerta</label>
                <div className="relative">
                  <select value={plant} onChange={e => { setPlant(e.target.value); setPage(1); }} className="sg-select appearance-none pr-8">
                    {["Todos", ...plants].map(p => <option key={p} value={p} className="bg-[var(--sg-panel-2)]">{p}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                </div>
              </div>

              <div className="sg-field">
                <label className="sg-label">Estado / Segmento</label>
                <div className="relative">
                  <select value={segment} onChange={e => { setSegment(e.target.value); setPage(1); }} className="sg-select appearance-none pr-8">
                    {["Todos", "Pendiente", "Normal", "Moderado", "Alto", "Crítico"].map(s => <option key={s} value={s} className="bg-[var(--sg-panel-2)]">{s}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                </div>
              </div>

              <div className="sg-field">
                <label className="sg-label">Desde</label>
                <input type="date" value={dateFrom} max={new Date().toISOString().split("T")[0]} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="sg-input" style={{ colorScheme: "dark" }} />
              </div>

              <div className="sg-field">
                <label className="sg-label">Hasta</label>
                <input type="date" value={dateTo} max={new Date().toISOString().split("T")[0]} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="sg-input" style={{ colorScheme: "dark" }} />
              </div>
            </motion.div>
          )}
        </div>

        {/* Table */}
        <div className="relative overflow-x-auto min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--sg-panel)]/50 backdrop-blur-sm">
              <div className="flex items-center gap-3 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-3 shadow-lg">
                <span className="sg-live-dot sg-pulse" />
                <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)]">Cargando...</span>
              </div>
            </div>
          )}
          <table className="sg-table min-w-[1200px]">
            <thead>
              <tr>
                <th>ID</th>
                <th>
                  <button
                    onClick={toggleSortFecha}
                    className="inline-flex items-center gap-1.5 hover:text-[var(--sg-ink)] transition-colors"
                    title={sortBy !== "fecha" ? "Ordenar por fecha ↓" : sortDir === "desc" ? "Ordenar por fecha ↑" : "Quitar orden"}
                  >
                    Fecha
                    {sortBy !== "fecha"
                      ? <ArrowUpDown className="h-3 w-3 text-[var(--sg-muted)]" />
                      : sortDir === "desc"
                        ? <ArrowDown className="h-3 w-3 text-[var(--sg-accent)]" />
                        : <ArrowUp   className="h-3 w-3 text-[var(--sg-accent)]" />
                    }
                  </button>
                </th>
                <th>H. Reg.</th>
                <th>H. Aten.</th>
                <th>H. Docs.</th>
                <th>Razón Social</th>
                <th>Empresa</th>
                {isAdmin && <th>Cliente</th>}
                <th>Puerta</th>
                <th>Tipo Op.</th>
                <th>
                  <button
                    onClick={toggleSortEspera}
                    className="inline-flex items-center gap-1.5 hover:text-[var(--sg-ink)] transition-colors"
                    title={sortBy !== "espera_min" ? "Ordenar por demora ↓" : sortDir === "desc" ? "Ordenar por demora ↑" : "Quitar orden"}
                  >
                    Demora
                    {sortBy !== "espera_min"
                      ? <ArrowUpDown className="h-3 w-3 text-[var(--sg-muted)]" />
                      : sortDir === "desc"
                        ? <ArrowDown className="h-3 w-3 text-[var(--sg-accent)]" />
                        : <ArrowUp   className="h-3 w-3 text-[var(--sg-accent)]" />
                    }
                  </button>
                </th>
                <th>T. Total</th>
                <th>Estado</th>
                {canEditRecords && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const wl = getWaitLabel(getOperationalMetric(r));
                return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.015 }}
                    onClick={() => setSelectedRecord(r)}
                    className="cursor-pointer hover:bg-[var(--sg-panel-2)] transition-colors"
                    title="Ver detalle completo"
                  >
                    <td className="sg-mono text-[11px] text-[var(--sg-muted)]">#{r.id}</td>
                    <td className="sg-mono text-[11px] text-[var(--sg-copy)]">{r.fecha}</td>
                    <td className="sg-mono text-[11px] text-[var(--sg-copy)]">{r.h_registro?.substring(0, 5) || "--:--"}</td>
                    <td className="sg-mono text-[11px] text-[var(--sg-muted)]">{r.h_atencion?.substring(0, 5) || "—"}</td>
                    <td className="sg-mono text-[11px] text-[var(--sg-muted)]">{r.h_dev_docs?.substring(0, 5) || "—"}</td>
                    <td>
                      <span className="font-semibold text-[var(--sg-ink)] block truncate max-w-[180px]" title={r.razon_social ?? undefined}>{r.razon_social || "-"}</span>
                    </td>
                    <td className="text-[var(--sg-copy)] truncate max-w-[140px]" title={r.empresa ?? undefined}>{r.empresa || "-"}</td>
                    {isAdmin && (
                      <td>
                        <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)] truncate max-w-[120px] block">
                          {r.company_id ? (companiesMap[r.company_id] ?? "—") : "—"}
                        </span>
                      </td>
                    )}
                    <td>
                      <span className="sg-mono text-[10px] uppercase tracking-[0.12em] text-[var(--sg-muted)]">{formatGateLabelFromPlant(r.planta ?? "")}</span>
                    </td>
                    <td className="sg-mono text-[11px] text-[var(--sg-copy)]">
                      {r.tipo_operacion || r.motivo_demora || "-"}
                    </td>
                    <td>
                      <span className="sg-font-mono text-[12px] font-bold" style={{ color: wl.color }}>
                        {getOperationalMetric(r) != null ? `${getOperationalMetric(r)} min` : "—"}
                      </span>
                    </td>
                    <td className="sg-mono text-[11px] text-[var(--sg-muted)]">
                      {r.tiempo_total_min != null ? `${r.tiempo_total_min} min` : "—"}
                    </td>
                    <td>
                      <span className={`sg-badge ${wl.badge}`}>{wl.text}</span>
                    </td>
                    {canEditRecords && (
                      <td>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingRecord(r);
                          }}
                          className="inline-flex items-center gap-1.5 border border-[var(--sg-line)] px-2.5 py-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </button>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={(isAdmin ? 13 : 12) + (canEditRecords ? 1 : 0)} className="py-10 text-center text-[var(--sg-muted)]">
                    No se encontraron registros con los filtros aplicados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-[var(--sg-line)] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="sg-mono text-[11px] uppercase tracking-[0.12em] text-[var(--sg-muted)]">
            Página {Math.min(page, totalPages)} de {totalPages} · {fmt.format(totalCount)} resultados
            {" · "}
            <span className="text-[var(--sg-muted)] opacity-60">Haz click en una fila para ver el detalle</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(v => Math.max(1, v - 1))}
              disabled={page <= 1 || loading}
              className="flex h-9 w-9 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-copy)] transition-colors hover:text-[var(--sg-ink)] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let start = Math.max(1, page - 2);
              const end = Math.min(totalPages, start + 4);
              if (end - start < 4) start = Math.max(1, end - 4);
              return start + i;
            })
              .filter(v => v <= totalPages)
              .map(v => (
                <button
                  key={v}
                  onClick={() => setPage(v)}
                  disabled={loading}
                  className={`flex h-9 w-9 items-center justify-center sg-font-mono text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                    page === v
                      ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]"
                      : "border border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-copy)] hover:text-[var(--sg-ink)]"
                  }`}
                >
                  {String(v).padStart(2, "0")}
                </button>
              ))}

            <button
              onClick={() => setPage(v => Math.min(totalPages, v + 1))}
              disabled={page >= totalPages || loading}
              className="flex h-9 w-9 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-copy)] transition-colors hover:text-[var(--sg-ink)] disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
