import { NextRequest, NextResponse } from "next/server";
import { getReporteData, getCompanySettings } from "@/app/actions";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

// ── Paleta de colores SmartGuard ───────────────────────────────────────────
const C = {
  navy:       "0F172A",
  navyLight:  "1E293B",
  accent:     "3B82F6",
  accentDark: "1D4ED8",
  green:      "22C55E",
  greenBg:    "DCFCE7",
  yellow:     "EAB308",
  yellowBg:   "FEF9C3",
  orange:     "E07B3A",
  orangeBg:   "FFEDD5",
  red:        "EF4444",
  redBg:      "FEE2E2",
  blue:       "3B82F6",
  blueBg:     "DBEAFE",
  white:      "FFFFFF",
  gray50:     "F8FAFC",
  gray100:    "F1F5F9",
  gray200:    "E2E8F0",
  gray500:    "64748B",
  gray700:    "334155",
  ink:        "0F172A",
};

function segColor(name: string): { fg: string; bg: string } {
  if (name.includes("90") || name === "Crítico")  return { fg: C.red,    bg: C.redBg    };
  if (name.includes("45") || name === "Alto")     return { fg: C.orange, bg: C.orangeBg };
  if (name.includes("30") || name === "Moderado") return { fg: C.yellow, bg: C.yellowBg };
  return { fg: C.green, bg: C.greenBg };
}

function waitColor(min: number | null): { fg: string; bg: string } {
  if (min === null)  return { fg: C.gray500, bg: C.gray100 };
  if (min >= 90)     return { fg: C.red,    bg: C.redBg    };
  if (min >= 45)     return { fg: C.orange, bg: C.orangeBg };
  if (min >= 30)     return { fg: C.yellow, bg: C.yellowBg };
  return               { fg: C.green, bg: C.greenBg };
}

function pctColor(pct: number | null): { fg: string; bg: string } {
  if (pct === null)  return { fg: C.gray500, bg: C.gray100 };
  if (pct >= 80)     return { fg: C.green,  bg: C.greenBg  };
  if (pct >= 60)     return { fg: C.yellow, bg: C.yellowBg };
  return               { fg: C.red,   bg: C.redBg    };
}

// ── Helpers de formato ─────────────────────────────────────────────────────

type WsRow = ExcelJS.Row;

function styleHeaderRow(row: WsRow, bgHex: string = C.navy, fgHex: string = C.white) {
  row.eachCell(cell => {
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bgHex } };
    cell.font   = { bold: true, color: { argb: "FF" + fgHex }, size: 9 };
    cell.border = { bottom: { style: "thin", color: { argb: "FF" + C.accent } } };
  });
  row.height = 22;
}

function styleDataCell(
  cell: ExcelJS.Cell,
  opts: { fg?: string; bg?: string; bold?: boolean; align?: ExcelJS.Alignment["horizontal"] } = {}
) {
  const { fg = C.ink, bg, bold = false, align = "left" } = opts;
  if (bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + bg } };
  cell.font      = { bold, color: { argb: "FF" + fg }, size: 9 };
  cell.alignment = { horizontal: align, vertical: "middle" };
  cell.border    = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
}

function setRowHeight(row: WsRow, h = 18) { row.height = h; }

function addSectionTitle(ws: ExcelJS.Worksheet, title: string, colSpan: number, rowNum: number) {
  const row = ws.getRow(rowNum);
  const cell = row.getCell(1);
  cell.value = title.toUpperCase();
  cell.font  = { bold: true, color: { argb: "FF" + C.accent }, size: 8 };
  cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.navyLight } };
  cell.alignment = { horizontal: "left", vertical: "middle" };
  ws.mergeCells(rowNum, 1, rowNum, colSpan);
  row.height = 20;
}

// ── Route handler ──────────────────────────────────────────────────────────

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

  const companyName = company?.name    ?? "SmartGuard";
  const sector      = company?.sector  ?? "";
  const logoUrl     = company?.logo_url ?? null;
  const ts          = new Date().toLocaleDateString("en-CA");
  const now         = new Date().toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "long", timeStyle: "short" });
  const filenameBase = `reporte_smartguard_${plant.toLowerCase().replace(/\s+/g, "_")}_${timeframe.toLowerCase()}_${ts}`;

  const wb = new ExcelJS.Workbook();
  wb.creator  = "SmartGuard";
  wb.created  = new Date();
  wb.modified = new Date();

  // ── Fetch logo for embedding ─────────────────────────────────────────────
  let logoImageId: number | null = null;
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const ct = res.headers.get("content-type") ?? "image/png";
        const ext = ct.includes("jpeg") || ct.includes("jpg") ? "jpeg" : "png";
        logoImageId = wb.addImage({ base64, extension: ext as "jpeg" | "png" });
      }
    } catch { /* logo fetch failed — skip */ }
  }

  // ════════════════════════════════════════════════════════════════════════
  // HOJA 0 — PORTADA
  // ════════════════════════════════════════════════════════════════════════
  const wsPortada = wb.addWorksheet("Portada", { properties: { tabColor: { argb: "FF" + C.accent } } });
  wsPortada.views = [{ showGridLines: false }];
  wsPortada.columns = [{ width: 5 }, { width: 30 }, { width: 30 }, { width: 20 }];

  // Fondo azul oscuro en el área de portada
  for (let r = 1; r <= 35; r++) {
    const row = wsPortada.getRow(r);
    row.height = 18;
    for (let c = 1; c <= 4; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.navy } };
    }
  }

  // Logo
  if (logoImageId !== null) {
    wsPortada.addImage(logoImageId, { tl: { col: 1, row: 2 }, ext: { width: 120, height: 60 } });
  }

  // Título empresa
  const titleRow = wsPortada.getRow(8);
  const titleCell = titleRow.getCell(2);
  titleCell.value = companyName.toUpperCase();
  titleCell.font  = { bold: true, size: 22, color: { argb: "FF" + C.white } };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  wsPortada.mergeCells(8, 2, 8, 4);
  titleRow.height = 36;

  // Sector
  if (sector) {
    const secRow = wsPortada.getRow(9);
    const secCell = secRow.getCell(2);
    secCell.value = sector.toUpperCase();
    secCell.font  = { size: 10, color: { argb: "FF" + C.accent } };
    secCell.alignment = { horizontal: "left", vertical: "middle" };
    wsPortada.mergeCells(9, 2, 9, 4);
    secRow.height = 20;
  }

  // Línea decorativa
  for (let c = 2; c <= 4; c++) {
    const cell = wsPortada.getRow(11).getCell(c);
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.accent } };
    cell.border = {};
  }
  wsPortada.getRow(11).height = 4;

  // Metadatos del reporte
  const meta = [
    ["REPORTE ANALÍTICO DE ACCESO VEHICULAR", ""],
    ["Planta / Sede",  plant],
    ["Período",        timeframe],
    ["Generado el",    now],
    ["Sistema",        "SmartGuard — Control Vehicular Industrial"],
  ];
  meta.forEach(([label, value], i) => {
    const row = wsPortada.getRow(13 + i);
    row.height = 20;
    const lCell = row.getCell(2);
    const vCell = row.getCell(3);
    lCell.value = label;
    lCell.font  = { size: i === 0 ? 11 : 9, bold: i === 0, color: { argb: "FF" + (i === 0 ? C.white : C.gray500) } };
    lCell.alignment = { horizontal: "left", vertical: "middle" };
    vCell.value = value;
    vCell.font  = { size: 9, bold: true, color: { argb: "FF" + C.white } };
    vCell.alignment = { horizontal: "left", vertical: "middle" };
  });

  // KPI summary en portada
  const kpiDefs = [
    { label: "Total Atenciones",  value: data.total,                                            color: C.white   },
    { label: "% A Tiempo",        value: data.pctOnTime !== null ? `${data.pctOnTime}%` : "—", color: C.green   },
    { label: "Prom. Espera",      value: `${data.avgEspera} min`,                               color: pctColor(data.pctOnTime).fg },
    { label: "Pendientes",        value: data.pending,                                          color: C.blue    },
    { label: "Críticos (>90min)", value: data.critico,                                          color: C.red     },
  ];

  wsPortada.getRow(20).height = 10; // spacer
  addSectionTitle(wsPortada, "Resumen ejecutivo", 4, 21);
  kpiDefs.forEach((k, i) => {
    const row = wsPortada.getRow(22 + i);
    row.height = 22;
    const lCell = row.getCell(2);
    const vCell = row.getCell(3);
    lCell.value = k.label;
    lCell.font  = { size: 9, color: { argb: "FF" + C.gray500 } };
    lCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.navyLight } };
    lCell.alignment = { horizontal: "left", vertical: "middle" };
    vCell.value = k.value;
    vCell.font  = { size: 11, bold: true, color: { argb: "FF" + k.color } };
    vCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.navyLight } };
    vCell.alignment = { horizontal: "right", vertical: "middle" };
  });

  // ════════════════════════════════════════════════════════════════════════
  // HOJA 1 — RESUMEN GENERAL
  // ════════════════════════════════════════════════════════════════════════
  const wsResumen = wb.addWorksheet("Resumen General", { properties: { tabColor: { argb: "FF22C55E" } } });
  wsResumen.views = [{ showGridLines: true }];
  wsResumen.columns = [
    { width: 38 }, { width: 20 }, { width: 5 },
  ];

  let r = 1;
  // Encabezado empresa
  const compRow = wsResumen.getRow(r++);
  wsResumen.mergeCells(1, 1, 1, 3);
  compRow.getCell(1).value = `${companyName} — Reporte ${timeframe} · Planta: ${plant} · ${now}`;
  compRow.getCell(1).font  = { bold: true, size: 10, color: { argb: "FF" + C.white } };
  compRow.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.navy } };
  compRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  compRow.height = 24;

  r++; // spacer
  addSectionTitle(wsResumen, "Indicadores Clave de Desempeño (KPIs)", 3, r++);

  const kpiRows = [
    ["Total de atenciones",              data.total,        null],
    ["A tiempo (< 30 min)",              data.ok,           null],
    ["Moderado (30–45 min)",             data.warn,         null],
    ["Alto (45–90 min)",                 data.alto,         null],
    ["Crítico (> 90 min)",               data.critico,      null],
    ["Pendientes (sin cierre)",          data.pending,      null],
    ["% A tiempo",                       data.pctOnTime !== null ? `${data.pctOnTime}%` : "N/A", null],
    ["Tiempo promedio de espera (min)",  data.avgEspera,    null],
    ["Tiempo máximo de espera (min)",    data.maxEspera,    null],
    ["Percentil 90 de espera (min)",     data.p90Espera,    null],
  ];

  kpiRows.forEach(([label, value], i) => {
    const row = wsResumen.getRow(r++);
    setRowHeight(row);
    const lCell = row.getCell(1);
    const vCell = row.getCell(2);
    lCell.value = label;
    lCell.font  = { size: 9, color: { argb: "FF" + C.gray700 } };
    lCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + (i % 2 === 0 ? C.white : C.gray50) } };
    lCell.alignment = { horizontal: "left", vertical: "middle" };
    vCell.value = value;
    vCell.font  = { size: 9, bold: true, color: { argb: "FF" + C.ink } };
    vCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + (i % 2 === 0 ? C.white : C.gray50) } };
    vCell.alignment = { horizontal: "right", vertical: "middle" };
    vCell.border = { right: { style: "thin", color: { argb: "FF" + C.gray200 } } };
  });

  r++;
  addSectionTitle(wsResumen, "Distribución por Segmento", 3, r++);
  const segHeader = wsResumen.getRow(r++);
  segHeader.values = ["", "Segmento", "Rango", "Cantidad", "% del total"];
  styleHeaderRow(segHeader, C.navyLight);
  segHeader.getCell(1).value = "";

  data.segments.forEach((s, i) => {
    const row = wsResumen.getRow(r++);
    const colors = segColor(s.name);
    setRowHeight(row);
    row.values = ["", s.name, s.range, s.count, `${s.pct}%`];
    [2, 3, 4, 5].forEach(c => {
      styleDataCell(row.getCell(c), { fg: colors.fg, bg: i % 2 === 0 ? colors.bg : C.white, align: c >= 4 ? "right" : "left" });
    });
    row.getCell(4).font = { bold: true, color: { argb: "FF" + colors.fg }, size: 9 };
  });

  wsResumen.addConditionalFormatting({
    ref: `B${r - data.segments.length}:E${r - 1}`,
    rules: [],
  });

  // ════════════════════════════════════════════════════════════════════════
  // HOJA 2 — POR PLANTA
  // ════════════════════════════════════════════════════════════════════════
  const wsPlanta = wb.addWorksheet("Por Planta", { properties: { tabColor: { argb: "FF3B82F6" } } });
  wsPlanta.columns = [
    { width: 24 }, { width: 10 }, { width: 12 }, { width: 16 },
    { width: 12 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 20 },
  ];

  const ph = wsPlanta.getRow(1);
  wsPlanta.mergeCells(1, 1, 1, 9);
  ph.getCell(1).value = `${companyName} — Comparativo por Planta · ${timeframe}`;
  ph.getCell(1).font  = { bold: true, size: 10, color: { argb: "FF" + C.white } };
  ph.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.navy } };
  ph.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  ph.height = 24;

  wsPlanta.addRow([]);
  const plantHeader = wsPlanta.addRow([
    "Planta", "Total", "A tiempo", "Moderado (30–45)", "Alto (45–90)",
    "Crítico (>90)", "Pendientes", "% A tiempo", "Prom. espera (min)",
  ]);
  styleHeaderRow(plantHeader, C.navy);
  plantHeader.height = 24;

  data.plantStats.forEach((p, i) => {
    const row = wsPlanta.addRow([
      p.planta, p.total, p.ok, p.warn, p.alto,
      p.critico, p.pending,
      p.pctOnTime !== null ? `${p.pctOnTime}%` : "N/A",
      p.avg,
    ]);
    setRowHeight(row);
    const bg = i % 2 === 0 ? C.white : C.gray50;
    [1,2,3,4,5,6,7].forEach(c => styleDataCell(row.getCell(c), { bg, align: c === 1 ? "left" : "right" }));
    const pc = pctColor(p.pctOnTime);
    styleDataCell(row.getCell(8), { fg: pc.fg, bg: pc.bg, bold: true, align: "right" });
    const wc = waitColor(p.avg);
    styleDataCell(row.getCell(9), { fg: wc.fg, bg: wc.bg, bold: true, align: "right" });
  });

  wsPlanta.views = [{ state: "frozen", ySplit: 3 }];

  // ════════════════════════════════════════════════════════════════════════
  // HOJA 3 — EMPRESAS CON MAYOR DEMORA
  // ════════════════════════════════════════════════════════════════════════
  const wsEmpresas = wb.addWorksheet("Empresas c. Demora", { properties: { tabColor: { argb: "FFEF4444" } } });
  wsEmpresas.columns = [
    { width: 5 }, { width: 40 }, { width: 16 }, { width: 20 }, { width: 20 }, { width: 16 },
  ];

  const eh = wsEmpresas.getRow(1);
  wsEmpresas.mergeCells(1, 1, 1, 6);
  eh.getCell(1).value = `${companyName} — Empresas / Transportistas con Mayor Demora (espera ≥ 30 min) · ${timeframe}`;
  eh.getCell(1).font  = { bold: true, size: 10, color: { argb: "FF" + C.white } };
  eh.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.navy } };
  eh.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  eh.height = 24;

  wsEmpresas.addRow([]);
  const emHeader = wsEmpresas.addRow(["#", "Empresa / Transportista", "N° de demoras", "Prom. espera (min)", "Máx. espera (min)", "Tendencia"]);
  styleHeaderRow(emHeader, C.navy);

  data.topCompanies.forEach((c, i) => {
    const trend = c.trend === "up" ? "↑ Empeorando" : c.trend === "down" ? "↓ Mejorando" : "— Estable";
    const trendFg = c.trend === "up" ? C.red : c.trend === "down" ? C.green : C.gray500;
    const row = wsEmpresas.addRow([i + 1, c.empresa, c.count, c.avgEspera, c.maxEspera, trend]);
    setRowHeight(row);
    const bg = i % 2 === 0 ? C.white : C.gray50;
    styleDataCell(row.getCell(1), { bg, align: "center", fg: C.gray500 });
    styleDataCell(row.getCell(2), { bg, bold: true });
    styleDataCell(row.getCell(3), { bg: C.redBg, fg: C.red, bold: true, align: "right" });
    const wc = waitColor(c.avgEspera);
    styleDataCell(row.getCell(4), { fg: wc.fg, bg: wc.bg, align: "right" });
    const wc2 = waitColor(c.maxEspera);
    styleDataCell(row.getCell(5), { fg: wc2.fg, bg: wc2.bg, align: "right" });
    styleDataCell(row.getCell(6), { fg: trendFg, bg, bold: true });
  });

  wsEmpresas.views = [{ state: "frozen", ySplit: 3 }];

  // ════════════════════════════════════════════════════════════════════════
  // HOJA 4 — TIPOS DE OPERACIÓN
  // ════════════════════════════════════════════════════════════════════════
  const wsOps = wb.addWorksheet("Tipos de Operación", { properties: { tabColor: { argb: "FFEAB308" } } });
  wsOps.columns = [{ width: 36 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 20 }];

  const oh = wsOps.getRow(1);
  wsOps.mergeCells(1, 1, 1, 5);
  oh.getCell(1).value = `${companyName} — Tipos de Operación · ${timeframe}`;
  oh.getCell(1).font  = { bold: true, size: 10, color: { argb: "FF" + C.white } };
  oh.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.navy } };
  oh.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  oh.height = 24;

  wsOps.addRow([]);
  const opHeader = wsOps.addRow(["Tipo de Operación", "Total registros", "Con demora", "% demora", "Prom. espera (min)"]);
  styleHeaderRow(opHeader, C.navy);

  data.opTypes.forEach((o, i) => {
    const row = wsOps.addRow([o.tipo, o.count, o.delayed, `${o.pctDelayed}%`, o.avgEspera]);
    setRowHeight(row);
    const bg = i % 2 === 0 ? C.white : C.gray50;
    styleDataCell(row.getCell(1), { bg });
    styleDataCell(row.getCell(2), { bg, align: "right" });
    styleDataCell(row.getCell(3), { bg: C.redBg, fg: C.red, align: "right" });
    const demFg = o.pctDelayed >= 50 ? C.red : o.pctDelayed >= 25 ? C.orange : C.green;
    styleDataCell(row.getCell(4), { fg: demFg, bg, bold: true, align: "right" });
    const wc = waitColor(o.avgEspera);
    styleDataCell(row.getCell(5), { fg: wc.fg, bg: wc.bg, align: "right" });
  });

  // ════════════════════════════════════════════════════════════════════════
  // HOJA 5 — MOTIVOS DE DEMORA
  // ════════════════════════════════════════════════════════════════════════
  if (data.delayReasons.length > 0) {
    const wsDem = wb.addWorksheet("Motivos de Demora", { properties: { tabColor: { argb: "FFE07B3A" } } });
    wsDem.columns = [{ width: 44 }, { width: 20 }, { width: 16 }];

    const dh = wsDem.getRow(1);
    wsDem.mergeCells(1, 1, 1, 3);
    dh.getCell(1).value = `${companyName} — Motivos de Demora · ${timeframe}`;
    dh.getCell(1).font  = { bold: true, size: 10, color: { argb: "FF" + C.white } };
    dh.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.navy } };
    dh.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    dh.height = 24;

    wsDem.addRow([]);
    const demHeader = wsDem.addRow(["Motivo de Demora", "Cantidad de casos", "% del total"]);
    styleHeaderRow(demHeader, C.navy);

    data.delayReasons.forEach((dr, i) => {
      const pct = data.total > 0 ? Math.round((dr.count / data.total) * 100) : 0;
      const row = wsDem.addRow([dr.motivo, dr.count, `${pct}%`]);
      setRowHeight(row);
      const bg = i % 2 === 0 ? C.white : C.gray50;
      styleDataCell(row.getCell(1), { bg });
      styleDataCell(row.getCell(2), { bg: C.redBg, fg: C.red, bold: true, align: "right" });
      styleDataCell(row.getCell(3), { bg, align: "right" });
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // HOJA 6 — RENDIMIENTO DE AGENTES
  // ════════════════════════════════════════════════════════════════════════
  if (data.agentStats.length > 0) {
    const wsAgentes = wb.addWorksheet("Agentes", { properties: { tabColor: { argb: "FF6366F1" } } });
    wsAgentes.columns = [
      { width: 32 }, { width: 10 }, { width: 12 }, { width: 14 },
      { width: 12 }, { width: 13 }, { width: 20 },
    ];

    const agh = wsAgentes.getRow(1);
    wsAgentes.mergeCells(1, 1, 1, 7);
    agh.getCell(1).value = `${companyName} — Rendimiento de Agentes / Guardias · ${timeframe}`;
    agh.getCell(1).font  = { bold: true, size: 10, color: { argb: "FF" + C.white } };
    agh.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.navy } };
    agh.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    agh.height = 24;

    wsAgentes.addRow([]);
    const agHeader = wsAgentes.addRow([
      "Agente / Guardia", "Total", "A tiempo", "Con demora",
      "Pendiente", "% A tiempo", "Prom. espera (min)",
    ]);
    styleHeaderRow(agHeader, C.navy);

    data.agentStats.forEach((a, i) => {
      const row = wsAgentes.addRow([
        a.agente, a.total, a.ok, a.delayed,
        a.pending,
        a.pctOnTime !== null ? `${a.pctOnTime}%` : "N/A",
        a.avgEspera !== null ? a.avgEspera        : "N/A",
      ]);
      setRowHeight(row);
      const bg = i % 2 === 0 ? C.white : C.gray50;
      [1,2,3,4,5].forEach(c => styleDataCell(row.getCell(c), { bg, align: c === 1 ? "left" : "right" }));
      const pc = pctColor(a.pctOnTime);
      styleDataCell(row.getCell(6), { fg: pc.fg, bg: pc.bg, bold: true, align: "right" });
      const wc = waitColor(a.avgEspera);
      styleDataCell(row.getCell(7), { fg: wc.fg, bg: wc.bg, align: "right" });
    });

    wsAgentes.views = [{ state: "frozen", ySplit: 3 }];
  }

  // ════════════════════════════════════════════════════════════════════════
  // HOJA 7 — TENDENCIA DIARIA
  // ════════════════════════════════════════════════════════════════════════
  if (data.trendData && data.trendData.length > 0) {
    const wsTrend = wb.addWorksheet("Tendencia", { properties: { tabColor: { argb: "FF94A3B8" } } });
    wsTrend.columns = [{ width: 18 }, { width: 10 }, { width: 12 }, { width: 12 }];

    const th = wsTrend.getRow(1);
    wsTrend.mergeCells(1, 1, 1, 4);
    th.getCell(1).value = `${companyName} — Tendencia por Período · ${timeframe}`;
    th.getCell(1).font  = { bold: true, size: 10, color: { argb: "FF" + C.white } };
    th.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + C.navy } };
    th.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    th.height = 24;

    wsTrend.addRow([]);
    const trHeader = wsTrend.addRow(["Período", "Total", "A tiempo", "Con demora"]);
    styleHeaderRow(trHeader, C.navy);

    data.trendData.forEach((t, i) => {
      const row = wsTrend.addRow([t.label ?? t.date, t.total, t.onTime, t.delayed]);
      setRowHeight(row);
      const bg = i % 2 === 0 ? C.white : C.gray50;
      styleDataCell(row.getCell(1), { bg });
      styleDataCell(row.getCell(2), { bg, align: "right" });
      styleDataCell(row.getCell(3), { bg: C.greenBg, fg: C.green, align: "right" });
      styleDataCell(row.getCell(4), { bg: C.redBg,   fg: C.red,   align: "right" });
    });
  }

  // ── Serialize and respond ────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const nodeBuffer = Buffer.from(buffer);

  return new NextResponse(nodeBuffer, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      "Cache-Control":       "no-store",
    },
  });
}
