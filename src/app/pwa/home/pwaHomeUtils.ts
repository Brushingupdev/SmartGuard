import type { RecentRegistration } from "@/app/registro/types";
import { isAbandonedRecord, isDelayedRecord } from "@/app/registro/status";

export const INACTIVITY_MS = 5 * 60 * 1000;

export const MOTIVOS_DEMORA = [
  "Documentación incompleta",
  "Revisión manual requerida",
  "Falla de sistema",
  "Exceso de vehículos",
  "Verificación de carga",
  "Problema con conductor",
  "Otro",
] as const;

export type Level = "urgente" | "demorado" | "esperando" | "fresco" | "atendido" | "completo";

export type GuardiaHomeTab = "inicio" | "citas" | "eventos" | "rendimiento" | "perfil";

export function getWaitMin(reg: RecentRegistration): number {
  if (!reg.time) return 0;
  const [h, m] = reg.time.split(":").map(Number);
  const now = new Date();
  const arr = new Date();
  arr.setHours(h, m, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - arr.getTime()) / 60000));
}

export function fmtTime(time: string | null): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m).padStart(2, "0")} ${period}`;
}

export function getLevel(reg: RecentRegistration, now: Date): Level {
  if (reg.docsDelivered) return "completo";
  if (reg.attended) return "atendido";
  if (isAbandonedRecord(reg, now)) return "urgente";
  if (isDelayedRecord(reg, now)) return "demorado";
  if (getWaitMin(reg) <= 5) return "fresco";
  return "esperando";
}

export const LEVEL_CFG: Record<Level, { color: string; bg: string; label: string; order: number }> = {
  urgente: { color: "#d35c4f", bg: "rgba(211,92,79,0.08)", label: "Urgente", order: 0 },
  demorado: { color: "#d4864a", bg: "rgba(212,134,74,0.06)", label: "Demorado", order: 1 },
  esperando: { color: "#c4c0b4", bg: "transparent", label: "Esperando", order: 2 },
  fresco: { color: "#6bbd8a", bg: "rgba(107,189,138,0.06)", label: "Llegó", order: 3 },
  atendido: { color: "#6ba7ff", bg: "rgba(107,167,255,0.06)", label: "En atención", order: 4 },
  completo: { color: "#6bbd8a", bg: "transparent", label: "Completo", order: 5 },
};
