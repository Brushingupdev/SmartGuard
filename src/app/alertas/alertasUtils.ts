import type {
  AlertHistoryPoint,
  AlertKpis,
  AlertLogRow,
} from "./alertasTypes";

export const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const EMPTY_KPIS: AlertKpis = {
  total: 0,
  enEspera: 0,
  criticos: 0,
  altos: 0,
  moderados: 0,
};

export function hasFullDate(value: unknown): value is AlertHistoryPoint {
  return Boolean(
    value &&
      typeof value === "object" &&
      "fullDate" in value &&
      typeof value.fullDate === "string"
  );
}

export function severityConfig(espera: number | null) {
  if (espera == null) {
    return {
      label: "N/A",
      color: "var(--sg-muted)",
      border: "var(--sg-line)",
      bg: "transparent",
    };
  }
  if (espera >= 90) {
    return {
      label: "Crítico",
      color: "var(--sg-danger)",
      border: "var(--sg-danger)",
      bg: "rgba(211,92,79,0.08)",
    };
  }
  if (espera >= 45) {
    return {
      label: "Alto",
      color: "#e07b3a",
      border: "#e07b3a",
      bg: "rgba(224,123,58,0.08)",
    };
  }
  return {
    label: "Moderado",
    color: "var(--sg-warn)",
    border: "var(--sg-warn)",
    bg: "rgba(200,168,75,0.08)",
  };
}

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function formatFullDate(iso: string) {
  const [, mm, dd] = iso.split("-");
  return `${parseInt(dd)} ${MONTHS[parseInt(mm) - 1]}`;
}

export function paginateAlertLogs(
  rows: AlertLogRow[],
  page: number,
  pageSize: number
) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  return {
    totalPages,
    currentPage,
    rows: rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  };
}
