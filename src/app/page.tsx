"use client";

import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  LayoutDashboard,
  ClipboardList,
  History,
  Bell,
  Users,
  Building2,
  Upload,
  Zap,
  CheckCircle2,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];
const numberFormatter = new Intl.NumberFormat("en-US");

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.55, ease: easeOut },
  }),
};

const stats = [
  { num: "100", suffix: "%", label: "Trazabilidad de registros" },
  { num: "<2", suffix: "s", label: "Tiempo de respuesta" },
  { num: "24", suffix: "/7", label: "Monitoreo continuo" },
  { num: "3", suffix: "", label: "Roles de acceso diferenciados" },
];

const steps = [
  {
    num: "01",
    title: "Registra tu empresa",
    desc: "Crea la cuenta de tu empresa en minutos. Configura el nombre de tu planta y los datos del supervisor principal.",
    icon: Building2,
  },
  {
    num: "02",
    title: "Carga tu personal",
    desc: "Importa la lista de responsables desde un archivo CSV exportado de Excel. El sistema queda configurado al instante.",
    icon: Upload,
  },
  {
    num: "03",
    title: "Opera en tiempo real",
    desc: "Tus guardias registran accesos desde la garita. Los supervisores monitorean el dashboard en vivo y auditan todo.",
    icon: Zap,
  },
];

const modules = [
  {
    num: "01",
    name: "Control de Acceso",
    desc: "Gestión centralizada de vehículos por garita y zona. Registro de entrada, salida y revisiones con trazabilidad completa.",
    icon: ShieldCheck,
  },
  {
    num: "02",
    name: "Dashboard KPIs",
    desc: "Tablero ejecutivo con indicadores en tiempo real: flujo vehicular, incidentes activos, ocupación y alertas.",
    icon: LayoutDashboard,
  },
  {
    num: "03",
    name: "Registro Operativo",
    desc: "Formulario estructurado para el ingreso de vehículos con captura de datos completa y flujo de 3 pasos.",
    icon: ClipboardList,
  },
  {
    num: "04",
    name: "Historial & Auditoría",
    desc: "Registro histórico con filtros avanzados, exportación CSV y trazabilidad completa de eventos por período.",
    icon: History,
  },
  {
    num: "05",
    name: "Alertas & Seguridad",
    desc: "Notificaciones automáticas para demoras, accesos denegados e intentos de ingreso no autorizados.",
    icon: Bell,
  },
  {
    num: "06",
    name: "Gestión de Usuarios",
    desc: "Roles diferenciados por guardia y supervisor con permisos granulares configurables por planta y turno.",
    icon: Users,
  },
];

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1600;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(id);
        return;
      }
      setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [target]);

  return <>{numberFormatter.format(count)}</>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ─────────── NAV ─────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="sticky top-0 z-50 border-b border-[var(--sg-line)] bg-[rgba(10,12,11,0.92)] backdrop-blur"
      >
        <div className="sg-shell flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center bg-[var(--sg-accent)]">
              <svg viewBox="0 0 16 16" className="h-4 w-4 fill-[var(--sg-canvas)]">
                <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
              </svg>
            </div>
            <span className="sg-font-display text-[18px] font-bold uppercase tracking-[0.18em] text-[var(--sg-ink)]">
              SmartGuard
            </span>
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            {[
              { label: "Características", href: "#modulos" },
              { label: "Cómo funciona", href: "#como-funciona" },
              { label: "Precios", href: "#precios" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="sg-font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--sg-copy)] transition-colors hover:text-[var(--sg-ink)]"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="sg-btn sg-btn-ghost sg-btn-sm hidden md:inline-flex">
              Iniciar Sesión
            </Link>
            <Link href="/onboarding" className="sg-btn sg-btn-accent sg-btn-sm">
              Registrar Empresa
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ─────────── HERO ─────────── */}
      <section className="border-b border-[var(--sg-line)]">
        <div className="sg-shell grid gap-0 lg:grid-cols-2">
          <div className="flex flex-col justify-center border-r-0 border-[var(--sg-line)] py-16 pr-0 lg:border-r lg:py-24 lg:pr-12">
            <motion.div
              custom={0.05}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="sg-kicker sg-eyebrow-line"
            >
              Plataforma SaaS de seguridad industrial
            </motion.div>

            <motion.h1
              custom={0.12}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="sg-display mt-7 text-[56px] md:text-[72px]"
            >
              Tu planta,<br />bajo<br />
              <em>control total.</em>
            </motion.h1>

            <motion.p
              custom={0.2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-7 max-w-[420px] text-[15px] leading-[1.7] font-light text-[var(--sg-copy)]"
            >
              SmartGuard centraliza el registro de acceso vehicular para cualquier planta industrial.
              Configura tu empresa, carga tus datos y empieza a operar en tiempo real — sin instalaciones.
            </motion.p>

            <motion.div
              custom={0.28}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-9 flex flex-wrap gap-3"
            >
              <Link href="/onboarding" className="sg-btn sg-btn-accent">
                Registrar mi empresa
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#como-funciona" className="sg-btn sg-btn-ghost">
                Cómo funciona
              </Link>
            </motion.div>

            <motion.div
              custom={0.36}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center gap-5"
            >
              {["Sin instalación", "Multi-planta", "Datos en tiempo real"].map((tag) => (
                <div key={tag} className="flex items-center gap-2 text-[11px] text-[var(--sg-muted)]">
                  <div className="h-1 w-1 rounded-full bg-[var(--sg-accent)]" />
                  {tag}
                </div>
              ))}
            </motion.div>
          </div>

          {/* hero right — mini dashboard mockup */}
          <motion.div
            custom={0.22}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="relative flex items-center justify-center overflow-hidden bg-[var(--sg-canvas-2)] px-6 py-16 lg:px-10 lg:py-20"
          >
            <div
              className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 rounded-full border border-[var(--sg-line)] opacity-40"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-14 -left-14 h-64 w-64 rounded-full border border-[var(--sg-line)] opacity-25"
              aria-hidden
            />

            <div className="relative z-10 w-full max-w-[400px] border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[8px_8px_0_rgba(196,192,180,0.08)]">
              <div className="flex items-center justify-between border-b border-[var(--sg-line)] px-4 py-3">
                <span className="sg-font-display text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--sg-ink)]">
                  Panel de Control
                </span>
                <span className="sg-live-pill">
                  <span className="sg-live-dot sg-pulse" />
                  En vivo
                </span>
              </div>

              <div className="p-4">
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <div className="bg-[var(--sg-panel-2)] px-3 py-2">
                    <div className="sg-kpi-val text-[22px] text-[var(--sg-success)]">48</div>
                    <div className="sg-kpi-label">Activos hoy</div>
                  </div>
                  <div className="bg-[var(--sg-panel-2)] px-3 py-2">
                    <div className="sg-kpi-val text-[22px] text-[var(--sg-accent)]">3</div>
                    <div className="sg-kpi-label">Pendientes</div>
                  </div>
                  <div className="bg-[var(--sg-panel-2)] px-3 py-2">
                    <div className="sg-kpi-val text-[22px]">1</div>
                    <div className="sg-kpi-label">Alertas</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {[
                    { plate: "ABC-4521", info: "Entrada · Garita Principal", time: "08:14", tone: "is-ok" },
                    { plate: "XYZ-9983", info: "Denegado · Sin permiso", time: "08:09", tone: "is-deny" },
                    { plate: "MKL-1102", info: "Salida · Garita Sur", time: "07:58", tone: "is-ok" },
                    { plate: "PPQ-7734", info: "Revisión manual requerida", time: "07:51", tone: "is-warn" },
                  ].map((ev) => (
                    <div key={ev.plate} className={`sg-event ${ev.tone}`} style={{ gridTemplateColumns: "76px 1fr 44px" }}>
                      <span className="sg-plate text-[11px]">{ev.plate}</span>
                      <span className="text-[11px] text-[var(--sg-copy)]">{ev.info}</span>
                      <span className="sg-mono text-[10px] text-[var(--sg-muted)]">{ev.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────── STATS STRIP ─────────── */}
      <div className="border-b border-[var(--sg-line)]">
        <div className="sg-shell grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: i * 0.08, duration: 0.45, ease: easeOut }}
              className={`sg-stat ${i === 1 || i === 3 ? "md:border-r-0" : ""} ${i < 2 ? "border-b border-[var(--sg-line)] md:border-b-0" : ""}`}
            >
              <div>
                <span className="sg-stat-num">
                  {typeof parseInt(s.num) === "number" && !isNaN(parseInt(s.num)) && s.num !== "ISO" ? (
                    <AnimatedCounter target={parseInt(s.num)} />
                  ) : (
                    s.num
                  )}
                </span>
                <span className="sg-stat-suffix">{s.suffix}</span>
              </div>
              <div className="sg-stat-label">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─────────── CÓMO FUNCIONA ─────────── */}
      <section id="como-funciona" className="border-b border-[var(--sg-line)]">
        <div className="sg-shell py-20 lg:py-24">
          <div className="mb-12 flex flex-col gap-3 border-b border-[var(--sg-line)] pb-7 md:flex-row md:items-baseline md:justify-between">
            <div>
              <div className="sg-kicker sg-kicker--muted">Proceso de activación</div>
              <h2 className="sg-section-title mt-2">
                De cero a operativo<br />en 3 pasos.
              </h2>
            </div>
            <Link
              href="/onboarding"
              className="sg-font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
            >
              Empezar ahora →
            </Link>
          </div>

          <div className="grid gap-px bg-[var(--sg-line)] md:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: easeOut }}
                className="bg-[var(--sg-panel)] p-8 lg:p-10 flex flex-col"
              >
                <div className="sg-module-num mb-6">{step.num}</div>
                <step.icon
                  className="mb-5 h-10 w-10"
                  strokeWidth={1.25}
                  style={{ color: "var(--sg-ink)" }}
                />
                <div className="sg-font-display text-[22px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-3">
                  {step.title}
                </div>
                <div className="text-[14px] leading-[1.7] font-light text-[var(--sg-copy)]">
                  {step.desc}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link href="/onboarding" className="sg-btn sg-btn-accent">
              Registrar mi empresa
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────── MÓDULOS / CARACTERÍSTICAS ─────────── */}
      <section id="modulos" className="sg-shell py-20 lg:py-24">
        <div className="mb-10 flex flex-col gap-3 border-b border-[var(--sg-line)] pb-5 md:flex-row md:items-baseline md:justify-between">
          <div>
            <div className="sg-kicker sg-kicker--muted sg-eyebrow-line" id="caracteristicas">
              Módulos del sistema
            </div>
            <h2 className="sg-section-title mt-2">Funcionalidades clave</h2>
          </div>
          <Link
            href="/login"
            className="sg-font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
          >
            Acceder al sistema →
          </Link>
        </div>

        <div className="grid gap-px bg-[var(--sg-line)] sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <motion.div
              key={m.num}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: i * 0.05, duration: 0.45, ease: easeOut }}
              className="sg-module"
            >
              <div className="sg-module-num">{m.num}</div>
              <m.icon className="mb-5 h-9 w-9" strokeWidth={1.5} style={{ color: "var(--sg-ink)" }} />
              <div className="sg-module-name">{m.name}</div>
              <div className="sg-module-desc">{m.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─────────── PRECIOS ─────────── */}
      <section id="precios" className="border-b border-[var(--sg-line)]">
        <div className="sg-shell py-20 lg:py-28">

          {/* Header */}
          <div className="mb-14 flex flex-col gap-3 border-b border-[var(--sg-line)] pb-8 md:flex-row md:items-baseline md:justify-between">
            <div>
              <div className="sg-kicker sg-kicker--muted">Planes y precios</div>
              <h2 className="sg-section-title mt-2">
                Transparente.<br />Sin sorpresas.
              </h2>
            </div>
            <p className="text-[13px] font-light text-[var(--sg-muted)] max-w-[260px] leading-relaxed">
              Prueba gratuita de 7 días con todo incluido. Luego continúas con el Plan Pro según sedes, garitas y volumen.
            </p>
          </div>

          {/* Cards */}
          <div className="grid gap-px bg-[var(--sg-line)] md:grid-cols-3">

            {/* ── Plan Trial ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: 0, duration: 0.5, ease: easeOut }}
              className="bg-[var(--sg-panel)] p-8 lg:p-10 flex flex-col"
            >
              <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] mb-6">
                01 · Inicio
              </div>
              <div className="sg-font-display text-[22px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-2">
                Prueba Gratuita
              </div>
              <p className="text-[13px] font-light text-[var(--sg-muted)] mb-8 leading-relaxed">
                Explora SmartGuard sin compromiso. Acceso completo a todas las funcionalidades durante 7 días.
              </p>

              <div className="mb-8">
                <span className="sg-font-display text-[48px] font-bold text-[var(--sg-ink)] leading-none">S/. 0</span>
                <span className="text-[13px] text-[var(--sg-muted)] ml-2">/ 7 días</span>
              </div>

              <div className="flex flex-col gap-3 mb-10 flex-1">
                {[
                  "Todo el Plan Pro incluido",
                  "Dashboard, reportes y alertas",
                  "Usuarios, sedes y garitas para la demo",
                  "Importación de datos históricos",
                  "Soporte de activación por WhatsApp",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[var(--sg-muted)] shrink-0 mt-0.5" />
                    <span className="text-[13px] text-[var(--sg-copy)]">{f}</span>
                  </div>
                ))}
              </div>

              <Link href="/onboarding" className="sg-btn sg-btn-ghost w-full justify-center">
                Empezar gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {/* ── Plan Pro ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: 0.1, duration: 0.5, ease: easeOut }}
              className="bg-[var(--sg-panel)] p-8 lg:p-10 flex flex-col relative border-x-0 border-[var(--sg-accent)] md:border-x"
            >
              {/* Badge */}
              <div className="absolute -top-px left-0 right-0 h-[2px] bg-[var(--sg-accent)]" />
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[rgba(200,168,75,0.12)] border border-[var(--sg-accent)] px-2.5 py-1">
                <Sparkles className="h-3 w-3 text-[var(--sg-accent)]" />
                <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)]">Más popular</span>
              </div>

              <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)] mb-6">
                02 · Profesional
              </div>
              <div className="sg-font-display text-[22px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-2">
                Plan Pro
              </div>
              <p className="text-[13px] font-light text-[var(--sg-muted)] mb-8 leading-relaxed">
                Para empresas industriales en operación. Ideal para iniciar control vehicular con trazabilidad, KPIs y alertas.
              </p>

              <div className="mb-8">
                <span className="sg-font-display text-[32px] font-bold text-[var(--sg-ink)] leading-none">A consultar</span>
              </div>

              <div className="flex flex-col gap-3 mb-10 flex-1">
                {[
                  "Operación inicial multi-garita",
                  "Usuarios operativos incluidos",
                  "Dashboard KPIs en tiempo real",
                  "Alertas WhatsApp + Email",
                  "Reportes PDF + Excel con logo",
                  "Importación de datos históricos",
                  "Configuración por sede/planta",
                  "Soporte prioritario por WhatsApp",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[var(--sg-accent)] shrink-0 mt-0.5" />
                    <span className="text-[13px] text-[var(--sg-copy)]">{f}</span>
                  </div>
                ))}
              </div>

              <Link href="/onboarding" className="sg-btn sg-btn-accent w-full justify-center">
                Registrar mi empresa
                <ArrowRight className="h-4 w-4" />
              </Link>

              <p className="text-center text-[11px] text-[var(--sg-muted)] mt-3">
                El alcance final se ajusta según sedes, usuarios y volumen operativo
              </p>
            </motion.div>

            {/* ── Plan Enterprise ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: 0.2, duration: 0.5, ease: easeOut }}
              className="bg-[var(--sg-panel)] p-8 lg:p-10 flex flex-col"
            >
              <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] mb-6">
                03 · Corporativo
              </div>
              <div className="sg-font-display text-[22px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-2">
                Enterprise
              </div>
              <p className="text-[13px] font-light text-[var(--sg-muted)] mb-8 leading-relaxed">
                Para grupos con varias sedes, alto volumen vehicular, integraciones ERP/WMS o requerimientos de SLA.
              </p>

              <div className="mb-8">
                <span className="sg-font-display text-[32px] font-bold text-[var(--sg-ink)] leading-none">A consultar</span>
              </div>

              <div className="flex flex-col gap-3 mb-10 flex-1">
                {[
                  "Todo lo del Plan Pro",
                  "Múltiples sedes y garitas avanzadas",
                  "Onboarding y capacitación al equipo",
                  "SLA de disponibilidad garantizado",
                  "API de integración con ERP/WMS",
                  "Gerente de cuenta dedicado",
                  "Reportes a medida",
                  "Facturación empresarial",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[var(--sg-success)] shrink-0 mt-0.5" />
                    <span className="text-[13px] text-[var(--sg-copy)]">{f}</span>
                  </div>
                ))}
              </div>

              <a
                href="https://wa.me/51983450723?text=Hola%2C%20quiero%20información%20sobre%20el%20plan%20Enterprise%20de%20SmartGuard"
                target="_blank"
                rel="noopener noreferrer"
                className="sg-btn sg-btn-primary w-full justify-center"
              >
                <MessageCircle className="h-4 w-4" />
                Hablar con ventas
              </a>
            </motion.div>

          </div>

          {/* Guarantee strip */}
          <div className="mt-10 grid grid-cols-1 gap-px bg-[var(--sg-line)] sm:grid-cols-3">
            {[
              { label: "Sin permanencia", desc: "Cancela cuando quieras, sin penalidades ni contratos." },
              { label: "Sin instalación", desc: "100% en la nube. Funciona desde cualquier dispositivo con internet." },
              { label: "Soporte real", desc: "Atención directa por WhatsApp. Sin bots, sin tickets sin respuesta." },
            ].map((g) => (
              <div key={g.label} className="bg-[var(--sg-canvas-2)] px-7 py-6">
                <div className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-1.5">
                  {g.label}
                </div>
                <p className="text-[12px] font-light text-[var(--sg-muted)] leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────── INDUSTRIAS ─────────── */}
      <section className="border-y border-[var(--sg-line)] bg-[var(--sg-canvas-2)]">
        <div className="sg-shell py-10">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="sg-font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--sg-muted)]">
              Diseñado para
            </div>
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 md:justify-end">
              {[
                "Manufactura",
                "Logística",
                "Distribución",
                "Minería",
                "Construcción",
                "Agroindustria",
              ].map((sector) => (
                <span
                  key={sector}
                  className="sg-font-display text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--sg-muted)]"
                >
                  {sector}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── CTA BANNER ─────────── */}
      <section className="border-b border-[var(--sg-line)] bg-[#05070a]">
        <div className="sg-shell grid items-center gap-8 py-16 md:grid-cols-[1fr_auto] md:py-20">
          <div>
            <h2 className="sg-display text-[38px] md:text-[48px]">
              Seguridad<br />industrial <em>sin<br />compromisos.</em>
            </h2>
            <p className="mt-4 text-[13px] font-light text-[var(--sg-copy)] max-w-[380px]">
              Configura SmartGuard para tu empresa en minutos. Sin hardware, sin instalaciones, sin contratos largos.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <Link href="/onboarding" className="sg-btn sg-btn-accent">
              Registrar mi empresa
              <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="text-[12px] font-light text-[var(--sg-muted)] md:text-right">
              Configuración inmediata · Soporte dedicado · Sin permanencia
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="bg-[var(--sg-canvas-2)]">
        <div className="sg-shell py-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto_auto]">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-6 w-6 items-center justify-center bg-[var(--sg-accent)]">
                  <svg viewBox="0 0 16 16" className="h-3 w-3 fill-[var(--sg-canvas)]">
                    <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
                  </svg>
                </div>
                <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.2em] text-[var(--sg-ink)]">
                  SmartGuard
                </span>
              </div>
              <p className="text-[12px] font-light text-[var(--sg-muted)] max-w-[260px] leading-relaxed">
                Plataforma SaaS para el control de acceso vehicular industrial.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] mb-1">
                Producto
              </div>
              {[
                { label: "Características", href: "#modulos" },
                { label: "Cómo funciona", href: "#como-funciona" },
                { label: "Precios", href: "#precios" },
                { label: "Registrar empresa", href: "/onboarding" },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-[12px] text-[var(--sg-copy)] hover:text-[var(--sg-ink)] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] mb-1">
                Acceso
              </div>
              {[
                { label: "Iniciar Sesión", href: "/login" },
                { label: "Recuperar contraseña", href: "/reset-password" },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-[12px] text-[var(--sg-copy)] hover:text-[var(--sg-ink)] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-[var(--sg-line)] pt-6 md:flex-row md:items-center md:justify-between">
            <div className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
              © 2026 SmartGuard · Todos los derechos reservados
            </div>
            <div className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
              v1.0 · Control Vehicular Industrial
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
