"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePWATheme } from "@/contexts/PWAThemeContext";
import { useEffect, useState, useCallback } from "react";
import { Palette, Settings, X } from "lucide-react";
import { validateGuardPIN, getDeviceCompanyInfo, type GuardSession } from "./actions";
import { loginPWA } from "./login/actions";
import { getDeviceConfig, saveDeviceConfig, saveGuardSession, type DeviceConfig } from "./storage";
import PINNumpad from "@/components/PINNumpad";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Logo ──────────────────────────────────────────────────────────────────────

function Logo({ size = 48 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}>
      <div className="absolute inset-0 blur-xl opacity-20 rounded-full"
        style={{ background: "var(--pwa-accent)" }} />
      <div className="relative flex items-center justify-center"
        style={{ width: size, height: size,
          border: "1.5px solid var(--pwa-accent)", background: "var(--pwa-surface)" }}>
        <svg viewBox="0 0 32 32" style={{ width: size * 0.48, height: size * 0.48 }}>
          <path d="M16 2 L28 7 L28 18 C28 24 23 29 16 32 C9 29 4 24 4 18 L4 7 Z"
            fill="none" stroke="var(--pwa-accent)" strokeWidth="1.5" strokeLinejoin="round"/>
          <rect x="14" y="10" width="4" height="12" rx="1" fill="var(--pwa-accent)"/>
          <rect x="10" y="14" width="12" height="4" rx="1" fill="var(--pwa-accent)"/>
        </svg>
      </div>
    </div>
  );
}

// ── Theme toggle compacto ─────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme, themes } = usePWATheme();
  const next = themes[(themes.findIndex(t => t.key === theme) + 1) % themes.length];
  return (
    <button
      onClick={() => setTheme(next.key)}
      title={`Cambiar a ${next.label}`}
      className="flex items-center justify-center h-8 w-8 rounded-full transition-colors"
      style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
        color: "var(--pwa-muted)" }}>
      <Palette className="h-3.5 w-3.5" />
    </button>
  );
}

// ── Setup Screen ──────────────────────────────────────────────────────────────

function SetupScreen({ onDone }: { onDone: (cfg: DeviceConfig) => void }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", password);
    const result = await loginPWA(fd);
    if (result?.error) { setError(result.error); setLoading(false); return; }
    const info = await getDeviceCompanyInfo();
    if (!info) { setError("No se pudo obtener la empresa. Verifica que el usuario sea supervisor."); setLoading(false); return; }
    saveDeviceConfig(info);
    onDone(info);
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 16, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "0.06em",
              color: "var(--pwa-ink)", margin: 0 }}>
              Smart<span style={{ color: "var(--pwa-accent)" }}>Guard</span>
            </p>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
              Configurar dispositivo
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col justify-center px-6 pb-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }} className="flex flex-col gap-6 max-w-[400px] mx-auto w-full">

          <div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "var(--pwa-accent)", margin: "0 0 8px" }}>
              Paso único de configuración
            </p>
            <h1 style={{ fontFamily: "var(--sg-font-display)", fontSize: 28, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--pwa-ink)",
              lineHeight: 1.15, margin: 0 }}>
              Vincula este dispositivo a tu empresa
            </h1>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--pwa-muted)", marginTop: 10 }}>
              Solo un supervisor puede hacer esto. Una vez configurado, los guardias entran con su PIN.
            </p>
          </div>

          <form onSubmit={handleSetup} className="flex flex-col gap-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="supervisor@empresa.com" required autoFocus
              className="w-full h-14 px-4 outline-none text-[15px]"
              style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)",
                color: "var(--pwa-ink)", fontFamily: "var(--sg-font-body)" }}
              onFocus={e => e.target.style.borderColor = "var(--pwa-accent)"}
              onBlur={e => e.target.style.borderColor = "var(--pwa-border)"} />

            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña del supervisor" required
              className="w-full h-14 px-4 outline-none text-[15px]"
              style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)",
                color: "var(--pwa-ink)", fontFamily: "var(--sg-font-body)" }}
              onFocus={e => e.target.style.borderColor = "var(--pwa-accent)"}
              onBlur={e => e.target.style.borderColor = "var(--pwa-border)"} />

            {error && (
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11,
                letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--pwa-danger)" }}>
                {error}
              </p>
            )}

            <motion.button type="submit" disabled={loading || !email || !password}
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 flex items-center justify-center mt-2 transition-opacity disabled:opacity-40"
              style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
                fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.2em",
                textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer" }}>
              {loading ? "Verificando..." : "Vincular dispositivo →"}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

// ── PIN Screen ────────────────────────────────────────────────────────────────

function PINScreen({
  device,
  onSuccess,
  onSetup,
}: {
  device: DeviceConfig;
  onSuccess: (guard: GuardSession) => void;
  onSetup: () => void;
}) {
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guard, setGuard]     = useState<GuardSession | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handlePIN = useCallback(async (pin: string) => {
    setLoading(true);
    setError(null);
    const result = await validateGuardPIN(pin, device.companyId);
    setLoading(false);
    if (result.success) {
      setGuard(result.guard);
    } else {
      setError(result.error);
    }
  }, [device.companyId]);

  // Pantalla de confirmación después del PIN correcto
  if (guard) {
    return (
      <div className="flex flex-col min-h-screen min-h-[100dvh] items-center justify-center px-6 gap-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="flex h-24 w-24 items-center justify-center"
          style={{ background: `${guard.avatar_color}22`,
            border: `2px solid ${guard.avatar_color}`,
            color: guard.avatar_color,
            fontFamily: "var(--sg-font-display)",
            fontSize: 32, fontWeight: 800 }}>
          {guard.nombre.split(" ").slice(0, 2).map(p => p[0]).join("")}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }} className="text-center">
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "var(--pwa-success)", margin: "0 0 8px" }}>
            ✓ Acceso permitido
          </p>
          <h2 style={{ fontFamily: "var(--sg-font-display)", fontSize: 30, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--pwa-ink)", margin: 0 }}>
            Hola, {guard.nombre.split(" ")[0]}
          </h2>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--pwa-muted)", marginTop: 6 }}>
            {guard.planta ?? "Todas las sedes"} · Turno {guard.turno}
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { saveGuardSession(guard); onSuccess(guard); }}
          className="w-full max-w-[320px] h-14 flex items-center justify-center"
          style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
            fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.2em",
            textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer" }}>
          Entrar →
        </motion.button>

        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          onClick={() => setGuard(null)}
          style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--pwa-muted)", background: "none", border: "none",
            cursor: "pointer" }}>
          No soy yo
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]">
      {/* Header compacto */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <div>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 14, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "0.06em",
              color: "var(--pwa-ink)", margin: 0 }}>
              Smart<span style={{ color: "var(--pwa-accent)" }}>Guard</span>
            </p>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
              {device.companyName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setShowSettings(s => !s)}
            className="flex items-center justify-center h-8 w-8 rounded-full transition-colors"
            style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
              color: "var(--pwa-muted)" }}>
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Settings drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden mx-5"
            style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)" }}>
            <div className="flex items-center justify-between px-4 py-3">
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
                textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
                Dispositivo vinculado a <strong style={{ color: "var(--pwa-ink)" }}>{device.companyName}</strong>
              </p>
              <button onClick={onSetup}
                style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "var(--pwa-danger)", background: "none",
                  border: "none", cursor: "pointer" }}>
                Reconfigurar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIN area — centrada verticalmente */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 gap-10">
        {/* Título */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center">
          <h2 style={{ fontFamily: "var(--sg-font-display)", fontSize: 24, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--pwa-ink)", margin: 0 }}>
            Ingresa tu PIN
          </h2>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "var(--pwa-muted)", marginTop: 6 }}>
            4 dígitos · asignado por tu supervisor
          </p>
        </motion.div>

        {/* Numpad */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }} className="w-full">
          <PINNumpad
            onComplete={handlePIN}
            error={error}
            loading={loading}
            onClearError={() => setError(null)}
          />
        </motion.div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-6 text-center">
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.16em",
          textTransform: "uppercase", color: "var(--pwa-muted)", opacity: 0.5 }}>
          ¿No tienes PIN? Pide a tu supervisor que te configure uno
        </p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PWAPage() {
  const router = useRouter();
  const [device, setDevice] = useState<DeviceConfig | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cfg = getDeviceConfig();
    setDevice(cfg);
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--pwa-bg)" }}>
        <Logo size={48} />
      </div>
    );
  }

  // Dispositivo NO configurado → pantalla de setup
  if (!device || showSetup) {
    return (
      <SetupScreen
        onDone={(cfg) => {
          setDevice(cfg);
          setShowSetup(false);
        }}
      />
    );
  }

  // Dispositivo configurado → pantalla de PIN
  return (
    <PINScreen
      device={device}
      onSuccess={() => router.push("/pwa/home")}
      onSetup={() => setShowSetup(true)}
    />
  );
}
