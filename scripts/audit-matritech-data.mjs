import * as XLSX from "@e965/xlsx";
import { readFileSync } from "node:fs";

const files = [
  "Eficiencia Cajamarquilla.xlsx hoy.xlsx",
  "Eficiencia Lomas.xlsx hoy.xlsx",
];

const PLATFORM_FIELDS = [
  ["fecha", ["fecha", "date"]],
  ["h_registro", ["hregistro", "llegada", "horaregistro", "hentrada", "hora"]],
  ["razon_social", ["razonsocial", "razon", "transportista", "vehiculo", "unidad"]],
  ["empresa", ["empresadestino", "empresa", "cliente", "destino"]],
  ["planta", ["planta", "sede", "garita"]],
  ["tipo", ["tipo"]],
  ["tipo_operacion", ["tipooperacion", "operacion"]],
  ["responsable", ["responsable", "almacen"]],
  ["agente", ["agente", "guardia"]],
  ["h_atencion", ["hatencion", "atencion"]],
  ["h_dev_docs", ["hdevdocs", "docs", "documentos"]],
  ["espera_min", ["esperamin", "espera", "tiempoespera"]],
  ["tiempo_total_min", ["tiempototal", "total", "duracion"]],
  ["observacion", ["observacion", "obs", "nota"]],
];

function normalizeStr(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function autoDetectMapping(headers) {
  const norm = headers.map(normalizeStr);
  const findCol = (patterns) => {
    for (let i = 0; i < norm.length; i++) {
      for (const p of patterns) if (norm[i].includes(p)) return headers[i];
    }
    return null;
  };
  return Object.fromEntries(PLATFORM_FIELDS.map(([key, patterns]) => [key, findCol(patterns)]));
}

function parseExcelDate(val) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    const date = new Date((val - 25569) * 86400 * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
  }
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "string") {
    const ddmm = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2, "0")}-${ddmm[1].padStart(2, "0")}`;
    const iso = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return val.substring(0, 10);
    const parsed = new Date(val);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split("T")[0];
  }
  return null;
}

function parseExcelTime(val) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    const totalSec = Math.round(val * 86400);
    const h = Math.floor(totalSec / 3600) % 24;
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  if (typeof val === "string") {
    const match = val.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) return `${match[1].padStart(2, "0")}:${match[2]}:${(match[3] ?? "00").padStart(2, "0")}`;
  }
  return null;
}

function minutesBetween(start, end) {
  if (!start || !end) return null;
  const [sh, sm, ss] = start.split(":").map(Number);
  const [eh, em, es] = end.split(":").map(Number);
  let delta = (eh * 3600 + em * 60 + es) - (sh * 3600 + sm * 60 + ss);
  if (delta < 0) delta += 24 * 3600;
  return Math.round(delta / 60);
}

function inspectCell(v) {
  if (v instanceof Date) return v.toISOString();
  return v;
}

function auditFile(file) {
  const wb = XLSX.read(readFileSync(file), { cellDates: false });
  const sheets = wb.SheetNames.map((sheetName) => auditSheet(wb, sheetName));
  return {
    file,
    firstSheet: wb.SheetNames[0],
    sheetNames: wb.SheetNames,
    sheets,
    bestSheet: sheets.reduce((best, sheet) => sheet.counts.valid > best.counts.valid ? sheet : best, sheets[0]),
  };
}

function auditSheet(wb, sheetName) {
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const headerIndex = rows.findIndex((row) => row.some((cell) => normalizeStr(cell).includes("fecha")));
  const headers = (rows[headerIndex] ?? []).map((h, i) => String(h ?? `__EMPTY_${i}`).trim());
  const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cell !== null && cell !== ""));
  const mapping = autoDetectMapping(headers);
  const colIdx = Object.fromEntries(headers.map((h, i) => [h, i]));
  const get = (row, field) => {
    const col = mapping[field];
    if (!col || colIdx[col] === undefined) return null;
    const v = row[colIdx[col]];
    return v === "" ? null : v ?? null;
  };

  const issues = [];
  const dateCounts = new Map();
  const plantCounts = new Map();
  const waitValues = [];
  const totalValues = [];
  let valid = 0;
  let invalid = 0;
  let missingDate = 0;
  let missingVehicle = 0;
  let timeParseProblems = 0;
  let computedWaitMismatch = 0;
  let totalLessThanWait = 0;
  let negativeOrHuge = 0;

  dataRows.forEach((row, i) => {
    const rowNo = headerIndex + 2 + i;
    const fecha = parseExcelDate(get(row, "fecha"));
    const razonSocial = get(row, "razon_social") ? String(get(row, "razon_social")).trim() : null;
    if (!fecha) missingDate++;
    if (!razonSocial) missingVehicle++;
    if (!fecha || !razonSocial) {
      invalid++;
      if (issues.length < 20) issues.push({ row: rowNo, type: "omitted", fecha, razonSocial, sample: row.slice(0, 8).map(inspectCell) });
      return;
    }
    valid++;
    dateCounts.set(fecha, (dateCounts.get(fecha) ?? 0) + 1);
    const planta = get(row, "planta");
    if (planta) plantCounts.set(String(planta).trim(), (plantCounts.get(String(planta).trim()) ?? 0) + 1);

    const hRegistro = parseExcelTime(get(row, "h_registro"));
    const hAtencion = parseExcelTime(get(row, "h_atencion"));
    const hDevDocs = parseExcelTime(get(row, "h_dev_docs"));
    for (const field of ["h_registro", "h_atencion", "h_dev_docs"]) {
      const raw = get(row, field);
      if (raw !== null && parseExcelTime(raw) === null) {
        timeParseProblems++;
        if (issues.length < 20) issues.push({ row: rowNo, type: "time_parse", field, raw: inspectCell(raw) });
      }
    }

    const esperaRaw = get(row, "espera_min");
    const totalRaw = get(row, "tiempo_total_min");
    const espera = esperaRaw !== null ? Math.round(Number.parseFloat(String(esperaRaw))) : null;
    const total = totalRaw !== null ? Math.round(Number.parseFloat(String(totalRaw))) : null;
    if (Number.isFinite(espera)) waitValues.push(espera);
    if (Number.isFinite(total)) totalValues.push(total);
    if ((Number.isFinite(espera) && (espera < 0 || espera > 24 * 60)) || (Number.isFinite(total) && (total < 0 || total > 24 * 60))) {
      negativeOrHuge++;
      if (issues.length < 20) issues.push({ row: rowNo, type: "negative_or_huge_minutes", espera, total });
    }
    if (Number.isFinite(espera) && Number.isFinite(total) && total < espera) {
      totalLessThanWait++;
      if (issues.length < 20) issues.push({ row: rowNo, type: "total_less_than_wait", espera, total });
    }
    const calcWait = minutesBetween(hRegistro, hAtencion);
    if (Number.isFinite(espera) && calcWait !== null && Math.abs(calcWait - espera) > 5) {
      computedWaitMismatch++;
      if (issues.length < 20) issues.push({ row: rowNo, type: "wait_mismatch", espera, calcWait, hRegistro, hAtencion });
    }
    const calcTotal = minutesBetween(hRegistro, hDevDocs);
    if (Number.isFinite(total) && calcTotal !== null && Math.abs(calcTotal - total) > 5 && issues.length < 20) {
      issues.push({ row: rowNo, type: "total_mismatch", total, calcTotal, hRegistro, hDevDocs });
    }
  });

  const minMax = (values) => values.length ? { min: Math.min(...values), max: Math.max(...values), avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length) } : null;
  const topEntries = (map, n = 10) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

  return {
    sheetName,
    headerIndex: headerIndex + 1,
    headers,
    detectedMapping: mapping,
    counts: {
      rawDataRows: dataRows.length,
      valid,
      invalid,
      missingDate,
      missingVehicle,
      timeParseProblems,
      computedWaitMismatch,
      totalLessThanWait,
      negativeOrHuge,
    },
    ranges: {
      fechas: topEntries(dateCounts, 5),
      plantas: topEntries(plantCounts, 10),
      esperaMin: minMax(waitValues),
      tiempoTotalMin: minMax(totalValues),
    },
    issues,
  };
}

console.log(JSON.stringify(files.map(auditFile), null, 2));
