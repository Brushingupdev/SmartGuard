"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function KioskLayout({
  children,
  plant,
  onExit,
}: {
  children: React.ReactNode;
  plant: string;
  onExit?: () => void;
}) {
  const [time, setTime] = useState("--:--:--");
  const [date, setDate] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDate(
        now.toLocaleDateString("es-PE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[#050708] flex flex-col">
      {/* Kiosk header bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(10,12,11,0.95)] sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center bg-[var(--sg-accent)]">
            <svg viewBox="0 0 16 16" className="h-5 w-5 fill-[#050708]">
              <path d="M1 8h6V2h2v6h6v2h-6v6H7v-6H1z" />
            </svg>
          </div>
          <div>
            <div className="sg-font-display text-[15px] font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)]">
              SmartGuard
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--sg-success)] sg-pulse" />
              <span className="sg-font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--sg-muted)]">
                Garita {plant}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <div
              className="sg-font-mono text-[26px] font-bold text-[var(--sg-ink)] tracking-[0.04em] leading-none"
              suppressHydrationWarning
            >
              {time}
            </div>
            <div
              className="sg-font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--sg-muted)] mt-1"
              suppressHydrationWarning
            >
              {date}
            </div>
          </div>
          {onExit && (
            <button
              onClick={onExit}
              className="flex items-center gap-1 border border-[var(--sg-line)] px-3 py-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-danger)] hover:text-[var(--sg-danger)] transition-colors"
            >
              Salir modo garita
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col"
      >
        {children}
      </motion.main>
    </div>
  );
}
