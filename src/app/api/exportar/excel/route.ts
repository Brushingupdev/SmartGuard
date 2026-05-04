import { NextRequest, NextResponse } from "next/server";
import { getReporteData, getCompanySettings } from "@/app/actions";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const plant     = searchParams.get("plant")     ?? "Todos";
  const timeframe = searchParams.get("timeframe") ?? "Día";

  const [data, company] = await Promise.all([
    getReporteData(plant, timeframe),
    getCompanySettings(),
  ]);

  if (!data) {
    return NextResponse.json({ error: "Sin datos o sin autorización" }, { status: 401 });
  }

  // Dynamic import to avoid edge-runtime issues
  const XLSX = await import("@e965/xlsx");

  const wb   = XLSX.utils.book_new();
  const ts   = new Date().toLocaleDateString("en-CA");
  const now  = new Date().toLocaleString("es-PE", { timeZone: "America/Lima" });
  const companyName   = company?.name   ?? "SmartGuard";
  const filenameBase  = `reporte_smartguard_${plant.toLowerCase().replace(/\s+/g, "_")}_${timeframe.toLowerCase()}_${ts}`;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function header(sheet: (string | number | null)[][], companyN: string, section: string) {
    sheet.push(
      [`SMARTGUARD — ${section}`],
      [`Empresa: ${companyN}   ·   Planta: ${plant}   ·   Período: ${timeframe}   ·   Generado: ${now}`],
      [],
    );
  }

  // ── Sheet 1 — Resumen General ──────────────────────────────────────────────

  const s1: (string | number | null)[][] = [];
  header(s1, companyName, "REPORTE ANALÍTICO DE ACCESO VEHICULAR");
  s1.push(
    ["INDICADORES CLAVE"],
    ["Métrica", "Valor"],
    ["Total de atenciones",               data.total],
    ["A tiempo (< 30 min)",               data.ok],
    ["Moderado (30–45 min)",              data.warn],
    ["Alto (45–90 min)",                  data.alto],
    ["Crítico (> 90 min)",                data.critico],
    ["Pendientes (sin cierre)",           data.pending],
    ["% A tiempo",                        data.pctOnTime !== null ? `${data.pctOnTime}%` : "N/A"],
    ["Tiempo promedio de espera (min)",   data.avgEspera],
    ["Tiempo máximo de espera (min)",     data.maxEspera],
    ["Percentil 90 de espera (min)",      data.p90Espera],
    [],
    ["DISTRIBUCIÓN POR SEGMENTO"],
    ["Segmento", "Rango", "Cantidad", "% del total"],
    ...data.segments.map(s => [s.name, s.range, s.count, `${s.pct}%`]),
  );

  const ws1 = XLSX.utils.aoa_to_sheet(s1);
  ws1["!cols"] = [{ wch: 38 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Resumen");

  // ── Sheet 2 — Comparativo por Planta ──────────────────────────────────────

  const s2: (string | number | null)[][] = [];
  header(s2, companyName, "COMPARATIVO POR PLANTA");
  s2.push(
    ["Planta", "Total", "A tiempo", "Moderado (30-45)", "Alto (45-90)", "Crítico (90+)", "Pendientes", "% A tiempo", "Prom. espera (min)"],
    ...data.plantStats.map(p => [
      p.planta, p.total, p.ok, p.warn, p.alto, p.critico, p.pending,
      p.pctOnTime !== null ? `${p.pctOnTime}%` : "N/A",
      p.avg,
    ]),
  );

  const ws2 = XLSX.utils.aoa_to_sheet(s2);
  ws2["!cols"] = [
    { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 18 },
    { wch: 15 }, { wch: 15 }, { wch: 13 }, { wch: 14 }, { wch: 20 },
  ];
  ws2["!freeze"] = { xSplit: 0, ySplit: 4 };
  XLSX.utils.book_append_sheet(wb, ws2, "Por Planta");

  // ── Sheet 3 — Empresas con Mayor Demora ───────────────────────────────────

  const s3: (string | number | null)[][] = [];
  header(s3, companyName, "EMPRESAS CON MAYOR DEMORA");
  s3.push(
    ["Nota: espera ≥ 30 min — top 10 empresas"],
    [],
    ["#", "Empresa / Transportista", "N° de demoras", "Prom. espera (min)", "Máx. espera (min)", "Tendencia"],
    ...data.topCompanies.map((c, i) => [
      i + 1,
      c.empresa,
      c.count,
      c.avgEspera,
      c.maxEspera,
      c.trend === "up"   ? "↑ Empeorando"
      : c.trend === "down" ? "↓ Mejorando"
      :                     "— Estable",
    ]),
  );

  const ws3 = XLSX.utils.aoa_to_sheet(s3);
  ws3["!cols"] = [
    { wch: 5 }, { wch: 40 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 16 },
  ];
  ws3["!freeze"] = { xSplit: 0, ySplit: 6 };
  XLSX.utils.book_append_sheet(wb, ws3, "Empresas c. Demora");

  // ── Sheet 4 — Tipos de Operación ──────────────────────────────────────────

  const s4: (string | number | null)[][] = [];
  header(s4, companyName, "TIPOS DE OPERACIÓN");
  s4.push(
    ["Tipo de Operación", "Total registros", "Con demora", "% demora", "Prom. espera (min)"],
    ...data.opTypes.map(o => [
      o.tipo, o.count, o.delayed, `${o.pctDelayed}%`, o.avgEspera,
    ]),
  );

  const ws4 = XLSX.utils.aoa_to_sheet(s4);
  ws4["!cols"] = [{ wch: 36 }, { wch: 17 }, { wch: 14 }, { wch: 12 }, { wch: 20 }];
  ws4["!freeze"] = { xSplit: 0, ySplit: 4 };
  XLSX.utils.book_append_sheet(wb, ws4, "Tipos de Operación");

  // ── Sheet 5 — Motivos de Demora ───────────────────────────────────────────

  if (data.delayReasons.length > 0) {
    const s5: (string | number | null)[][] = [];
    header(s5, companyName, "MOTIVOS DE DEMORA");
    s5.push(
      ["Motivo de Demora", "Cantidad de casos", "% del total"],
      ...data.delayReasons.map(r => [
        r.motivo,
        r.count,
        data.total > 0 ? `${Math.round((r.count / data.total) * 100)}%` : "N/A",
      ]),
    );

    const ws5 = XLSX.utils.aoa_to_sheet(s5);
    ws5["!cols"] = [{ wch: 44 }, { wch: 20 }, { wch: 14 }];
    ws5["!freeze"] = { xSplit: 0, ySplit: 4 };
    XLSX.utils.book_append_sheet(wb, ws5, "Motivos de Demora");
  }

  // ── Sheet 6 — Rendimiento de Agentes ──────────────────────────────────────

  if (data.agentStats.length > 0) {
    const s6: (string | number | null)[][] = [];
    header(s6, companyName, "RENDIMIENTO DE AGENTES / GUARDIAS");
    s6.push(
      ["Agente / Guardia", "Total", "A tiempo", "Con demora", "Pendiente", "% A tiempo", "Prom. espera (min)"],
      ...data.agentStats.map(a => [
        a.agente, a.total, a.ok, a.delayed, a.pending,
        a.pctOnTime !== null ? `${a.pctOnTime}%`    : "N/A",
        a.avgEspera !== null ? a.avgEspera           : "N/A",
      ]),
    );

    const ws6 = XLSX.utils.aoa_to_sheet(s6);
    ws6["!cols"] = [
      { wch: 32 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 13 }, { wch: 20 },
    ];
    ws6["!freeze"] = { xSplit: 0, ySplit: 4 };
    XLSX.utils.book_append_sheet(wb, ws6, "Agentes");
  }

  // ── Write + respond ────────────────────────────────────────────────────────

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      "Cache-Control":       "no-store",
    },
  });
}
