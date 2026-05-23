import { differenceInMinutes } from "date-fns";
import { sanitizeSearchTerm } from "@/lib/sanitize";

const DAY_MS = 24 * 60 * 60 * 1000;

export const MANUAL_LONG_DURATION_LIMIT_MINUTES = 16 * 60;
const ANTICIPADO_SEGMENT = { label: "🔵 Anticipado", orden: 0, esDemora: 0 };

type SegmentResult = {
  label: string;
  orden: number;
  esDemora: number;
};

export function parseDateTime(date: string | null | undefined, time: string | null | undefined): Date | null {
  if (!date || !time) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) return null;
  return new Date(year, month - 1, day, hour, minute, second);
}

export function diffMinByDateTime(
  startDate: string | null | undefined,
  startTime: string | null | undefined,
  endDate: string | null | undefined,
  endTime: string | null | undefined,
): number | null {
  const start = parseDateTime(startDate, startTime);
  const end = parseDateTime(endDate, endTime);
  if (!start || !end) return null;
  return Math.max(0, differenceInMinutes(end, start));
}

export function maxDateTime(
  aDate: string | null | undefined,
  aTime: string | null | undefined,
  bDate: string | null | undefined,
  bTime: string | null | undefined,
): { date: string; time: string } | null {
  const a = parseDateTime(aDate, aTime);
  const b = parseDateTime(bDate, bTime);
  if (!a && !b) return null;
  if (!a) return bDate && bTime ? { date: bDate, time: bTime } : null;
  if (!b) return aDate && aTime ? { date: aDate, time: aTime } : null;
  return a >= b
    ? { date: aDate as string, time: aTime as string }
    : { date: bDate as string, time: bTime as string };
}

export function inferManualEndDate(startDate: string | null, startTime: string | null, endTime: string): string | null {
  if (!startDate || !startTime) return null;
  const start = parseDateTime(startDate, startTime);
  let end = parseDateTime(startDate, endTime);
  if (!start || !end) return startDate;
  while (end < start) end = new Date(end.getTime() + DAY_MS);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
}

export function normalizePlantScope(input: string | string[]): string[] {
  if (Array.isArray(input)) return [...new Set(input.map((item) => item.trim()).filter(Boolean))];
  return input.trim() ? [input.trim()] : [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyAtencionFilters(query: any, { search, plant, segment, dateFrom, dateTo }: {
  search: string;
  plant: string;
  segment: string;
  dateFrom: string;
  dateTo: string;
}) {
  if (search) {
    const safeSearch = sanitizeSearchTerm(search);
    if (safeSearch) {
      query = query.or(`razon_social.ilike.%${safeSearch}%,empresa.ilike.%${safeSearch}%`);
    }
  }
  if (plant && plant !== "Todos") query = query.eq("planta", plant);
  if (dateFrom) query = query.gte("fecha", dateFrom);
  if (dateTo) query = query.lte("fecha", dateTo);
  if (segment && segment !== "Todos") {
    if (segment === "Normal") query = query.lt("espera_min", 30).gt("espera_min", 0);
    else if (segment === "Moderado") query = query.gte("espera_min", 30).lt("espera_min", 45);
    else if (segment === "Alto") query = query.gte("espera_min", 45).lt("espera_min", 90);
    else if (segment === "Crítico") query = query.gte("espera_min", 90);
    else if (segment === "Pendiente") query = query.is("espera_min", null);
  }
  return query;
}

type RecentRegistrationRow = {
  id: number;
  razon_social?: string | null;
  empresa?: string | null;
  planta?: string | null;
  tipo?: string | null;
  h_registro?: string | null;
  hora_cita?: string | null;
  tipo_operacion?: string | null;
  motivo_demora?: string | null;
  responsable?: string | null;
  agente?: string | null;
  observacion?: string | null;
  h_atencion?: string | null;
  espera_min?: number | null;
  demora_cita_min?: number | null;
  h_dev_docs?: string | null;
  tiempo_total_min?: number | null;
  estado?: "esperado" | "activo" | "atendido" | null;
};

export interface RecentRegistrationView {
  id: number;
  razonSocial: string;
  empresa: string;
  planta: string;
  type: string;
  time: string;
  reason: string;
  tipoOperacion: string | null;
  responsable: string;
  agente: string;
  observacion: string;
  attended: boolean;
  h_atencion: string | null;
  espera_min: number | null;
  demora_cita_min: number | null;
  docsDelivered: boolean;
  h_dev_docs: string | null;
  tiempo_total_min: number | null;
  hora_cita: string | null;
  estado: "esperado" | "activo" | "atendido";
  hasArrived: boolean;
  scheduledOnly: boolean;
}

export function mapRecentRegistrationRow(row: RecentRegistrationRow): RecentRegistrationView {
  return {
    id: row.id,
    razonSocial: row.razon_social || "",
    empresa: row.empresa || "",
    planta: row.planta || "",
    type: row.tipo || "Proveedor",
    time: row.h_registro ? row.h_registro.substring(0, 5) : (row.hora_cita ? row.hora_cita.substring(0, 5) : "--:--"),
    reason: row.h_registro ? (row.tipo_operacion || row.motivo_demora || "Ingreso") : "Cita pendiente",
    tipoOperacion: row.tipo_operacion || null,
    responsable: row.responsable || "",
    agente: row.agente || "",
    observacion: row.observacion || "",
    attended: !!row.h_atencion,
    h_atencion: row.h_atencion ? row.h_atencion.substring(0, 5) : null,
    espera_min: row.espera_min ?? null,
    demora_cita_min: row.demora_cita_min ?? null,
    docsDelivered: !!row.h_dev_docs,
    h_dev_docs: row.h_dev_docs ? row.h_dev_docs.substring(0, 5) : null,
    tiempo_total_min: row.tiempo_total_min ?? null,
    hora_cita: row.hora_cita ? row.hora_cita.substring(0, 5) : null,
    estado: row.estado ?? "activo",
    hasArrived: !!row.h_registro,
    scheduledOnly: !row.h_registro && row.estado === "esperado",
  };
}

type SupervisorCitaRow = {
  id: number;
  razon_social?: string | null;
  empresa?: string | null;
  planta?: string | null;
  fecha?: string | null;
  hora_cita?: string | null;
  h_registro?: string | null;
  h_atencion?: string | null;
  tipo?: string | null;
  tipo_operacion?: string | null;
  responsable?: string | null;
  agente?: string | null;
  observacion?: string | null;
  estado?: "esperado" | "activo" | "atendido" | null;
  espera_min?: number | null;
};

export function mapSupervisorCitaRow(row: SupervisorCitaRow) {
  return {
    id: row.id,
    razonSocial: row.razon_social || "—",
    empresa: row.empresa || "—",
    planta: row.planta || "",
    fecha: row.fecha || "",
    horaCita: row.hora_cita ? row.hora_cita.substring(0, 5) : "—",
    hRegistro: row.h_registro ? row.h_registro.substring(0, 5) : null,
    hAtencion: row.h_atencion ? row.h_atencion.substring(0, 5) : null,
    tipo: row.tipo || "Proveedor",
    tipoOperacion: row.tipo_operacion || null,
    responsable: row.responsable || null,
    agente: row.agente || null,
    observacion: row.observacion || null,
    estado: (row.estado ?? "esperado") as "esperado" | "activo" | "atendido",
    esperaMin: row.espera_min ?? null,
  };
}

export function calculateManualAtencionFields(
  {
    fechaRegistro,
    hRegistro,
    horaCita,
    hAtencion,
  }: {
    fechaRegistro: string | null;
    hRegistro: string | null;
    horaCita: string | null;
    hAtencion: string;
  },
  calcSegmento: (minutes: number) => SegmentResult,
): { ok: true; update: Record<string, unknown>; operationalDelayMin: number | null } | { ok: false; error: string } {
  const hAtencionFull = hAtencion + ":00";
  const manualBaseTime = hRegistro ?? horaCita;
  const hAtencionDate = inferManualEndDate(fechaRegistro, manualBaseTime, hAtencionFull);
  const esperaMin = diffMinByDateTime(fechaRegistro, hRegistro, hAtencionDate, hAtencionFull);
  const demoraCitaMin = horaCita
    ? diffMinByDateTime(fechaRegistro, horaCita, hAtencionDate, hAtencionFull)
    : null;
  const operationalBase = horaCita
    ? maxDateTime(fechaRegistro, horaCita, fechaRegistro, hRegistro)
    : null;
  const operationalDelayMin = operationalBase
    ? diffMinByDateTime(operationalBase.date, operationalBase.time, hAtencionDate, hAtencionFull)
    : esperaMin;
  const atencionDateTime = parseDateTime(hAtencionDate, hAtencionFull);
  const citaDateTime = parseDateTime(fechaRegistro, horaCita);
  const isAnticipado = !!horaCita
    && !!atencionDateTime
    && !!citaDateTime
    && atencionDateTime < citaDateTime
    && demoraCitaMin === 0;

  if (esperaMin !== null && esperaMin > MANUAL_LONG_DURATION_LIMIT_MINUTES) {
    return {
      ok: false,
      error: "La hora de atención parece incorrecta — verifica que sea posterior a la llegada (máx. 16 h de diferencia)",
    };
  }

  const update: Record<string, unknown> = {
    h_atencion: hAtencionFull,
    espera_min: esperaMin,
    demora_cita_min: demoraCitaMin,
  };

  const segmentBase = operationalDelayMin ?? demoraCitaMin ?? esperaMin;
  if (isAnticipado) {
    update.segmento_espera = ANTICIPADO_SEGMENT.label;
    update.segmento_orden = ANTICIPADO_SEGMENT.orden;
    update.es_demora = ANTICIPADO_SEGMENT.esDemora;
  } else if (segmentBase != null) {
    const seg = calcSegmento(segmentBase);
    update.segmento_espera = seg.label;
    update.segmento_orden = seg.orden;
    update.es_demora = seg.esDemora;
  }

  return { ok: true, update, operationalDelayMin };
}

export function calculateCloseAtencionFields(
  {
    fechaRegistro,
    hRegistro,
    horaCita,
    endDate,
    endTime,
    motivoDemora,
    hSalida,
  }: {
    fechaRegistro: string | null;
    hRegistro: string | null;
    horaCita: string | null;
    endDate: string;
    endTime: string;
    motivoDemora?: string;
    hSalida?: string;
  },
  calcSegmento: (minutes: number) => SegmentResult,
) {
  const esperaMin = diffMinByDateTime(fechaRegistro, hRegistro, endDate, endTime) ?? 0;

  let demoraCitaMin: number | null = null;
  let isAnticipado = false;
  let operationalDelayMin: number | null = esperaMin;
  if (horaCita) {
    const citaDateTime = parseDateTime(fechaRegistro, horaCita);
    const endDateTime = parseDateTime(endDate, endTime);
    if (citaDateTime && endDateTime && endDateTime < citaDateTime) {
      demoraCitaMin = 0;
      isAnticipado = true;
    } else {
      demoraCitaMin = diffMinByDateTime(fechaRegistro, horaCita, endDate, endTime) ?? 0;
    }
    const operationalBase = maxDateTime(fechaRegistro, horaCita, fechaRegistro, hRegistro);
    operationalDelayMin = operationalBase
      ? diffMinByDateTime(operationalBase.date, operationalBase.time, endDate, endTime)
      : esperaMin;
  }

  const segmentBase = operationalDelayMin ?? demoraCitaMin ?? esperaMin;
  const seg = isAnticipado ? ANTICIPADO_SEGMENT : calcSegmento(segmentBase);

  const update: Record<string, unknown> = {
    h_atencion: endTime,
    espera_min: esperaMin,
    demora_cita_min: demoraCitaMin,
    segmento_espera: seg.label,
    segmento_orden: seg.orden,
    es_demora: seg.esDemora,
  };

  if (motivoDemora) {
    update.motivo_demora = motivoDemora;
  } else if (isAnticipado && horaCita) {
    update.observacion = `Atendido antes de la hora de cita (${horaCita.substring(0, 5)})`;
  }
  if (hSalida && /^\d{2}:\d{2}$/.test(hSalida)) {
    update.h_salida = hSalida + ":00";
  }

  return {
    update,
    esperaMin,
    demoraCitaMin,
    operationalDelayMin,
  };
}
