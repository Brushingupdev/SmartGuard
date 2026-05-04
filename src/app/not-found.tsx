import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--sg-canvas)]">
      <div className="w-full max-w-[480px] border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[8px_8px_0_rgba(196,192,180,0.06)]">
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
          <div className="sg-font-display text-[80px] font-bold leading-none text-[var(--sg-line-strong)]">
            404
          </div>
          <div className="sg-font-display text-[20px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
            Ruta no encontrada
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--sg-copy)] max-w-[320px]">
            La página que buscas no existe o fue movida. Verifica la URL o regresa al panel principal.
          </p>
        </div>

        <div className="border-t border-[var(--sg-line)] px-6 py-5 flex gap-3">
          <Link href="/" className="sg-btn sg-btn-ghost flex-1 justify-center">
            Inicio
          </Link>
          <Link href="/dashboard" className="sg-btn sg-btn-primary flex-1 justify-center">
            Dashboard
          </Link>
        </div>
      </div>

      <div className="mt-5 sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
        SmartGuard · Control Vehicular
      </div>
    </div>
  );
}
