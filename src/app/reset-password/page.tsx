"use client";

import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Mail, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { resetPassword } from "@/app/login/actions";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const result = await resetPassword(email);
    setLoading(false);
    if (result.success) {
      setSent(true);
    } else {
      setErrorMsg(result.error ?? "Error al enviar el correo.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--sg-canvas)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
        className="w-full max-w-[420px]"
      >
        {/* Logo */}
        <Link href="/login" className="inline-flex items-center gap-3 mb-8">
          <div className="flex h-7 w-7 items-center justify-center bg-[var(--sg-accent)]">
            <svg viewBox="0 0 16 16" className="h-4 w-4 fill-[var(--sg-canvas)]">
              <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
            </svg>
          </div>
          <span className="sg-font-display text-[16px] font-bold uppercase tracking-[0.2em] text-[var(--sg-ink)]">
            SmartGuard
          </span>
        </Link>

        <div className="border border-[var(--sg-line)] bg-[var(--sg-panel)] p-8">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <CheckCircle2 className="h-12 w-12 text-[var(--sg-success)]" />
              <div>
                <div className="sg-font-display text-[20px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-2">
                  Correo enviado
                </div>
                <p className="text-[13px] text-[var(--sg-copy)] leading-relaxed">
                  Revisa tu bandeja de entrada en <strong className="text-[var(--sg-ink)]">{email}</strong>.
                  Haz clic en el enlace para crear una nueva contraseña.
                </p>
              </div>
              <Link href="/login" className="sg-btn sg-btn-ghost mt-2">
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="sg-font-display text-[22px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-2">
                  Recuperar acceso
                </h1>
                <p className="text-[13px] text-[var(--sg-copy)]">
                  Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="sg-field">
                  <label className="sg-label">Correo electrónico *</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      required
                      className="sg-input pl-10"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="border border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] px-4 py-3 text-[12px] text-[var(--sg-danger)]">
                    {errorMsg}
                  </div>
                )}

                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  className={`sg-btn sg-btn-accent w-full justify-center h-12 ${loading ? "opacity-70" : ""}`}
                >
                  {loading ? (
                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                      <RefreshCw className="h-5 w-5" />
                    </motion.span>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Enviar enlace de recuperación
                    </>
                  )}
                </motion.button>

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver al inicio de sesión
                </Link>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
