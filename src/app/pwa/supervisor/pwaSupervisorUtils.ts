import { isAbandonedRecord, isDelayedRecord } from "@/app/registro/status";
import type { RecentRegistration } from "@/app/registro/types";

export function fmtShortDate(date: string | null): string {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
  });
}

export function fmtTime(t: string | null): string {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

export type Level =
  | "urgente"
  | "demorado"
  | "esperando"
  | "fresco"
  | "atendido"
  | "completo";

export function getWaitMin(reg: RecentRegistration): number {
  if (!reg.time) return 0;
  const [h, m] = reg.time.split(":").map(Number);
  const arr = new Date();
  arr.setHours(h, m, 0, 0);
  return Math.max(0, Math.floor((Date.now() - arr.getTime()) / 60000));
}

export function getLevel(reg: RecentRegistration, now: Date): Level {
  if (reg.docsDelivered) return "completo";
  if (reg.attended) return "atendido";
  if (isAbandonedRecord(reg, now)) return "urgente";
  if (isDelayedRecord(reg, now)) return "demorado";
  if (getWaitMin(reg) <= 5) return "fresco";
  return "esperando";
}

export const LEVEL_CFG: Record<
  Level,
  { color: string; bg: string; label: string; order: number }
> = {
  urgente: {
    color: "#d35c4f",
    bg: "rgba(211,92,79,0.08)",
    label: "Urgente",
    order: 0,
  },
  demorado: {
    color: "#d4864a",
    bg: "rgba(212,134,74,0.06)",
    label: "Demorado",
    order: 1,
  },
  esperando: {
    color: "#c4c0b4",
    bg: "transparent",
    label: "Esperando",
    order: 2,
  },
  fresco: {
    color: "#6bbd8a",
    bg: "rgba(107,189,138,0.06)",
    label: "Llegó",
    order: 3,
  },
  atendido: {
    color: "#6ba7ff",
    bg: "rgba(107,167,255,0.06)",
    label: "En atención",
    order: 4,
  },
  completo: {
    color: "#6bbd8a",
    bg: "transparent",
    label: "Completo",
    order: 5,
  },
};

export type Tab = "inicio" | "vehiculos" | "citas" | "perfil";
