"use client";

import { motion } from "framer-motion";
import { Eye, EyeOff, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { updatePassword } from "@/app/login/actions";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    const result = await updatePassword(password);
    setLoading(false);
    if (!result.success) {
      setErrorMsg(result.error ?? "Error al actualizar la contraseña.");
    }
    // En caso de éxito, updatePassword hace redirect a /dashboard automáticamente
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
        <div className="inline-flex items-center gap-3 mb-8">
          <div className="flex h-7 w-7 items-center justify-center bg-[var(--sg-accent)]">
            <svg viewBox="0 0 16 16" className="h-4 w-4 fill-[var(--sg-canvas)]">
              <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
            </svg>
          </div>
          <span className="sg-font-display text-[16px] font-bold uppercase tracking-[0.2em] text-[var(--sg-ink)]">
            SmartGuard
          </span>
        </div>

        <div className="border border-[var(--sg-line)] bg-[var(--sg-panel)] p-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="h-5 w-5 text-[var(--sg-accent)]" />
              <h1 className="sg-font-display text-[22px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                Nueva contraseña
              </h1>
            </div>
            <p className="text-[13px] text-[var(--sg-copy)]">
              Elige una contraseña segura de al menos 8 caracteres.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="sg-field">
              <label className="sg-label">Nueva contraseña *</label>
              <div className="relative">
                <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                  className="sg-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="sg-field">
              <label className="sg-label">Confirmar contraseña *</label>
              <div className="relative">
                <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  className={`sg-input pl-10 ${confirm && confirm !== password ? "border-[var(--sg-danger)]" : ""}`}
                />
              </div>
              {confirm && confirm !== password && (
                <p className="mt-1 text-[11px] text-[var(--sg-danger)]">Las contraseñas no coinciden</p>
              )}
            </div>

            {errorMsg && (
              <div className="border border-[var(--sg-danger)] bg-[rgba(211,92,79,0.08)] px-4 py-3 text-[12px] text-[var(--sg-danger)]">
                {errorMsg}
              </div>
            )}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={loading || (!!confirm && confirm !== password)}
              className={`sg-btn sg-btn-accent w-full justify-center h-12 ${loading ? "opacity-70" : ""}`}
            >
              {loading ? (
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                  <RefreshCw className="h-5 w-5" />
                </motion.span>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Guardar nueva contraseña
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
