"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePWATheme } from "@/contexts/PWAThemeContext";
import { Palette } from "lucide-react";
import { useState } from "react";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Glow */}
      <div
        className="absolute inset-0 blur-xl opacity-30"
        style={{ background: "var(--pwa-accent)", borderRadius: "50%" }}
      />
      {/* Border box */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: size,
          height: size,
          border: "2px solid var(--pwa-accent)",
          background: "var(--pwa-surface)",
        }}
      >
        <svg
          viewBox="0 0 32 32"
          style={{ width: size * 0.5, height: size * 0.5, fill: "var(--pwa-accent)" }}
        >
          <path d="M16 2 L28 7 L28 18 C28 24 23 29 16 32 C9 29 4 24 4 18 L4 7 Z" fill="none" stroke="var(--pwa-accent)" strokeWidth="1.5" strokeLinejoin="round"/>
          <rect x="14" y="10" width="4" height="12" rx="1"/>
          <rect x="10" y="14" width="12" height="4" rx="1"/>
        </svg>
      </div>
    </motion.div>
  );
}

function ThemePicker() {
  const { theme, setTheme, themes } = usePWATheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center h-9 w-9 rounded-full transition-colors"
        style={{
          background: "var(--pwa-surface-2)",
          border: "1px solid var(--pwa-border)",
          color: "var(--pwa-muted)",
        }}
      >
        <Palette className="h-4 w-4" />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-full right-0 mb-2 flex flex-col gap-1 p-2 rounded-none shadow-lg"
          style={{
            background: "var(--pwa-surface)",
            border: "1px solid var(--pwa-border)",
            minWidth: 120,
          }}
        >
          {themes.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTheme(t.key); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors"
              style={{
                color: theme === t.key ? "var(--pwa-accent)" : "var(--pwa-ink-soft)",
                background: theme === t.key ? "var(--pwa-surface-2)" : "transparent",
                fontFamily: "var(--sg-font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  background: t.key === "dark" ? "#c8a84b" : t.key === "light" ? "#b8941e" : "#c8a84b",
                  opacity: theme === t.key ? 1 : 0.4,
                }}
              />
              {t.label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default function PWAWelcomePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            fontFamily: "var(--sg-font-mono)",
            fontSize: 9,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--pwa-muted)",
          }}
        >
          SmartGuard · v2
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <ThemePicker />
        </motion.div>
      </div>

      {/* Centro */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 gap-8">
        <LogoMark size={80} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease }}
          className="text-center"
        >
          <h1
            style={{
              fontFamily: "var(--sg-font-display)",
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              color: "var(--pwa-ink)",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Smart
            <span style={{ color: "var(--pwa-accent)" }}>Guard</span>
          </h1>
          <p
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--pwa-muted)",
              marginTop: 10,
            }}
          >
            Control de acceso vehicular
          </p>
        </motion.div>

        {/* Línea decorativa */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.5, ease }}
          style={{
            height: 1,
            width: 48,
            background: "var(--pwa-accent)",
            opacity: 0.5,
          }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            fontFamily: "var(--sg-font-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--pwa-muted)",
            textAlign: "center",
          }}
        >
          Registra ingresos · Controla tiempos
          <br />
          Notifica en tiempo real
        </motion.div>
      </div>

      {/* Botón CTA */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5, ease }}
        className="px-6 pb-10"
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/pwa/login")}
          className="w-full flex items-center justify-center gap-3 h-14 text-sm font-bold tracking-widest uppercase transition-opacity active:opacity-80"
          style={{
            background: "var(--pwa-accent)",
            color: "var(--pwa-accent-fg)",
            fontFamily: "var(--sg-font-mono)",
            fontSize: 12,
            letterSpacing: "0.2em",
            border: "none",
          }}
        >
          Entrar al sistema →
        </motion.button>

        <p
          className="text-center mt-4"
          style={{
            fontFamily: "var(--sg-font-mono)",
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--pwa-muted)",
          }}
        >
          Plataforma segura · Datos en tiempo real
        </p>
      </motion.div>
    </div>
  );
}
