"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Shield, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginPWA } from "./login/actions";
import { ease, LogoMark, type PwaRole, ThemeToggle } from "./pwaEntryShared";

export function RoleSelector({
  onSelect,
}: {
  onSelect: (role: PwaRole) => void;
}) {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, var(--pwa-accent) 6%, transparent), transparent)",
        }}
      />

      <div className="relative flex items-center justify-between px-6 pt-7">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease }}
          style={{
            fontFamily: "var(--sg-font-mono)",
            fontSize: 8,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "var(--pwa-muted)",
          }}
        >
          SmartGuard · v2
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <ThemeToggle />
        </motion.div>
      </div>

      <div className="relative flex flex-col items-center justify-center px-6 pb-8 pt-10">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease }}
        >
          <LogoMark size={72} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6, ease }}
          className="mt-5 text-center"
        >
          <h1
            style={{
              fontFamily: "var(--sg-font-display)",
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              color: "var(--pwa-ink)",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Smart<span style={{ color: "var(--pwa-accent)" }}>Guard</span>
          </h1>
          <p
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--pwa-muted)",
              marginTop: 8,
            }}
          >
            Control de acceso industrial
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.4, duration: 0.6, ease }}
        className="mx-6 mb-8"
        style={{ height: 1, background: "var(--pwa-border)" }}
      />

      <div className="relative flex flex-1 flex-col gap-4 px-6">
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5, ease }}
          whileTap={{ scale: 0.975 }}
          onClick={() => onSelect("supervisor")}
          className="relative flex w-full items-center gap-5 overflow-hidden p-6 text-left"
          style={{
            background: "var(--pwa-surface)",
            borderTop: "3px solid var(--pwa-accent)",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 120,
              height: 120,
              background:
                "radial-gradient(circle at top right, color-mix(in srgb, var(--pwa-accent) 10%, transparent), transparent)",
              pointerEvents: "none",
            }}
          />

          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center"
            style={{
              background:
                "color-mix(in srgb, var(--pwa-accent) 10%, transparent)",
            }}
          >
            <Shield className="h-7 w-7" style={{ color: "var(--pwa-accent)" }} />
          </div>

          <div className="min-w-0 flex-1">
            <p
              style={{
                fontFamily: "var(--sg-font-display)",
                fontSize: 20,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "-0.01em",
                color: "var(--pwa-ink)",
                margin: 0,
              }}
            >
              Supervisor
            </p>
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
                margin: "5px 0 0",
              }}
            >
              Dashboard · Reportes · Gestión
            </p>
          </div>

          <span
            style={{
              color: "var(--pwa-accent)",
              fontSize: 22,
              fontWeight: 200,
              lineHeight: 1,
              marginRight: 4,
            }}
          >
            →
          </span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5, ease }}
          whileTap={{ scale: 0.975 }}
          onClick={() => onSelect("guardia")}
          className="relative flex w-full items-center gap-5 overflow-hidden p-6 text-left"
          style={{
            background: "var(--pwa-surface)",
            borderTop: "3px solid #6bbd8a",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 120,
              height: 120,
              background:
                "radial-gradient(circle at top right, color-mix(in srgb, #6bbd8a 8%, transparent), transparent)",
              pointerEvents: "none",
            }}
          />

          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center"
            style={{ background: "color-mix(in srgb, #6bbd8a 10%, transparent)" }}
          >
            <UserCheck className="h-7 w-7" style={{ color: "#6bbd8a" }} />
          </div>

          <div className="min-w-0 flex-1">
            <p
              style={{
                fontFamily: "var(--sg-font-display)",
                fontSize: 20,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "-0.01em",
                color: "var(--pwa-ink)",
                margin: 0,
              }}
            >
              Guardia
            </p>
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
                margin: "5px 0 0",
              }}
            >
              Registro · Semáforo · Operación
            </p>
          </div>

          <span
            style={{
              color: "#6bbd8a",
              fontSize: 22,
              fontWeight: 200,
              lineHeight: 1,
              marginRight: 4,
            }}
          >
            →
          </span>
        </motion.button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="px-6 py-8 text-center"
        style={{
          fontFamily: "var(--sg-font-mono)",
          fontSize: 8,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--pwa-muted)",
          opacity: 0.4,
        }}
      >
        Plataforma segura · Datos en tiempo real
      </motion.p>
    </div>
  );
}

export function LoginScreen({
  role,
  onBack,
}: {
  role: PwaRole;
  onBack: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accent = role === "supervisor" ? "var(--pwa-accent)" : "#6bbd8a";
  const accentFg = role === "supervisor" ? "var(--pwa-accent-fg)" : "#000";

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const result = await loginPWA(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const nextRole = result.role;
    if (nextRole === "administrador") router.replace("/admin");
    else if (nextRole === "supervisor") router.replace("/pwa/supervisor");
    else router.replace("/pwa/home");
  };

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 90% 50% at 50% 0%, color-mix(in srgb, ${accent} 8%, transparent), transparent)`,
        }}
      />

      <div className="relative flex items-center justify-between px-6 pb-2 pt-7">
        <button
          onClick={onBack}
          className="flex items-center gap-2 transition-opacity active:opacity-60"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--sg-font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--pwa-muted)",
          }}
        >
          ← Volver
        </button>
        <ThemeToggle />
      </div>

      <div className="relative flex flex-col items-center px-6 pb-8 pt-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease }}
        >
          <LogoMark size={56} color={accent} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease }}
          className="mt-5 flex items-center gap-2"
        >
          {role === "supervisor" ? (
            <Shield className="h-4 w-4" style={{ color: accent }} />
          ) : (
            <UserCheck className="h-4 w-4" style={{ color: accent }} />
          )}
          <span
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 600,
            }}
          >
            {role === "supervisor" ? "Supervisor" : "Guardia"}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease }}
          style={{
            fontFamily: "var(--sg-font-display)",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            color: "var(--pwa-ink)",
            margin: "10px 0 0",
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          Bienvenido
          <br />
          <span
            style={{
              color: "var(--pwa-ink-soft)",
              fontWeight: 400,
              fontSize: 24,
            }}
          >
            de vuelta.
          </span>
        </motion.h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease }}
        className="relative flex-1 px-6 pb-10"
      >
        <form
          onSubmit={handleLogin}
          className="mx-auto flex max-w-[420px] flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
              }}
            >
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@empresa.com"
              required
              autoFocus
              className="h-14 w-full px-4 text-[15px] outline-none transition-all"
              style={{
                background: "var(--pwa-surface)",
                border: "1px solid var(--pwa-border)",
                color: "var(--pwa-ink)",
                fontFamily: "var(--sg-font-body)",
              }}
              onFocus={(event) => {
                event.target.style.borderColor = accent;
                event.target.style.boxShadow = `0 0 0 3px color-mix(in srgb, ${accent} 15%, transparent)`;
              }}
              onBlur={(event) => {
                event.target.style.borderColor = "var(--pwa-border)";
                event.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
              }}
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                className="h-14 w-full px-4 pr-12 text-[15px] outline-none transition-all"
                style={{
                  background: "var(--pwa-surface)",
                  border: "1px solid var(--pwa-border)",
                  color: "var(--pwa-ink)",
                  fontFamily: "var(--sg-font-body)",
                }}
                onFocus={(event) => {
                  event.target.style.borderColor = accent;
                  event.target.style.boxShadow = `0 0 0 3px color-mix(in srgb, ${accent} 15%, transparent)`;
                }}
                onBlur={(event) => {
                  event.target.style.borderColor = "var(--pwa-border)";
                  event.target.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((value) => !value)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity active:opacity-60"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--pwa-muted)",
                }}
              >
                {showPwd ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  style={{
                    padding: "12px 16px",
                    background:
                      "color-mix(in srgb, var(--pwa-danger) 10%, transparent)",
                    borderLeft: "3px solid var(--pwa-danger)",
                    color: "var(--pwa-danger)",
                    fontFamily: "var(--sg-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading || !email || !password}
            whileTap={{ scale: 0.97 }}
            className="mt-1 flex h-14 w-full items-center justify-center gap-2 transition-opacity disabled:opacity-40"
            style={{
              background: accent,
              color: accentFg,
              fontFamily: "var(--sg-font-mono)",
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
            }}
          >
            {loading ? (
              <motion.div
                className="h-5 w-5 rounded-full border-2"
                style={{
                  borderColor: "rgba(0,0,0,0.15)",
                  borderTopColor: accentFg,
                }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              />
            ) : (
              `Entrar como ${role === "supervisor" ? "supervisor" : "guardia"} →`
            )}
          </motion.button>

          <p
            className="text-center"
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--pwa-muted)",
              opacity: 0.6,
            }}
          >
            ¿Olvidaste tu contraseña? Contacta al administrador
          </p>
        </form>
      </motion.div>
    </div>
  );
}
