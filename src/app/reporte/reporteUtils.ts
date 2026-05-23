import { formatGateLabelFromPlant } from "@/lib/gates";
import type { ReporteData } from "./reporteTypes";

export const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function exportReporteCSV(
  data: ReporteData,
  plant: string,
  timeframe: string,
  selectedSegments: string[],
  soloDemoras: boolean,
  compareMode?: string
) {
  const ts = new Date().toLocaleDateString("en-CA");
  const bom = "\ufeff";
  const filters: string[] = [];
  if (compareMode && compareMode !== "Todas") {
    filters.push(`Sede: ${compareMode}`);
  }
  if (selectedSegments.length > 0) {
    filters.push(`Segmentos: ${selectedSegments.join(", ")}`);
  }
  if (soloDemoras) {
    filters.push("Solo demoras");
  }
  const filtersLine =
    filters.length > 0 ? `Filtros: ${filters.join(" | ")}` : "";

  const lines: string[] = [
    "SmartGuard — Reporte Analítico",
    `Puerta: ${formatGateLabelFromPlant(plant)} | Período: ${timeframe} | Generado: ${ts}`,
    ...(filtersLine ? [filtersLine] : []),
    "",
    "RESUMEN GENERAL",
    "Total,A tiempo,Moderado,Alto,Crítico,Pendiente,% A tiempo,Prom. espera (min),Máx. espera (min),P90 (min)",
    `${data.total},${data.ok},${data.warn},${data.alto},${data.critico},${data.pending},${data.pctOnTime ?? ""},${data.avgEspera},${data.maxEspera},${data.p90Espera}`,
    "",
    "COMPARATIVO POR PUERTA",
    "Puerta,Total,A tiempo,Moderado,Alto,Crítico,Pendiente,% A tiempo,Prom. espera (min)",
    ...data.plantStats.map(
      (plantStat) =>
        `${formatGateLabelFromPlant(plantStat.planta)},${plantStat.total},${plantStat.ok},${plantStat.warn},${plantStat.alto},${plantStat.critico},${plantStat.pending},${plantStat.pctOnTime ?? ""},${plantStat.avg}`
    ),
    "",
    "EMPRESAS CON MAYOR DEMORA",
    "Empresa,Demoras,Prom. espera (min),Máx. espera (min)",
    ...data.topCompanies.map(
      (company) =>
        `"${company.empresa.replace(/"/g, '""')}",${company.count},${company.avgEspera},${company.maxEspera}`
    ),
    "",
    "SLA DE PROVEEDORES",
    "Proveedor,Visitas,A tiempo,Demoras,Tasa demora %,Grade,Prom. espera (min)",
    ...data.providerSLA.map(
      (provider) =>
        `"${provider.empresa.replace(/"/g, '""')}",${provider.total},${provider.onTime},${provider.delayed},${provider.rate}%,${provider.grade},${provider.avgEspera ?? "N/A"}`
    ),
    "",
    "TIPOS DE OPERACIÓN",
    "Tipo,Total,Con demora,% demora,Prom. espera (min)",
    ...data.opTypes.map(
      (operation) =>
        `"${operation.tipo.replace(/"/g, '""')}",${operation.count},${operation.delayed},${operation.pctDelayed},${operation.avgEspera}`
    ),
    ...(data.delayReasons.length > 0
      ? [
          "",
          "MOTIVOS DE DEMORA",
          "Motivo,Cantidad",
          ...data.delayReasons.map(
            (reason) =>
              `"${reason.motivo.replace(/"/g, '""')}",${reason.count}`
          ),
        ]
      : []),
    ...(data.agentStats.length > 0
      ? [
          "",
          "RENDIMIENTO DE AGENTES",
          "Agente,Total,A tiempo,Con demora,Pendiente,% A tiempo,Prom. espera (min)",
          ...data.agentStats.map(
            (agent) =>
              `"${agent.agente.replace(/"/g, '""')}",${agent.total},${agent.ok},${agent.delayed},${agent.pending},${agent.pctOnTime ?? ""},${agent.avgEspera ?? ""}`
          ),
        ]
      : []),
  ];

  const blob = new Blob([bom + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reporte_smartguard_${plant.toLowerCase().replace(/ /g, "_")}_${timeframe.toLowerCase()}_${ts}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function pctColor(pct: number | null) {
  if (pct == null) return "var(--sg-muted)";
  if (pct >= 80) return "var(--sg-success)";
  if (pct >= 60) return "var(--sg-warn)";
  return "var(--sg-danger)";
}

export function esperaColor(min: number | null) {
  if (min == null) return "var(--sg-muted)";
  if (min < 30) return "var(--sg-success)";
  if (min < 45) return "var(--sg-warn)";
  if (min < 90) return "#e07b3a";
  return "var(--sg-danger)";
}

export function rateColor(rate: number): string {
  if (rate <= 10) return "var(--sg-success)";
  if (rate <= 25) return "var(--sg-warn)";
  if (rate <= 50) return "#e07b3a";
  return "var(--sg-danger)";
}

export const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const HOURS_RANGE = Array.from({ length: 14 }, (_, index) => index + 6);

export function heatColor(rate: number | null): string {
  if (rate === null) return "transparent";
  if (rate === 0) return "rgba(107,189,138,0.25)";
  if (rate < 20) return "rgba(107,189,138,0.55)";
  if (rate < 40) return "rgba(200,168,75,0.55)";
  if (rate < 60) return "rgba(224,123,58,0.65)";
  return "rgba(211,92,79,0.75)";
}
