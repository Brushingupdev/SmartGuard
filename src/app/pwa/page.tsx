"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePWATheme } from "@/contexts/PWAThemeContext";
import { useEffect, useState, useCallback } from "react";
import { Palette, Settings, X, CheckCircle2 } from "lucide-react";
import { validateGuardPIN, getDeviceCompanyInfo, type GuardSession } from "./actions";
import PINNumpad from "@/components/PINNumpad";
import { loginPWA } from "./login/actions";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Device config stored in localStorage ─────────────────────────────────────

const DEVICE_KEY = "sg-device";

type DeviceConfig = {
  companyId: string;
  companyName: string;
  plantas: string[];
};

function getDeviceConfig(): DeviceConfig | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveDeviceConfig(cfg: DeviceConfig) {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(cfg));
}

function saveGuardSession(guard: GuardSession) {
  localStorage.setItem("sg-guard", JSON.stringify(guard));
}

// ── Logo ──────────────────────────────────────────────────────────────────────

function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="absolute inset-0 blur-2xl opacity-20 rounded-full"
        style={{ background: "var(--pwa-accent)" }} />
      <div className="relative flex items-center justify-center"
        style={{ width: size, height: size, border: "2px solid var(--pwa-accent)", background: "var(--pwa-surface)" }}>
        <svg viewBox="0 0 32 32" style={{ width: size * 0.5, height: size * 0.5 }}>
          <path d="M16 2 L28 7 L28 18 C28 24 23 29 16 32 C9 29 4 24 4 18 L4 7 Z"
            fill="none" stroke="var(--pwa-accent)" strokeWidth="1.5" strokeLinejoin="round"/>
          <rect x="14" y="10" width="4" height="12" rx="1" fill="var(--pwa-accent)"/>
          <rect x="10" y="14" width="12" height="4" rx="1" fill="var(--pwa-accent)"/>
        </svg>
      </div>
    </div>
  );
}

// ── Theme Picker ──────────────────────────────────────────────────────────────

function ThemePicker() {
  const { theme, setTheme, themes } = usePWATheme();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center h-9 w-9 rounded-full transition-colors"
        style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)", color: "var(--pwa-muted)" }}>
        <Palette className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 p-2 flex flex-col gap-1"
            style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)", minWidth: 120 }}>
            {themes.map((t) => (
              <button key={t.key} onClick={() => { setTheme(t.key); setOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-left transition-colors"
                style={{
                  color: theme === t.key ? "var(--pwa-accent)" : "var(--pwa-ink-soft)",
                  background: theme === t.key ? "var(--pwa-surface-2)" : "transparent",
                  fontFamily: "var(--sg-font-mono)", fontSize: 11,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                <span className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: t.key === "light" ? "#b8941e" : "var(--pwa-accent)", opacity: theme === t.key ? 1 : 0.4 }} />
                {t.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Setup Modal (supervisor configura el dispositivo) ─────────────────────────

function SetupModal({ onDone, onCancel }: { onDone: (cfg: DeviceConfig) => void; onCancel: () => void }) {
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
    // Obtener info de la empresa
    const info = await getDeviceCompanyInfo();
    if (!info) { setError("No se pudo obtener la empresa"); setLoading(false); return; }
    saveDeviceConfig(info);
    onDone(info);
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }} transition={{ ease }}
        className="w-full sm:max-w-[400px] p-6 flex flex-col gap-5"
        style={{ background: "var(--pwa-surface)", borderTop: "2px solid var(--pwa-accent)" }}>

        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "var(--pwa-accent)", margin: 0 }}>Configurar dispositivo</p>
            <h3 style={{ fontFamily: "var(--sg-font-display)", fontSize: 20, fontWeight: 800,
              textTransform: "uppercase", color: "var(--pwa-ink)", margin: "6px 0 0" }}>Acceso supervisor</h3>
          </div>
          <button onClick={onCancel} style={{ color: "var(--pwa-muted)", background: "none", border: "none" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, color: "var(--pwa-muted)",
          letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Ingresa las credenciales del supervisor para vincular este dispositivo a la planta
        </p>

        <form onSubmit={handleSetup} className="flex flex-col gap-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="supervisor@empresa.com" required
            className="w-full h-12 px-4 outline-none text-[14px]"
            style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
              color: "var(--pwa-ink)", fontFamily: "var(--sg-font-body)" }}
            onFocus={e => e.target.style.borderColor = "var(--pwa-accent)"}
            onBlur={e => e.target.style.borderColor = "var(--pwa-border)"} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Contraseña" required
            className="w-full h-12 px-4 outline-none text-[14px]"
            style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
              color: "var(--pwa-ink)", fontFamily: "var(--sg-font-body)" }}
            onFocus={e => e.target.style.borderColor = "var(--pwa-accent)"}
            onBlur={e => e.target.style.borderColor = "var(--pwa-border)"} />
          {error && (
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11, color: "var(--pwa-danger)",
              letterSpacing: "0.1em", textTransform: "uppercase" }}>{error}</p>
          )}
          <motion.button type="submit" disabled={loading || !email || !password}
            whileTap={{ scale: 0.97 }}
            className="w-full h-12 flex items-center justify-center transition-opacity disabled:opacity-40"
            style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
              fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.2em",
              textTransform: "uppercase", fontWeight: 700, border: "none" }}>
            {loading ? "Verificando..." : "Vincular dispositivo →"}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── PIN Modal ─────────────────────────────────────────────────────────────────

function PINModal({
  device,
  onSuccess,
  onCancel,
}: {
  device: DeviceConfig;
  onSuccess: (guard: GuardSession) => void;
  onCancel: () => void;
}) {
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guard, setGuard]   = useState<GuardSession | null>(null);

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

  // Si se identificó al guardia, mostramos confirmación
  if (guard) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ ease }}
          className="w-full sm:max-w-[360px] p-8 flex flex-col items-center gap-5"
          style={{ background: "var(--pwa-surface)", borderTop: "2px solid var(--pwa-success)" }}>

          {/* Avatar */}
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className="flex h-20 w-20 items-center justify-center"
            style={{ background: `${guard.avatar_color}22`,
              border: `2px solid ${guard.avatar_color}`, color: guard.avatar_color,
              fontFamily: "var(--sg-font-display)", fontSize: 28, fontWeight: 800 }}>
            {guard.nombre.split(" ").slice(0, 2).map(p => p[0]).join("")}
          </motion.div>

          <div className="text-center">
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-success)", margin: 0 }}>
              <CheckCircle2 className="inline h-3 w-3 mr-1" />PIN correcto
            </p>
            <h2 style={{ fontFamily: "var(--sg-font-display)", fontSize: 24, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--pwa-ink)",
              margin: "8px 0 4px" }}>
              Hola, {guard.nombre.split(" ")[0]}
            </h2>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
              {guard.planta ?? "Todas las sedes"} · Turno {guard.turno}
            </p>
          </div>

          <motion.button
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { saveGuardSession(guard); onSuccess(guard); }}
            className="w-full h-13 flex items-center justify-center gap-2"
            style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
              fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.2em",
              textTransform: "uppercase", fontWeight: 700, border: "none",
              height: 52, cursor: "pointer" }}>
            Entrar →
          </motion.button>

          <button onClick={onCancel}
            style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--pwa-muted)", background: "none", border: "none" }}>
            Cancelar
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}>
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }} transition={{ ease }}
        className="w-full sm:max-w-[380px] p-7 flex flex-col gap-6"
        style={{ background: "var(--pwa-surface)", borderTop: "2px solid var(--pwa-accent)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "var(--pwa-accent)", margin: 0 }}>
              {device.companyName}
            </p>
            <h3 style={{ fontFamily: "var(--sg-font-display)", fontSize: 22, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--pwa-ink)",
              margin: "6px 0 0" }}>
              Ingresa tu PIN
            </h3>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--pwa-muted)", marginTop: 4 }}>
              4 dígitos · asignado por tu supervisor
            </p>
          </div>
          <button onClick={onCancel}
            style={{ color: "var(--pwa-muted)", background: "none", border: "none", cursor: "pointer" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Numpad */}
        <PINNumpad
          onComplete={handlePIN}
          error={error}
          loading={loading}
          onClearError={() => setError(null)}
        />
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PWAWelcomePage() {
  const router = useRouter();
  const [device, setDevice]       = useState<DeviceConfig | null>(null);
  const [showPIN, setShowPIN]     = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    const cfg = getDeviceConfig();
    setDevice(cfg);
    setReady(true);
  }, []);

  const handleGuardSuccess = (guard: GuardSession) => {
    router.push("/pwa/home");
  };

  if (!ready) return null;

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "var(--pwa-muted)" }}>
          {device ? device.companyName : "SmartGuard · v2"}
        </motion.div>
        <div className="flex items-center gap-2">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
            <ThemePicker />
          </motion.div>
          {/* Botón de setup (solo si el dispositivo ya está configurado, para re-configurar) */}
          {device && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
              onClick={() => setShowSetup(true)}
              className="flex items-center justify-center h-9 w-9 rounded-full transition-colors"
              style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
                color: "var(--pwa-muted)" }}>
              <Settings className="h-4 w-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Centro */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 gap-8">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease }}>
          <LogoMark size={80} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease }} className="text-center">
          <h1 style={{ fontFamily: "var(--sg-font-display)", fontSize: 36, fontWeight: 800,
            letterSpacing: "-0.02em", textTransform: "uppercase", color: "var(--pwa-ink)",
            lineHeight: 1.1, margin: 0 }}>
            Smart<span style={{ color: "var(--pwa-accent)" }}>Guard</span>
          </h1>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.22em",
            textTransform: "uppercase", color: "var(--pwa-muted)", marginTop: 10 }}>
            Control de acceso vehicular
          </p>
        </motion.div>

        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{ height: 1, width: 48, background: "var(--pwa-accent)", opacity: 0.5 }} />

        {device ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="text-center" style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
              letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
            Dispositivo vinculado a<br />
            <span style={{ color: "var(--pwa-ink-soft)", fontWeight: 600 }}>{device.companyName}</span>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="text-center" style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10,
              letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
            Registra ingresos · Controla tiempos<br />Notifica en tiempo real
          </motion.div>
        )}
      </div>

      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5, ease }}
        className="px-6 pb-10 flex flex-col gap-3">

        {device ? (
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowPIN(true)}
            className="w-full flex items-center justify-center h-14"
            style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
              fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.2em",
              textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer" }}>
            Ingresar con PIN →
          </motion.button>
        ) : (
          <>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowSetup(true)}
              className="w-full flex items-center justify-center h-14"
              style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
                fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.2em",
                textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer" }}>
              Configurar dispositivo →
            </motion.button>
            <p className="text-center" style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9,
              letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
              El supervisor vincula este dispositivo una sola vez
            </p>
          </>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showPIN && device && (
          <PINModal
            key="pin"
            device={device}
            onSuccess={handleGuardSuccess}
            onCancel={() => setShowPIN(false)}
          />
        )}
        {showSetup && (
          <SetupModal
            key="setup"
            onDone={(cfg) => { setDevice(cfg); setShowSetup(false); }}
            onCancel={() => setShowSetup(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
