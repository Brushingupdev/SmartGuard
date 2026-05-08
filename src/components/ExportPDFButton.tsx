"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileDown, Loader2 } from "lucide-react";
import { getReporteData } from "@/app/actions";
import { formatGateLabelFromPlant } from "@/lib/gates";

interface Props {
  plant: string;
  timeframe: string;
  kpis: { ok: number; deny: number; warn: number; pending: number; total: number };
  puntualidad: number | null;
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function ExportPDFButton({ plant, timeframe, kpis, puntualidad }: Props) {
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);
    try {
      const data = await getReporteData(plant, timeframe);
      const now = new Date();
      const fecha = `${now.getDate()} de ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

      // Build printable content
      const printWindow = window.open("", "_blank");
      if (!printWindow) { alert("Permite ventanas emergentes para exportar el reporte."); setGenerating(false); return; }

      const css = `
        body { font-family: 'Segoe UI', system-ui, sans-serif; background:#0a0c0b; color:#d4cfc6; padding:40px; margin:0; }
        .header { border-bottom:2px solid #c8a84b; padding-bottom:20px; margin-bottom:30px; }
        .header h1 { color:#c8a84b; font-size:24px; text-transform:uppercase; margin:0; letter-spacing:4px; }
        .header p { color:#6a706c; font-size:12px; margin:5px 0 0; }
        .kpis { display:flex; gap:16px; margin-bottom:30px; flex-wrap:wrap; }
        .kpi { flex:1; min-width:140px; border:1px solid #2a2d2b; padding:16px; }
        .kpi .val { font-size:28px; font-weight:bold; color:#c8a84b; }
        .kpi .lbl { font-size:10px; text-transform:uppercase; color:#6a706c; margin-top:4px; letter-spacing:2px; }
        table { width:100%; border-collapse:collapse; margin-top:20px; }
        th { text-align:left; border-bottom:1px solid #2a2d2b; padding:8px 12px; font-size:10px; text-transform:uppercase; color:#6a706c; letter-spacing:2px; }
        td { border-bottom:1px solid #151716; padding:8px 12px; font-size:12px; color:#d4cfc6; }
        .footer { margin-top:40px; border-top:1px solid #2a2d2b; padding-top:20px; font-size:10px; color:#6a706c; }
        .footer .logo { color:#c8a84b; font-weight:bold; text-transform:uppercase; letter-spacing:3px; }
        @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
      `;

      const segments = data?.segments ?? [];
      const delayReasons = data?.delayReasons ?? [];

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>SmartGuard — Reporte ${fecha}</title><style>${css}</style></head>
        <body>
          <div class="header">
            <h1>SmartGuard</h1>
            <p>Reporte Operativo — ${fecha} | Puerta: ${formatGateLabelFromPlant(plant)} | Período: ${timeframe}</p>
          </div>
          <div class="kpis">
            <div class="kpi"><div class="val" style="color:#6bbd8a">${kpis.ok}</div><div class="lbl">A tiempo (&lt;30 min)</div></div>
            <div class="kpi"><div class="val" style="color:#c8a84b">${kpis.warn}</div><div class="lbl">Revisión (30–45 min)</div></div>
            <div class="kpi"><div class="val" style="color:#d35c4f">${kpis.deny}</div><div class="lbl">Con demora (&gt;45 min)</div></div>
            <div class="kpi"><div class="val">${kpis.total}</div><div class="lbl">Total atenciones</div></div>
            ${puntualidad != null ? `<div class="kpi"><div class="val" style="color:#6bbd8a">${puntualidad}%</div><div class="lbl">Puntualidad</div></div>` : ""}
          </div>
          <h3 style="color:#c8a84b;text-transform:uppercase;letter-spacing:2px;font-size:14px;margin:30px 0 10px;">Distribución por segmento</h3>
          <table>
            <tr><th>Segmento</th><th>Rango</th><th>Cantidad</th><th>%</th></tr>
            ${segments.map(s => `<tr><td>${s.name}</td><td>${s.range}</td><td>${s.count}</td><td>${s.pct}%</td></tr>`).join("")}
          </table>
          <h3 style="color:#c8a84b;text-transform:uppercase;letter-spacing:2px;font-size:14px;margin:30px 0 10px;">Causas de demora</h3>
          <table>
            <tr><th>Motivo</th><th>Cantidad</th></tr>
            ${delayReasons.map(r => `<tr><td>${r.motivo}</td><td>${r.count}</td></tr>`).join("") || '<tr><td colspan="2">Sin demoras registradas</td></tr>'}
          </table>
          <div class="footer">
            <div class="logo">SmartGuard</div>
            <p>Generado automáticamente el ${fecha}. Control Vehicular Industrial v1.0</p>
          </div>
          <script>window.onload=function(){window.print();};</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch {
      alert("Error al generar el reporte. Intenta de nuevo.");
    }
    setGenerating(false);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleExport}
      disabled={generating}
      className="flex items-center gap-2 border border-[var(--sg-accent)] bg-[var(--sg-panel-2)] px-4 py-2 sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-accent)] hover:bg-[var(--sg-accent)] hover:text-[var(--sg-canvas)] transition-colors disabled:opacity-50"
    >
      {generating ? (
        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
          <Loader2 className="h-4 w-4" />
        </motion.span>
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Exportar Reporte
    </motion.button>
  );
}
