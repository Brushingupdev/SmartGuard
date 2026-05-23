import type {
  getAlertLogs,
  getAlertsData,
  getGuardiaEventosAlertas,
  getIncidentsByDate,
} from "@/app/actions";

export type AlertsData = Awaited<ReturnType<typeof getAlertsData>>;

export type AlertSummary = AlertsData["alerts"][number] & {
  company_id?: string | null;
  isLive?: boolean;
  motivo_demora?: string | null;
  responsable?: string | null;
  agente?: string | null;
};

export type IncidentAlert = Awaited<ReturnType<typeof getIncidentsByDate>>[number] & {
  isLive?: boolean;
};

export type AlertDetail = AlertSummary | IncidentAlert;
export type AlertLogRow = Awaited<ReturnType<typeof getAlertLogs>>[number];
export type GuardiaEventosAlertData = Awaited<
  ReturnType<typeof getGuardiaEventosAlertas>
>;
export type GuardiaEventoAlert = GuardiaEventosAlertData["events"][number];
export type AlertHistoryPoint = AlertsData["histChart"][number];
export type AlertKpis = AlertsData["kpis"];
