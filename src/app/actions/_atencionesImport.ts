"use server";

import { createHash } from "node:crypto";
import { getUserContext, type UserContext } from "@/utils/supabase/user";
import { buildImportRowKey, dedupeImportRows } from "@/lib/importDedup";
import { checkWriteAccess, logError } from "./_helpers";
import { getCompanyPlants } from "./companies";
import { upsertAgentes, upsertResponsables } from "./responsables";

export interface ImportOptions {
  source?: "excel" | "image";
  fileName?: string;
  rejectedRows?: number;
}

export interface ImportHistoryItem {
  id: string;
  source: "excel" | "image";
  fileName: string | null;
  status: "processing" | "completed" | "failed";
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  rejectedRows: number;
  dateFrom: string | null;
  dateTo: string | null;
  plants: string[];
  createdByName: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ImportPreview {
  validCount: number;
  eligibleCount: number;
  duplicateCount: number;
  withinFileDuplicateCount: number;
  outOfPeriodCount: number;
  missingRegistrationTimeCount: number;
  missingPlantCount: number;
  invalidPlants: string[];
  detectedDateFrom: string | null;
  detectedDateTo: string | null;
  detectedPlants: string[];
  previousBatch: ImportHistoryItem | null;
  newResponsables: string[];
  newAgentes: string[];
  existingResponsables: string[];
  existingAgentes: string[];
  companyPlants: string[];
}

type ImportedExcelRow = import("@/utils/excel-import").ImportedExcelRow;

type ExistingKeyRow = {
  fecha: string;
  razon_social: string;
  h_registro: string | null;
  planta: string | null;
};

type ImportBatchRow = {
  id: string;
  source: "excel" | "image";
  file_name: string | null;
  status: "processing" | "completed" | "failed";
  total_rows: number;
  imported_rows: number;
  duplicate_rows: number;
  rejected_rows: number;
  date_from: string | null;
  date_to: string | null;
  plants: string[] | null;
  created_by_name: string;
  created_at: string;
  completed_at: string | null;
};

function canBulkImport(ctx: UserContext): boolean {
  return ctx.role === "supervisor" || ctx.role === "administrador";
}

function getDetectedRange(rows: ImportedExcelRow[]) {
  const dates = Array.from(new Set(rows.map((row) => row.fecha))).sort();
  return {
    dateFrom: dates[0] ?? null,
    dateTo: dates.at(-1) ?? null,
  };
}

function getDetectedPlants(rows: ImportedExcelRow[]): string[] {
  return Array.from(
    new Set(rows.map((row) => row.planta?.trim()).filter(Boolean) as string[]),
  ).sort((left, right) => left.localeCompare(right, "es"));
}

function buildBatchFingerprint(rows: ImportedExcelRow[]): string {
  const keys = rows.map(buildImportRowKey).sort();
  return createHash("sha256").update(keys.join("\n")).digest("hex");
}

function toHistoryItem(row: ImportBatchRow): ImportHistoryItem {
  return {
    id: row.id,
    source: row.source,
    fileName: row.file_name,
    status: row.status,
    totalRows: row.total_rows,
    importedRows: row.imported_rows,
    duplicateRows: row.duplicate_rows,
    rejectedRows: row.rejected_rows,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    plants: row.plants ?? [],
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

async function fetchExistingKeys(
  admin: ReturnType<typeof import("@/utils/supabase/admin").createAdminClient>,
  companyId: string,
  rows: ImportedExcelRow[],
): Promise<Set<string>> {
  const dates = Array.from(new Set(rows.map((row) => row.fecha))).sort();
  const keys = new Set<string>();

  for (let dateIndex = 0; dateIndex < dates.length; dateIndex += 30) {
    const dateBatch = dates.slice(dateIndex, dateIndex + 30);
    for (let from = 0; ; from += 1_000) {
      const { data, error } = await admin
        .from("atenciones")
        .select("fecha, razon_social, h_registro, planta")
        .eq("company_id", companyId)
        .in("fecha", dateBatch)
        .range(from, from + 999);

      if (error) throw error;
      const page = (data ?? []) as ExistingKeyRow[];
      for (const row of page) keys.add(buildImportRowKey(row));
      if (page.length < 1_000) break;
    }
  }

  return keys;
}

function sanitizeRow(row: ImportedExcelRow, companyId: string, importBatchId: string) {
  return {
    fecha: row.fecha,
    anio: row.anio,
    mes_num: row.mes_num,
    h_registro: row.h_registro,
    h_atencion: row.h_atencion,
    h_dev_docs: row.h_dev_docs,
    hora_cita: row.hora_cita,
    razon_social: row.razon_social,
    empresa: row.empresa,
    planta: row.planta,
    tipo: row.tipo,
    tipo_operacion: row.tipo_operacion,
    responsable: row.responsable,
    agente: row.agente,
    espera_min: row.espera_min,
    demora_cita_min: row.demora_cita_min,
    tiempo_total_min: row.tiempo_total_min,
    segmento_espera: row.segmento_espera,
    segmento_orden: row.segmento_orden,
    es_demora: row.es_demora,
    motivo_demora: row.motivo_demora,
    observacion: row.observacion,
    company_id: companyId,
    import_batch_id: importBatchId,
    estado: "atendido",
  };
}

async function analyzeImportRows(
  admin: ReturnType<typeof import("@/utils/supabase/admin").createAdminClient>,
  companyId: string,
  rows: ImportedExcelRow[],
) {
  const { uniqueRows, duplicateCount: withinFileDuplicateCount } = dedupeImportRows(rows);
  const existingKeys = await fetchExistingKeys(admin, companyId, uniqueRows);
  const newRows = uniqueRows.filter((row) => !existingKeys.has(buildImportRowKey(row)));
  const databaseDuplicateCount = uniqueRows.length - newRows.length;

  return {
    normalizedRows: rows,
    uniqueRows,
    newRows,
    withinFileDuplicateCount,
    databaseDuplicateCount,
    fingerprint: buildBatchFingerprint(uniqueRows),
  };
}

async function findPreviousBatch(
  admin: ReturnType<typeof import("@/utils/supabase/admin").createAdminClient>,
  companyId: string,
  fingerprint: string,
): Promise<ImportHistoryItem | null> {
  const { data, error } = await admin
    .from("import_batches")
    .select("id, source, file_name, status, total_rows, imported_rows, duplicate_rows, rejected_rows, date_from, date_to, plants, created_by_name, created_at, completed_at")
    .eq("company_id", companyId)
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (error) throw error;
  return data ? toHistoryItem(data as ImportBatchRow) : null;
}

export async function getImportHistory(limit = 20): Promise<{
  history: ImportHistoryItem[];
  error?: string;
}> {
  const ctx = await getUserContext();
  if (!ctx?.companyId) return { history: [], error: "Sin empresa asociada" };
  if (!canBulkImport(ctx)) return { history: [], error: "No autorizado" };

  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
    const { data, error } = await admin
      .from("import_batches")
      .select("id, source, file_name, status, total_rows, imported_rows, duplicate_rows, rejected_rows, date_from, date_to, plants, created_by_name, created_at, completed_at")
      .eq("company_id", ctx.companyId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) throw error;
    return { history: ((data ?? []) as ImportBatchRow[]).map(toHistoryItem) };
  } catch (err) {
    logError("getImportHistory", err);
    return { history: [], error: "No se pudo cargar el historial de cargas" };
  }
}

export async function previewImportAtenciones(
  rows: ImportedExcelRow[],
  _options?: ImportOptions,
): Promise<{ preview: ImportPreview | null; error?: string }> {
  void _options;
  const ctx = await getUserContext();
  if (!ctx?.companyId) return { preview: null, error: "Sin empresa asociada" };
  if (!canBulkImport(ctx)) return { preview: null, error: "Solo supervisores pueden realizar cargas masivas" };
  if (!rows || rows.length === 0) return { preview: null, error: "Sin filas válidas" };
  if (rows.length > 10_000) return { preview: null, error: "Máximo 10.000 filas por importación" };

  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();
    const analysis = await analyzeImportRows(admin, ctx.companyId, rows);

    const companyPlants = await getCompanyPlants(ctx.companyId);
    const plantSet = new Set(companyPlants.map((plant) => plant.trim().toLowerCase()));
    const invalidPlants = Array.from(
      new Set(
        analysis.normalizedRows
          .filter((row) => row.planta && !plantSet.has(row.planta.trim().toLowerCase()))
          .map((row) => row.planta as string),
      ),
    );

    const excelResponsables = Array.from(
      new Set(analysis.newRows.map((row) => row.responsable).filter(Boolean) as string[]),
    );
    const excelAgentes = Array.from(
      new Set(analysis.newRows.map((row) => row.agente).filter(Boolean) as string[]),
    );

    const [{ data: existingRespData }, { data: existingAgentData }, previousBatch] = await Promise.all([
      excelResponsables.length
        ? admin.from("responsables").select("nombre").eq("company_id", ctx.companyId).in("nombre", excelResponsables)
        : Promise.resolve({ data: [] }),
      excelAgentes.length
        ? admin.from("agentes").select("nombre").eq("company_id", ctx.companyId).in("nombre", excelAgentes)
        : Promise.resolve({ data: [] }),
      findPreviousBatch(admin, ctx.companyId, analysis.fingerprint),
    ]);

    const existingRespSet = new Set((existingRespData ?? []).map((row) => row.nombre));
    const existingAgentSet = new Set((existingAgentData ?? []).map((row) => row.nombre));
    const range = getDetectedRange(analysis.normalizedRows);

    return {
      preview: {
        validCount: analysis.normalizedRows.length,
        eligibleCount: analysis.newRows.length,
        duplicateCount: analysis.withinFileDuplicateCount + analysis.databaseDuplicateCount,
        withinFileDuplicateCount: analysis.withinFileDuplicateCount,
        outOfPeriodCount: 0,
        missingRegistrationTimeCount: analysis.normalizedRows.filter((row) => !row.h_registro).length,
        missingPlantCount: analysis.normalizedRows.filter((row) => !row.planta?.trim()).length,
        invalidPlants,
        detectedDateFrom: range.dateFrom,
        detectedDateTo: range.dateTo,
        detectedPlants: getDetectedPlants(analysis.normalizedRows),
        previousBatch,
        newResponsables: excelResponsables.filter((responsable) => !existingRespSet.has(responsable)),
        newAgentes: excelAgentes.filter((agente) => !existingAgentSet.has(agente)),
        existingResponsables: excelResponsables.filter((responsable) => existingRespSet.has(responsable)),
        existingAgentes: excelAgentes.filter((agente) => existingAgentSet.has(agente)),
        companyPlants,
      },
    };
  } catch (err) {
    logError("previewImportAtenciones", err);
    return { preview: null, error: "Error al generar vista previa" };
  }
}

export async function importAtenciones(
  rows: ImportedExcelRow[],
  options?: ImportOptions,
): Promise<{
  success: boolean;
  imported: number;
  skippedDuplicates: number;
  skippedOutOfPeriod: number;
  batchId?: string;
  duplicateBatch?: boolean;
  error?: string;
}> {
  const ctx = await getUserContext();
  if (!ctx?.companyId) {
    return { success: false, imported: 0, skippedDuplicates: 0, skippedOutOfPeriod: 0, error: "Sin empresa asociada" };
  }
  const companyId = ctx.companyId;
  if (!canBulkImport(ctx)) {
    return { success: false, imported: 0, skippedDuplicates: 0, skippedOutOfPeriod: 0, error: "Solo supervisores pueden realizar cargas masivas" };
  }
  const writeError = await checkWriteAccess();
  if (writeError) {
    return { success: false, imported: 0, skippedDuplicates: 0, skippedOutOfPeriod: 0, error: writeError };
  }
  if (!rows || rows.length === 0) {
    return { success: false, imported: 0, skippedDuplicates: 0, skippedOutOfPeriod: 0, error: "Sin filas válidas" };
  }
  if (rows.length > 10_000) {
    return { success: false, imported: 0, skippedDuplicates: 0, skippedOutOfPeriod: 0, error: "Máximo 10.000 filas por importación" };
  }

  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();
    const analysis = await analyzeImportRows(admin, companyId, rows);
    const skippedDuplicates = analysis.withinFileDuplicateCount + analysis.databaseDuplicateCount;

    const companyPlants = await getCompanyPlants(companyId);
    const plantSet = new Set(companyPlants.map((plant) => plant.trim().toLowerCase()));
    const hasMissingPlant = analysis.normalizedRows.some((row) => !row.planta?.trim());
    const hasInvalidPlant = analysis.normalizedRows.some(
      (row) => row.planta && !plantSet.has(row.planta.trim().toLowerCase()),
    );
    if (hasMissingPlant || hasInvalidPlant) {
      return {
        success: false,
        imported: 0,
        skippedDuplicates,
        skippedOutOfPeriod: 0,
        error: hasMissingPlant
          ? "Asigna una planta a todas las filas antes de importar"
          : "Hay plantas que no pertenecen a la empresa",
      };
    }

    const previousBatch = await findPreviousBatch(admin, companyId, analysis.fingerprint);
    if (previousBatch) {
      return {
        success: true,
        imported: 0,
        skippedDuplicates: analysis.normalizedRows.length,
        skippedOutOfPeriod: 0,
        batchId: previousBatch.id,
        duplicateBatch: true,
      };
    }

    const range = getDetectedRange(analysis.normalizedRows);
    const batchPayload = {
      company_id: companyId,
      created_by: ctx.userId,
      created_by_name: ctx.displayName || ctx.email || "Usuario",
      source: options?.source ?? "excel",
      file_name: options?.fileName?.trim().slice(0, 255) || null,
      fingerprint: analysis.fingerprint,
      status: "processing",
      total_rows: analysis.normalizedRows.length,
      imported_rows: 0,
      duplicate_rows: skippedDuplicates,
      rejected_rows: Math.max(0, Math.trunc(options?.rejectedRows ?? 0)),
      date_from: range.dateFrom,
      date_to: range.dateTo,
      plants: getDetectedPlants(analysis.normalizedRows),
    };

    const { data: batchData, error: batchError } = await admin
      .from("import_batches")
      .insert(batchPayload)
      .select("id")
      .single();

    if (batchError) {
      if (batchError.code === "23505") {
        const concurrentBatch = await findPreviousBatch(admin, companyId, analysis.fingerprint);
        return {
          success: true,
          imported: 0,
          skippedDuplicates: analysis.normalizedRows.length,
          skippedOutOfPeriod: 0,
          batchId: concurrentBatch?.id,
          duplicateBatch: true,
        };
      }
      throw batchError;
    }

    const batchId = String(batchData.id);
    if (analysis.newRows.length === 0) {
      await admin
        .from("import_batches")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", batchId);
      return {
        success: true,
        imported: 0,
        skippedDuplicates,
        skippedOutOfPeriod: 0,
        batchId,
      };
    }

    const responsables = Array.from(
      new Set(analysis.newRows.map((row) => row.responsable).filter(Boolean) as string[]),
    );
    const agentes = Array.from(
      new Set(analysis.newRows.map((row) => row.agente).filter(Boolean) as string[]),
    );

    if (responsables.length > 0) await upsertResponsables(responsables, companyId);
    if (agentes.length > 0) await upsertAgentes(agentes, companyId);

    const mapped = analysis.newRows.map((row) => sanitizeRow(row, companyId, batchId));
    let imported = 0;

    for (let index = 0; index < mapped.length; index += 500) {
      const batch = mapped.slice(index, index + 500);
      const { error } = await admin.from("atenciones").insert(batch);
      if (error) {
        await admin
          .from("import_batches")
          .update({ status: "failed", imported_rows: imported, completed_at: new Date().toISOString() })
          .eq("id", batchId);
        logError("importAtenciones", error, { batch: index, source: options?.source ?? "excel" });
        return {
          success: false,
          imported,
          skippedDuplicates,
          skippedOutOfPeriod: 0,
          batchId,
          error: "Error al insertar filas. Verifica el formato.",
        };
      }
      imported += batch.length;
    }

    await admin
      .from("import_batches")
      .update({ status: "completed", imported_rows: imported, completed_at: new Date().toISOString() })
      .eq("id", batchId);

    return {
      success: true,
      imported,
      skippedDuplicates,
      skippedOutOfPeriod: 0,
      batchId,
    };
  } catch (err) {
    logError("importAtenciones", err);
    return {
      success: false,
      imported: 0,
      skippedDuplicates: 0,
      skippedOutOfPeriod: 0,
      error: "Error inesperado al importar",
    };
  }
}
