"use server";

import { getUserContext } from "@/utils/supabase/user";
import { checkWriteAccess, logError } from "./_helpers";
import { getCompanyPlants } from "./companies";
import { upsertAgentes, upsertResponsables } from "./responsables";

export interface ImportPreview {
  validCount: number;
  duplicateCount: number;
  invalidPlants: string[];
  newResponsables: string[];
  newAgentes: string[];
  existingResponsables: string[];
  existingAgentes: string[];
  companyPlants: string[];
}

type ImportedExcelRow = import("@/utils/excel-import").ImportedExcelRow;

export async function previewImportAtenciones(
  rows: ImportedExcelRow[],
): Promise<{ preview: ImportPreview | null; error?: string }> {
  const ctx = await getUserContext();
  if (!ctx?.companyId) return { preview: null, error: "Sin empresa asociada" };

  if (!rows || rows.length === 0) return { preview: null, error: "Sin filas válidas" };

  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();

    const companyPlants = await getCompanyPlants(ctx.companyId);
    const plantSet = new Set(companyPlants.map((plant) => plant.trim().toLowerCase()));

    const invalidPlants = Array.from(
      new Set(
        rows
          .filter((row) => row.planta && !plantSet.has(row.planta.trim().toLowerCase()))
          .map((row) => row.planta as string),
      ),
    );

    const excelResponsables = Array.from(new Set(rows.map((row) => row.responsable).filter(Boolean) as string[]));
    const excelAgentes = Array.from(new Set(rows.map((row) => row.agente).filter(Boolean) as string[]));

    const { data: existingRespData } = await admin
      .from("responsables")
      .select("nombre")
      .eq("company_id", ctx.companyId)
      .in("nombre", excelResponsables);

    const { data: existingAgentData } = await admin
      .from("agentes")
      .select("nombre")
      .eq("company_id", ctx.companyId)
      .in("nombre", excelAgentes);

    const existingRespSet = new Set((existingRespData ?? []).map((row) => row.nombre));
    const existingAgentSet = new Set((existingAgentData ?? []).map((row) => row.nombre));

    const newResponsables = excelResponsables.filter((responsable) => !existingRespSet.has(responsable));
    const newAgentes = excelAgentes.filter((agente) => !existingAgentSet.has(agente));
    const existingResponsables = excelResponsables.filter((responsable) => existingRespSet.has(responsable));
    const existingAgentes = excelAgentes.filter((agente) => existingAgentSet.has(agente));

    const dateRazonTimePairs = rows
      .filter((row) => row.fecha && row.razon_social)
      .map((row) => ({ fecha: row.fecha, razon_social: row.razon_social, h_registro: row.h_registro }));

    let duplicateCount = 0;
    if (dateRazonTimePairs.length > 0) {
      const batches = [];
      for (let index = 0; index < dateRazonTimePairs.length; index += 100) {
        batches.push(dateRazonTimePairs.slice(index, index + 100));
      }

      for (const batch of batches) {
        const fechas = Array.from(new Set(batch.map((item) => item.fecha)));
        const { data: existing } = await admin
          .from("atenciones")
          .select("fecha, razon_social, h_registro")
          .eq("company_id", ctx.companyId)
          .in("fecha", fechas);

        if (!existing?.length) continue;

        const existingSet = new Set(
          existing.map((row) => `${row.fecha}|${row.razon_social}|${row.h_registro ?? ""}`),
        );
        for (const item of batch) {
          const key = `${item.fecha}|${item.razon_social}|${item.h_registro ?? ""}`;
          if (existingSet.has(key)) duplicateCount++;
        }
      }
    }

    return {
      preview: {
        validCount: rows.length,
        duplicateCount,
        invalidPlants,
        newResponsables,
        newAgentes,
        existingResponsables,
        existingAgentes,
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
): Promise<{ success: boolean; imported: number; error?: string }> {
  const ctx = await getUserContext();
  if (!ctx?.companyId) return { success: false, imported: 0, error: "Sin empresa asociada" };
  const writeError = await checkWriteAccess();
  if (writeError) return { success: false, imported: 0, error: writeError };

  if (!rows || rows.length === 0) return { success: false, imported: 0, error: "Sin filas válidas" };
  if (rows.length > 10_000) return { success: false, imported: 0, error: "Máximo 10.000 filas por importación" };

  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();

    const responsables = Array.from(new Set(rows.map((row) => row.responsable).filter(Boolean) as string[]));
    const agentes = Array.from(new Set(rows.map((row) => row.agente).filter(Boolean) as string[]));

    if (responsables.length > 0) {
      await upsertResponsables(responsables, ctx.companyId);
    }
    if (agentes.length > 0) {
      await upsertAgentes(agentes, ctx.companyId);
    }

    const mapped = rows.map((row) => ({ ...row, company_id: ctx.companyId, estado: "atendido" }));
    let imported = 0;

    for (let index = 0; index < mapped.length; index += 500) {
      const batch = mapped.slice(index, index + 500);
      const { error } = await admin.from("atenciones").insert(batch);
      if (error) {
        logError("importAtenciones", error, { batch: index });
        return { success: false, imported, error: "Error al insertar filas. Verifica el formato." };
      }
      imported += batch.length;
    }

    return { success: true, imported };
  } catch (err) {
    logError("importAtenciones", err);
    return { success: false, imported: 0, error: "Error inesperado al importar" };
  }
}
