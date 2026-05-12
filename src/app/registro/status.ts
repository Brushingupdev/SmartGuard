type RegistroTiming = {
  attended: boolean;
  docsDelivered: boolean;
  espera_min: number | null;
  time: string;
  hora_cita?: string | null;
  hasArrived?: boolean;
  h_atencion?: string | null;
};

export const DELAY_THRESHOLD_MINUTES = 45;
export const ABANDONED_THRESHOLD_MINUTES = 240;

export function minutesSince(time: string, now = new Date()): number {
  const [hh, mm] = time.split(":").map(Number);
  const diff = (now.getHours() * 60 + now.getMinutes()) - (hh * 60 + mm);
  return diff < 0 ? diff + 1440 : diff;
}

export function diffMinutes(from: string, to: string): number {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  let diff = (th * 60 + tm) - (fh * 60 + fm);
  if (diff < 0) diff += 1440;
  return diff;
}

function minutesOfDay(time: string): number | null {
  const [hh, mm] = time.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

export function isEarlyArrival(record: Pick<RegistroTiming, "time" | "hora_cita" | "hasArrived">): boolean {
  if (!record.hora_cita || record.hasArrived === false) return false;
  const arrivalMin = minutesOfDay(record.time);
  const citaMin = minutesOfDay(record.hora_cita);
  if (arrivalMin === null || citaMin === null) return false;
  return arrivalMin < citaMin;
}

export function getArrivalDeltaMinutes(record: Pick<RegistroTiming, "time" | "hora_cita" | "hasArrived">): number | null {
  if (!record.hora_cita || record.hasArrived === false) return null;
  const arrivalMin = minutesOfDay(record.time);
  const citaMin = minutesOfDay(record.hora_cita);
  if (arrivalMin === null || citaMin === null) return null;
  return arrivalMin - citaMin;
}

export function getPendingWaitMinutes(record: Pick<RegistroTiming, "time" | "hora_cita" | "hasArrived">, now = new Date()): number {
  if (record.hora_cita) {
    const arrivalMin = minutesOfDay(record.time);
    const citaMin = minutesOfDay(record.hora_cita);
    if (arrivalMin === null || citaMin === null) return 0;
    const baseMin = record.hasArrived === false ? citaMin : Math.max(arrivalMin, citaMin);
    const diff = (now.getHours() * 60 + now.getMinutes()) - baseMin;
    return Math.max(0, diff);
  }
  return minutesSince(record.time, now);
}

export function getWaitInPlantMinutes(record: RegistroTiming, now = new Date()): number {
  if (record.hasArrived === false) return 0;
  if (record.attended && record.h_atencion) {
    return diffMinutes(record.time, record.h_atencion);
  }
  return minutesSince(record.time, now);
}

export function getScheduleDelayMinutes(record: RegistroTiming, now = new Date()): number | null {
  if (!record.hora_cita) return null;
  if (record.attended && record.h_atencion) {
    return Math.max(0, diffMinutes(record.hora_cita, record.h_atencion));
  }
  const [hh, mm] = record.hora_cita.split(":").map(Number);
  const diff = (now.getHours() * 60 + now.getMinutes()) - (hh * 60 + mm);
  return Math.max(0, diff);
}

export function isAnticipatedRecord(record: RegistroTiming): boolean {
  if (!record.attended || !record.hora_cita || !record.h_atencion) return false;
  const citaMin = diffMinutes("00:00", record.hora_cita);
  const atencionMin = diffMinutes("00:00", record.h_atencion);
  return atencionMin < citaMin;
}

export function getAnticipationMinutes(record: RegistroTiming): number {
  if (!isAnticipatedRecord(record) || !record.hora_cita || !record.h_atencion) return 0;
  return diffMinutes(record.h_atencion, record.hora_cita);
}

export function getOperationalDelayMinutes(record: RegistroTiming, now = new Date()): number {
  if (record.hasArrived === false) return 0;
  if (!record.hora_cita) return record.attended ? (record.espera_min ?? 0) : minutesSince(record.time, now);
  if (record.attended && record.h_atencion) {
    const arrivalMin = minutesOfDay(record.time);
    const citaMin = minutesOfDay(record.hora_cita);
    const attentionMin = minutesOfDay(record.h_atencion);
    if (arrivalMin === null || citaMin === null || attentionMin === null) return record.espera_min ?? 0;
    return Math.max(0, attentionMin - Math.max(arrivalMin, citaMin));
  }
  return record.attended ? (record.espera_min ?? 0) : getPendingWaitMinutes(record, now);
}

export function getWaitMinutes(record: RegistroTiming, now = new Date()): number {
  return getOperationalDelayMinutes(record, now);
}

export function isDelayedRecord(record: RegistroTiming, now = new Date()): boolean {
  if (record.docsDelivered) return false;
  return getOperationalDelayMinutes(record, now) >= DELAY_THRESHOLD_MINUTES;
}

export function isAbandonedRecord(record: RegistroTiming, now = new Date()): boolean {
  if (record.docsDelivered || record.attended || record.hasArrived === false) return false;
  return getWaitInPlantMinutes(record, now) >= ABANDONED_THRESHOLD_MINUTES;
}
