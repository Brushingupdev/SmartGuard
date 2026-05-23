"use client";

import { motion } from "framer-motion";
import { ArrowRight, LogOut } from "lucide-react";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import { usePWATheme } from "@/contexts/PWAThemeContext";
import { formatGateLabelFromPlant, type GateAssignment } from "@/lib/gates";
import { isDelayedRecord } from "@/app/registro/status";
import type { RecentRegistration } from "@/app/registro/types";
import { ScreenHeader } from "./PWAHomeGuardiaShared";

export function TabRendimiento({ guardName, plant, records, onOpenPerfil }: {
  guardName: string;
  plant: string;
  records: RecentRegistration[];
  onOpenPerfil: () => void;
}) {
  const misRegistros = records.filter((r) => r.agente === guardName && r.planta === plant);
  const misCompletados = misRegistros.filter((r) => r.docsDelivered).length;
  const misDemoras = misRegistros.filter((r) => isDelayedRecord(r)).length;

  const avgEspera = misRegistros.filter((r) => r.espera_min != null).length > 0
    ? Math.round(
        misRegistros
          .filter((r) => r.espera_min != null)
          .reduce((sum, r) => sum + (r.espera_min ?? 0), 0) /
        misRegistros.filter((r) => r.espera_min != null).length,
      )
    : 0;

  const recentOwn = misRegistros.slice(0, 5);

  return (
    <div className="flex flex-col pb-6">
      <ScreenHeader
        tab="rendimiento"
        title="Mi rendimiento"
        trailing={<div className="rounded-xl px-3 py-2" style={{ border: "1px solid var(--pwa-border)" }}><span style={{ fontFamily: "var(--sg-font-body)", fontSize: 12, color: "var(--pwa-ink-soft)" }}>Hoy</span></div>}
      />

      <div className="mx-4 p-4" style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)", borderRadius: 14 }}>
        <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 700, color: "var(--pwa-ink)", margin: 0 }}>
          Resumen del día
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: "Registros", value: misRegistros.length, meta: "Total", color: "var(--pwa-ink)" },
            { label: "Citas atendidas", value: misCompletados, meta: `De ${misRegistros.length || 0}`, color: "var(--pwa-ink)" },
            { label: "Tiempo promedio", value: avgEspera > 0 ? `${String(Math.floor(avgEspera / 60)).padStart(2, "0")}:${String(avgEspera % 60).padStart(2, "0")}` : "00:00", meta: "min", color: "var(--pwa-ink)" },
            { label: "Retrasos", value: misDemoras, meta: "Citas", color: misDemoras > 0 ? "#d35c4f" : "var(--pwa-ink)" },
          ].map((metric) => (
            <div key={metric.label} className="flex flex-col gap-1 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--pwa-border)" }}>
              <span style={{ fontFamily: "var(--sg-font-body)", fontSize: 12, color: "var(--pwa-ink-soft)" }}>{metric.label}</span>
              <span style={{ fontFamily: "var(--sg-font-display)", fontSize: 24, fontWeight: 800, color: metric.color, lineHeight: 1 }}>
                {metric.value}
              </span>
              <span style={{ fontFamily: "var(--sg-font-body)", fontSize: 12, color: "var(--pwa-ink-soft)" }}>
                {metric.meta}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4" style={{ border: "1px solid var(--pwa-border)", borderRadius: 14, overflow: "hidden" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--pwa-surface)" }}>
          <div>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 800, textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}>
              Historial personal
            </p>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: "4px 0 0" }}>
              {formatGateLabelFromPlant(plant)} · última actividad
            </p>
          </div>
          <button onClick={onOpenPerfil} className="flex items-center gap-1" style={{ background: "none", border: "none", color: "var(--pwa-accent)", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Perfil <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {recentOwn.length === 0 ? (
          <div className="px-4 py-8" style={{ background: "var(--pwa-surface)" }}>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
              Aún no tienes registros asignados hoy
            </p>
          </div>
        ) : (
          recentOwn.map((record) => (
            <div key={record.id} className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: "var(--pwa-surface)", borderTop: "1px solid var(--pwa-border)" }}>
              <div className="min-w-0">
                <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }} className="truncate">
                  {record.razonSocial}
                </p>
                <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: "4px 0 0" }}>
                  {record.empresa || "Sin empresa"} · {record.tipoOperacion || "Operación"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11, color: "var(--pwa-accent)", margin: 0 }}>
                  {record.time}
                </p>
                <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: record.docsDelivered ? "#6bbd8a" : record.attended ? "#6ba7ff" : "var(--pwa-muted)", margin: "4px 0 0" }}>
                  {record.docsDelivered ? "Completo" : record.attended ? "Atendido" : "Pendiente"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ProfileOption({
  label,
  value,
  tone = "default",
  onClick,
}: {
  label: string;
  value?: string;
  tone?: "default" | "danger";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      style={{ borderTop: "1px solid var(--pwa-border)", background: "var(--pwa-surface)" }}
    >
      <div>
        <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: tone === "danger" ? "var(--pwa-danger)" : "var(--pwa-ink)", margin: 0 }}>
          {label}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {value ? (
          <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
            {value}
          </span>
        ) : null}
        <ArrowRight className="h-3.5 w-3.5" style={{ color: tone === "danger" ? "var(--pwa-danger)" : "var(--pwa-muted)" }} />
      </div>
    </button>
  );
}

export function TabPerfil({ guardName, plant, plants, gateOptions, onLogout, onOpenRendimiento }: {
  guardName: string;
  plant: string;
  plants: string[];
  gateOptions: GateAssignment[];
  onLogout: () => void;
  onOpenRendimiento: () => void;
}) {
  const { theme, setTheme, themes } = usePWATheme();
  const initials = guardName.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <div className="flex flex-col pb-6">
      <ScreenHeader tab="perfil" title="Perfil" />
      <div
        className="mx-4 relative overflow-hidden p-5"
        style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)", borderRadius: 14 }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 140,
            height: 140,
            background: "radial-gradient(circle at top right, color-mix(in srgb, var(--pwa-accent) 8%, transparent), transparent)",
            pointerEvents: "none",
          }}
        />

        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center"
            style={{
              background: "color-mix(in srgb, var(--pwa-accent) 14%, transparent)",
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
              style={{
                fontFamily: "var(--sg-font-display)",
                fontSize: 18,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--pwa-ink)",
                margin: 0,
              }}
              className="truncate"
            >
              {guardName}
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
              {formatGateLabelFromPlant(plant)}
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
              Guardia · Turno activo
            </p>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4 p-4" style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)", borderRadius: 14 }}>
        <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 700, color: "var(--pwa-ink)", margin: 0 }}>
          Información
        </p>
        <div className="mt-4 grid gap-3">
          {[
            ["Turno", "Matutino (06:00 - 14:00)"],
            ["Puertas activas", String(plants.length || 1)],
            ["Planta activa", plant.split(" ")[0] || plant],
            ["Puerta activa", formatGateLabelFromPlant(plant, gateOptions)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0" style={{ borderColor: "var(--pwa-border)" }}>
              <span style={{ fontFamily: "var(--sg-font-body)", fontSize: 13, color: "var(--pwa-ink-soft)" }}>{label}</span>
              <span style={{ fontFamily: "var(--sg-font-body)", fontSize: 13, color: "var(--pwa-ink)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4" style={{ border: "1px solid var(--pwa-border)" }}>
        <div className="px-4 py-3" style={{ background: "var(--pwa-surface)" }}>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
            Opciones
          </p>
        </div>
        <ProfileOption label="Mi rendimiento" value="detalle del día" onClick={onOpenRendimiento} />
        <ProfileOption label="Panel web" value="dashboard" onClick={() => { window.location.href = "/dashboard"; }} />
        <ProfileOption label="Historial web" value="detalle completo" onClick={() => { window.location.href = "/historial"; }} />
        <ProfileOption label="Ajustes visuales" value="tema actual" />
        <ProfileOption label="Ayuda" value="guía rápida" />
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

      <div className="mx-4 mt-4 p-4" style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)" }}>
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
          {themes.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className="flex flex-1 flex-col items-center gap-2 py-3 transition-all"
              style={{
                background: theme === t.key ? "color-mix(in srgb, var(--pwa-accent) 10%, transparent)" : "var(--pwa-surface-2)",
                border: `1px solid ${theme === t.key ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
                cursor: "pointer",
              }}
            >
              <div
                className="h-5 w-5 rounded-full border-2"
                style={{
                  background: t.key === "dark" ? "#0d0f0e" : t.key === "light" ? "#f2f0eb" : "#000",
                  borderColor: theme === t.key ? "var(--pwa-accent)" : "var(--pwa-border)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 8,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: theme === t.key ? "var(--pwa-accent)" : "var(--pwa-muted)",
                }}
              >
                {t.label}
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
            background: "transparent",
            border: "1px solid rgba(211,92,79,0.65)",
            cursor: "pointer",
            color: "#ff6a5f",
            borderRadius: 10,
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
