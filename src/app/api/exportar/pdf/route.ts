import { NextRequest, NextResponse } from "next/server";
import { getReporteData, getCompanySettings } from "@/app/actions";
import { formatGateLabelFromPlant } from "@/lib/gates";

export const runtime = "nodejs";

// ── Color helpers ─────────────────────────────────────────────────────────────

function pctColor(pct: number | null): string {
  if (pct == null) return "#6b7280";
  if (pct >= 80)   return "#22c55e";
  if (pct >= 60)   return "#eab308";
  return "#ef4444";
}

function esperaColor(min: number | null): string {
  if (min == null) return "#6b7280";
  if (min < 30)    return "#22c55e";
  if (min < 45)    return "#eab308";
  if (min < 90)    return "#e07b3a";
  return "#ef4444";
}

function segmentColor(name: string): string {
  if (name === "Normal")    return "#22c55e";
  if (name === "Moderado")  return "#eab308";
  if (name === "Alto")      return "#e07b3a";
  if (name === "Crítico")   return "#ef4444";
  return "#3b82f6";
}

// ── HTML builder ──────────────────────────────────────────────────────────────

function buildHtml(
  data: NonNullable<Awaited<ReturnType<typeof getReporteData>>>,
  companyName: string,
  logoUrl: string | null,
  plant: string,
  timeframe: string,
  segments?: string[] | null,
  soloDemoras?: boolean,
  site?: string | null,
  sector?: string | null,
  contactName?: string | null,
): string {
  const now = new Date().toLocaleString("es-PE", {
    timeZone:   "America/Lima",
    year:       "numeric",
    month:      "long",
    day:        "numeric",
    hour:       "2-digit",
    minute:     "2-digit",
  });

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="Logo" class="logo" />`
    : `<div class="logo-fallback">SG</div>`;

  // Tendencia diaria (últimos N períodos)
  const trendHtml = data.trendData && data.trendData.length > 0
    ? `<table>
        <thead><tr>
          <th>Período</th>
          <th style="text-align:right">Total</th>
          <th style="text-align:right">A tiempo</th>
          <th style="text-align:right">Con demora</th>
        </tr></thead>
        <tbody>
          ${data.trendData.map((t, i) => `
            <tr class="${i % 2 === 0 ? "even" : ""}">
              <td>${t.label ?? t.date}</td>
              <td class="num">${t.total}</td>
              <td class="num ok">${t.onTime}</td>
              <td class="num crit">${t.delayed}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>`
    : `<p class="empty">Sin datos de tendencia en este período</p>`;

  // Horas pico (top 3 horas con más demoras)
  const peakHours = data.flowData && data.flowData.length > 0
    ? [...data.flowData]
        .sort((a, b) => b.deny - a.deny)
        .slice(0, 5)
        .filter(h => h.deny > 0)
    : [];
  const peakHoursHtml = peakHours.length > 0
    ? peakHours.map(h => `
        <div class="peak-row">
          <span class="peak-hour">${String(h.h).padStart(2,"0")}:00</span>
          <div class="peak-bars">
            <div class="peak-bar ok-bar"  style="width:${Math.round((h.ok  / (h.ok + h.warn + h.deny || 1)) * 100)}%"></div>
            <div class="peak-bar warn-bar" style="width:${Math.round((h.warn / (h.ok + h.warn + h.deny || 1)) * 100)}%"></div>
            <div class="peak-bar deny-bar" style="width:${Math.round((h.deny / (h.ok + h.warn + h.deny || 1)) * 100)}%"></div>
          </div>
          <span class="peak-count crit">${h.deny} demora${h.deny !== 1 ? "s" : ""}</span>
        </div>
      `).join("")
    : `<p class="empty">Sin horas pico registradas</p>`;

  // KPI cards
  const kpis = [
    { label: "Total atenciones", value: String(data.total),                                                  color: "#e2e8f0" },
    { label: "% A tiempo",       value: data.pctOnTime !== null ? `${data.pctOnTime}%` : "—",               color: pctColor(data.pctOnTime) },
    { label: "Prom. espera",     value: `${data.avgEspera} min`,                                             color: esperaColor(data.avgEspera) },
    { label: "Máx. espera",      value: `${data.maxEspera} min`,                                             color: esperaColor(data.maxEspera) },
    { label: "Percentil 90",     value: `${data.p90Espera} min`,                                             color: esperaColor(data.p90Espera) },
    { label: "Pendientes",       value: String(data.pending),                                                color: "#3b82f6" },
  ];

  const kpiHtml = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-value" style="color:${k.color}">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
    </div>
  `).join("");

  // Segments bar
  const segBars = data.segments
    .filter(s => s.count > 0)
    .map(s => `
      <div class="seg-row">
        <div class="seg-meta">
          <span class="seg-dot" style="background:${segmentColor(s.name)}"></span>
          <span class="seg-name">${s.name}</span>
          <span class="seg-range">${s.range}</span>
          <span class="seg-count">${s.count} <span class="seg-pct">(${s.pct}%)</span></span>
        </div>
        <div class="seg-track">
          <div class="seg-fill" style="width:${s.pct}%;background:${segmentColor(s.name)}"></div>
        </div>
      </div>
    `).join("");

  // Plant stats table
  const plantRows = data.plantStats.map((p, i) => `
    <tr class="${i % 2 === 0 ? "even" : ""}">
      <td><strong>${formatGateLabelFromPlant(p.planta)}</strong></td>
      <td class="num">${p.total}</td>
      <td class="num ok">${p.ok}</td>
      <td class="num warn">${p.warn}</td>
      <td class="num high">${p.alto}</td>
      <td class="num crit">${p.critico}</td>
      <td class="num info">${p.pending}</td>
      <td class="num" style="color:${pctColor(p.pctOnTime)}">${p.pctOnTime !== null ? `${p.pctOnTime}%` : "—"}</td>
      <td class="num" style="color:${esperaColor(p.avg)}">${p.avg} min</td>
    </tr>
  `).join("");

  // Top companies table
  const compRows = data.topCompanies.slice(0, 10).map((c, i) => `
    <tr class="${i % 2 === 0 ? "even" : ""}">
      <td class="num muted">${i + 1}</td>
      <td><strong>${c.empresa}</strong></td>
      <td class="num crit">${c.count}</td>
      <td class="num" style="color:${esperaColor(c.avgEspera)}">${c.avgEspera} min</td>
      <td class="num" style="color:${esperaColor(c.maxEspera)}">${c.maxEspera} min</td>
      <td class="num ${c.trend === "up" ? "crit" : c.trend === "down" ? "ok" : "muted"}">
        ${c.trend === "up" ? "↑ Empeorando" : c.trend === "down" ? "↓ Mejorando" : "— Estable"}
      </td>
    </tr>
  `).join("");

  // Op types table
  const opRows = data.opTypes.map((o, i) => `
    <tr class="${i % 2 === 0 ? "even" : ""}">
      <td>${o.tipo}</td>
      <td class="num">${o.count}</td>
      <td class="num crit">${o.delayed}</td>
      <td class="num" style="color:${pctColor(100 - o.pctDelayed)}">${o.pctDelayed}%</td>
      <td class="num" style="color:${esperaColor(o.avgEspera)}">${o.avgEspera} min</td>
    </tr>
  `).join("");

  // Delay reasons list
  const maxReasonCount = data.delayReasons.length ? Math.max(...data.delayReasons.map(r => r.count)) : 1;
  const reasonsHtml = data.delayReasons.length === 0
    ? `<p class="empty">Sin motivos registrados en este período</p>`
    : data.delayReasons.map((r, i) => `
        <div class="reason-row">
          <span class="reason-rank">${String(i + 1).padStart(2, "0")}</span>
          <div class="reason-body">
            <div class="reason-meta">
              <span class="reason-name">${r.motivo}</span>
              <span class="reason-count">${r.count} casos</span>
            </div>
            <div class="reason-track">
              <div class="reason-fill" style="width:${Math.round((r.count / maxReasonCount) * 100)}%"></div>
            </div>
          </div>
        </div>
      `).join("");

  // Agent stats table
  const agentRows = data.agentStats.map((a, i) => `
    <tr class="${i % 2 === 0 ? "even" : ""}">
      <td><strong>${a.agente}</strong></td>
      <td class="num">${a.total}</td>
      <td class="num ok">${a.ok}</td>
      <td class="num crit">${a.delayed}</td>
      <td class="num info">${a.pending}</td>
      <td class="num" style="color:${pctColor(a.pctOnTime)}">${a.pctOnTime !== null ? `${a.pctOnTime}%` : "—"}</td>
      <td class="num" style="color:${esperaColor(a.avgEspera)}">${a.avgEspera !== null ? `${a.avgEspera} min` : "—"}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte SmartGuard — ${companyName}</title>
  <style>
    /* ── Reset & base ────────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 11px;
      color: #0f172a;
      background: #f8fafc;
      line-height: 1.45;
    }

    /* ── Print button (hidden when printing) ─────────────────────────── */
    .print-bar {
      background: #1e293b;
      color: #e2e8f0;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 100;
      font-size: 12px;
    }
    .print-bar span { font-family: monospace; font-size: 11px; opacity: 0.7; }
    .print-btn {
      background: #3b82f6;
      color: #fff;
      border: none;
      padding: 7px 20px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      border-radius: 3px;
    }
    .print-btn:hover { background: #2563eb; }

    /* ── Page wrapper ───────────────────────────────────────────────── */
    .page {
      max-width: 940px;
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 0 0 1px #e2e8f0;
    }

    /* ── Header ─────────────────────────────────────────────────────── */
    .report-header {
      background: #0f172a;
      color: #fff;
      padding: 28px 32px 24px;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border-radius: 4px;
      background: #fff;
      padding: 4px;
      flex-shrink: 0;
    }
    .logo-fallback {
      width: 64px;
      height: 64px;
      background: #1e40af;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -1px;
      color: #fff;
      flex-shrink: 0;
    }
    .header-info { flex: 1; }
    .header-badge {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #3b82f6;
      margin-bottom: 4px;
    }
    .header-company {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #fff;
      margin-bottom: 6px;
    }
    .header-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .header-pill {
      background: rgba(59,130,246,0.18);
      border: 1px solid rgba(59,130,246,0.35);
      color: #93c5fd;
      padding: 2px 10px;
      font-size: 10px;
      font-family: monospace;
      letter-spacing: 0.06em;
    }
    .header-timestamp {
      font-size: 9px;
      color: #64748b;
      margin-top: 8px;
      font-family: monospace;
    }
    .header-sg {
      text-align: right;
    }
    .header-sg-logo {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: #3b82f6;
    }
    .header-sg-sub {
      font-size: 9px;
      color: #475569;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    /* ── Accent bar ─────────────────────────────────────────────────── */
    .accent-bar {
      height: 4px;
      background: linear-gradient(90deg, #3b82f6 0%, #6366f1 35%, #22c55e 65%, #eab308 85%, #ef4444 100%);
    }

    /* ── Sections ───────────────────────────────────────────────────── */
    .section {
      padding: 24px 32px;
      border-bottom: 1px solid #e2e8f0;
    }
    .section:last-child { border-bottom: none; }
    .section-title {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #3b82f6;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::after {
      content: "";
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }

    /* ── KPI grid ───────────────────────────────────────────────────── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
    }
    .kpi-card {
      background: #0f172a;
      padding: 14px 12px 12px;
      border-radius: 4px;
      text-align: center;
    }
    .kpi-value {
      font-size: 22px;
      font-weight: 800;
      font-family: "Courier New", monospace;
      line-height: 1;
      margin-bottom: 6px;
    }
    .kpi-label {
      font-size: 8.5px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #64748b;
    }

    /* ── Segments ───────────────────────────────────────────────────── */
    .seg-row { margin-bottom: 12px; }
    .seg-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 5px;
    }
    .seg-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .seg-name { font-weight: 700; font-size: 11px; }
    .seg-range { color: #94a3b8; font-size: 10px; font-family: monospace; }
    .seg-count { margin-left: auto; font-weight: 700; font-size: 12px; font-family: monospace; }
    .seg-pct { font-weight: 400; color: #64748b; }
    .seg-track {
      height: 6px;
      background: #f1f5f9;
      border-radius: 2px;
      overflow: hidden;
    }
    .seg-fill { height: 100%; border-radius: 2px; min-width: 2px; }

    /* ── Tables ─────────────────────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    thead tr {
      background: #1e293b;
      color: #e2e8f0;
    }
    th {
      padding: 8px 10px;
      text-align: left;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    td {
      padding: 7px 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    tr.even td { background: #f8fafc; }
    .num { text-align: right; font-family: monospace; font-weight: 600; }
    .muted { color: #94a3b8; }
    .ok   { color: #22c55e; }
    .warn { color: #eab308; }
    .high { color: #e07b3a; }
    .crit { color: #ef4444; }
    .info { color: #3b82f6; }

    /* ── Two-column layout ──────────────────────────────────────────── */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .col-section { padding: 0; border-bottom: none; }
    .col-section .section-title { font-size: 9px; }

    /* ── Delay reasons ──────────────────────────────────────────────── */
    .reason-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .reason-rank {
      font-family: monospace;
      font-size: 11px;
      font-weight: 800;
      color: #cbd5e1;
      flex-shrink: 0;
      width: 20px;
    }
    .reason-body { flex: 1; }
    .reason-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .reason-name { font-size: 11px; font-weight: 600; }
    .reason-count { font-family: monospace; font-size: 11px; color: #ef4444; font-weight: 700; }
    .reason-track {
      height: 4px;
      background: #f1f5f9;
      border-radius: 2px;
      overflow: hidden;
    }
    .reason-fill {
      height: 100%;
      background: #ef4444;
      opacity: 0.7;
      border-radius: 2px;
      min-width: 2px;
    }

    /* ── Footer ─────────────────────────────────────────────────────── */
    .report-footer {
      background: #0f172a;
      color: #475569;
      padding: 14px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      font-family: monospace;
      letter-spacing: 0.08em;
    }
    .footer-brand { color: #3b82f6; font-weight: 700; }

    .empty {
      color: #94a3b8;
      font-style: italic;
      font-size: 11px;
      padding: 8px 0;
    }

    /* ── Peak hours ─────────────────────────────────────────────────── */
    .peak-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .peak-hour {
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      width: 42px;
      flex-shrink: 0;
    }
    .peak-bars {
      flex: 1;
      height: 8px;
      background: #f1f5f9;
      border-radius: 2px;
      display: flex;
      overflow: hidden;
    }
    .peak-bar { height: 100%; min-width: 1px; }
    .ok-bar   { background: #22c55e; }
    .warn-bar { background: #eab308; }
    .deny-bar { background: #ef4444; }
    .peak-count {
      font-family: monospace;
      font-size: 10px;
      font-weight: 700;
      width: 70px;
      text-align: right;
      flex-shrink: 0;
    }

    /* ── Print styles ───────────────────────────────────────────────── */
    @media print {
      body { background: #fff; font-size: 10px; }
      .print-bar { display: none !important; }
      .page { box-shadow: none; max-width: 100%; }
      .section { padding: 16px 24px; break-inside: avoid; }
      .kpi-card { background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead tr { background: #1e293b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr.even td { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .accent-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .seg-fill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .reason-fill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report-header { background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report-footer { background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 1.2cm; size: A4; }
    }
  </style>
</head>
<body>

  <!-- Print toolbar (hidden in print) -->
  <div class="print-bar">
    <span>SMARTGUARD · REPORTE ANALÍTICO · ${companyName} · ${timeframe}</span>
    <button class="print-btn" onclick="window.print()">⬇ Guardar como PDF</button>
  </div>

  <div class="page">

    <!-- Header -->
    <div class="report-header">
      ${logoHtml}
      <div class="header-info">
        <div class="header-badge">SmartGuard · Reporte Analítico de Acceso Vehicular Industrial</div>
        <div class="header-company">${companyName}</div>
        <div class="header-meta">
          ${sector ? `<span class="header-pill">SECTOR: ${sector}</span>` : ""}
          <span class="header-pill">PUERTA: ${formatGateLabelFromPlant(plant)}</span>
          <span class="header-pill">PERÍODO: ${timeframe}</span>
          ${site && site !== "Todas" ? `<span class="header-pill">SEDE: ${site}</span>` : ""}
          ${segments && segments.length > 0 ? `<span class="header-pill">SEGMENTOS: ${segments.join(", ")}</span>` : ""}
          ${soloDemoras ? `<span class="header-pill">SOLO DEMORAS</span>` : ""}
        </div>
        <div class="header-timestamp">Generado el ${now}${contactName ? ` · Responsable: ${contactName}` : ""}</div>
      </div>
      <div class="header-sg">
        <div class="header-sg-logo">SMART<br/>GUARD</div>
        <div class="header-sg-sub">Control de acceso</div>
      </div>
    </div>

    <div class="accent-bar"></div>

    <!-- KPIs -->
    <div class="section">
      <div class="section-title">Indicadores Clave de Desempeño</div>
      <div class="kpi-grid">
        ${kpiHtml}
      </div>
    </div>

    <!-- Segments + Plant breakdown -->
    <div class="section">
      <div class="two-col">
        <div class="col-section">
          <div class="section-title">Distribución por Segmento</div>
          ${segBars}
        </div>
        <div class="col-section">
          <div class="section-title">Resumen Detallado</div>
          <table>
            <thead><tr>
              <th>Segmento</th><th>Rango</th><th style="text-align:right">Cant.</th><th style="text-align:right">%</th>
            </tr></thead>
            <tbody>
              ${data.segments.map((s, i) => `
                <tr class="${i % 2 === 0 ? "even" : ""}">
                  <td style="color:${segmentColor(s.name)};font-weight:700">${s.name}</td>
                  <td class="muted" style="font-family:monospace">${s.range}</td>
                  <td class="num">${s.count}</td>
                  <td class="num muted">${s.pct}%</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Plant comparison -->
    ${data.plantStats.length > 0 ? `
    <div class="section">
      <div class="section-title">Comparativo por Puerta</div>
      <table>
        <thead><tr>
          <th>Puerta</th>
          <th style="text-align:right">Total</th>
          <th style="text-align:right">A tiempo</th>
          <th style="text-align:right">Moderado</th>
          <th style="text-align:right">Alto</th>
          <th style="text-align:right">Crítico</th>
          <th style="text-align:right">Pendiente</th>
          <th style="text-align:right">% Puntual</th>
          <th style="text-align:right">Prom. espera</th>
        </tr></thead>
        <tbody>${plantRows}</tbody>
      </table>
    </div>
    ` : ""}

    <!-- Top companies -->
    ${data.topCompanies.length > 0 ? `
    <div class="section">
      <div class="section-title">Empresas con Mayor Demora — Top 10 (espera ≥ 30 min)</div>
      <table>
        <thead><tr>
          <th>#</th>
          <th>Empresa / Transportista</th>
          <th style="text-align:right">Demoras</th>
          <th style="text-align:right">Prom. espera</th>
          <th style="text-align:right">Máx. espera</th>
          <th style="text-align:right">Tendencia</th>
        </tr></thead>
        <tbody>${compRows}</tbody>
      </table>
    </div>
    ` : ""}

    <!-- Op types + Delay reasons side by side -->
    <div class="section">
      <div class="two-col">
        <div class="col-section">
          <div class="section-title">Tipos de Operación</div>
          ${data.opTypes.length === 0 ? '<p class="empty">Sin datos</p>' : `
          <table>
            <thead><tr>
              <th>Tipo</th>
              <th style="text-align:right">Total</th>
              <th style="text-align:right">Demoras</th>
              <th style="text-align:right">% dem.</th>
              <th style="text-align:right">Prom.</th>
            </tr></thead>
            <tbody>${opRows}</tbody>
          </table>
          `}
        </div>
        <div class="col-section">
          <div class="section-title">Motivos de Demora</div>
          ${reasonsHtml}
        </div>
      </div>
    </div>

    <!-- Agent stats -->
    ${data.agentStats.length > 0 ? `
    <div class="section">
      <div class="section-title">Rendimiento de Agentes / Guardias — Top 10 por volumen</div>
      <table>
        <thead><tr>
          <th>Agente / Guardia</th>
          <th style="text-align:right">Total</th>
          <th style="text-align:right">A tiempo</th>
          <th style="text-align:right">Con demora</th>
          <th style="text-align:right">Pendiente</th>
          <th style="text-align:right">% Puntual</th>
          <th style="text-align:right">Prom. espera</th>
        </tr></thead>
        <tbody>${agentRows}</tbody>
      </table>
    </div>
    ` : ""}

    <!-- Tendencia + Horas pico -->
    <div class="section">
      <div class="two-col">
        <div class="col-section">
          <div class="section-title">Tendencia por Período</div>
          ${trendHtml}
        </div>
        <div class="col-section">
          <div class="section-title">Horas con Mayor Demora</div>
          ${peakHoursHtml}
          ${peakHours.length > 0 ? `
          <div style="display:flex;gap:12px;margin-top:10px;font-size:9px;color:#64748b;">
            <span><span style="display:inline-block;width:10px;height:10px;background:#22c55e;border-radius:2px;margin-right:4px;"></span>A tiempo</span>
            <span><span style="display:inline-block;width:10px;height:10px;background:#eab308;border-radius:2px;margin-right:4px;"></span>Moderado</span>
            <span><span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:2px;margin-right:4px;"></span>Con demora</span>
          </div>` : ""}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="report-footer">
      <span><span class="footer-brand">SMARTGUARD</span> · Control de Acceso Vehicular Industrial${sector ? ` · ${sector}` : ""}</span>
      <span>${companyName} · ${formatGateLabelFromPlant(plant)} · ${timeframe}</span>
      <span>Generado ${now}</span>
    </div>

  </div>

  <script>
    // Auto-trigger print after page renders
    window.addEventListener("load", function() {
      setTimeout(function() { window.print(); }, 600);
    });
  </script>
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const plant       = searchParams.get("plant")       ?? "Todos";
  const timeframe   = searchParams.get("timeframe")   ?? "Día";
  const segmentsRaw = searchParams.get("segments")    ?? undefined;
  const soloDemoras = searchParams.get("soloDemoras") === "1";
  const site        = searchParams.get("site")        ?? undefined;

  const segments = segmentsRaw ? segmentsRaw.split(",") : undefined;

  const [data, company] = await Promise.all([
    getReporteData(plant, timeframe, segments, soloDemoras, site),
    getCompanySettings(),
  ]);

  if (!data) {
    return new NextResponse(
      "<html><body><h2>Sin datos o sin autorización</h2></body></html>",
      { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const companyName = company?.name         ?? "SmartGuard";
  const logoUrl     = company?.logo_url     ?? null;
  const sector      = company?.sector       ?? null;
  const contactName = company?.contact_name ?? null;

  const html = buildHtml(data, companyName, logoUrl, plant, timeframe, segments, soloDemoras, site, sector, contactName);

  return new NextResponse(html, {
    headers: {
      "Content-Type":  "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
