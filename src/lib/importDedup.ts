import { normalizeStr, type ImportedExcelRow } from "@/utils/excel-import";

export type ImportKeyRow = Pick<
  ImportedExcelRow,
  "fecha" | "razon_social" | "h_registro" | "planta"
>;

export function buildImportRowKey(row: ImportKeyRow): string {
  const time = row.h_registro?.slice(0, 5) ?? "sin-hora";
  return [
    row.fecha,
    normalizeStr(row.planta ?? ""),
    normalizeStr(row.razon_social),
    time,
  ].join("|");
}

export function dedupeImportRows<T extends ImportKeyRow>(rows: T[]): {
  uniqueRows: T[];
  duplicateCount: number;
} {
  const seen = new Set<string>();
  const uniqueRows: T[] = [];
  let duplicateCount = 0;

  for (const row of rows) {
    const key = buildImportRowKey(row);
    if (seen.has(key)) {
      duplicateCount++;
      continue;
    }
    seen.add(key);
    uniqueRows.push(row);
  }

  return { uniqueRows, duplicateCount };
}
