"use client";

import dynamic from "next/dynamic";
import type { DashboardClientProps } from "./dashboardClientTypes";

const DashboardClient = dynamic(() => import("./DashboardClient"), {
  ssr: false,
  loading: () => (
    <div
      aria-busy="true"
      className="flex min-h-screen items-center justify-center bg-[var(--sg-canvas)] px-5"
    >
      <div className="border border-[var(--sg-line)] bg-[var(--sg-panel)] px-5 py-4 text-center">
        <p className="sg-font-display text-sm font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)]">
          Cargando dashboard
        </p>
        <p className="mt-1 text-xs text-[var(--sg-muted)]">
          Preparando los indicadores operativos.
        </p>
      </div>
    </div>
  ),
});

export default function DashboardClientShell(props: DashboardClientProps) {
  return <DashboardClient {...props} />;
}
