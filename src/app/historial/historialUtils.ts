import { formatGateLabelFromPlant } from "@/lib/gates";
import type { HistorialRecord } from "./historialTypes";

export const fmt = new Intl.NumberFormat("en-US");

export function getOperationalMetric(
  record: Pick<HistorialRecord, "demora_cita_min" | "espera_min">
): number | null {
  return record.demora_cita_min ?? record.espera_min ?? null;
}

export function getWaitLabel(wait: number | null) {
  if (wait == null) {
    return {
      text: "Pendiente",
      badge: "sg-badge-muted",
      color: "var(--sg-muted)",
    };
  }
  if (wait >= 90) {
    return {
      text: "Crítico",
      badge: "sg-badge-deny",
      color: "var(--sg-danger)",
    };
  }
  if (wait >= 45) {
    return {
      text: "Alto",
      badge: "sg-badge-warn",
      color: "#e07b3a",
    };
  }
  if (wait >= 30) {
    return {
      text: "Moderado",
      badge: "sg-badge-info",
      color: "var(--sg-info)",
    };
  }
  return {
    text: "Normal",
    badge: "sg-badge-ok",
    color: "var(--sg-success)",
  };
}

export function exportCSV(rows: HistorialRecord[]) {
  const headers = [
    "ID",
    "Fecha",
    "H.Registro",
    "H.Atencion",
    "H.Dev.Docs",
    "Razon_Social",
    "Empresa",
    "Puerta",
    "Tipo",
    "Tipo_Operacion",
    "Motivo_Demora",
    "Espera_Planta_Min",
    "Demora_Cita_Min",
    "Tiempo_Total_Min",
    "Segmento",
    "Responsable",
    "Agente",
    "Observacion",
  ];
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.fecha,
        row.h_registro ?? "",
        row.h_atencion ?? "",
        row.h_dev_docs ?? "",
        `"${(row.razon_social ?? "").replace(/"/g, '""')}"`,
        `"${(row.empresa ?? "").replace(/"/g, '""')}"`,
        formatGateLabelFromPlant(row.planta ?? ""),
        row.tipo ?? "",
        row.tipo_operacion ?? "",
        row.motivo_demora ?? "",
        row.espera_min ?? "",
        row.demora_cita_min ?? "",
        row.tiempo_total_min ?? "",
        row.segmento_espera ?? "",
        row.responsable ?? "",
        row.agente ?? "",
        `"${(row.observacion ?? "").replace(/"/g, '""')}"`,
      ].join(",")
    );
  }

  const blob = new Blob(["﻿" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `historial_smartguard_${new Date().toLocaleDateString("en-CA")}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
