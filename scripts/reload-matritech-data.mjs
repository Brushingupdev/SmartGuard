import { createClient } from "@supabase/supabase-js";
import * as XLSX from "@e965/xlsx";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prepareExcelImport } from "../src/utils/excel-import.ts";

const FILES = [
  "Eficiencia Cajamarquilla.xlsx hoy.xlsx",
  "Eficiencia Lomas.xlsx hoy.xlsx",
];
const MIN_DEMO_DATE = "2023-01-01";
const MAX_DEMO_DATE = "2026-05-07";

function loadEnv(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [
          line.slice(0, index),
          line.slice(index + 1).replace(/^['"]|['"]$/g, ""),
        ];
      }),
  );
}

function segmentFromWait(esperaMin) {
  if (esperaMin === null || esperaMin === undefined) return { segmento_espera: null, segmento_orden: 0, es_demora: 0 };
  if (esperaMin >= 90) return { segmento_espera: "🔴 > 90 min",  segmento_orden: 4, es_demora: 1 };
  if (esperaMin >= 45) return { segmento_espera: "🟠 45-90 min", segmento_orden: 3, es_demora: 1 };
  if (esperaMin >= 30) return { segmento_espera: "🟡 30-45 min", segmento_orden: 2, es_demora: 1 };
  return { segmento_espera: "🟢 < 30 min", segmento_orden: 1, es_demora: 0 };
}

function estadoFor(row) {
  if (row.h_atencion) return "atendido";
  if (row.h_registro) return "activo";
  return "esperado";
}

function dedupePendingUniqueIndex(rows) {
  const seen = new Set();
  const skipped = [];
  const kept = [];

  for (const row of rows) {
    if (!row.h_atencion) {
      const key = [row.razon_social, row.planta, row.fecha, row.company_id].join("|");
      if (seen.has(key)) {
        skipped.push(row);
        continue;
      }
      seen.add(key);
    }
    kept.push(row);
  }

  return { kept, skipped };
}

async function fetchAllAtenciones(supabase, companyId) {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("atenciones")
      .select("*")
      .eq("company_id", companyId)
      .range(from, from + 999);
    if (error) throw error;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

function summarize(rows) {
  const byPlant = {};
  let waitNull = 0;
  let totalNull = 0;
  let future = 0;
  let hugeWait = 0;
  let hugeTotal = 0;

  for (const row of rows) {
    const plant = row.planta ?? "(null)";
    byPlant[plant] ??= { rows: 0, minDate: null, maxDate: null, waitNull: 0, totalNull: 0 };
    const bucket = byPlant[plant];
    bucket.rows++;
    if (!bucket.minDate || row.fecha < bucket.minDate) bucket.minDate = row.fecha;
    if (!bucket.maxDate || row.fecha > bucket.maxDate) bucket.maxDate = row.fecha;
    if (row.espera_min === null || row.espera_min === undefined) {
      waitNull++;
      bucket.waitNull++;
    }
    if (row.tiempo_total_min === null || row.tiempo_total_min === undefined) {
      totalNull++;
      bucket.totalNull++;
    }
    if (row.fecha > MAX_DEMO_DATE) future++;
    if ((row.espera_min ?? 0) > 240) hugeWait++;
    if ((row.tiempo_total_min ?? 0) > 480) hugeTotal++;
  }

  return { total: rows.length, byPlant, waitNull, totalNull, future, hugeWait, hugeTotal };
}

async function main() {
  const env = loadEnv(".env.local");
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id,name")
    .eq("name", "Matritech")
    .single();
  if (companyError) throw companyError;

  const currentRows = await fetchAllAtenciones(supabase, company.id);
  mkdirSync("memory", { recursive: true });
  const backupPath = resolve("memory", `matritech-atenciones-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(backupPath, JSON.stringify(currentRows, null, 2));

  const preparedRows = [];
  const skippedDateRange = [];
  const importSummary = [];
  for (const file of FILES) {
    const workbook = XLSX.read(readFileSync(file), { cellDates: false });
    const sheets = workbook.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: null }),
    }));
    const prepared = prepareExcelImport(sheets, file);
    if (!prepared) throw new Error(`No se pudo preparar ${file}`);
    importSummary.push({
      file,
      sheet: prepared.sheetName,
      valid: prepared.valid.length,
      invalid: prepared.invalid,
    });
    for (const row of prepared.valid) {
      if (row.fecha < MIN_DEMO_DATE || row.fecha > MAX_DEMO_DATE) {
        skippedDateRange.push(row);
        continue;
      }
      const segment = segmentFromWait(row.espera_min);
      preparedRows.push({
        ...row,
        ...segment,
        company_id: company.id,
        estado: estadoFor(row),
      });
    }
  }

  const { kept, skipped } = dedupePendingUniqueIndex(preparedRows);

  const { error: deleteError } = await supabase
    .from("atenciones")
    .delete()
    .eq("company_id", company.id);
  if (deleteError) throw deleteError;

  for (let i = 0; i < kept.length; i += 500) {
    const { error } = await supabase.from("atenciones").insert(kept.slice(i, i + 500));
    if (error) throw error;
  }

  const finalRows = await fetchAllAtenciones(supabase, company.id);
  console.log(JSON.stringify({
    company,
    backupPath,
    importSummary,
    prepared: preparedRows.length,
    inserted: kept.length,
    skippedPendingDuplicates: skipped.length,
    skippedDateRange: skippedDateRange.length,
    before: summarize(currentRows),
    after: summarize(finalRows),
    skippedSamples: skipped.slice(0, 10).map((row) => ({
      fecha: row.fecha,
      planta: row.planta,
      razon_social: row.razon_social,
      h_registro: row.h_registro,
      h_atencion: row.h_atencion,
    })),
    skippedDateRangeSamples: skippedDateRange.slice(0, 10).map((row) => ({
      fecha: row.fecha,
      planta: row.planta,
      razon_social: row.razon_social,
      h_registro: row.h_registro,
      h_atencion: row.h_atencion,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
