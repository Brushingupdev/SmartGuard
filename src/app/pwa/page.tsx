"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePWATheme } from "@/contexts/PWAThemeContext";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft, Eye, EyeOff, Lock, Mail,
  Palette, Smartphone, Tablet,
} from "lucide-react";
import { validateGuardPIN, getDeviceCompanyInfo, type GuardSession } from "./actions";
import { loginPWA } from "./login/actions";
import {
  getDeviceConfig, saveDeviceConfig, saveGuardSession,
  clearGuardSession, type DeviceConfig,
} from "./storage";
import PINNumpad from "@/components/PINNumpad";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Logo ──────────────────────────────────────────────────────────────────────

function Logo({ size = 40 }: { size?: number }) {
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

// ── Theme toggle ──────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme, themes } = usePWATheme();
  const next = themes[(themes.findIndex(t => t.key === theme) + 1) % themes.length];
  return (
    <button onClick={() => setTheme(next.key)} title={`Tema: ${next.label}`}
      className="flex items-center justify-center h-8 w-8 transition-colors"
      style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
        color: "var(--pwa-muted)", cursor: "pointer" }}>
      <Palette className="h-3.5 w-3.5" />
    </button>
  );
}

// ── Header compartido ─────────────────────────────────────────────────────────

function PWAHeader({ subtitle, onBack }: { subtitle?: string; onBack?: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 pt-6 pb-2">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button onClick={onBack}
            className="flex items-center justify-center h-8 w-8 transition-colors"
            style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)",
              color: "var(--pwa-muted)", cursor: "pointer" }}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        ) : <Logo size={32} />}
        <div>
          <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--pwa-ink)", margin: 0 }}>
            Smart<span style={{ color: "var(--pwa-accent)" }}>Guard</span>
          </p>
          {subtitle && (
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <ThemeToggle />
    </div>
  );
}

// ── Pantalla principal — elegir cómo entrar ───────────────────────────────────

type Mode = "home" | "email" | "pin-setup" | "pin";

function HomeScreen({ onSelect, hasPinDevice }: {
  onSelect: (mode: "email" | "pin") => void;
  hasPinDevice: boolean;
}) {
  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]">
      <PWAHeader />

      <div className="flex flex-1 flex-col justify-center px-6 pb-10 gap-8">

        {/* Título */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }} className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size={64} />
          </div>
          <h1 style={{ fontFamily: "var(--sg-font-display)", fontSize: 28, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--pwa-ink)",
            lineHeight: 1.15, margin: 0 }}>
            ¿Cómo quieres
            <br />entrar?
          </h1>
        </motion.div>

        {/* Opciones */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease }}
          className="flex flex-col gap-3">

          {/* Opción 1 — Celular personal */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect("email")}
            className="flex items-center gap-4 p-5 text-left transition-all"
            style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)",
              cursor: "pointer" }}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--pwa-accent) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--pwa-accent) 40%, transparent)" }}>
              <Smartphone className="h-5 w-5" style={{ color: "var(--pwa-accent)" }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 16, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.02em", color: "var(--pwa-ink)", margin: 0 }}>
                Mi celular
              </p>
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "var(--pwa-muted)", margin: "4px 0 0" }}>
                Correo y contraseña · Sesión personal
              </p>
            </div>
            <span style={{ color: "var(--pwa-muted)", marginLeft: "auto", fontSize: 18 }}>→</span>
          </motion.button>

          {/* Opción 2 — Tablet compartida */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect("pin")}
            className="flex items-center gap-4 p-5 text-left transition-all"
            style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)",
              cursor: "pointer" }}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center"
              style={{ background: "color-mix(in srgb, #6ba7ff 12%, transparent)",
                border: "1px solid color-mix(in srgb, #6ba7ff 40%, transparent)" }}>
              <Tablet className="h-5 w-5" style={{ color: "#6ba7ff" }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 16, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.02em", color: "var(--pwa-ink)", margin: 0 }}>
                Tablet de garita
              </p>
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "var(--pwa-muted)", margin: "4px 0 0" }}>
                {hasPinDevice ? "PIN de 4 dígitos · Dispositivo vinculado" : "PIN de 4 dígitos · Dispositivo compartido"}
              </p>
            </div>
            <span style={{ color: "var(--pwa-muted)", marginLeft: "auto", fontSize: 18 }}>→</span>
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-center"
          style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--pwa-muted)", opacity: 0.6 }}>
          Control de acceso vehicular industrial
        </motion.p>
      </div>
    </div>
  );
}

// ── Login con email ───────────────────────────────────────────────────────────

function EmailLoginScreen({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", password);
    const result = await loginPWA(fd);
    if (result?.error) { setError(result.error); setLoading(false); return; }
    // loginPWA retorna { success, role } — redirigir según rol
    const role = result.role;
    if (role === "administrador") router.replace("/admin");
    else if (role === "supervisor") router.replace("/pwa/supervisor");
    else router.replace("/pwa/home");
  };

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]">
      <PWAHeader subtitle="Mi celular" onBack={onBack} />

      <div className="flex flex-1 flex-col justify-center px-6 pb-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex flex-col gap-6 max-w-[400px] mx-auto w-full">

          <div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "var(--pwa-accent)", margin: "0 0 8px" }}>
              Acceso personal
            </p>
            <h2 style={{ fontFamily: "var(--sg-font-display)", fontSize: 26, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--pwa-ink)", margin: 0 }}>
              Bienvenido<br />
              <span style={{ color: "var(--pwa-ink-soft)", fontWeight: 400 }}>de vuelta.</span>
            </h2>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            {/* Email */}
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
                style={{ color: "var(--pwa-muted)" }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="correo@empresa.com" required autoFocus
                className="w-full h-14 pl-12 pr-4 outline-none text-[15px]"
                style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)",
                  color: "var(--pwa-ink)", fontFamily: "var(--sg-font-body)" }}
                onFocus={e => { e.target.style.borderColor = "var(--pwa-accent)"; e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--pwa-accent) 15%, transparent)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--pwa-border)"; e.target.style.boxShadow = "none"; }} />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
                style={{ color: "var(--pwa-muted)" }} />
              <input type={showPwd ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña" required
                className="w-full h-14 pl-12 pr-12 outline-none text-[15px]"
                style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)",
                  color: "var(--pwa-ink)", fontFamily: "var(--sg-font-body)" }}
                onFocus={e => { e.target.style.borderColor = "var(--pwa-accent)"; e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--pwa-accent) 15%, transparent)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--pwa-border)"; e.target.style.boxShadow = "none"; }} />
              <button type="button" onClick={() => setShowPwd(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: "var(--pwa-muted)", background: "none", border: "none", cursor: "pointer" }}>
                {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="px-4 py-3"
                    style={{ background: "color-mix(in srgb, var(--pwa-danger) 10%, transparent)",
                      borderLeft: "3px solid var(--pwa-danger)", color: "var(--pwa-danger)",
                      fontFamily: "var(--sg-font-mono)", fontSize: 11, letterSpacing: "0.1em",
                      textTransform: "uppercase" }}>
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button type="submit" disabled={loading || !email || !password}
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 flex items-center justify-center mt-1 transition-opacity disabled:opacity-40"
              style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
                fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.2em",
                textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer" }}>
              {loading ? (
                <motion.div className="h-5 w-5 rounded-full border-2"
                  style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "var(--pwa-accent-fg)" }}
                  animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />
              ) : "Entrar →"}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

// ── Setup de tablet ───────────────────────────────────────────────────────────

function TabletSetupScreen({ onDone, onBack }: {
  onDone: (cfg: DeviceConfig) => void;
  onBack: () => void;
}) {
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
    if (!info) { setError("Verifica que el usuario sea supervisor"); setLoading(false); return; }
    saveDeviceConfig(info);
    onDone(info);
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]">
      <PWAHeader subtitle="Configurar tablet" onBack={onBack} />

      <div className="flex flex-1 flex-col justify-center px-6 pb-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex flex-col gap-6 max-w-[400px] mx-auto w-full">

          <div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "#6ba7ff", margin: "0 0 8px" }}>
              Paso único · Solo lo hace el supervisor
            </p>
            <h2 style={{ fontFamily: "var(--sg-font-display)", fontSize: 24, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--pwa-ink)", margin: 0 }}>
              Vincular tablet a la empresa
            </h2>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "var(--pwa-muted)", marginTop: 8 }}>
              Una vez vinculada, los guardias entran solo con su PIN de 4 dígitos
            </p>
          </div>

          <form onSubmit={handleSetup} className="flex flex-col gap-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="supervisor@empresa.com" required autoFocus
              className="w-full h-14 px-4 outline-none text-[15px]"
              style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)",
                color: "var(--pwa-ink)", fontFamily: "var(--sg-font-body)" }}
              onFocus={e => e.target.style.borderColor = "#6ba7ff"}
              onBlur={e => e.target.style.borderColor = "var(--pwa-border)"} />

            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña del supervisor" required
              className="w-full h-14 px-4 outline-none text-[15px]"
              style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)",
                color: "var(--pwa-ink)", fontFamily: "var(--sg-font-body)" }}
              onFocus={e => e.target.style.borderColor = "#6ba7ff"}
              onBlur={e => e.target.style.borderColor = "var(--pwa-border)"} />

            {error && (
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "var(--pwa-danger)" }}>{error}</p>
            )}

            <motion.button type="submit" disabled={loading || !email || !password}
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 flex items-center justify-center mt-1 transition-opacity disabled:opacity-40"
              style={{ background: "#6ba7ff", color: "#000",
                fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.2em",
                textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer" }}>
              {loading ? "Vinculando..." : "Vincular tablet →"}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

// ── PIN Screen (tablet vinculada) ─────────────────────────────────────────────

function PINScreen({ device, onBack, onSuccess }: {
  device: DeviceConfig;
  onBack: () => void;
  onSuccess: (guard: GuardSession) => void;
}) {
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guard, setGuard]     = useState<GuardSession | null>(null);

  const handlePIN = useCallback(async (pin: string) => {
    setLoading(true);
    setError(null);
    const result = await validateGuardPIN(pin, device.companyId);
    setLoading(false);
    if (result.success) setGuard(result.guard);
    else setError(result.error);
  }, [device.companyId]);

  // Confirmación de identidad
  if (guard) {
    return (
      <div className="flex flex-col min-h-screen min-h-[100dvh] items-center justify-center px-6 gap-6">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="flex h-24 w-24 items-center justify-center"
          style={{ background: `${guard.avatar_color}22`, border: `2px solid ${guard.avatar_color}`,
            color: guard.avatar_color, fontFamily: "var(--sg-font-display)", fontSize: 32, fontWeight: 800 }}>
          {guard.nombre.split(" ").slice(0, 2).map(p => p[0]).join("")}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }} className="text-center">
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "var(--pwa-success)", margin: "0 0 8px" }}>
            ✓ Acceso permitido
          </p>
          <h2 style={{ fontFamily: "var(--sg-font-display)", fontSize: 28, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--pwa-ink)", margin: 0 }}>
            Hola, {guard.nombre.split(" ")[0]}
          </h2>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--pwa-muted)", marginTop: 6 }}>
            {guard.planta ?? device.companyName} · Turno {guard.turno}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }} className="flex flex-col gap-3 w-full max-w-[300px]">
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => { saveGuardSession(guard); onSuccess(guard); }}
            className="w-full h-14 flex items-center justify-center"
            style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)",
              fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.2em",
              textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer" }}>
            Entrar →
          </motion.button>
          <button onClick={() => setGuard(null)}
            style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--pwa-muted)", background: "none",
              border: "none", cursor: "pointer" }}>
            No soy yo
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen min-h-[100dvh]">
      <PWAHeader subtitle={device.companyName} onBack={onBack} />

      <div className="flex flex-1 flex-col items-center justify-center px-6 gap-10">
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

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }} className="w-full">
          <PINNumpad onComplete={handlePIN} error={error} loading={loading}
            onClearError={() => setError(null)} />
        </motion.div>
      </div>

      <div className="px-5 pb-6 flex justify-center">
        <button onClick={() => { clearGuardSession(); }}
          style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "var(--pwa-muted)", opacity: 0.5,
            background: "none", border: "none", cursor: "pointer" }}>
          ¿Sin PIN? Pide a tu supervisor
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PWAPage() {
  const router  = useRouter();
  const [mode, setMode]     = useState<Mode>("home");
  const [device, setDevice] = useState<DeviceConfig | null>(null);
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    setDevice(getDeviceConfig());
    setReady(true);
  }, []);

  if (!ready) return (
    <div className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--pwa-bg)" }}>
      <Logo size={48} />
    </div>
  );

  // PIN → si el dispositivo ya está vinculado, ir directo al numpad
  if (mode === "pin") {
    if (!device) {
      // No configurado → pantalla de setup
      return (
        <TabletSetupScreen
          onDone={(cfg) => { setDevice(cfg); }}
          onBack={() => setMode("home")}
        />
      );
    }
    return (
      <PINScreen
        device={device}
        onBack={() => setMode("home")}
        onSuccess={() => router.push("/pwa/home")}
      />
    );
  }

  if (mode === "email") {
    return <EmailLoginScreen onBack={() => setMode("home")} />;
  }

  // Home — elegir cómo entrar
  return (
    <HomeScreen
      hasPinDevice={!!device}
      onSelect={(m) => setMode(m)}
    />
  );
}
