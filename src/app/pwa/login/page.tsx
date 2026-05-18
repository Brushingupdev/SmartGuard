"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginPWA } from "./actions";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function PWAInput({
  type,
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoFocus,
}: {
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
        style={{ color: "var(--pwa-muted)" }}
      />
      <input
        type={isPassword ? (show ? "text" : "password") : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={isPassword ? "current-password" : "email"}
        className="w-full h-14 pl-12 pr-12 outline-none transition-all text-[15px]"
        style={{
          background: "var(--pwa-surface)",
          border: "1px solid var(--pwa-border)",
          color: "var(--pwa-ink)",
          fontFamily: "var(--sg-font-body)",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--pwa-accent)";
          e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--pwa-accent) 15%, transparent)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--pwa-border)";
          e.target.style.boxShadow = "none";
        }}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-4 top-1/2 -translate-y-1/2"
          style={{ color: "var(--pwa-muted)" }}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}

export default function PWALoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      const result = await loginPWA(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const role = result?.role;
      if (role === "administrador") {
        router.replace("/admin");
        return;
      }
      if (role === "supervisor") {
        router.replace("/pwa/supervisor");
        return;
      }
      router.replace("/pwa/home");
    } catch {
      setError("Error inesperado. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          onClick={() => router.push("/pwa")}
          className="flex items-center gap-2 transition-opacity active:opacity-60"
          style={{
            color: "var(--pwa-muted)",
            fontFamily: "var(--sg-font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </motion.button>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col justify-between px-6 pt-8 pb-10">
        <div>
          {/* Título */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--pwa-accent)",
                marginBottom: 10,
              }}
            >
              Acceso al sistema
            </p>
            <h1
              style={{
                fontFamily: "var(--sg-font-display)",
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                color: "var(--pwa-ink)",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Bienvenido
              <br />
              <span style={{ color: "var(--pwa-ink-soft)", fontWeight: 400 }}>
                de vuelta.
              </span>
            </h1>
          </motion.div>

          {/* Formulario */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease }}
            className="flex flex-col gap-3 mt-10"
          >
            <PWAInput
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="correo@empresa.com"
              icon={Mail}
              autoFocus
            />
            <PWAInput
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Contraseña"
              icon={Lock}
            />

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className="flex items-start gap-2 px-4 py-3 text-[13px]"
                    style={{
                      background: "color-mix(in srgb, var(--pwa-danger) 10%, transparent)",
                      borderLeft: "3px solid var(--pwa-danger)",
                      color: "var(--pwa-danger)",
                    }}
                  >
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading || !email || !password}
              whileTap={{ scale: 0.98 }}
              className="w-full h-14 mt-2 flex items-center justify-center transition-opacity disabled:opacity-40"
              style={{
                background: "var(--pwa-accent)",
                color: "var(--pwa-accent-fg)",
                fontFamily: "var(--sg-font-mono)",
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 700,
                border: "none",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? (
                <motion.div
                  className="h-5 w-5 rounded-full border-2"
                  style={{
                    borderColor: "rgba(0,0,0,0.2)",
                    borderTopColor: "var(--pwa-accent-fg)",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                />
              ) : (
                "Entrar →"
              )}
            </motion.button>
          </motion.form>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
          style={{
            fontFamily: "var(--sg-font-mono)",
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--pwa-muted)",
          }}
        >
          ¿Problemas para ingresar? Contacta a tu supervisor
        </motion.p>
      </div>
    </div>
  );
}
