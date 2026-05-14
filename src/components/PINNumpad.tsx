"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Delete } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  onComplete: (pin: string) => Promise<void>;
  error: string | null;
  loading: boolean;
  onClearError: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export default function PINNumpad({ onComplete, error, loading, onClearError }: Props) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);

  // Auto-submit cuando llega a 4 dígitos
  useEffect(() => {
    if (pin.length === 4) {
      void onComplete(pin).then(() => {
        // Si hay error, limpia el PIN y sacude
        setPin("");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  // Sacudir los dots cuando hay error
  useEffect(() => {
    if (error) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleKey = (key: string) => {
    if (loading) return;
    onClearError();
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
    } else if (key !== "" && pin.length < 4) {
      setPin((p) => p + key);
    }
  };

  // Soporte teclado físico
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleKey(e.key);
      if (e.key === "Backspace") handleKey("⌫");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, loading]);

  return (
    <div className="flex flex-col items-center gap-8">

      {/* Dots indicadores */}
      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4"
      >
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: i < pin.length ? 1 : 0.5,
              background: error
                ? "var(--pwa-danger)"
                : i < pin.length
                ? "var(--pwa-accent)"
                : "var(--pwa-border)",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="h-4 w-4 rounded-full"
            style={{ background: "var(--pwa-border)" }}
          />
        ))}
      </motion.div>

      {/* Error message */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--pwa-danger)",
              margin: "-20px 0",
            }}
          >
            {error}
          </motion.p>
        ) : loading ? (
          <motion.p
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--pwa-muted)",
              margin: "-20px 0",
            }}
          >
            Verificando...
          </motion.p>
        ) : null}
      </AnimatePresence>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
        {KEYS.map((key, i) => {
          if (key === "") return <div key={i} />;

          const isDelete = key === "⌫";
          const isEmpty = key === "";

          return (
            <motion.button
              key={i}
              onClick={() => handleKey(key)}
              disabled={loading || (key !== "⌫" && pin.length >= 4)}
              whileTap={{ scale: 0.9 }}
              className="flex items-center justify-center h-16 transition-all select-none disabled:opacity-30"
              style={{
                background: isDelete
                  ? "var(--pwa-surface)"
                  : "var(--pwa-surface)",
                border: `1px solid ${isDelete ? "var(--pwa-border)" : "var(--pwa-border)"}`,
                color: isDelete ? "var(--pwa-muted)" : "var(--pwa-ink)",
                fontFamily: "var(--sg-font-display)",
                fontSize: isDelete ? 16 : 22,
                fontWeight: 600,
                cursor: isEmpty ? "default" : "pointer",
                borderRadius: 0,
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {isDelete ? <Delete className="h-5 w-5" /> : key}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
