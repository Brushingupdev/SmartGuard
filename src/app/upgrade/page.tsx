import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, LogOut, Mail, MessageCircle, ShieldCheck, Zap } from "lucide-react";
import { logout } from "@/app/login/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activar plan — SmartGuard" };

const WHATSAPP_NUMBER = "51983450723";
const CONTACT_EMAIL   = "adrishio09@gmail.com";

const PLAN_FEATURES = [
  "Registro ilimitado de vehículos",
  "Alertas WhatsApp y Email en tiempo real",
  "Dashboard con KPIs y diagnóstico operativo",
  "Análisis SLA de proveedores",
  "Reportes y exportación Excel / PDF",
  "Importación de datos históricos",
  "Múltiples puertas y sedes",
  "Cuentas ilimitadas de guardias",
  "Soporte técnico directo",
];

const PAYMENT_METHODS = [
  { label: "Yape",        value: "51 983 450 723",  note: "Envía el comprobante por WhatsApp" },
  { label: "Transferencia BCP", value: "193-1234567890-0-62", note: "CCI: 002-193-001234567890-62" },
];

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role === "administrador") redirect("/admin");

  const companyId = user.user_metadata?.company_id as string | undefined;
  let plan: string = "trial";
  let companyName: string = user.user_metadata?.company as string ?? "tu empresa";

  if (companyId) {
    const { data } = await supabase
      .from("companies")
      .select("plan, trial_ends_at, name")
      .eq("id", companyId)
      .single();
    if (data) { plan = data.plan as string; companyName = data.name as string; }
  }

  if (plan === "active") redirect("/dashboard");

  const isSuspended = plan === "suspended";

  const whatsappMsg = encodeURIComponent(
    `Hola, soy ${companyName} y quiero activar mi plan mensual de SmartGuard.`
  );

  return (
    <div className="min-h-screen bg-[var(--sg-canvas)] px-5 py-10 flex items-start justify-center">
      <div className="w-full max-w-[920px]">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex h-7 w-7 items-center justify-center bg-[var(--sg-accent)]">
            <svg viewBox="0 0 16 16" className="fill-[var(--sg-canvas)]" style={{ width: 12, height: 12 }}>
              <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
            </svg>
          </div>
          <span className="sg-font-display text-[14px] font-bold uppercase tracking-[0.2em] text-[var(--sg-ink)]">
            SmartGuard
          </span>
        </div>

        {/* Status banner */}
        <div className={`flex items-center gap-3 border p-4 mb-8 ${
          isSuspended
            ? "border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)]"
            : "border-[var(--sg-warn)] bg-[rgba(212,134,74,0.08)]"
        }`}>
          <AlertTriangle className={`h-5 w-5 shrink-0 ${isSuspended ? "text-[var(--sg-danger)]" : "text-[var(--sg-warn)]"}`} />
          <div>
            <div className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
              {isSuspended ? "Cuenta suspendida" : `Período de prueba finalizado — ${companyName}`}
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--sg-muted)]">
              {isSuspended
                ? "Contacta al equipo para reactivar el acceso."
                : "Activa tu plan para seguir operando sin interrupciones."}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

          {/* Left — plan card */}
          <div className="sg-panel p-7">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="sg-kicker mb-1">Plan Operativo</div>
                <div className="flex items-baseline gap-2">
                  <span className="sg-font-display text-[40px] font-bold leading-none text-[var(--sg-ink)]">S/ 299</span>
                  <span className="sg-font-mono text-[13px] text-[var(--sg-muted)]">/ mes</span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--sg-muted)]">Sin contrato mínimo · cancela cuando quieras</div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[var(--sg-accent)] bg-[rgba(200,168,75,0.1)]">
                <ShieldCheck className="h-5 w-5 text-[var(--sg-accent)]" />
              </div>
            </div>

            <div className="border-t border-[var(--sg-line)] pt-5 mb-6">
              <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] mb-3">Incluye</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PLAN_FEATURES.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--sg-success)]" />
                    <span className="text-[12px] text-[var(--sg-copy)]">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="sg-btn sg-btn-accent w-full justify-center h-12 text-[13px]"
              >
                <MessageCircle className="h-4.5 w-4.5" />
                Activar por WhatsApp
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=Activar plan SmartGuard — ${companyName}&body=Hola, quiero activar mi plan mensual de SmartGuard para ${companyName}.`}
                className="sg-btn sg-btn-primary w-full justify-center h-11"
              >
                <Mail className="h-4 w-4" />
                Activar por correo
              </a>
            </div>
          </div>

          {/* Right — payment + steps */}
          <div className="flex flex-col gap-5">

            {/* Payment methods */}
            <div className="sg-panel p-5">
              <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] mb-4">
                Métodos de pago aceptados
              </div>
              <div className="flex flex-col gap-3">
                {PAYMENT_METHODS.map(m => (
                  <div key={m.label} className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">{m.label}</span>
                    </div>
                    <div className="sg-font-mono text-[14px] font-bold text-[var(--sg-ink)]">{m.value}</div>
                    <div className="mt-0.5 text-[10px] text-[var(--sg-muted)]">{m.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div className="sg-panel p-5">
              <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] mb-4">
                ¿Cómo activar?
              </div>
              <div className="flex flex-col gap-0">
                {[
                  ["Contáctanos por WhatsApp o correo"],
                  ["Realiza el pago por Yape o transferencia"],
                  ["Envíanos el comprobante por WhatsApp"],
                  ["Activamos tu cuenta en menos de 1 hora hábil"],
                ].map(([step], i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-[var(--sg-line)] last:border-0">
                    <span className="sg-font-mono text-[11px] font-bold text-[var(--sg-accent)] shrink-0 mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[12px] text-[var(--sg-copy)]">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time indicator */}
            <div className="flex items-center gap-2 px-1 text-[11px] text-[var(--sg-muted)]">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Activación en menos de 1 hora hábil
            </div>
            <div className="flex items-center gap-2 px-1 text-[11px] text-[var(--sg-muted)]">
              <Zap className="h-3.5 w-3.5 shrink-0" />
              Sin configuración adicional — acceso inmediato al activar
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div className="mt-8 text-center">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 mx-auto text-[11px] text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar sesión
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
