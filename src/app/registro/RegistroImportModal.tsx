"use client";

import {
  getImportHistory,
  importAtenciones,
  previewImportAtenciones,
  type ImportHistoryItem,
  type ImportOptions,
  type ImportPreview,
} from "@/app/actions/_atencionesImport";
import {
  PLATFORM_FIELDS,
  prepareExcelImport,
  processRows,
  transformRow,
  type ExcelMapping,
  type ExcelRow,
  type ImportedExcelRow,
} from "@/utils/excel-import";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  History,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

type SourceMode = "excel" | "image";
type ViewMode = "new" | "history";

type ExtractionResponse = {
  rows: Array<{
    fecha: string | null;
    planta: string | null;
    tipo: string | null;
    razon_social: string | null;
    empresa: string | null;
    h_registro: string | null;
    h_atencion: string | null;
    h_dev_docs: string | null;
    responsable: string | null;
    agente: string | null;
    observacion: string | null;
    confidence: number;
    warnings: string[];
  }>;
  notes: string[];
};

type ImportResult = {
  imported: number;
  skippedDuplicates: number;
  skippedOutOfPeriod: number;
};

const EDIT_HEADERS = [
  "fecha",
  "tipo",
  "razon_social",
  "empresa",
  "planta",
  "h_registro",
  "h_atencion",
  "h_dev_docs",
  "hora_cita",
  "tipo_operacion",
  "responsable",
  "agente",
  "motivo_demora",
  "observacion",
];

const EDIT_MAPPING: ExcelMapping = Object.fromEntries(
  EDIT_HEADERS.map((header) => [header, header]),
);

function formatDate(value: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDetectedPeriod(dateFrom: string | null, dateTo: string | null): string {
  if (!dateFrom) return "Fecha no detectada";
  if (!dateTo || dateFrom === dateTo) return formatDate(dateFrom);
  return `${formatDate(dateFrom)} al ${formatDate(dateTo)}`;
}

function rebuildRow(
  row: ImportedExcelRow,
  field: keyof ImportedExcelRow,
  value: string,
): ImportedExcelRow | null {
  const candidate = { ...row, [field]: value || null } as ImportedExcelRow;
  const raw: ExcelRow = EDIT_HEADERS.map((header) => candidate[header as keyof ImportedExcelRow] as string | number | null);
  return transformRow(raw, EDIT_HEADERS, EDIT_MAPPING, {
    planta: candidate.planta,
    fecha: candidate.fecha,
  });
}

export default function RegistroImportModal({
  open,
  onClose,
  currentPlant,
  plants,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  currentPlant: string;
  plants: string[];
  onImported: () => void;
}) {
  const excelInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<SourceMode>("excel");
  const [viewMode, setViewMode] = useState<ViewMode>("new");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ImportedExcelRow[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [mapping, setMapping] = useState<ExcelMapping>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<ExcelRow[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [extractionNotes, setExtractionNotes] = useState<string[]>([]);
  const [lowConfidenceCount, setLowConfidenceCount] = useState(0);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const assignablePlants = useMemo(
    () => Array.from(new Set([currentPlant, ...plants].map((item) => item.trim()).filter(Boolean))),
    [currentPlant, plants],
  );

  const options = useMemo<ImportOptions>(
    () => ({
      source,
      fileName: fileName ?? undefined,
      rejectedRows: invalidCount,
    }),
    [source, fileName, invalidCount],
  );

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    const response = await getImportHistory(30);
    setHistoryLoading(false);
    setHistory(response.history);
    setHistoryError(response.error ?? null);
  };

  const resetFile = () => {
    setFileName(null);
    setRows([]);
    setInvalidCount(0);
    setMapping({});
    setHeaders([]);
    setRawRows([]);
    setPreview(null);
    setResult(null);
    setError(null);
    setExtractionNotes([]);
    setLowConfidenceCount(0);
    if (excelInputRef.current) excelInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const close = () => {
    resetFile();
    onClose();
  };

  const analyzeRows = async (nextRows = rows) => {
    if (!nextRows.length) return;
    setPreviewLoading(true);
    setError(null);
    const response = await previewImportAtenciones(nextRows, options);
    setPreviewLoading(false);
    if (!response.preview) {
      setPreview(null);
      setError(response.error ?? "No se pudo analizar la carga");
      return;
    }
    setPreview(response.preview);
  };

  const readExcel = async (file: File) => {
    setParsing(true);
    setError(null);
    setResult(null);
    try {
      const XLSX = await import("@e965/xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: false,
      });
      const sheets = workbook.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], {
          header: 1,
          raw: true,
          defval: null,
        }) as ExcelRow[],
      }));
      const prepared = prepareExcelImport(sheets, file.name);
      if (!prepared?.headers.length) {
        throw new Error("No se encontró una tabla con Fecha y Razón Social / Vehículo.");
      }

      setFileName(file.name);
      setHeaders(prepared.headers);
      setRawRows(prepared.rows);
      setMapping(prepared.mapping);
      setRows(prepared.valid);
      setInvalidCount(prepared.invalid);
      await analyzeRows(prepared.valid);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo leer el archivo");
    } finally {
      setParsing(false);
    }
  };

  const readImage = async (file: File) => {
    setParsing(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.set("image", file);

      const response = await fetch("/api/registro/extract-image", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ExtractionResponse | { error?: string };
      if (!response.ok || !("rows" in payload)) {
        throw new Error((payload as { error?: string }).error ?? "No se pudo analizar la imagen");
      }

      const imageHeaders = [
        "Fecha",
        "Planta",
        "Tipo",
        "Razón Social",
        "Empresa",
        "H. registro",
        "H. atención",
        "H. Dev. Documentos",
        "Responsable de Almacén",
        "Agente Responsable",
        "Observación",
      ];
      const imageMapping: ExcelMapping = {
        fecha: "Fecha",
        planta: "Planta",
        tipo: "Tipo",
        razon_social: "Razón Social",
        empresa: "Empresa",
        h_registro: "H. registro",
        h_atencion: "H. atención",
        h_dev_docs: "H. Dev. Documentos",
        responsable: "Responsable de Almacén",
        agente: "Agente Responsable",
        observacion: "Observación",
      };
      const imageRawRows: ExcelRow[] = payload.rows.map((row) => [
        row.fecha,
        row.planta,
        row.tipo,
        row.razon_social,
        row.empresa,
        row.h_registro,
        row.h_atencion,
        row.h_dev_docs,
        row.responsable,
        row.agente,
        row.observacion,
      ]);
      const processed = processRows(imageRawRows, imageHeaders, imageMapping);

      setFileName(file.name);
      setRows(processed.valid);
      setInvalidCount(processed.invalid);
      setExtractionNotes(payload.notes);
      setLowConfidenceCount(payload.rows.filter((row) => row.confidence < 0.8 || row.warnings.length > 0).length);
      await analyzeRows(processed.valid);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo analizar la imagen");
    } finally {
      setParsing(false);
    }
  };

  const updateMapping = (field: string, column: string | null) => {
    const nextMapping = { ...mapping, [field]: column };
    const processed = processRows(rawRows, headers, nextMapping);
    setMapping(nextMapping);
    setRows(processed.valid);
    setInvalidCount(processed.invalid);
    setPreview(null);
    setError(null);
  };

  const updateRow = (index: number, field: keyof ImportedExcelRow, value: string) => {
    setRows((current) => {
      const next = [...current];
      const rebuilt = rebuildRow(next[index], field, value);
      if (rebuilt) next[index] = rebuilt;
      return next;
    });
    setPreview(null);
    setResult(null);
  };

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    setPreview(null);
    setResult(null);
  };

  const assignPlantToMissingRows = (nextPlant: string) => {
    if (!nextPlant) return;
    setRows((current) => current.map((row) => {
      if (row.planta?.trim()) return row;
      return rebuildRow(row, "planta", nextPlant) ?? row;
    }));
    setPreview(null);
    setResult(null);
  };

  const confirmImport = async () => {
    if (!rows.length || !preview) return;
    setImportLoading(true);
    setError(null);
    const response = await importAtenciones(rows, options);
    setImportLoading(false);
    if (!response.success) {
      setError(response.error ?? "No se pudo completar la importación");
      return;
    }
    setResult({
      imported: response.imported,
      skippedDuplicates: response.skippedDuplicates,
      skippedOutOfPeriod: response.skippedOutOfPeriod,
    });
    void loadHistory();
    onImported();
  };

  const canImport = Boolean(
    preview &&
      preview.eligibleCount > 0 &&
      preview.invalidPlants.length === 0 &&
      preview.missingPlantCount === 0 &&
      !previewLoading &&
      !importLoading,
  );

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5"
          onClick={(event) => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <motion.section
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden border border-[var(--sg-line)] bg-[var(--sg-panel)]"
            aria-modal="true"
            role="dialog"
            aria-label="Cargar datos operativos"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[var(--sg-line)] px-5 py-4 sm:px-6">
              <div>
                <div className="sg-kicker">Registro operativo</div>
                <h2 className="mt-1 sg-font-display text-[18px] font-bold">Carga inteligente de datos</h2>
                <p className="mt-1 text-[11px] text-[var(--sg-muted)]">
                  La plataforma detecta fecha y planta; tú revisas antes de guardar.
                </p>
              </div>
              <button onClick={close} className="p-1 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]" aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="mb-5 grid grid-cols-2 border border-[var(--sg-line)]" role="tablist" aria-label="Secciones de carga">
                <button
                  role="tab"
                  aria-selected={viewMode === "new"}
                  onClick={() => setViewMode("new")}
                  className={`flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-semibold transition-colors ${viewMode === "new" ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]" : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"}`}
                >
                  <Upload className="h-4 w-4" /> Nueva carga
                </button>
                <button
                  role="tab"
                  aria-selected={viewMode === "history"}
                  onClick={() => {
                    setViewMode("history");
                    void loadHistory();
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-semibold transition-colors ${viewMode === "history" ? "bg-[var(--sg-panel-3)] text-[var(--sg-accent)]" : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"}`}
                >
                  <History className="h-4 w-4" /> Historial de cargas
                </button>
              </div>

              {viewMode === "history" ? (
                <section role="tabpanel" aria-label="Historial de cargas">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--sg-line)] pb-4">
                    <div>
                      <h3 className="sg-font-display text-[16px] font-bold text-[var(--sg-ink)]">Archivos y lotes registrados</h3>
                      <p className="mt-1 text-[11px] text-[var(--sg-muted)]">Consulta qué se cargó, cuándo y cuántos duplicados se evitaron.</p>
                    </div>
                    <button onClick={() => void loadHistory()} disabled={historyLoading} className="sg-btn sg-btn-ghost sg-btn-sm">
                      <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`} /> Actualizar
                    </button>
                  </div>

                  {historyError ? (
                    <div className="mt-4 border border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] p-3 text-[12px] text-[var(--sg-danger)]">{historyError}</div>
                  ) : null}

                  {historyLoading && history.length === 0 ? (
                    <div className="flex min-h-40 items-center justify-center gap-2 text-[11px] text-[var(--sg-muted)]">
                      <RefreshCw className="h-4 w-4 animate-spin" /> Cargando historial...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="mt-5 flex min-h-40 flex-col items-center justify-center border border-dashed border-[var(--sg-line)] text-center">
                      <History className="h-6 w-6 text-[var(--sg-muted)]" />
                      <div className="mt-3 text-[12px] font-semibold text-[var(--sg-ink)]">Aún no hay cargas registradas</div>
                      <div className="mt-1 text-[10px] text-[var(--sg-muted)]">La primera importación confirmada aparecerá aquí.</div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {history.map((item) => (
                        <article key={item.id} className="grid gap-3 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] md:items-center">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {item.source === "image" ? <ImageIcon className="h-4 w-4 shrink-0 text-[var(--sg-accent)]" /> : <FileSpreadsheet className="h-4 w-4 shrink-0 text-[var(--sg-accent)]" />}
                              <span className="truncate text-[12px] font-semibold text-[var(--sg-ink)]">{item.fileName ?? "Carga sin nombre"}</span>
                            </div>
                            <div className="mt-2 text-[10px] text-[var(--sg-muted)]">
                              {formatDetectedPeriod(item.dateFrom, item.dateTo)} · {item.plants.join(", ") || "Sin planta"}
                            </div>
                          </div>
                          <div className="text-[10px] text-[var(--sg-muted)]">
                            <div>{formatDateTime(item.createdAt)}</div>
                            <div className="mt-1">Por {item.createdByName}</div>
                          </div>
                          <div className="flex gap-4 md:justify-end">
                            <div><strong className="sg-font-mono text-[16px] text-[var(--sg-success)]">{item.importedRows}</strong><div className="text-[9px] uppercase text-[var(--sg-muted)]">Nuevos</div></div>
                            <div><strong className="sg-font-mono text-[16px] text-[var(--sg-warn)]">{item.duplicateRows}</strong><div className="text-[9px] uppercase text-[var(--sg-muted)]">Duplicados</div></div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              ) : (
                <section role="tabpanel" aria-label="Nueva carga">
              <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
                <div>
                  <div className="sg-label mb-2">Origen</div>
                  <div className="grid grid-cols-2 border border-[var(--sg-line)]">
                    {([
                      ["excel", "Excel / CSV", FileSpreadsheet],
                      ["image", "Imagen", ImageIcon],
                    ] as const).map(([value, label, Icon]) => (
                      <button
                        key={value}
                        onClick={() => {
                          setSource(value);
                          resetFile();
                        }}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-semibold transition-colors ${source === value ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]" : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"}`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-l-2 border-[var(--sg-accent)] bg-[var(--sg-panel-2)] px-4 py-3">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sg-accent)]" />
                    <div>
                      <div className="text-[11px] font-semibold text-[var(--sg-ink)]">Detección automática</div>
                      <p className="mt-1 text-[10px] leading-relaxed text-[var(--sg-muted)]">
                        No necesitas filtrar antes. Se leerán la fecha y la planta del archivo o imagen; si la planta no aparece, podrás asignarla en la vista previa.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {!fileName && !result ? (
                <div className="mt-5">
                  <input
                    ref={source === "excel" ? excelInputRef : imageInputRef}
                    id="registro-import-file"
                    type="file"
                    accept={source === "excel" ? ".xlsx,.xls,.csv" : "image/jpeg,image/png,image/webp"}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void (source === "excel" ? readExcel(file) : readImage(file));
                    }}
                  />
                  <label
                    htmlFor="registro-import-file"
                    className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-[var(--sg-line)] px-4 text-center text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
                  >
                    {parsing ? <RefreshCw className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                    <div>
                      <div className="sg-font-mono text-[11px] uppercase tracking-widest">
                        {parsing ? "Procesando..." : source === "excel" ? "Seleccionar Excel o CSV" : "Seleccionar imagen original"}
                      </div>
                      <div className="mt-2 text-[10px] normal-case tracking-normal text-[var(--sg-muted)]">
                        {source === "image"
                          ? "JPG, PNG o WebP · máximo 8 MB · detectaremos fecha, planta y filas"
                          : "Se detectarán las columnas, fechas y plantas del propio archivo."}
                      </div>
                    </div>
                  </label>
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 flex items-start gap-3 border border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] p-3 text-[12px] text-[var(--sg-danger)]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              {fileName && !result ? (
                <>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-3">
                    <div>
                      <div className="text-[13px] font-semibold text-[var(--sg-ink)]">{fileName}</div>
                      <div className="mt-1 text-[10px] text-[var(--sg-muted)]">
                        {rows.length.toLocaleString()} filas listas para revisar
                        {invalidCount > 0 ? ` · ${invalidCount} filas incompletas no incluidas` : ""}
                      </div>
                    </div>
                    <button onClick={resetFile} className="sg-btn sg-btn-ghost sg-btn-sm">Cambiar archivo</button>
                  </div>

                  {source === "excel" && headers.length > 0 ? (
                    <details className="mt-4 border border-[var(--sg-line)] bg-[var(--sg-panel-2)]">
                      <summary className="cursor-pointer px-4 py-3 text-[11px] font-semibold text-[var(--sg-muted)]">
                        Revisar mapeo de columnas
                      </summary>
                      <div className="grid gap-2 border-t border-[var(--sg-line)] p-4 sm:grid-cols-2">
                        {PLATFORM_FIELDS.map((field) => (
                          <label key={field.key} className="grid grid-cols-[140px_1fr] items-center gap-2">
                            <span className="text-[10px] text-[var(--sg-muted)]">
                              {field.label}{field.required ? " *" : ""}
                            </span>
                            <select
                              value={mapping[field.key] ?? ""}
                              onChange={(event) => updateMapping(field.key, event.target.value || null)}
                              className="sg-select text-[11px]"
                            >
                              <option value="">— sin mapear —</option>
                              {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                            </select>
                          </label>
                        ))}
                      </div>
                    </details>
                  ) : null}

                  {source === "image" && (lowConfidenceCount > 0 || extractionNotes.length > 0) ? (
                    <div className="mt-4 border-l-2 border-[var(--sg-warn)] bg-[rgba(216,169,61,0.08)] px-4 py-3 text-[11px] text-[var(--sg-muted)]">
                      <div className="font-semibold text-[var(--sg-warn)]">
                        {lowConfidenceCount > 0 ? `${lowConfidenceCount} filas requieren atención especial.` : "Observaciones del reconocimiento"}
                      </div>
                      {extractionNotes.slice(0, 4).map((note) => <div key={note} className="mt-1">• {note}</div>)}
                    </div>
                  ) : null}

                  {rows.some((row) => !row.planta?.trim()) ? (
                    <div className="mt-4 flex flex-col gap-3 border-l-2 border-[var(--sg-warn)] bg-[rgba(216,169,61,0.08)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-[11px] font-semibold text-[var(--sg-warn)]">Hay filas sin planta detectada</div>
                        <p className="mt-1 text-[10px] text-[var(--sg-muted)]">Asigna una planta solo a esas filas; las plantas ya detectadas se conservarán.</p>
                      </div>
                      <select value="" onChange={(event) => assignPlantToMissingRows(event.target.value)} className="sg-select min-w-48 text-[11px]">
                        <option value="">Asignar planta...</option>
                        {assignablePlants.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>
                  ) : null}

                  <div className="mt-4 overflow-x-auto border border-[var(--sg-line)]">
                    <table className="min-w-[1320px] w-full border-collapse text-[10px]">
                      <thead className="bg-[var(--sg-panel-3)] text-left uppercase tracking-wider text-[var(--sg-muted)]">
                        <tr>
                          <th className="px-2 py-2">Fecha</th>
                          <th className="px-2 py-2">Planta</th>
                          <th className="px-2 py-2">Razón social / unidad</th>
                          <th className="px-2 py-2">Empresa</th>
                          <th className="px-2 py-2">Registro</th>
                          <th className="px-2 py-2">Atención</th>
                          <th className="px-2 py-2">Documentos</th>
                          <th className="px-2 py-2">Responsable</th>
                          <th className="px-2 py-2">Agente</th>
                          <th className="px-2 py-2">Observación</th>
                          <th className="w-9 px-2 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 200).map((row, index) => (
                          <tr key={`${row.fecha}-${row.razon_social}-${index}`} className="border-t border-[var(--sg-line)]">
                            <td className="p-1"><input type="date" value={row.fecha} onChange={(event) => updateRow(index, "fecha", event.target.value)} className="sg-input min-w-32 px-2 py-1.5 text-[10px]" /></td>
                            <td className="p-1">
                              <select value={row.planta ?? ""} onChange={(event) => updateRow(index, "planta", event.target.value)} className="sg-select min-w-36 px-2 py-1.5 text-[10px]">
                                <option value="">— seleccionar —</option>
                                {row.planta && !assignablePlants.includes(row.planta) ? <option value={row.planta}>{row.planta}</option> : null}
                                {assignablePlants.map((item) => <option key={item} value={item}>{item}</option>)}
                              </select>
                            </td>
                            <td className="p-1"><input value={row.razon_social} onChange={(event) => updateRow(index, "razon_social", event.target.value)} className="sg-input min-w-44 px-2 py-1.5 text-[10px] uppercase" /></td>
                            <td className="p-1"><input value={row.empresa ?? ""} onChange={(event) => updateRow(index, "empresa", event.target.value)} className="sg-input min-w-36 px-2 py-1.5 text-[10px] uppercase" /></td>
                            <td className="p-1"><input type="time" value={row.h_registro?.slice(0, 5) ?? ""} onChange={(event) => updateRow(index, "h_registro", event.target.value)} className="sg-input min-w-24 px-2 py-1.5 text-[10px]" /></td>
                            <td className="p-1"><input type="time" value={row.h_atencion?.slice(0, 5) ?? ""} onChange={(event) => updateRow(index, "h_atencion", event.target.value)} className="sg-input min-w-24 px-2 py-1.5 text-[10px]" /></td>
                            <td className="p-1"><input type="time" value={row.h_dev_docs?.slice(0, 5) ?? ""} onChange={(event) => updateRow(index, "h_dev_docs", event.target.value)} className="sg-input min-w-24 px-2 py-1.5 text-[10px]" /></td>
                            <td className="p-1"><input value={row.responsable ?? ""} onChange={(event) => updateRow(index, "responsable", event.target.value)} className="sg-input min-w-36 px-2 py-1.5 text-[10px]" /></td>
                            <td className="p-1"><input value={row.agente ?? ""} onChange={(event) => updateRow(index, "agente", event.target.value)} className="sg-input min-w-32 px-2 py-1.5 text-[10px]" /></td>
                            <td className="p-1"><input value={row.observacion ?? ""} onChange={(event) => updateRow(index, "observacion", event.target.value)} className="sg-input min-w-52 px-2 py-1.5 text-[10px]" /></td>
                            <td className="p-1"><button onClick={() => removeRow(index)} className="p-2 text-[var(--sg-muted)] hover:text-[var(--sg-danger)]" aria-label={`Eliminar fila ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 200 ? <p className="mt-2 text-[10px] text-[var(--sg-muted)]">Se muestran las primeras 200 filas. El análisis considera las {rows.length.toLocaleString()} filas.</p> : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button onClick={() => void analyzeRows()} disabled={!rows.length || previewLoading} className="sg-btn sg-btn-ghost sg-btn-sm">
                      <RefreshCw className={`h-3.5 w-3.5 ${previewLoading ? "animate-spin" : ""}`} />
                      {preview ? "Volver a analizar" : "Analizar datos"}
                    </button>
                    <span className="text-[10px] text-[var(--sg-muted)]">Los cambios en la tabla requieren volver a analizar.</span>
                  </div>

                  {preview ? (
                    <div className="mt-4 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4">
                      <div className="grid gap-3 border-b border-[var(--sg-line)] pb-4 sm:grid-cols-2">
                        <div>
                          <div className="sg-label">Período detectado</div>
                          <div className="mt-1 text-[12px] font-semibold text-[var(--sg-ink)]">{formatDetectedPeriod(preview.detectedDateFrom, preview.detectedDateTo)}</div>
                        </div>
                        <div>
                          <div className="sg-label">Plantas detectadas</div>
                          <div className="mt-1 text-[12px] font-semibold text-[var(--sg-ink)]">{preview.detectedPlants.join(", ") || "Pendiente de asignar"}</div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
                      {[
                        [preview.eligibleCount, "Nuevos", "var(--sg-success)"],
                        [preview.duplicateCount, "Duplicados omitidos", "var(--sg-warn)"],
                        [preview.newResponsables.length, "Responsables nuevos", "var(--sg-accent)"],
                        [preview.newAgentes.length, "Agentes nuevos", "var(--sg-accent)"],
                      ].map(([value, label, tone]) => (
                        <div key={String(label)}>
                          <div className="sg-font-mono text-[20px] font-bold" style={{ color: String(tone) }}>{Number(value).toLocaleString()}</div>
                          <div className="mt-1 text-[9px] uppercase tracking-wider text-[var(--sg-muted)]">{label}</div>
                        </div>
                      ))}
                      </div>
                      {preview.previousBatch ? (
                        <div className="mt-4 border-l-2 border-[var(--sg-warn)] bg-[rgba(216,169,61,0.08)] px-3 py-2 text-[11px] text-[var(--sg-warn)]">
                          Este mismo lote ya fue cargado el {formatDateTime(preview.previousBatch.createdAt)} por {preview.previousBatch.createdByName}. No se volverá a registrar.
                        </div>
                      ) : null}
                      {preview.invalidPlants.length > 0 ? (
                        <div className="mt-4 border-l-2 border-[var(--sg-danger)] px-3 text-[11px] text-[var(--sg-danger)]">
                          Plantas no válidas: {preview.invalidPlants.join(", ")}
                        </div>
                      ) : null}
                      {preview.missingPlantCount > 0 ? (
                        <div className="mt-4 border-l-2 border-[var(--sg-warn)] px-3 text-[11px] text-[var(--sg-warn)]">
                          {preview.missingPlantCount} filas necesitan una planta antes de guardar.
                        </div>
                      ) : null}
                      {preview.missingRegistrationTimeCount > 0 ? (
                        <div className="mt-4 text-[10px] text-[var(--sg-muted)]">
                          {preview.missingRegistrationTimeCount} filas no tienen hora de registro. Para ellas, el control de duplicados usa fecha + planta + razón social.
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-col-reverse gap-3 border-t border-[var(--sg-line)] pt-4 sm:flex-row sm:justify-end">
                    <button onClick={close} className="sg-btn sg-btn-ghost">Cancelar</button>
                    <button onClick={() => void confirmImport()} disabled={!canImport} className="sg-btn sg-btn-accent min-w-52 justify-center disabled:cursor-not-allowed disabled:opacity-40">
                      {importLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {preview ? `Sumar ${preview.eligibleCount.toLocaleString()} registros` : "Analiza antes de importar"}
                    </button>
                  </div>
                </>
              ) : null}

              {result ? (
                <div className="mt-5 border border-[var(--sg-success)] bg-[rgba(107,189,138,0.08)] p-5">
                  <div className="flex items-start gap-3 text-[var(--sg-success)]">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <div>
                      <div className="text-[14px] font-bold">Carga completada</div>
                      <div className="mt-2 text-[12px]">
                        {result.imported.toLocaleString()} registros nuevos agregados a la plataforma.
                      </div>
                      {result.skippedDuplicates > 0 ? <div className="mt-1 text-[11px]">{result.skippedDuplicates.toLocaleString()} duplicados fueron omitidos.</div> : null}
                    </div>
                  </div>
                  <button onClick={close} className="sg-btn sg-btn-ghost mt-5 w-full justify-center">Cerrar y ver registros</button>
                </div>
              ) : null}
                </section>
              )}
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
