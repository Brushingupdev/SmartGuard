"use client";

import Sidebar from "@/components/Sidebar";
import { getBillingStatus } from "@/app/actions";
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

function BillingBanner() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getBillingStatus>>>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => { getBillingStatus().then(setStatus); }, []);

  if (!status || dismissed) return null;

  // Cuenta suspendida — no se puede cerrar
  if (status.plan === "suspended") {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(3,5,4,0.92)] backdrop-blur-sm">
        <div className="max-w-[420px] w-full mx-4 border border-[var(--sg-danger)] bg-[var(--sg-panel)] p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-[var(--sg-danger)] mx-auto mb-4" />
          <h2 className="sg-font-display text-[20px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-2">
            Cuenta suspendida
          </h2>
          <p className="text-[13px] text-[var(--sg-muted)] mb-6">
            El acceso a SmartGuard ha sido suspendido. Contacta al equipo de SmartGuard para reactivar tu cuenta.
          </p>
          <a href="/upgrade" className="sg-btn sg-btn-danger w-full justify-center">
            Ver opciones de reactivación
          </a>
        </div>
      </div>
    );
  }

  // Trial expirado — el middleware debería haber redirigido, pero por si acaso
  if (status.plan === "trial" && status.expired) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(3,5,4,0.92)] backdrop-blur-sm">
        <div className="max-w-[420px] w-full mx-4 border border-[var(--sg-warn)] bg-[var(--sg-panel)] p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-[var(--sg-warn)] mx-auto mb-4" />
          <h2 className="sg-font-display text-[20px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-2">
            Período de prueba finalizado
          </h2>
          <p className="text-[13px] text-[var(--sg-muted)] mb-6">
            Tu prueba gratuita de SmartGuard ha terminado. Activa tu plan para continuar operando.
          </p>
          <a href="/upgrade" className="sg-btn sg-btn-accent w-full justify-center">
            Activar plan →
          </a>
        </div>
      </div>
    );
  }

  // Trial por vencer (≤ 3 días)
  if (status.plan === "trial" && status.daysLeft != null && status.daysLeft <= 3) {
    return (
      <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-between gap-3 px-5 py-2.5 bg-[var(--sg-warn)] text-[var(--sg-canvas)]">
        <div className="flex items-center gap-2 text-[12px] font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {status.daysLeft === 0
            ? <>Tu período de prueba <strong>vence hoy</strong>. Activa tu plan para no perder el acceso.</>
            : <>Tu período de prueba vence en <strong>{status.daysLeft} día{status.daysLeft !== 1 ? "s" : ""}</strong>. Activa tu plan para no perder el acceso.</>
          }
          <a href="/upgrade" className="underline font-bold ml-1 hover:opacity-80">Ver opciones →</a>
        </div>
        <button onClick={() => setDismissed(true)} className="shrink-0 opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <BillingBanner />
      <Sidebar />
      <main className="min-w-0 flex-1 pt-[64px] lg:pt-0">
        <div className="px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
