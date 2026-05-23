"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { LoginScreen, RoleSelector } from "./PWAEntryScreens";
import { LogoMark, ease, type PwaRole } from "./pwaEntryShared";
type Screen = "home" | "login";

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PWAPage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [role, setRole] = useState<PwaRole>("guardia");
  const ready = true;

  if (!ready) return (
    <div className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--pwa-bg)" }}>
      <LogoMark size={48} />
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      {screen === "home" ? (
        <motion.div key="home"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25, ease }}>
          <RoleSelector onSelect={(r) => { setRole(r); setScreen("login"); }} />
        </motion.div>
      ) : (
        <motion.div key="login"
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.25, ease }}>
          <LoginScreen role={role} onBack={() => setScreen("home")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
