"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { AnimatedCounter } from "./LandingShared";
import {
  accessFooterLinks,
  easeOut,
  fadeUp,
  heroEvents,
  heroTags,
  landingNavLinks,
  modules,
  pricingGuarantees,
  productFooterLinks,
  proFeatures,
  sectors,
  stats,
  steps,
  trialFeatures,
  enterpriseFeatures,
} from "./landingData";

export function LandingNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="sticky top-0 z-50 border-b border-[var(--sg-line)] bg-[rgba(10,12,11,0.92)] backdrop-blur"
    >
      <div className="sg-shell flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <SmartGuardMark size="sm" />
          <span className="sg-font-display text-[18px] font-bold uppercase tracking-[0.18em] text-[var(--sg-ink)]">
            SmartGuard
          </span>
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          {landingNavLinks.map((item) => (
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
  );
}

export function LandingHero() {
  return (
    <section className="border-b border-[var(--sg-line)]">
      <div className="sg-shell grid gap-0 lg:grid-cols-2">
        <div className="flex flex-col justify-center border-r-0 border-[var(--sg-line)] py-16 pr-0 lg:border-r lg:py-24 lg:pr-12">
          <motion.div custom={0.05} initial="hidden" animate="visible" variants={fadeUp} className="sg-kicker sg-eyebrow-line">
            Plataforma SaaS de seguridad industrial
          </motion.div>

          <motion.h1
            custom={0.12}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="sg-display mt-7 text-[56px] md:text-[72px]"
          >
            Tu planta,
            <br />
            bajo
            <br />
            <em>control total.</em>
          </motion.h1>

          <motion.p
            custom={0.2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-7 max-w-[420px] text-[15px] font-light leading-[1.7] text-[var(--sg-copy)]"
          >
            SmartGuard centraliza el registro de acceso vehicular para cualquier planta industrial. Configura tu empresa,
            carga tus datos y empieza a operar en tiempo real - sin instalaciones.
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
            {heroTags.map((tag) => (
              <div key={tag} className="flex items-center gap-2 text-[11px] text-[var(--sg-muted)]">
                <div className="h-1 w-1 rounded-full bg-[var(--sg-accent)]" />
                {tag}
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          custom={0.22}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="relative flex items-center justify-center overflow-hidden bg-[var(--sg-canvas-2)] px-6 py-16 lg:px-10 lg:py-20"
        >
          <div className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 rounded-full border border-[var(--sg-line)] opacity-40" aria-hidden />
          <div className="pointer-events-none absolute -bottom-14 -left-14 h-64 w-64 rounded-full border border-[var(--sg-line)] opacity-25" aria-hidden />

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
                {heroEvents.map((event) => (
                  <div
                    key={event.plate}
                    className={`sg-event ${event.tone}`}
                    style={{ gridTemplateColumns: "76px 1fr 44px" }}
                  >
                    <span className="sg-plate text-[11px]">{event.plate}</span>
                    <span className="text-[11px] text-[var(--sg-copy)]">{event.info}</span>
                    <span className="sg-mono text-[10px] text-[var(--sg-muted)]">{event.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function LandingStatsSection() {
  return (
    <div className="border-b border-[var(--sg-line)]">
      <div className="sg-shell grid grid-cols-2 md:grid-cols-4">
        {stats.map((stat, index) => {
          const parsed = Number.parseInt(stat.num, 10);
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: index * 0.08, duration: 0.45, ease: easeOut }}
              className={`sg-stat ${index === 1 || index === 3 ? "md:border-r-0" : ""} ${index < 2 ? "border-b border-[var(--sg-line)] md:border-b-0" : ""}`}
            >
              <div>
                <span className="sg-stat-num">{Number.isNaN(parsed) ? stat.num : <AnimatedCounter target={parsed} />}</span>
                <span className="sg-stat-suffix">{stat.suffix}</span>
              </div>
              <div className="sg-stat-label">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function LandingHowItWorksSection() {
  return (
    <section id="como-funciona" className="border-b border-[var(--sg-line)]">
      <div className="sg-shell py-20 lg:py-24">
        <div className="mb-12 flex flex-col gap-3 border-b border-[var(--sg-line)] pb-7 md:flex-row md:items-baseline md:justify-between">
          <div>
            <div className="sg-kicker sg-kicker--muted">Proceso de activación</div>
            <h2 className="sg-section-title mt-2">
              De cero a operativo
              <br />
              en 3 pasos.
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
          {steps.map((step, index) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: easeOut }}
              className="flex flex-col bg-[var(--sg-panel)] p-8 lg:p-10"
            >
              <div className="sg-module-num mb-6">{step.num}</div>
              <step.icon className="mb-5 h-10 w-10" strokeWidth={1.25} style={{ color: "var(--sg-ink)" }} />
              <div className="mb-3 sg-font-display text-[22px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                {step.title}
              </div>
              <div className="text-[14px] font-light leading-[1.7] text-[var(--sg-copy)]">{step.desc}</div>
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
  );
}

export function LandingModulesSection() {
  return (
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
        {modules.map((module, index) => (
          <motion.div
            key={module.num}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: index * 0.05, duration: 0.45, ease: easeOut }}
            className="sg-module"
          >
            <div className="sg-module-num">{module.num}</div>
            <module.icon className="mb-5 h-9 w-9" strokeWidth={1.5} style={{ color: "var(--sg-ink)" }} />
            <div className="sg-module-name">{module.name}</div>
            <div className="sg-module-desc">{module.desc}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function LandingPricingSection() {
  return (
    <section id="precios" className="border-b border-[var(--sg-line)]">
      <div className="sg-shell py-20 lg:py-28">
        <div className="mb-14 flex flex-col gap-3 border-b border-[var(--sg-line)] pb-8 md:flex-row md:items-baseline md:justify-between">
          <div>
            <div className="sg-kicker sg-kicker--muted">Planes y precios</div>
            <h2 className="sg-section-title mt-2">
              Transparente.
              <br />
              Sin sorpresas.
            </h2>
          </div>
          <p className="max-w-[260px] text-[13px] font-light leading-relaxed text-[var(--sg-muted)]">
            Prueba gratuita de 7 días con todo incluido. Luego continúas con el Plan Pro según sedes, garitas y volumen.
          </p>
        </div>

        <div className="grid gap-px bg-[var(--sg-line)] md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="flex flex-col bg-[var(--sg-panel)] p-8 lg:p-10"
          >
            <div className="mb-6 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">01 · Inicio</div>
            <div className="mb-2 sg-font-display text-[22px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
              Prueba Gratuita
            </div>
            <p className="mb-8 text-[13px] font-light leading-relaxed text-[var(--sg-muted)]">
              Explora SmartGuard sin compromiso. Acceso completo a todas las funcionalidades durante 7 días.
            </p>

            <div className="mb-8">
              <span className="sg-font-display text-[48px] font-bold leading-none text-[var(--sg-ink)]">S/. 0</span>
              <span className="ml-2 text-[13px] text-[var(--sg-muted)]">/ 7 días</span>
            </div>

            <FeatureList features={trialFeatures} iconClassName="text-[var(--sg-muted)]" />

            <Link href="/onboarding" className="sg-btn sg-btn-ghost w-full justify-center">
              Empezar gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.1, duration: 0.5, ease: easeOut }}
            className="relative flex flex-col border-x-0 border-[var(--sg-accent)] bg-[var(--sg-panel)] p-8 lg:p-10 md:border-x"
          >
            <div className="absolute -top-px left-0 right-0 h-[2px] bg-[var(--sg-accent)]" />
            <div className="absolute top-4 right-4 flex items-center gap-1.5 border border-[var(--sg-accent)] bg-[rgba(200,168,75,0.12)] px-2.5 py-1">
              <Sparkles className="h-3 w-3 text-[var(--sg-accent)]" />
              <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)]">Más popular</span>
            </div>

            <div className="mb-6 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)]">
              02 · Profesional
            </div>
            <div className="mb-2 sg-font-display text-[22px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">Plan Pro</div>
            <p className="mb-8 text-[13px] font-light leading-relaxed text-[var(--sg-muted)]">
              Para empresas industriales en operación. Ideal para iniciar control vehicular con trazabilidad, KPIs y alertas.
            </p>

            <div className="mb-8">
              <span className="sg-font-display text-[32px] font-bold leading-none text-[var(--sg-ink)]">A consultar</span>
            </div>

            <FeatureList features={proFeatures} iconClassName="text-[var(--sg-accent)]" />

            <Link href="/onboarding" className="sg-btn sg-btn-accent w-full justify-center">
              Registrar mi empresa
              <ArrowRight className="h-4 w-4" />
            </Link>

            <p className="mt-3 text-center text-[11px] text-[var(--sg-muted)]">
              El alcance final se ajusta según sedes, usuarios y volumen operativo
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.2, duration: 0.5, ease: easeOut }}
            className="flex flex-col bg-[var(--sg-panel)] p-8 lg:p-10"
          >
            <div className="mb-6 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
              03 · Corporativo
            </div>
            <div className="mb-2 sg-font-display text-[22px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
              Enterprise
            </div>
            <p className="mb-8 text-[13px] font-light leading-relaxed text-[var(--sg-muted)]">
              Para grupos con varias sedes, alto volumen vehicular, integraciones ERP/WMS o requerimientos de SLA.
            </p>

            <div className="mb-8">
              <span className="sg-font-display text-[32px] font-bold leading-none text-[var(--sg-ink)]">A consultar</span>
            </div>

            <FeatureList features={enterpriseFeatures} iconClassName="text-[var(--sg-success)]" />

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

        <div className="mt-10 grid grid-cols-1 gap-px bg-[var(--sg-line)] sm:grid-cols-3">
          {pricingGuarantees.map((guarantee) => (
            <div key={guarantee.label} className="bg-[var(--sg-canvas-2)] px-7 py-6">
              <div className="mb-1.5 sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                {guarantee.label}
              </div>
              <p className="text-[12px] font-light leading-relaxed text-[var(--sg-muted)]">{guarantee.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingIndustriesSection() {
  return (
    <section className="border-y border-[var(--sg-line)] bg-[var(--sg-canvas-2)]">
      <div className="sg-shell py-10">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="sg-font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--sg-muted)]">Diseñado para</div>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 md:justify-end">
            {sectors.map((sector) => (
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
  );
}

export function LandingCtaSection() {
  return (
    <section className="border-b border-[var(--sg-line)] bg-[#05070a]">
      <div className="sg-shell grid items-center gap-8 py-16 md:grid-cols-[1fr_auto] md:py-20">
        <div>
          <h2 className="sg-display text-[38px] md:text-[48px]">
            Seguridad
            <br />
            industrial <em>sin<br />compromisos.</em>
          </h2>
          <p className="mt-4 max-w-[380px] text-[13px] font-light text-[var(--sg-copy)]">
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
  );
}

export function LandingFooter() {
  return (
    <footer className="bg-[var(--sg-canvas-2)]">
      <div className="sg-shell py-10">
        <div className="grid gap-8 md:grid-cols-[1fr_auto_auto]">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <SmartGuardMark size="xs" />
              <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.2em] text-[var(--sg-ink)]">
                SmartGuard
              </span>
            </div>
            <p className="max-w-[260px] text-[12px] font-light leading-relaxed text-[var(--sg-muted)]">
              Plataforma SaaS para el control de acceso vehicular industrial.
            </p>
          </div>

          <FooterLinks title="Producto" links={productFooterLinks} />
          <FooterLinks title="Acceso" links={accessFooterLinks} />
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
  );
}

function FeatureList({ features, iconClassName }: { features: readonly string[]; iconClassName: string }) {
  return (
    <div className="mb-10 flex flex-1 flex-col gap-3">
      {features.map((feature) => (
        <div key={feature} className="flex items-start gap-3">
          <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${iconClassName}`} />
          <span className="text-[13px] text-[var(--sg-copy)]">{feature}</span>
        </div>
      ))}
    </div>
  );
}

function FooterLinks({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="mb-1 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">{title}</div>
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="text-[12px] text-[var(--sg-copy)] transition-colors hover:text-[var(--sg-ink)]"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function SmartGuardMark({ size }: { size: "sm" | "xs" }) {
  const classes = size === "sm" ? "h-7 w-7" : "h-6 w-6";
  const iconClasses = size === "sm" ? "h-4 w-4" : "h-3 w-3";

  return (
    <div className={`flex items-center justify-center bg-[var(--sg-accent)] ${classes}`}>
      <svg viewBox="0 0 16 16" className={`fill-[var(--sg-canvas)] ${iconClasses}`}>
        <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
      </svg>
    </div>
  );
}
