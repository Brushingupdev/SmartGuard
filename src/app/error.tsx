"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--sg-canvas)]">
      <div className="w-full max-w-[480px] border border-[var(--sg-danger)] bg-[var(--sg-panel)] shadow-[8px_8px_0_rgba(211,92,79,0.08)]">
        <div className="border-b border-[var(--sg-line)] px-6 py-4 flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--sg-accent)]">
            <svg viewBox="0 0 16 16" className="h-4 w-4 fill-[var(--sg-canvas)]">
              <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
            </svg>
          </div>
          <span className="sg-font-display text-[15px] font-bold uppercase tracking-[0.16em] text-[var(--sg-ink)]">
            SmartGuard
          </span>
        </div>

        <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center border border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)]">
            <svg viewBox="0 0 24 24" className="h-7 w-7 stroke-[var(--sg-danger)] fill-none" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="sg-font-display text-[20px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
            Error del sistema
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--sg-copy)] max-w-[320px]">
            Ocurrió un error inesperado. Puedes intentar recargar la página o regresar al panel principal.
          </p>
          {error.digest && (
            <div className="sg-font-mono text-[10px] text-[var(--sg-muted)] bg-[var(--sg-panel-2)] border border-[var(--sg-line)] px-3 py-1.5">
              Ref: {error.digest}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--sg-line)] px-6 py-5 flex gap-3">
          <Link href="/dashboard" className="sg-btn sg-btn-ghost flex-1 justify-center">
            Inicio
          </Link>
          <button onClick={reset} className="sg-btn sg-btn-primary flex-1 justify-center">
            Reintentar
          </button>
        </div>
      </div>

      <div className="mt-5 sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
        SmartGuard · Control Vehicular
      </div>
    </div>
  );
}
