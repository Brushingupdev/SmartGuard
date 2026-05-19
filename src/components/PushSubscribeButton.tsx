"use client";

import { motion } from "framer-motion";
import { Bell, BellOff, BellRing, CheckCircle2, Send, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePushSubscriptionStatus, type PushStatus } from "@/hooks/usePushSubscriptionStatus";

type Variant = "row" | "card";
type ShowMode = "all" | "inactive" | "active";

export default function PushSubscribeButton({
  variant = "row",
  showMode = "all",
}: {
  variant?: Variant;
  showMode?: ShowMode;
}) {
  const { status, loading, subscribe, unsubscribe, sendTest } = usePushSubscriptionStatus();
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "error">("neutral");

  const shouldHide = useMemo(() => {
    if (showMode === "inactive") return status === "subscribed";
    if (showMode === "active") return status !== "subscribed";
    return false;
  }, [showMode, status]);

  const showTestAction = status === "subscribed";

  const handleToggle = async () => {
    setMessage(null);
    const result = status === "subscribed" ? await unsubscribe() : await subscribe();

    if (!result.ok) {
      setMessageTone("error");
      setMessage(result.error ?? "No se pudo actualizar la suscripción.");
      return;
    }

    if (status === "subscribed") {
      setMessageTone("neutral");
      setMessage("Notificaciones desactivadas en este dispositivo.");
      return;
    }

    setMessageTone("success");
    setMessage("Notificaciones activadas. Vamos a enviarte una prueba.");
    const testResult = await sendTest();
    if (!testResult.ok) {
      setMessageTone("error");
      setMessage(testResult.error ?? "No se pudo enviar la notificación de prueba.");
      return;
    }
    setMessageTone("success");
    setMessage("Push activo. Deberías recibir una notificación de prueba ahora.");
  };

  const handleSendTest = async () => {
    setMessage(null);
    const result = await sendTest();
    setMessageTone(result.ok ? "success" : "error");
    setMessage(
      result.ok
        ? "Notificación de prueba enviada."
        : (result.error ?? "No se pudo enviar la prueba."),
    );
  };

  if (shouldHide) return null;

  const toneColor =
    messageTone === "success" ? "#6bbd8a" : messageTone === "error" ? "#ff8e7b" : "var(--pwa-muted)";

  const statusCopy: Record<PushStatus, { title: string; detail: string; icon: ReactNode }> = {
    loading: {
      title: "Comprobando notificaciones",
      detail: "Estamos revisando si este dispositivo ya quedó suscrito.",
      icon: <Bell className="h-4 w-4" style={{ color: "var(--pwa-muted)" }} />,
    },
    unavailable: {
      title: "Push no disponible aquí",
      detail: "Este navegador no soporta notificaciones push para la app.",
      icon: <BellOff className="h-4 w-4" style={{ color: "var(--pwa-muted)" }} />,
    },
    unconfigured: {
      title: "Push pendiente de configurar",
      detail: "El servidor todavía no expone las claves VAPID en este entorno.",
      icon: <BellOff className="h-4 w-4" style={{ color: "#ff8e7b" }} />,
    },
    denied: {
      title: "Notificaciones bloqueadas",
      detail: "Actívalas en ajustes del navegador para recibir alertas de citas y demoras.",
      icon: <BellOff className="h-4 w-4" style={{ color: "#ff8e7b" }} />,
    },
    unsubscribed: {
      title: "Activa alertas en este móvil",
      detail: "Recibe avisos de citas, demoras y nuevos vehículos sin estar mirando la pantalla.",
      icon: <Smartphone className="h-4 w-4" style={{ color: "var(--pwa-accent)" }} />,
    },
    subscribed: {
      title: "Notificaciones activas",
      detail: "Este dispositivo ya está listo para recibir avisos de SmartGuard.",
      icon: <BellRing className="h-4 w-4" style={{ color: "var(--pwa-accent)" }} />,
    },
  };

  const copy = statusCopy[status];

  if (variant === "card") {
    return (
      <div
        className="mx-4 mt-4 overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.008))",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
        }}
      >
        <div className="flex items-start gap-3 px-4 py-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              background:
                status === "subscribed"
                  ? "color-mix(in srgb, var(--pwa-accent) 12%, transparent)"
                  : "var(--pwa-surface-2)",
              border: `1px solid ${status === "subscribed" ? "color-mix(in srgb, var(--pwa-accent) 28%, transparent)" : "var(--pwa-border)"}`,
            }}
          >
            {copy.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 8,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
                margin: 0,
              }}
            >
              Notificaciones
            </p>
            <p
              style={{
                fontFamily: "var(--sg-font-display)",
                fontSize: 16,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--pwa-ink)",
                margin: "6px 0 0",
              }}
            >
              {copy.title}
            </p>
            <p
              style={{
                fontFamily: "var(--sg-font-body)",
                fontSize: 13,
                color: "var(--pwa-ink-soft)",
                margin: "8px 0 0",
                lineHeight: 1.45,
              }}
            >
              {copy.detail}
            </p>
          </div>
        </div>

        {(status === "unsubscribed" || status === "subscribed") && (
          <div className="px-4 pb-4 flex gap-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleToggle}
              disabled={loading}
              className="flex-1 h-11 disabled:opacity-60"
              style={{
                background: status === "subscribed" ? "var(--pwa-surface-2)" : "var(--pwa-accent)",
                color: status === "subscribed" ? "var(--pwa-ink)" : "var(--pwa-accent-fg)",
                border: status === "subscribed" ? "1px solid var(--pwa-border)" : "none",
                cursor: "pointer",
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 700,
                borderRadius: 10,
              }}
            >
              {status === "subscribed" ? "Desactivar" : "Activar push"}
            </motion.button>

            {showTestAction ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSendTest}
                disabled={loading}
                className="h-11 px-4 disabled:opacity-60"
                style={{
                  background: "var(--pwa-surface-2)",
                  border: "1px solid var(--pwa-border)",
                  color: "var(--pwa-ink)",
                  cursor: "pointer",
                  borderRadius: 10,
                }}
                aria-label="Enviar prueba"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            ) : null}
          </div>
        )}

        {message ? (
          <div className="px-4 pb-4">
            <p
              style={{
                fontFamily: "var(--sg-font-body)",
                fontSize: 12,
                color: toneColor,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {message}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={status === "unsubscribed" || status === "subscribed" ? handleToggle : undefined}
        disabled={
          loading ||
          status === "loading" ||
          status === "unavailable" ||
          status === "unconfigured" ||
          status === "denied"
        }
        className="flex items-center justify-between w-full px-4 py-3.5 transition-opacity disabled:opacity-60"
        style={{
          background:
            status === "subscribed"
              ? "color-mix(in srgb, var(--pwa-accent) 8%, transparent)"
              : "var(--pwa-surface-2)",
          border: `1px solid ${status === "subscribed" ? "color-mix(in srgb, var(--pwa-accent) 35%, transparent)" : "var(--pwa-border)"}`,
          cursor: status === "unsubscribed" || status === "subscribed" ? "pointer" : "default",
        }}
      >
        <div className="flex items-center gap-3">
          {copy.icon}
          <div className="text-left">
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: status === "subscribed" ? "var(--pwa-accent)" : "var(--pwa-ink)",
                margin: 0,
              }}
            >
              {copy.title}
            </p>
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 8,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
                margin: "2px 0 0",
              }}
            >
              {copy.detail}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showTestAction ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void handleSendTest();
              }}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 disabled:opacity-60"
              style={{
                background: "var(--pwa-surface)",
                border: "1px solid var(--pwa-border)",
                color: "var(--pwa-ink)",
                cursor: "pointer",
                borderRadius: 999,
                fontFamily: "var(--sg-font-mono)",
                fontSize: 8,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              <Send className="h-3 w-3" />
              Probar
            </button>
          ) : null}
          <div
            className="h-5 w-9 rounded-full relative"
            style={{
              background: status === "subscribed" ? "var(--pwa-accent)" : "var(--pwa-border)",
              transition: "background 0.2s",
            }}
          >
            <div
              className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
              style={{
                background: "#fff",
                left: status === "subscribed" ? "calc(100% - 18px)" : "2px",
                transition: "left 0.2s",
              }}
            />
          </div>
        </div>
      </motion.button>

      {message ? (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)" }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: toneColor }} />
          <p style={{ fontFamily: "var(--sg-font-body)", fontSize: 12, color: toneColor, margin: 0 }}>
            {message}
          </p>
        </div>
      ) : null}
    </div>
  );
}
