// SmartGuard – Presentation Generator
// Uses pptxgenjs to build a professional pitch deck in Spanish
// Run with: node generate_presentation.js
// Output:   SmartGuard_Presentacion.pptx

const pptxgen = require("pptxgenjs");

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy:    "0F2044",
  teal:    "0D9488",
  tealLt:  "14B8A6",
  amber:   "F59E0B",
  white:   "FFFFFF",
  offWhite:"F0F5FF",
  gray:    "64748B",
  grayLt:  "E2E8F0",
  red:     "EF4444",
  darkText:"1E293B",
  card:    "FFFFFF",
};

const FONT_H = "Calibri";
const FONT_B = "Calibri";

const makeShadow = () => ({
  type: "outer", color: "000000", opacity: 0.12, blur: 8, offset: 3, angle: 135,
});

function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: opts.fill || C.card },
    line: { color: opts.line || C.grayLt, width: opts.lineW || 1 },
    shadow: makeShadow(),
  });
}

function sectionLabel(slide, text, y = 0.18) {
  slide.addText(text.toUpperCase(), {
    x: 0.55, y, w: 9, h: 0.3,
    fontFace: FONT_B, fontSize: 9, color: C.teal, bold: true,
    charSpacing: 3, margin: 0,
  });
}

function slideTitle(slide, text, y = 0.52) {
  slide.addText(text, {
    x: 0.55, y, w: 8.9, h: 0.7,
    fontFace: FONT_H, fontSize: 30, color: C.navy, bold: true, margin: 0,
  });
}

// ─── Pres setup ───────────────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author  = "SmartGuard";
pres.title   = "SmartGuard — Control Vehicular Industrial";

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 – Cover
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.teal }, line: { color: C.teal, width: 0 },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.7, w: 0.07, h: 4.2,
    fill: { color: C.teal }, line: { color: C.teal, width: 0 },
  });
  s.addShape(pres.shapes.OVAL, {
    x: 0.75, y: 0.85, w: 1.1, h: 1.1,
    fill: { color: C.teal }, line: { color: C.tealLt, width: 2 },
  });
  s.addText("SG", {
    x: 0.75, y: 0.85, w: 1.1, h: 1.1,
    fontFace: FONT_H, fontSize: 28, color: C.white, bold: true,
    align: "center", valign: "middle", margin: 0,
  });
  s.addText("SmartGuard", {
    x: 2.1, y: 0.88, w: 7.5, h: 0.85,
    fontFace: FONT_H, fontSize: 46, color: C.white, bold: true, margin: 0,
  });
  s.addText("Control Vehicular Industrial", {
    x: 2.1, y: 1.72, w: 7.5, h: 0.55,
    fontFace: FONT_B, fontSize: 20, color: C.tealLt, margin: 0,
  });
  s.addShape(pres.shapes.LINE, {
    x: 0.65, y: 2.5, w: 8.7, h: 0,
    line: { color: "1E3A6A", width: 1.5 },
  });

  const props = [
    { icon: "⚡", text: "Alertas en tiempo real por Email y WhatsApp" },
    { icon: "📊", text: "Dashboard de KPIs y análisis de demoras" },
    { icon: "🏭", text: "Multi-planta · Multi-empresa · Roles RBAC" },
    { icon: "☁️",  text: "100% en la nube — sin instalación" },
  ];
  props.forEach((p, i) => {
    const yp = 2.7 + i * 0.6;
    s.addText(p.icon, { x: 0.65, y: yp, w: 0.5, h: 0.5, fontFace: FONT_B, fontSize: 16, align: "center", valign: "middle", margin: 0 });
    s.addText(p.text, { x: 1.2, y: yp + 0.03, w: 8.2, h: 0.45, fontFace: FONT_B, fontSize: 14, color: "A8C5E8", margin: 0, valign: "middle" });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.325, w: 10, h: 0.3, fill: { color: "0A1830" }, line: { color: "0A1830", width: 0 } });
  s.addText("Presentación Comercial · 2025", { x: 0.5, y: 5.33, w: 9, h: 0.28, fontFace: FONT_B, fontSize: 10, color: "4A6FA5", align: "center", margin: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 – El problema
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  sectionLabel(s, "El Desafío");
  slideTitle(s, "Las plantas industriales pierden tiempo sin saberlo");

  const problems = [
    { icon: "🕐", title: "Sin control de tiempos", desc: "Las esperas de camiones y vehículos se registran en papel o Excel, sin visibilidad en tiempo real.", color: C.red },
    { icon: "📵", title: "Alertas tardías o nulas", desc: "Los supervisores se enteran de las demoras horas después o cuando ya es un problema grave.", color: C.amber },
    { icon: "📋", title: "Sin trazabilidad", desc: "No existe historial confiable del flujo vehicular para tomar decisiones ni demostrar SLAs.", color: C.teal },
    { icon: "🏢", title: "Múltiples plantas, cero unificación", desc: "Cada planta opera por separado. No hay vista consolidada para la gerencia.", color: C.navy },
  ];

  problems.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 0.5 + col * 4.75;
    const cy = 1.45 + row * 1.75;
    const cw = 4.4;
    const ch = 1.55;
    card(s, cx, cy, cw, ch);
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: 0.07, h: ch, fill: { color: p.color }, line: { color: p.color, width: 0 } });
    s.addText(p.icon, { x: cx + 0.18, y: cy + 0.1, w: 0.55, h: 0.55, fontFace: FONT_B, fontSize: 22, align: "center", valign: "middle", margin: 0 });
    s.addText(p.title, { x: cx + 0.8, y: cy + 0.08, w: cw - 0.95, h: 0.4, fontFace: FONT_H, fontSize: 13, color: C.darkText, bold: true, margin: 0 });
    s.addText(p.desc, { x: cx + 0.8, y: cy + 0.48, w: cw - 0.95, h: 0.9, fontFace: FONT_B, fontSize: 11, color: C.gray, margin: 0, wrap: true });
  });

  s.addText("SmartGuard · Control Vehicular Industrial", { x: 0.5, y: 5.3, w: 9, h: 0.25, fontFace: FONT_B, fontSize: 9, color: C.gray, align: "right", margin: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 – La solución
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  s.addText("LA SOLUCIÓN", { x: 0.55, y: 0.18, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 9, color: C.tealLt, bold: true, charSpacing: 3, margin: 0 });
  s.addText("SmartGuard digitaliza y automatiza\nel control vehicular de tu planta", { x: 0.55, y: 0.52, w: 8.9, h: 1.1, fontFace: FONT_H, fontSize: 28, color: C.white, bold: true, margin: 0 });

  const features = [
    { icon: "📝", title: "Registro digital en garita",  desc: "El guardia registra cada vehículo en un formulario web simple de 3 pasos, en segundos." },
    { icon: "⏱",  title: "Cronómetro automático",        desc: "El sistema mide el tiempo de espera desde el ingreso hasta la atención de forma automática." },
    { icon: "🔔", title: "Alertas por Email y WhatsApp", desc: "Si la espera supera el umbral, se notifica al supervisor de inmediato por ambos canales." },
    { icon: "📈", title: "Dashboard en tiempo real",     desc: "KPIs, gráficos de tendencia, heatmap semanal y ranking de operadores — todo actualizado al instante." },
    { icon: "🏢", title: "Gestión multi-empresa",        desc: "El administrador gestiona todas las empresas clientes y plantas desde un único panel." },
    { icon: "🔐", title: "Acceso por roles (RBAC)",      desc: "Guardia, Supervisor y Administrador — cada usuario ve solo lo que necesita." },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const cx = 0.35 + col * 3.1;
    const cy = 1.8 + Math.floor(i / 3) * 1.55;
    const cw = 2.9;
    const ch = 1.4;
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: cw, h: ch, fill: { color: "162B52" }, line: { color: "1E3A6A", width: 1 }, shadow: makeShadow() });
    s.addText(f.icon, { x: cx + 0.12, y: cy + 0.12, w: 0.5, h: 0.5, fontFace: FONT_B, fontSize: 20, align: "center", valign: "middle", margin: 0 });
    s.addText(f.title, { x: cx + 0.68, y: cy + 0.1, w: cw - 0.8, h: 0.42, fontFace: FONT_H, fontSize: 12, color: C.tealLt, bold: true, margin: 0 });
    s.addText(f.desc, { x: cx + 0.12, y: cy + 0.58, w: cw - 0.24, h: 0.75, fontFace: FONT_B, fontSize: 10.5, color: "93B4D8", margin: 0, wrap: true });
  });

  s.addText("SmartGuard · Control Vehicular Industrial", { x: 0.5, y: 5.3, w: 9, h: 0.25, fontFace: FONT_B, fontSize: 9, color: "2D4A7A", align: "right", margin: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 – Cómo funciona (flujo)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  sectionLabel(s, "El Flujo");
  slideTitle(s, "¿Cómo funciona? — 4 pasos simples");

  const steps = [
    { num: "01", color: C.teal,  title: "Ingreso a garita", desc: "El guardia registra el vehículo: patente, empresa, planta, razón de visita. 3 pasos rápidos en la app." },
    { num: "02", color: C.amber, title: "Atención en planta", desc: "El sistema inicia el cronómetro automáticamente. Si la espera supera el umbral configurado, dispara la alerta." },
    { num: "03", color: C.red,   title: "Alerta automática", desc: "El supervisor recibe email + WhatsApp con: vehículo, planta, hora de ingreso y minutos de espera." },
    { num: "04", color: C.navy,  title: "Cierre y reporte", desc: "Al entregar documentos se cierra la atención. Queda registrado en el historial para análisis y reportes." },
  ];

  steps.forEach((st, i) => {
    const cx = 0.4 + i * 2.35;
    const cy = 1.5;
    const cw = 2.15;
    const ch = 3.0;
    card(s, cx, cy, cw, ch, { lineW: 1.5, line: C.grayLt });
    s.addShape(pres.shapes.OVAL, { x: cx + (cw - 0.75) / 2, y: cy + 0.18, w: 0.75, h: 0.75, fill: { color: st.color }, line: { color: st.color, width: 0 } });
    s.addText(st.num, { x: cx + (cw - 0.75) / 2, y: cy + 0.18, w: 0.75, h: 0.75, fontFace: FONT_H, fontSize: 18, color: C.white, bold: true, align: "center", valign: "middle", margin: 0 });
    s.addText(st.title, { x: cx + 0.12, y: cy + 1.1, w: cw - 0.24, h: 0.55, fontFace: FONT_H, fontSize: 13, color: C.darkText, bold: true, align: "center", margin: 0, wrap: true });
    s.addText(st.desc, { x: cx + 0.12, y: cy + 1.7, w: cw - 0.24, h: 1.2, fontFace: FONT_B, fontSize: 10.5, color: C.gray, align: "center", margin: 0, wrap: true });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 4.65, w: 9.2, h: 0.5, fill: { color: "E0F2F1" }, line: { color: C.teal, width: 1 } });
  s.addText("💡  Todo el flujo queda registrado: historial filtrable, exportable a Excel y visible en el dashboard.", { x: 0.55, y: 4.66, w: 8.9, h: 0.48, fontFace: FONT_B, fontSize: 11, color: "065F46", valign: "middle", margin: 4 });
  s.addText("SmartGuard · Control Vehicular Industrial", { x: 0.5, y: 5.3, w: 9, h: 0.25, fontFace: FONT_B, fontSize: 9, color: C.gray, align: "right", margin: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 – Roles
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  sectionLabel(s, "Roles y Accesos");
  slideTitle(s, "Tres roles, un sistema unificado");

  const roles = [
    {
      icon: "🛡️", color: C.teal, title: "Guardia", sub: "Operación en garita",
      perms: ["Registrar ingreso de vehículo", "Ver estado de atenciones activas", "Cerrar atención al entregar documentos"],
      devices: "📱 Tablet o celular en garita",
    },
    {
      icon: "👔", color: C.amber, title: "Supervisor", sub: "Control operativo",
      perms: ["Dashboard con KPIs en tiempo real", "Historial y filtros por fecha/planta", "Recibir alertas de demora", "Reportes exportables"],
      devices: "💻 PC o celular en oficina",
    },
    {
      icon: "🏢", color: C.navy, title: "Administrador", sub: "Gestión SaaS multi-tenant",
      perms: ["Gestionar todas las empresas y plantas", "Ver puntaje de salud por cliente", "Gestión de usuarios y pagos", "Acceso de impersonación por empresa"],
      devices: "💻 Panel de administración exclusivo",
    },
  ];

  roles.forEach((r, i) => {
    const cx = 0.5 + i * 3.1;
    const cy = 1.45;
    const cw = 2.85;
    const ch = 3.7;
    card(s, cx, cy, cw, ch, { line: C.grayLt });
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: cw, h: 0.08, fill: { color: r.color }, line: { color: r.color, width: 0 } });
    s.addText(r.icon, { x: cx + 0.15, y: cy + 0.2, w: 0.6, h: 0.6, fontFace: FONT_B, fontSize: 24, align: "center", valign: "middle", margin: 0 });
    s.addText(r.title, { x: cx + 0.8, y: cy + 0.22, w: cw - 0.95, h: 0.38, fontFace: FONT_H, fontSize: 18, color: C.darkText, bold: true, margin: 0 });
    s.addText(r.sub, { x: cx + 0.8, y: cy + 0.6, w: cw - 0.95, h: 0.28, fontFace: FONT_B, fontSize: 10, color: r.color, bold: true, margin: 0 });
    s.addShape(pres.shapes.LINE, { x: cx + 0.15, y: cy + 1.02, w: cw - 0.3, h: 0, line: { color: C.grayLt, width: 1 } });
    r.perms.forEach((p, j) => {
      s.addText([
        { text: "✓ ", options: { color: r.color, bold: true } },
        { text: p, options: { color: C.darkText } },
      ], { x: cx + 0.18, y: cy + 1.12 + j * 0.52, w: cw - 0.33, h: 0.48, fontFace: FONT_B, fontSize: 10.5, margin: 0, wrap: true });
    });
    s.addShape(pres.shapes.RECTANGLE, { x: cx + 0.15, y: cy + ch - 0.45, w: cw - 0.3, h: 0.35, fill: { color: C.offWhite }, line: { color: C.grayLt, width: 1 } });
    s.addText(r.devices, { x: cx + 0.18, y: cy + ch - 0.45, w: cw - 0.33, h: 0.35, fontFace: FONT_B, fontSize: 9.5, color: C.gray, valign: "middle", margin: 0 });
  });

  s.addText("SmartGuard · Control Vehicular Industrial", { x: 0.5, y: 5.3, w: 9, h: 0.25, fontFace: FONT_B, fontSize: 9, color: C.gray, align: "right", margin: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 – Alertas
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.amber }, line: { color: C.amber, width: 0 } });
  s.addText("SISTEMA DE ALERTAS", { x: 0.55, y: 0.18, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 9, color: C.amber, bold: true, charSpacing: 3, margin: 0 });
  s.addText("Notificaciones automáticas cuando más importa", { x: 0.55, y: 0.52, w: 8.9, h: 0.65, fontFace: FONT_H, fontSize: 26, color: C.white, bold: true, margin: 0 });

  s.addText("¿Cómo funciona?", { x: 0.5, y: 1.35, w: 4.2, h: 0.38, fontFace: FONT_H, fontSize: 15, color: C.tealLt, bold: true, margin: 0 });

  const howSteps = [
    "El guardia registra el vehículo → comienza el cronómetro",
    "Cada minuto, el sistema revisa la cola de atenciones activas",
    "Si la espera supera el umbral (ej. 45 min), encola una alerta",
    "La alerta se envía por Email (Resend) y WhatsApp (Green API) simultáneamente",
    "El resultado queda registrado en el log de alertas para auditoría",
  ];
  howSteps.forEach((st, i) => {
    s.addShape(pres.shapes.OVAL, { x: 0.5, y: 1.82 + i * 0.63, w: 0.3, h: 0.3, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
    s.addText(String(i + 1), { x: 0.5, y: 1.82 + i * 0.63, w: 0.3, h: 0.3, fontFace: FONT_B, fontSize: 10, color: C.white, bold: true, align: "center", valign: "middle", margin: 0 });
    s.addText(st, { x: 0.88, y: 1.82 + i * 0.63, w: 4.1, h: 0.55, fontFace: FONT_B, fontSize: 10.5, color: "A8C5E8", margin: 0, wrap: true });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 5.35, y: 1.28, w: 4.2, h: 3.7, fill: { color: "162B52" }, line: { color: "1E3A6A", width: 1 }, shadow: makeShadow() });
  s.addText("📱  Mensaje WhatsApp recibido", { x: 5.5, y: 1.38, w: 3.9, h: 0.35, fontFace: FONT_B, fontSize: 10, color: C.tealLt, bold: true, margin: 0 });
  s.addShape(pres.shapes.LINE, { x: 5.5, y: 1.76, w: 3.9, h: 0, line: { color: "1E3A6A", width: 1 } });

  const msgLines = [
    { t: "⚠ SmartGuard — Alerta de Demora", b: true,  c: C.amber },
    { t: " ",                                b: false, c: C.white },
    { t: "TRANSLOGIC ABC-4521",              b: true,  c: C.white },
    { t: "🏭 QUIMICOS Y DERIVADOS · Lomas",  b: false, c: "93B4D8" },
    { t: "🕐 Ingreso: 09:52",                b: false, c: "93B4D8" },
    { t: "⏱ Espera: 121 min  🔴 Crítico",   b: true,  c: C.red   },
    { t: " ",                                b: false, c: C.white },
    { t: "Ver en plataforma → /alertas",     b: false, c: C.tealLt},
  ];
  msgLines.forEach((l, i) => {
    s.addText(l.t, { x: 5.5, y: 1.85 + i * 0.3, w: 3.9, h: 0.3, fontFace: FONT_B, fontSize: 11, color: l.c, bold: l.b, margin: 0 });
  });

  s.addText("Niveles de severidad", { x: 5.5, y: 4.25, w: 3.9, h: 0.3, fontFace: FONT_B, fontSize: 9, color: "4A6FA5", bold: true, margin: 0 });
  [
    { c: C.amber,  t: "🟡 Moderado  ≥ 45 min" },
    { c: "F97316", t: "🟠 Alto        ≥ 90 min" },
    { c: C.red,    t: "🔴 Crítico    ≥ 90 min" },
  ].forEach((sv, i) => {
    s.addText(sv.t, { x: 5.5, y: 4.55 + i * 0.25, w: 3.9, h: 0.25, fontFace: FONT_B, fontSize: 9.5, color: sv.c, margin: 0 });
  });

  s.addText("SmartGuard · Control Vehicular Industrial", { x: 0.5, y: 5.3, w: 9, h: 0.25, fontFace: FONT_B, fontSize: 9, color: "2D4A7A", align: "right", margin: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 – Dashboard
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  sectionLabel(s, "Panel del Supervisor");
  slideTitle(s, "Dashboard — Visibilidad total en tiempo real");

  const kpis = [
    { val: "12", label: "Vehículos hoy",  icon: "🚛", color: C.teal },
    { val: "34 min", label: "Espera promedio", icon: "⏱", color: C.amber },
    { val: "3",  label: "Alertas activas",  icon: "🔔", color: C.red },
    { val: "98%", label: "Tasa de cierre", icon: "✅", color: "059669" },
  ];
  kpis.forEach((k, i) => {
    const cx = 0.5 + i * 2.27;
    card(s, cx, 1.45, 2.05, 1.1, { lineW: 1.5, line: C.grayLt });
    s.addText(k.icon, { x: cx + 0.12, y: 1.52, w: 0.45, h: 0.45, fontFace: FONT_B, fontSize: 20, align: "center", valign: "middle", margin: 0 });
    s.addText(k.val, { x: cx + 0.62, y: 1.48, w: 1.35, h: 0.48, fontFace: FONT_H, fontSize: 22, color: k.color, bold: true, margin: 0 });
    s.addText(k.label, { x: cx + 0.62, y: 1.96, w: 1.35, h: 0.28, fontFace: FONT_B, fontSize: 9.5, color: C.gray, margin: 0 });
  });

  const feats = [
    "📊  Gráfico de barras: atenciones por hora del día",
    "📅  Heatmap semanal: identifica los días más críticos",
    "🏆  Ranking de operadores por tiempo promedio de atención",
    "📈  Tendencia de 30 días: evolución de demoras",
    "🔍  Historial filtrable: fecha, planta, empresa, estado",
    "📤  Exportación a Excel de cualquier rango de fechas",
  ];
  s.addText("Funcionalidades del dashboard:", { x: 0.5, y: 2.72, w: 4.5, h: 0.35, fontFace: FONT_H, fontSize: 13, color: C.navy, bold: true, margin: 0 });
  feats.forEach((f, i) => {
    s.addText(f, { x: 0.55, y: 3.12 + i * 0.34, w: 4.5, h: 0.32, fontFace: FONT_B, fontSize: 11, color: C.darkText, margin: 0 });
  });

  // Mock chart
  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 2.6, w: 4.3, h: 2.4, fill: { color: C.white }, line: { color: C.grayLt, width: 1 }, shadow: makeShadow() });
  s.addText("Atenciones por hora — Hoy", { x: 5.35, y: 2.68, w: 3.9, h: 0.3, fontFace: FONT_B, fontSize: 10, color: C.gray, bold: true, margin: 0, align: "center" });
  const bars = [
    { h: 0.4, l: "06h" }, { h: 0.6, l: "08h" }, { h: 1.05, l: "10h" },
    { h: 0.9, l: "12h" }, { h: 0.75, l: "14h" }, { h: 0.5, l: "16h" }, { h: 0.3, l: "18h" },
  ];
  bars.forEach((b, i) => {
    const bx = 5.45 + i * 0.55;
    const bBottom = 4.85;
    s.addShape(pres.shapes.RECTANGLE, { x: bx, y: bBottom - b.h, w: 0.38, h: b.h, fill: { color: i === 2 ? C.teal : "B2DFDB" }, line: { color: "B2DFDB", width: 0 } });
    s.addText(b.l, { x: bx, y: bBottom + 0.05, w: 0.38, h: 0.2, fontFace: FONT_B, fontSize: 7.5, color: C.gray, align: "center", margin: 0 });
  });

  s.addText("SmartGuard · Control Vehicular Industrial", { x: 0.5, y: 5.3, w: 9, h: 0.25, fontFace: FONT_B, fontSize: 9, color: C.gray, align: "right", margin: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 – Arquitectura técnica
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  s.addText("ARQUITECTURA", { x: 0.55, y: 0.18, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 9, color: C.tealLt, bold: true, charSpacing: 3, margin: 0 });
  s.addText("Stack moderno, escalable y 100% en la nube", { x: 0.55, y: 0.52, w: 8.9, h: 0.6, fontFace: FONT_H, fontSize: 26, color: C.white, bold: true, margin: 0 });

  const layers = [
    { title: "Frontend", color: C.teal, items: ["Next.js 16 App Router", "TypeScript + Tailwind CSS", "Supabase Realtime (websockets)", "Deploy: Vercel CDN global"] },
    { title: "Backend / Base de datos", color: C.amber, items: ["Supabase PostgreSQL", "Row Level Security (RLS)", "Server Actions (API routes)", "pg_cron para tareas automáticas"] },
    { title: "Notificaciones", color: "EC4899", items: ["Resend API → Email HTML", "Green API → WhatsApp", "Edge Functions (Deno)", "Cola de alertas con reintentos"] },
    { title: "Autenticación y Seguridad", color: "8B5CF6", items: ["Supabase Auth (JWT)", "RBAC en middleware Next.js", "Impersonación con cookie segura", "Service Role sólo en server"] },
  ];

  layers.forEach((l, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 0.4 + col * 4.75;
    const cy = 1.35 + row * 1.85;
    const cw = 4.4;
    const ch = 1.7;
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: cw, h: ch, fill: { color: "162B52" }, line: { color: "1E3A6A", width: 1 }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: 0.07, h: ch, fill: { color: l.color }, line: { color: l.color, width: 0 } });
    s.addText(l.title, { x: cx + 0.2, y: cy + 0.1, w: cw - 0.3, h: 0.35, fontFace: FONT_H, fontSize: 13, color: l.color, bold: true, margin: 0 });
    l.items.forEach((it, j) => {
      s.addText(`· ${it}`, { x: cx + 0.2, y: cy + 0.48 + j * 0.28, w: cw - 0.3, h: 0.28, fontFace: FONT_B, fontSize: 10.5, color: "A8C5E8", margin: 0 });
    });
  });

  s.addText("SmartGuard · Control Vehicular Industrial", { x: 0.5, y: 5.3, w: 9, h: 0.25, fontFace: FONT_B, fontSize: 9, color: "2D4A7A", align: "right", margin: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 – Multi-tenant
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  sectionLabel(s, "Modelo Multi-Tenant");
  slideTitle(s, "Una plataforma, múltiples clientes");

  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.5, w: 2.5, h: 0.75, fill: { color: C.navy }, line: { color: C.navy, width: 0 }, shadow: makeShadow() });
  s.addText("🏢  Administrador SmartGuard", { x: 0.5, y: 1.5, w: 2.5, h: 0.75, fontFace: FONT_B, fontSize: 10.5, color: C.white, bold: true, align: "center", valign: "middle", margin: 4 });

  const clients = [
    { name: "Empresa A\n2 plantas · 5 usuarios", y: 2.7 },
    { name: "Empresa B\n4 plantas · 12 usuarios", y: 3.5 },
    { name: "Empresa C\n1 planta · 3 usuarios", y: 4.3 },
  ];
  clients.forEach((c) => {
    s.addShape(pres.shapes.RECTANGLE, { x: 3.0, y: c.y, w: 2.6, h: 0.65, fill: { color: C.white }, line: { color: C.grayLt, width: 1 }, shadow: makeShadow() });
    s.addText(c.name, { x: 3.0, y: c.y, w: 2.6, h: 0.65, fontFace: FONT_B, fontSize: 10.5, color: C.darkText, align: "center", valign: "middle", margin: 4 });
  });

  const features = [
    { icon: "🔑", text: "Cada empresa tiene sus propios datos, usuarios y plantas — completamente aislados por RLS." },
    { icon: "📊", text: "El admin ve un puntaje de salud por empresa: actividad, alertas, uso y pagos." },
    { icon: "🔗", text: "Onboarding self-service: cada empresa recibe un link único para registrarse." },
    { icon: "💳", text: "Panel de pagos integrado: estado de plan (trial / activo), fecha de vencimiento." },
    { icon: "👤", text: "Impersonación segura: el admin puede ver la plataforma como un cliente." },
  ];
  s.addText("Capacidades de gestión:", { x: 5.8, y: 1.42, w: 3.8, h: 0.35, fontFace: FONT_H, fontSize: 13, color: C.navy, bold: true, margin: 0 });
  features.forEach((f, i) => {
    s.addText(f.icon, { x: 5.8, y: 1.88 + i * 0.67, w: 0.38, h: 0.5, fontFace: FONT_B, fontSize: 16, align: "center", valign: "middle", margin: 0 });
    s.addText(f.text, { x: 6.25, y: 1.88 + i * 0.67, w: 3.35, h: 0.6, fontFace: FONT_B, fontSize: 10.5, color: C.darkText, margin: 0, wrap: true });
  });

  s.addText("SmartGuard · Control Vehicular Industrial", { x: 0.5, y: 5.3, w: 9, h: 0.25, fontFace: FONT_B, fontSize: 9, color: C.gray, align: "right", margin: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 – Costos de infraestructura
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  sectionLabel(s, "Costos Operativos");
  slideTitle(s, "Infraestructura — ¿Cuánto cuesta operar SmartGuard?");

  const costData = [
    { service: "Vercel",    icon: "▲",  tier1: "Gratis",  tier2: "$20/mes", notes: "Hosting web + CDN global. Plan Pro para dominios custom y SLA.", color: C.navy },
    { service: "Supabase",  icon: "⚡", tier1: "Gratis",  tier2: "$25/mes", notes: "BD, auth, realtime y edge functions. Free hasta 50k filas activas.", color: C.teal },
    { service: "Resend",    icon: "✉️", tier1: "Gratis*", tier2: "$20/mes", notes: "Email transaccional. Free: 100 emails/día. Pro: 50 000 emails/mes.", color: C.amber },
    { service: "Green API", icon: "💬", tier1: "—",       tier2: "~$15/mes", notes: "1 instancia WhatsApp por número. Sin costo por mensaje enviado.", color: "059669" },
  ];

  const cols = [0.4, 3.5, 5.5, 7.3];
  const headers = ["Servicio", "Plan gratuito", "Plan pago", "Notas"];
  headers.forEach((h, i) => {
    const w = i < 3 ? cols[i+1] - cols[i] - 0.05 : 2.3;
    s.addShape(pres.shapes.RECTANGLE, { x: cols[i], y: 1.45, w, h: 0.4, fill: { color: C.navy }, line: { color: C.navy, width: 0 } });
    s.addText(h, { x: cols[i] + 0.1, y: 1.45, w: w - 0.1, h: 0.4, fontFace: FONT_H, fontSize: 11, color: C.white, bold: true, valign: "middle", margin: 0 });
  });

  costData.forEach((row, i) => {
    const ry = 1.9 + i * 0.72;
    const bg = i % 2 === 0 ? C.white : "F8FAFC";
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: ry, w: 9.2, h: 0.67, fill: { color: bg }, line: { color: C.grayLt, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: ry, w: 0.07, h: 0.67, fill: { color: row.color }, line: { color: row.color, width: 0 } });
    s.addText(`${row.icon}  ${row.service}`, { x: 0.55, y: ry, w: 2.85, h: 0.67, fontFace: FONT_H, fontSize: 13, color: C.darkText, bold: true, valign: "middle", margin: 0 });
    s.addText(row.tier1, { x: cols[1] + 0.1, y: ry, w: 1.85, h: 0.67, fontFace: FONT_B, fontSize: 12, color: "059669", bold: true, valign: "middle", margin: 0 });
    s.addText(row.tier2, { x: cols[2] + 0.1, y: ry, w: 1.75, h: 0.67, fontFace: FONT_B, fontSize: 12, color: C.amber, bold: true, valign: "middle", margin: 0 });
    s.addText(row.notes, { x: cols[3] + 0.1, y: ry + 0.05, w: 2.2, h: 0.58, fontFace: FONT_B, fontSize: 9.5, color: C.gray, margin: 0, wrap: true });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 4.82, w: 9.2, h: 0.5, fill: { color: "E0F2F1" }, line: { color: C.teal, width: 1.5 } });
  s.addText("💰  Costo total estimado:", { x: 0.55, y: 4.82, w: 4, h: 0.5, fontFace: FONT_H, fontSize: 13, color: C.navy, bold: true, valign: "middle", margin: 0 });
  s.addText("Plan inicial (free tier): ~$15/mes  ·  Plan completo: ~$80/mes", { x: 4.5, y: 4.82, w: 5.0, h: 0.5, fontFace: FONT_B, fontSize: 12, color: C.teal, bold: true, valign: "middle", margin: 0 });

  s.addText("SmartGuard · Control Vehicular Industrial", { x: 0.5, y: 5.3, w: 9, h: 0.25, fontFace: FONT_B, fontSize: 9, color: C.gray, align: "right", margin: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 – Planes y precios (SaaS)
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  s.addText("PLANES COMERCIALES", { x: 0.55, y: 0.18, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 9, color: C.tealLt, bold: true, charSpacing: 3, margin: 0 });
  s.addText("Precios sugeridos para vender SmartGuard a tus clientes", { x: 0.55, y: 0.52, w: 8.9, h: 0.6, fontFace: FONT_H, fontSize: 22, color: C.white, bold: true, margin: 0 });

  const plans = [
    {
      name: "Trial", price: "Gratis", period: "14 días", color: C.gray, highlight: false,
      features: ["1 planta · hasta 3 usuarios", "Registro vehicular completo", "Alertas de demora activas", "Dashboard básico", "Sin tarjeta de crédito"],
    },
    {
      name: "Starter", price: "$150", period: "/ mes", color: C.teal, highlight: false,
      features: ["Hasta 2 plantas", "Hasta 10 usuarios", "Email + WhatsApp ilimitados", "Historial y reportes", "Soporte por email"],
    },
    {
      name: "Pro", price: "$350", period: "/ mes", color: C.amber, highlight: true,
      features: ["Plantas ilimitadas", "Usuarios ilimitados", "Alertas multi-canal", "Dashboard avanzado + exportación", "Soporte prioritario + SLA", "Integración API personalizada"],
    },
  ];

  plans.forEach((pl, i) => {
    const cx = 0.55 + i * 3.1;
    const cy = 1.3;
    const cw = 2.85;
    const ch = 3.85;
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: cw, h: ch, fill: { color: pl.highlight ? "1A3A6A" : "162B52" }, line: { color: pl.highlight ? C.amber : "1E3A6A", width: pl.highlight ? 2 : 1 }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: cw, h: 0.07, fill: { color: pl.color }, line: { color: pl.color, width: 0 } });

    if (pl.highlight) {
      s.addShape(pres.shapes.RECTANGLE, { x: cx + cw / 2 - 0.75, y: cy - 0.22, w: 1.5, h: 0.3, fill: { color: C.amber }, line: { color: C.amber, width: 0 } });
      s.addText("RECOMENDADO", { x: cx + cw / 2 - 0.75, y: cy - 0.22, w: 1.5, h: 0.3, fontFace: FONT_B, fontSize: 8, color: C.navy, bold: true, align: "center", valign: "middle", margin: 0 });
    }

    s.addText(pl.name, { x: cx + 0.15, y: cy + 0.18, w: cw - 0.3, h: 0.42, fontFace: FONT_H, fontSize: 20, color: C.white, bold: true, align: "center", margin: 0 });
    s.addText(pl.price, { x: cx + 0.15, y: cy + 0.65, w: cw - 0.3, h: 0.65, fontFace: FONT_H, fontSize: 32, color: pl.color, bold: true, align: "center", margin: 0 });
    s.addText(pl.period, { x: cx + 0.15, y: cy + 1.3, w: cw - 0.3, h: 0.28, fontFace: FONT_B, fontSize: 11, color: "93B4D8", align: "center", margin: 0 });
    s.addShape(pres.shapes.LINE, { x: cx + 0.2, y: cy + 1.65, w: cw - 0.4, h: 0, line: { color: "1E3A6A", width: 1 } });

    pl.features.forEach((f, j) => {
      s.addText([
        { text: "✓ ", options: { color: pl.color, bold: true } },
        { text: f,    options: { color: "A8C5E8" } },
      ], { x: cx + 0.2, y: cy + 1.78 + j * 0.35, w: cw - 0.35, h: 0.34, fontFace: FONT_B, fontSize: 10, margin: 0, wrap: true });
    });
  });

  s.addText("* Precios sugeridos en USD · Adaptar según mercado local y volumen de clientes", { x: 0.5, y: 5.2, w: 9, h: 0.28, fontFace: FONT_B, fontSize: 9, color: "2D4A7A", align: "center", margin: 0 });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 12 – CTA
// ══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: -1, y: 3.5, w: 4, h: 4, fill: { color: "0A2040" }, line: { color: "0A2040", width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: 8, y: -1, w: 3.5, h: 3.5, fill: { color: "0A2040" }, line: { color: "0A2040", width: 0 } });

  s.addText("¿Listo para empezar?", { x: 1, y: 0.55, w: 8, h: 0.75, fontFace: FONT_H, fontSize: 34, color: C.white, bold: true, align: "center", margin: 0 });
  s.addText("SmartGuard se configura en menos de 24 horas", { x: 1, y: 1.32, w: 8, h: 0.45, fontFace: FONT_B, fontSize: 16, color: C.tealLt, align: "center", margin: 0 });

  const steps = [
    { num: "1", title: "Demo en vivo",   desc: "Agenda una demostración personalizada con tu planta de prueba." },
    { num: "2", title: "Trial gratuito", desc: "14 días sin costo, con soporte de configuración incluido." },
    { num: "3", title: "Lanzamiento",    desc: "Onboarding en menos de 24h. Guardias operando desde el primer día." },
  ];
  steps.forEach((st, i) => {
    const cx = 0.65 + i * 3.05;
    const cy = 2.1;
    const cw = 2.8;
    const ch = 2.4;
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: cw, h: ch, fill: { color: "162B52" }, line: { color: C.teal, width: 1 }, shadow: makeShadow() });
    s.addShape(pres.shapes.OVAL, { x: cx + (cw - 0.8) / 2, y: cy + 0.2, w: 0.8, h: 0.8, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
    s.addText(st.num, { x: cx + (cw - 0.8) / 2, y: cy + 0.2, w: 0.8, h: 0.8, fontFace: FONT_H, fontSize: 22, color: C.white, bold: true, align: "center", valign: "middle", margin: 0 });
    s.addText(st.title, { x: cx + 0.15, y: cy + 1.15, w: cw - 0.3, h: 0.42, fontFace: FONT_H, fontSize: 15, color: C.white, bold: true, align: "center", margin: 0 });
    s.addText(st.desc, { x: cx + 0.15, y: cy + 1.6, w: cw - 0.3, h: 0.75, fontFace: FONT_B, fontSize: 11, color: "93B4D8", align: "center", margin: 0, wrap: true });
  });

  s.addText("📧 adrishio09@gmail.com  ·  🌐 smart-guard-six.vercel.app", { x: 0.5, y: 4.75, w: 9, h: 0.4, fontFace: FONT_B, fontSize: 13, color: C.tealLt, align: "center", margin: 0 });
  s.addText("SmartGuard · Control Vehicular Industrial · 2025", { x: 0.5, y: 5.15, w: 9, h: 0.3, fontFace: FONT_B, fontSize: 9, color: "2D4A7A", align: "center", margin: 0 });
}

// ─── Write file ───────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "SmartGuard_Presentacion.pptx" })
  .then(() => console.log("✅ SmartGuard_Presentacion.pptx guardado."))
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); });
