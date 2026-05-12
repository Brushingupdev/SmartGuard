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
  hora_cita: string | null;
  razon_social: string;
  empresa: string | null;
  planta: string | null;
  tipo: string;
  tipo_operacion: string | null;
  responsable: string | null;
  agente: string | null;
  espera_min: number | null;
  demora_cita_min: number | null;
  tiempo_total_min: number | null;
  segmento_espera: string | null;
  segmento_orden: number;
  es_demora: number;
  motivo_demora: string | null;
  observacion: string | null;
}

export interface PreparedExcelImport {
  sheetName: string;
  headerRowIndex: number;
  headers: string[];
  rows: ExcelRow[];
  mapping: ExcelMapping;
  valid: ImportedExcelRow[];
  invalid: number;
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
  { key: "hora_cita",        label: "Hora de Cita",            required: false },
  { key: "h_atencion",       label: "H. Atención",             required: false },
  { key: "h_dev_docs",       label: "H. Dev. Documentos",      required: false },
  { key: "espera_min",       label: "Espera (min)",            required: false },
  { key: "tiempo_total_min", label: "Tiempo Total (min)",      required: false },
  { key: "motivo_demora",    label: "Motivo de Demora",        required: false },
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
  const findExactOrCol = (exactPatterns: string[], fallbackPatterns: string[]): string | null => {
    for (let i = 0; i < norm.length; i++) {
      if (exactPatterns.includes(norm[i])) return headers[i];
    }
    return findCol(fallbackPatterns);
  };
  return {
    fecha:            findCol(["fecha", "date"]),
    h_registro:       findCol(["hregistro", "registrovehiculo", "horaregistro", "hentrada", "llegada", "hora"]),
    razon_social:     findCol(["razonsocial", "razon", "transportista", "vehiculo", "unidad"]),
    empresa:          findExactOrCol(["empresa", "empresadestino"], ["destino"]),
    planta:           findCol(["planta", "sede", "garita", "muelle", "puerta"]),
    tipo:             findExactOrCol(["tipo", "proveedorcliente", "proveedor"], ["tipovehiculo", "tipoproveedor"]),
    tipo_operacion:   findCol(["tipooperacion", "operacion"]),
    responsable:      findExactOrCol(["responsabledealmacen", "responsablealmacen"], ["responsable"]),
    agente:           findCol(["agente", "guardia"]),
    hora_cita:        findCol(["horacita", "citaprogramada", "horaturno", "turno", "cita"]),
    h_atencion:       findCol(["hatencion", "atencionalmacen", "atencion"]),
    h_dev_docs:       findCol(["hdevdocs", "docs", "documentos"]),
    espera_min:       findCol(["esperamin", "espera", "tiempoespera"]),
    tiempo_total_min: findCol(["tiempototal", "total", "duracion"]),
    // Patrón estricto: evita capturar "Motivo del Viaje" u otros campos genéricos
    // "Motivo de Demora" → "motivodedemora", "Motivo Demora" → "motivodemora"
    motivo_demora:    findCol(["motivodemora", "motivodedemora", "causademora", "razondemora"]),
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
    const s = val.trim();
    const ddmm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2, "0")}-${ddmm[1].padStart(2, "0")}`;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return s.substring(0, 10);
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  }
  return null;
}

export function parseExcelTime(val: ExcelCell): string | null {
  if (val === null || val === undefined || val === "") return null;
  if (val instanceof Date) {
    return `${String(val.getHours()).padStart(2, "0")}:${String(val.getMinutes()).padStart(2, "0")}:${String(val.getSeconds()).padStart(2, "0")}`;
  }
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

function parseMinutes(val: ExcelCell): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Math.round(parseFloat(String(val)));
  return isNaN(n) ? null : n;
}

function timeToSeconds(t: string): number {
  const [h, m, s = 0] = t.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function minutesBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const delta = timeToSeconds(end) - timeToSeconds(start);
  if (delta < 0) return null;
  return Math.round(delta / 60);
}

/** Returns negative minutes if end is before start (used to detect anticipado) */
function minutesBetweenSigned(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return Math.round((timeToSeconds(end) - timeToSeconds(start)) / 60);
}

/**
 * Extrae la hora de cita desde el texto libre de Observación.
 * Detecta patrones como "PROGRAMADO PARA LAS 9:00 AM", "cita programada para las 14 hrs", etc.
 */
export function inferHoraCitaFromObservacion(obs: string | null): string | null {
  if (!obs) return null;
  // Normalización ligera: solo minúsculas + quitar acentos, conservar espacios y ":"
  const n = obs.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");

  // Solo procesar si hay pistas de cita/programación
  if (!n.includes("programad") && !n.includes("cita") && !n.includes("estaba para las")) return null;

  // Patrones (con espacios preservados): "para las 14:30", "para las 14 hrs", "programado 10:30 am"
  const timePatterns = [
    /para las (\d{1,2}):(\d{2})\s*(am|pm|horas?|hrs?)?/i,
    /programado\s+(\d{1,2}):(\d{2})\s*(am|pm)?/i,
    /para las (\d{1,2})\s+?(am|pm|horas?|hrs?)/i,
    /para las (\d{1,2})\s*hrs?/i,
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,
  ];

  for (const re of timePatterns) {
    const m = n.match(re);
    if (m) {
      let h   = parseInt(m[1]);
      const min = m[2] !== undefined ? parseInt(m[2]) : 0;
      const ampm = (m[3] ?? m[2] ?? "").toLowerCase();
      if (ampm === "pm" && h < 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
      if (!isNaN(h) && !isNaN(min) && h >= 0 && h <= 23 && min >= 0 && min <= 59) {
        return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
      }
    }
  }
  return null;
}

/**
 * Mapea texto libre de Observación a los 15 motivos estandarizados de Matritech.
 * Retorna null si la observación no contiene un motivo de demora identificable.
 */
export function inferMotivoDemoraFromObservacion(obs: string | null): string | null {
  if (!obs) return null;
  const n = normalizeStr(obs);

  // Filtrar observaciones que no son motivos de demora
  if (n === "nohayobservacion" || n === "----" || n === "-----" || n === "") return null;
  if (!n.includes("demora") && !n.includes("motivo") && !n.includes("atencion") && !n.includes("espera")) return null;

  // Mapeo a motivos estandarizados (orden importa: más específico primero)
  if (n.includes("montacarga"))                                          return "Espera de montacarga disponible";
  if (n.includes("estiba"))                                              return "Falta de estibas";
  if (n.includes("refrigerio"))                                          return "Refrigerio del personal";
  if (n.includes("simulacro") || n.includes("auditoria"))               return "Evento externo (simulacro / auditoría)";
  if (n.includes("calidad") || n.includes("verificacion"))              return "Control de calidad";
  if (n.includes("reunion"))                                             return "Falta de comunicación previa con almacén";
  if (n.includes("documentacion") || n.includes("guia") || n.includes("documentos") || n.includes("remision")) return "Documentación incompleta";
  if (n.includes("facturacion") || n.includes("factura"))               return "Facturación pendiente";
  if (n.includes("produccion"))                                          return "Material en proceso de Producción";
  if (n.includes("rampaa") || n.includes("rampaocu") || n.includes("faltadeespacio") || n.includes("espacio")) return "Rampa ocupada";
  if (n.includes("noprogramado") || n.includes("fueradehorario") || n.includes("fueradehora")) return "Unidad fuera de horario";
  if (n.includes("pimentel") || n.includes("atencionatransportes") || n.includes("atencionprevia") || n.includes("atendiendomercaderia") || n.includes("despachandomercaderia") || n.includes("cargandocamion") || n.includes("cargamentocamion")) return "Atención previa a otra unidad";
  if (n.includes("contenedor") || n.includes("descarga") || n.includes("cargadescarga") || n.includes("mercaderia") || n.includes("despacho")) return "Carga / descarga en proceso";
  if (n.includes("preparamiento") || n.includes("preparacion"))         return "Preparamiento de mercadería";

  return null;
}

function segmentFromDelay(delayMin: number | null, isAnticipado: boolean) {
  if (isAnticipado) return { segmento_espera: "🔵 Anticipado", segmento_orden: 0, es_demora: 0 };
  if (delayMin === null) return { segmento_espera: null, segmento_orden: 0, es_demora: 0 };
  if (delayMin >= 90) return { segmento_espera: "🔴 > 90 min",  segmento_orden: 4, es_demora: 1 };
  if (delayMin >= 45) return { segmento_espera: "🟠 45-90 min", segmento_orden: 3, es_demora: 1 };
  if (delayMin >= 30) return { segmento_espera: "🟡 30-45 min", segmento_orden: 2, es_demora: 1 };
  return { segmento_espera: "🟢 < 30 min", segmento_orden: 1, es_demora: 0 };
}

export function normalizeTipo(value: unknown): string {
  const normalized = normalizeStr(value);
  if (normalized.includes("cliente")) return "Cliente";
  if (normalized.includes("propio")) return "Propio";
  if (normalized.includes("proveedor") || normalized.includes("provedoor")) return "Proveedor";
  return "Proveedor";
}

export function inferTipoOperacion(...values: unknown[]): string | null {
  const text = normalizeStr(values.filter(Boolean).join(" "));
  if (!text) return null;
  if (text.includes("traslado")) return "Traslado";
  if (text.includes("descarga") || text.includes("contenedor")) return "Descarga";
  if (text.includes("carga") || text.includes("despacho") || text.includes("mercaderia")) return "Carga";
  if (text.includes("mantenimiento")) return "Mantenimiento";
  if (text.includes("visita")) return "Visita";
  return null;
}

function normalizeHeaderRow(row: ExcelRow): string[] {
  return row.map((h, i) => {
    const value = h?.toString().trim() ?? "";
    return value || `__EMPTY_${i}`;
  });
}

function inferPlant(sourceName: string): string | null {
  const n = normalizeStr(sourceName);
  if (n.includes("cajamarquilla")) return "Cajamarquilla";
  if (n.includes("lomas")) return "Lomas";
  return null;
}

function scoreImport(valid: ImportedExcelRow[], mapping: ExcelMapping): number {
  const mappedCore = ["fecha", "razon_social", "h_registro", "h_atencion"].filter((k) => mapping[k]).length;
  return valid.length * 10 + mappedCore;
}

export function transformRow(
  rawRow: ExcelRow,
  headers: string[],
  mapping: ExcelMapping,
  defaults: { planta?: string | null } = {},
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

  const h_registro   = parseExcelTime(get("h_registro"));
  const h_atencion   = parseExcelTime(get("h_atencion"));
  const h_dev_docs   = parseExcelTime(get("h_dev_docs"));
  const empresa      = get("empresa") ? String(get("empresa")).toUpperCase().trim() : null;
  const observacion  = get("observacion") ? String(get("observacion")).trim() : null;
  const explicitTipoOperacion = get("tipo_operacion") ? String(get("tipo_operacion")).trim() : null;

  // ── hora_cita: columna explícita → fallback inferencia desde Observación ──
  const hora_cita =
    parseExcelTime(get("hora_cita")) ??
    inferHoraCitaFromObservacion(observacion);

  // ── motivo_demora: columna explícita → fallback inferencia desde Observación ──
  const motivo_demora =
    (get("motivo_demora") ? String(get("motivo_demora")).trim() : null) ??
    inferMotivoDemoraFromObservacion(observacion);

  // ── Tiempos ──────────────────────────────────────────────────────────────
  const espera_min      = parseMinutes(get("espera_min")) ?? minutesBetween(h_registro, h_atencion);
  const tiempo_total_min = parseMinutes(get("tiempo_total_min")) ?? minutesBetween(h_registro, h_dev_docs);

  // ── Demora vs cita ────────────────────────────────────────────────────────
  // Si hay hora_cita y h_atencion, calculamos el delta firmado.
  // Delta < 0  → llegó antes de la cita (anticipado) → demora_cita_min = 0
  // Delta >= 0 → llegó después de la cita → demora_cita_min = delta en minutos
  let demora_cita_min: number | null = null;
  let isAnticipado = false;

  if (hora_cita && h_atencion) {
    const delta = minutesBetweenSigned(hora_cita, h_atencion);
    if (delta !== null) {
      if (delta <= 0) {
        isAnticipado    = true;
        demora_cita_min = 0;
      } else {
        demora_cita_min = delta;
      }
    }
  }

  // ── Segmentación ─────────────────────────────────────────────────────────
  // Usa demora_cita_min si existe, si no espera_min (mismo criterio que producción)
  const segmentBase = demora_cita_min ?? espera_min;
  const { segmento_espera, segmento_orden, es_demora } = segmentFromDelay(segmentBase, isAnticipado);

  const d = new Date(fecha);
  return {
    fecha,
    anio:             d.getFullYear(),
    mes_num:          d.getMonth() + 1,
    h_registro,
    h_atencion,
    h_dev_docs,
    hora_cita,
    razon_social,
    empresa,
    planta:           get("planta")        ? String(get("planta")).trim()                : defaults.planta ?? null,
    tipo:             get("tipo")          ? normalizeTipo(get("tipo"))                  : "Proveedor",
    tipo_operacion:   explicitTipoOperacion ?? inferTipoOperacion(empresa, observacion, razon_social),
    responsable:      get("responsable")   ? String(get("responsable")).trim()           : null,
    agente:           get("agente")        ? String(get("agente")).trim()                : null,
    espera_min,
    demora_cita_min,
    tiempo_total_min,
    segmento_espera,
    segmento_orden,
    es_demora,
    motivo_demora,
    observacion,
  };
}

export function processRows(
  rawRows: ExcelRow[],
  headers: string[],
  mapping: ExcelMapping,
  defaults: { planta?: string | null } = {},
) {
  const valid: ImportedExcelRow[] = [];
  let invalid = 0;
  for (const row of rawRows) {
    const r = transformRow(row, headers, mapping, defaults);
    if (r) valid.push(r);
    else invalid++;
  }
  return { valid, invalid };
}

export function prepareExcelImport(
  sheets: { name: string; rows: ExcelRow[] }[],
  fileName = "",
): PreparedExcelImport | null {
  let best: PreparedExcelImport | null = null;

  for (const sheet of sheets) {
    const headerRowIndex = sheet.rows.findIndex((row) => {
      const normalized = row.map(normalizeStr);
      return normalized.some((h) => h.includes("fecha")) &&
        normalized.some((h) => h.includes("razon") || h.includes("transportista") || h.includes("vehiculo") || h.includes("unidad"));
    });
    if (headerRowIndex < 0) continue;

    const headers = normalizeHeaderRow(sheet.rows[headerRowIndex]);
    const rows = sheet.rows.slice(headerRowIndex + 1).filter((r) => r.some((c) => c !== null && c !== ""));
    const mapping = autoDetectMapping(headers);
    const defaultPlant = inferPlant(`${fileName} ${sheet.name}`);
    const valid: ImportedExcelRow[] = [];
    let invalid = 0;
    for (const row of rows) {
      const transformed = transformRow(row, headers, mapping, { planta: defaultPlant });
      if (transformed) valid.push(transformed);
      else invalid++;
    }

    const candidate = { sheetName: sheet.name, headerRowIndex, headers, rows, mapping, valid, invalid };
    if (!best || scoreImport(candidate.valid, candidate.mapping) > scoreImport(best.valid, best.mapping)) {
      best = candidate;
    }
  }

  return best;
}
