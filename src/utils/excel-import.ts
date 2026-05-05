// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ExcelCell = string | number | boolean | Date | null | undefined;
export type ExcelRow  = ExcelCell[];
export type ExcelMapping = Record<string, string | null>;

export interface ImportedExcelRow {
  fecha: string;
  anio: number;
  mes_num: number;
  h_registro: string | null;
  h_atencion: string | null;
  h_dev_docs: string | null;
  razon_social: string;
  empresa: string | null;
  planta: string | null;
  tipo: string;
  tipo_operacion: string | null;
  responsable: string | null;
  agente: string | null;
  espera_min: number | null;
  tiempo_total_min: number | null;
  segmento_espera: string | null;
  segmento_orden: number;
  es_demora: number;
  observacion: string | null;
}

// ─── Definición de campos ─────────────────────────────────────────────────────

export const PLATFORM_FIELDS: { key: string; label: string; required: boolean }[] = [
  { key: "fecha",            label: "Fecha",                   required: true  },
  { key: "h_registro",       label: "Hora de registro",        required: false },
  { key: "razon_social",     label: "Razón Social / Vehículo", required: true  },
  { key: "empresa",          label: "Empresa Destino",         required: false },
  { key: "planta",           label: "Planta / Garita",         required: false },
  { key: "tipo",             label: "Tipo (Prov./Propio)",     required: false },
  { key: "tipo_operacion",   label: "Tipo de Operación",       required: false },
  { key: "responsable",      label: "Responsable Almacén",     required: false },
  { key: "agente",           label: "Agente / Guardia",        required: false },
  { key: "h_atencion",       label: "H. Atención",             required: false },
  { key: "h_dev_docs",       label: "H. Dev. Documentos",      required: false },
  { key: "espera_min",       label: "Espera (min)",            required: false },
  { key: "tiempo_total_min", label: "Tiempo Total (min)",      required: false },
  { key: "observacion",      label: "Observación",             required: false },
];

// ─── Helpers de parsing ───────────────────────────────────────────────────────

export function normalizeStr(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

export function autoDetectMapping(headers: string[]): ExcelMapping {
  const norm = headers.map(normalizeStr);
  const findCol = (patterns: string[]): string | null => {
    for (let i = 0; i < norm.length; i++) {
      for (const p of patterns) {
        if (norm[i].includes(p)) return headers[i];
      }
    }
    return null;
  };
  return {
    fecha:            findCol(["fecha", "date"]),
    h_registro:       findCol(["hregistro", "llegada", "horaregistro", "hentrada", "hora"]),
    razon_social:     findCol(["razonsocial", "razon", "transportista", "vehiculo", "unidad"]),
    empresa:          findCol(["empresadestino", "empresa", "cliente", "destino"]),
    planta:           findCol(["planta", "sede", "garita"]),
    tipo:             findCol(["tipo"]),
    tipo_operacion:   findCol(["tipooperacion", "operacion"]),
    responsable:      findCol(["responsable", "almacen"]),
    agente:           findCol(["agente", "guardia"]),
    h_atencion:       findCol(["hatencion", "atencion"]),
    h_dev_docs:       findCol(["hdevdocs", "docs", "documentos"]),
    espera_min:       findCol(["esperamin", "espera", "tiempoespera"]),
    tiempo_total_min: findCol(["tiempototal", "total", "duracion"]),
    observacion:      findCol(["observacion", "obs", "nota"]),
  };
}

export function parseExcelDate(val: ExcelCell): string | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    const date = new Date((val - 25569) * 86400 * 1000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  }
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "string") {
    const ddmm = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2, "0")}-${ddmm[1].padStart(2, "0")}`;
    const iso = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return val.substring(0, 10);
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  }
  return null;
}

export function parseExcelTime(val: ExcelCell): string | null {
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

export function transformRow(
  rawRow: ExcelRow,
  headers: string[],
  mapping: ExcelMapping,
): ImportedExcelRow | null {
  const colIdx: Record<string, number> = {};
  headers.forEach((h, i) => { colIdx[h] = i; });

  const get = (field: string): ExcelCell | null => {
    const col = mapping[field];
    if (!col || colIdx[col] === undefined) return null;
    const v = rawRow[colIdx[col]];
    return v === "" ? null : v ?? null;
  };

  const fecha        = parseExcelDate(get("fecha"));
  const razon_social = get("razon_social") ? String(get("razon_social")).toUpperCase().trim() : null;
  if (!fecha || !razon_social) return null;

  const espera_raw       = get("espera_min");
  const total_raw        = get("tiempo_total_min");
  const espera_min       = espera_raw  !== null ? Math.round(parseFloat(String(espera_raw)))  : null;
  const tiempo_total_min = total_raw   !== null ? Math.round(parseFloat(String(total_raw)))   : null;

  let segmento_espera: string | null = null;
  let segmento_orden = 0;
  let es_demora = 0;
  if (espera_min !== null && !isNaN(espera_min)) {
    if      (espera_min >= 90) { segmento_espera = "🔴 > 90 min";  segmento_orden = 4; es_demora = 1; }
    else if (espera_min >= 45) { segmento_espera = "🟠 45-90 min"; segmento_orden = 3; es_demora = 1; }
    else if (espera_min >= 30) { segmento_espera = "🟡 30-45 min"; segmento_orden = 2; es_demora = 1; }
    else                       { segmento_espera = "🟢 < 30 min";  segmento_orden = 1; }
  }

  const d = new Date(fecha);
  return {
    fecha,
    anio:             d.getFullYear(),
    mes_num:          d.getMonth() + 1,
    h_registro:       parseExcelTime(get("h_registro")),
    h_atencion:       parseExcelTime(get("h_atencion")),
    h_dev_docs:       parseExcelTime(get("h_dev_docs")),
    razon_social,
    empresa:          get("empresa")       ? String(get("empresa")).toUpperCase().trim() : null,
    planta:           get("planta")        ? String(get("planta")).trim()                : null,
    tipo:             get("tipo")          ? String(get("tipo")).trim()                  : "Proveedor",
    tipo_operacion:   get("tipo_operacion")? String(get("tipo_operacion")).trim()        : null,
    responsable:      get("responsable")   ? String(get("responsable")).trim()           : null,
    agente:           get("agente")        ? String(get("agente")).trim()                : null,
    espera_min:       isNaN(espera_min as number) ? null : espera_min,
    tiempo_total_min: isNaN(tiempo_total_min as number) ? null : tiempo_total_min,
    segmento_espera,
    segmento_orden,
    es_demora,
    observacion:      get("observacion")   ? String(get("observacion")).trim()           : null,
  };
}

export function processRows(rawRows: ExcelRow[], headers: string[], mapping: ExcelMapping) {
  const valid: ImportedExcelRow[] = [];
  let invalid = 0;
  for (const row of rawRows) {
    const r = transformRow(row, headers, mapping);
    if (r) valid.push(r);
    else invalid++;
  }
  return { valid, invalid };
}
