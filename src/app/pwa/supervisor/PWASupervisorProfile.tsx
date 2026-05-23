"use client";

import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { usePWATheme } from "@/contexts/PWAThemeContext";
import { isAbandonedRecord } from "@/app/registro/status";
import type { RecentRegistration } from "@/app/registro/types";
import { useLiveNow } from "@/hooks/useLiveTimer";

export function TabPerfilSupervisor({
  supervisorName,
  records,
  onLogout,
}: {
  supervisorName: string;
  records: RecentRegistration[];
  onLogout: () => void;
}) {
  const { theme, setTheme, themes } = usePWATheme();
  const initials = supervisorName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const now = useLiveNow();
  const urgentes = records.filter((record) => isAbandonedRecord(record, now)).length;

  return (
    <div className="flex flex-col pb-6">
      <div
        className="relative mx-4 mt-4 overflow-hidden p-5"
        style={{
          background: "var(--pwa-surface)",
          borderTop: "3px solid var(--pwa-accent)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 140,
            height: 140,
            background:
              "radial-gradient(circle at top right, color-mix(in srgb, var(--pwa-accent) 8%, transparent), transparent)",
            pointerEvents: "none",
          }}
        />
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center"
            style={{
              background:
                "color-mix(in srgb, var(--pwa-accent) 14%, transparent)",
              border: "2px solid var(--pwa-accent)",
              color: "var(--pwa-accent)",
              fontFamily: "var(--sg-font-display)",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate"
              style={{
                fontFamily: "var(--sg-font-display)",
                fontSize: 18,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--pwa-ink)",
                margin: 0,
              }}
            >
              {supervisorName}
            </p>
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--pwa-accent)",
                margin: "4px 0 0",
              }}
            >
              Supervisor
            </p>
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
                margin: "2px 0 0",
              }}
            >
              {urgentes > 0
                ? `⚠ ${urgentes} urgente${urgentes !== 1 ? "s" : ""}`
                : "Turno activo · todo OK"}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4">
        <p
          style={{
            fontFamily: "var(--sg-font-mono)",
            fontSize: 8,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--pwa-muted)",
            marginBottom: 8,
          }}
        >
          Resumen del día
        </p>
        <div className="grid grid-cols-4 gap-px" style={{ background: "var(--pwa-border)" }}>
          {[
            {
              label: "Total",
              value: records.length,
              color: "var(--pwa-accent)",
            },
            { label: "Urgentes", value: urgentes, color: "#d35c4f" },
            {
              label: "Atendidos",
              value: records.filter((record) => record.attended).length,
              color: "#6ba7ff",
            },
            {
              label: "Completos",
              value: records.filter((record) => record.docsDelivered).length,
              color: "#6bbd8a",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 py-4"
              style={{ background: "var(--pwa-surface)" }}
            >
              <span
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 22,
                  fontWeight: 800,
                  color: stat.color,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </span>
              <span
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 7,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--pwa-muted)",
                  textAlign: "center",
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4">
        <p
          style={{
            fontFamily: "var(--sg-font-mono)",
            fontSize: 8,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--pwa-muted)",
            marginBottom: 8,
          }}
        >
          Notificaciones
        </p>
        <PushSubscribeButton />
      </div>

      <div
        className="mx-4 mt-4 p-4"
        style={{
          background: "var(--pwa-surface)",
          border: "1px solid var(--pwa-border)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--sg-font-mono)",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--pwa-muted)",
            margin: "0 0 12px",
          }}
        >
          Apariencia
        </p>
        <div className="flex gap-3">
          {themes.map((themeOption) => (
            <button
              key={themeOption.key}
              onClick={() => setTheme(themeOption.key)}
              className="flex flex-1 flex-col items-center gap-2 py-3"
              style={{
                background:
                  theme === themeOption.key
                    ? "color-mix(in srgb, var(--pwa-accent) 10%, transparent)"
                    : "var(--pwa-surface-2)",
                border: `1px solid ${theme === themeOption.key ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
                cursor: "pointer",
              }}
            >
              <div
                className="h-5 w-5 rounded-full border-2"
                style={{
                  background:
                    themeOption.key === "dark"
                      ? "#0d0f0e"
                      : themeOption.key === "light"
                        ? "#f2f0eb"
                        : "#000",
                  borderColor:
                    theme === themeOption.key
                      ? "var(--pwa-accent)"
                      : "var(--pwa-border)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 8,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color:
                    theme === themeOption.key
                      ? "var(--pwa-accent)"
                      : "var(--pwa-muted)",
                }}
              >
                {themeOption.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 py-3.5"
          style={{
            background: "var(--pwa-surface-2)",
            border: "1px solid var(--pwa-border)",
            cursor: "pointer",
            color: "var(--pwa-muted)",
            fontFamily: "var(--sg-font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </motion.button>
      </div>
    </div>
  );
}
