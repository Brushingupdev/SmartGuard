import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AlertTriangle, Clock, MessageCircle, Mail, LogOut, CheckCircle2 } from "lucide-react";
import { logout } from "@/app/login/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activar plan" };

// Número WhatsApp del fundador (sin + ni espacios)
const WHATSAPP_NUMBER = "51983450723";
const CONTACT_EMAIL   = "adrishio09@gmail.com";

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Admins no deberían llegar aquí
  if (user.user_metadata?.role === "administrador") redirect("/admin");

  // Leer estado real del plan
  const companyId = user.user_metadata?.company_id as string | undefined;
  let plan: string = "trial";
  let companyName: string = user.user_metadata?.company as string ?? "tu empresa";

  if (companyId) {
    const { data } = await supabase
      .from("companies")
      .select("plan, trial_ends_at, name")
      .eq("id", companyId)
      .single();
    if (data) {
      plan        = data.plan as string;
      companyName = data.name as string;
    }
  }

  const isSuspended = plan === "suspended";

  // Si el plan está activo, redirigir al dashboard
  if (plan === "active") redirect("/dashboard");

  const whatsappMsg = encodeURIComponent(
    `Hola, soy ${companyName} y quiero activar mi plan de SmartGuard. ¿Me puedes ayudar?`
  );

  return (
    <div className="min-h-screen bg-[var(--sg-canvas)] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[480px]">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center bg-[var(--sg-accent)]">
              <svg viewBox="0 0 16 16" className="fill-[var(--sg-canvas)]" style={{ width: 14, height: 14 }}>
                <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
              </svg>
            </div>
            <span className="sg-font-display text-[15px] font-bold uppercase tracking-[0.2em] text-[var(--sg-ink)]">
              SmartGuard
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="sg-panel p-8 text-center">

          {/* Icon */}
          <div className={`flex h-16 w-16 items-center justify-center border mx-auto mb-5 ${
            isSuspended
              ? "border-[var(--sg-danger)] bg-[rgba(211,92,79,0.1)]"
              : "border-[var(--sg-warn)] bg-[rgba(200,168,75,0.1)]"
          }`}>
            <AlertTriangle className={`h-8 w-8 ${isSuspended ? "text-[var(--sg-danger)]" : "text-[var(--sg-warn)]"}`} />
          </div>

          {/* Title */}
          <div className="sg-kicker mb-2">
            {isSuspended ? "Cuenta suspendida" : "Período de prueba finalizado"}
          </div>
          <h1 className="sg-font-display text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-3">
            {isSuspended ? "Acceso suspendido" : "Tu prueba ha terminado"}
          </h1>
          <p className="text-[13px] text-[var(--sg-muted)] leading-relaxed mb-6">
            {isSuspended
              ? `La cuenta de ${companyName} ha sido suspendida. Contacta al equipo de SmartGuard para reactivar el acceso.`
              : `La prueba gratuita de ${companyName} ha terminado. Para continuar operando con SmartGuard, activa tu plan mensual.`
            }
          </p>

          {/* Plan info */}
          {!isSuspended && (
            <div className="mb-6 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4 text-left">
              <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] mb-3">
                Incluye el plan activo
              </div>
              {[
                "Registro ilimitado de vehículos",
                "Alertas WhatsApp y Email en tiempo real",
                "Dashboard y reportes avanzados",
                "Importación de datos históricos",
                "Soporte técnico directo",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2.5 py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--sg-success)] shrink-0" />
                  <span className="text-[12px] text-[var(--sg-copy)]">{feature}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col gap-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="sg-btn sg-btn-accent w-full justify-center h-11"
            >
              <MessageCircle className="h-4 w-4" />
              Activar por WhatsApp
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Activar plan SmartGuard — ${companyName}&body=Hola, soy ${companyName} y quiero activar mi plan de SmartGuard.`}
              className="sg-btn sg-btn-primary w-full justify-center h-11"
            >
              <Mail className="h-4 w-4" />
              Activar por correo
            </a>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--sg-line)]" />
            <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">o</span>
            <div className="flex-1 h-px bg-[var(--sg-line)]" />
          </div>

          {/* Process info */}
          <div className="text-left mb-6">
            <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] mb-3">
              ¿Cómo funciona?
            </div>
            {[
              ["01", "Contáctanos por WhatsApp o correo"],
              ["02", "Te enviamos el monto y datos de pago (Yape / transferencia)"],
              ["03", "Confirmas el pago con captura de pantalla"],
              ["04", "Activamos tu cuenta en menos de 1 hora"],
            ].map(([num, step]) => (
              <div key={num} className="flex items-center gap-3 py-2 border-b border-[var(--sg-line)] last:border-0">
                <span className="sg-font-mono text-[10px] font-bold text-[var(--sg-accent)] shrink-0">{num}</span>
                <span className="text-[12px] text-[var(--sg-copy)]">{step}</span>
              </div>
            ))}
          </div>

          {/* Time indicator */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--sg-muted)] mb-6">
            <Clock className="h-3.5 w-3.5" />
            Activación en menos de 1 hora hábil
          </div>

          {/* Sign out */}
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full text-[11px] text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar sesión
            </button>
          </form>
        </div>

        <p className="text-center mt-6 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
          SmartGuard · Control Vehicular Industrial
        </p>
      </div>
    </div>
  );
}
