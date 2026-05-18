"use client";

import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center bg-[var(--sg-accent)]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 16 16" className="fill-[var(--sg-canvas)]" style={{ width: size * 0.57, height: size * 0.57 }}>
        <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    try {
      const { login } = await import('./actions');
      const result = await login(formData);
      if (result?.error) {
        setErrorMsg(result.error);
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Ocurrió un error inesperado al iniciar sesión.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* Presentation panel */}
      <section className="relative hidden overflow-hidden border-r border-[var(--sg-line)] bg-[var(--sg-canvas-2)] lg:flex">
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full border border-[var(--sg-line)] opacity-30"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full border border-[var(--sg-line)] opacity-20"
          aria-hidden
        />

        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="flex items-center gap-3">
            <LogoMark size={32} />
            <div>
              <div className="sg-font-display text-[18px] font-bold uppercase tracking-[0.2em] text-[var(--sg-ink)] leading-none">
                SmartGuard
              </div>
              <div className="sg-font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--sg-muted)] mt-1">
                Control de acceso industrial
              </div>
            </div>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="max-w-[560px]"
          >
            <div className="sg-kicker sg-eyebrow-line">Control de acceso industrial</div>
            <h1 className="sg-display mt-6 text-[56px] xl:text-[72px]">
              Tu planta<br />bajo<br /><em>control.</em>
            </h1>
            <p className="mt-6 max-w-[34rem] text-[15px] leading-[1.7] font-light text-[var(--sg-copy)]">
              Accede al panel operativo de tu empresa. Monitorea el flujo vehicular,
              consulta el historial y sigue el rendimiento en tiempo real.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-0 border border-[var(--sg-line)]">
              {[
                { label: "Activación", value: "< 5 min" },
                { label: "Roles", value: "02" },
                { label: "Cifrado", value: "TLS" },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`p-5 ${i < 2 ? "border-r border-[var(--sg-line)]" : ""}`}
                >
                  <div className="sg-slabel">{item.label}</div>
                  <div className="sg-font-display text-[28px] font-bold text-[var(--sg-ink)] leading-none mt-3">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="border border-[var(--sg-line)] bg-[var(--sg-panel)] p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--sg-accent)]" />
              <div>
                <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)]">
                  Plataforma SaaS multi-empresa
                </div>
                <div className="mt-2 text-[13px] leading-[1.6] font-light text-[var(--sg-copy)]">
                  Cada empresa opera en su propio espacio. Supervisores y guardias con accesos
                  diferenciados según su rol y planta asignada.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: easeOut }}
          className="w-full max-w-[440px]"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark size={28} />
            <div>
              <div className="sg-font-display text-[16px] font-bold uppercase tracking-[0.2em] text-[var(--sg-ink)] leading-none">
                SmartGuard
              </div>
              <div className="sg-font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--sg-muted)] mt-1">
                Inicio de sesión
              </div>
            </div>
          </div>

          <div className="sg-panel p-7 md:p-8">
            <div className="sg-kicker">Iniciar sesión</div>
            <h2 className="sg-font-display mt-3 text-[30px] font-bold uppercase tracking-[-0.01em] text-[var(--sg-ink)] leading-[1.05]">
              Bienvenido al<br />centro operativo.
            </h2>
            <p className="mt-4 text-[13px] leading-[1.6] font-light text-[var(--sg-copy)]">
              Usa tus credenciales para entrar al tablero, revisar la operación y consultar tu historial.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              
              {errorMsg && (
                <div className="bg-[rgba(211,92,79,0.1)] border-l-2 border-[var(--sg-danger)] p-3 text-[13px] text-[var(--sg-danger)]">
                  {errorMsg}
                </div>
              )}

              <div className="sg-field">
                <label className="sg-label">Correo corporativo</label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="guardia@empresa.com"
                  className="sg-input"
                />
              </div>

              <div className="sg-field">
                <div className="flex items-center justify-between gap-4">
                  <label className="sg-label">Contraseña</label>
                  <a
                    href="/reset-password"
                    className="sg-font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--sg-accent)] hover:text-[var(--sg-accent-soft)]"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="Ingresa tu contraseña"
                    className="sg-input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
                    aria-label="Mostrar u ocultar contraseña"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className={`sg-btn sg-btn-accent w-full ${loading ? "cursor-wait" : ""}`}
              >
                {loading ? (
                  <motion.span
                    className="inline-flex h-4 w-4 rounded-full border-2 border-[rgba(20,17,10,0.3)] border-t-[#14110a]"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  />
                ) : (
                  <>
                    Entrar al sistema
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-6 border-t border-[var(--sg-line)] pt-5 text-[12px] leading-[1.6] font-light text-[var(--sg-copy)]">
              ¿Tu empresa aún no está registrada?{" "}
              <a href="/onboarding" className="text-[var(--sg-accent)] hover:text-[var(--sg-accent-soft)] transition-colors">
                Registra tu empresa aquí
              </a>
              . Si ya tienes empresa pero no tienes usuario, solicítalo a tu supervisor.
            </div>
          </div>

          <div className="mt-5 text-center sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">
            <Link href="/" className="transition-colors hover:text-[var(--sg-ink)]">
              ← Volver al inicio
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
