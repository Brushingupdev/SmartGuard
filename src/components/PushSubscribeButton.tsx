"use client";

import { motion } from "framer-motion";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useEffect, useState } from "react";

type PushStatus = "loading" | "unavailable" | "unconfigured" | "denied" | "subscribed" | "unsubscribed";

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/subscribe");
    const data = await res.json() as { configured: boolean; publicKey: string | null };
    return data.configured ? data.publicKey : null;
  } catch {
    return null;
  }
}

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64   = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData  = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function PushSubscribeButton() {
  const [status, setStatus]   = useState<PushStatus>("loading");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unavailable");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    getVapidPublicKey().then(key => {
      if (!key) { setStatus("unconfigured"); return; }

      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setStatus(sub ? "subscribed" : "unsubscribed");
        });
      });
    });
  }, []);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const key = await getVapidPublicKey();
      if (!key) { setStatus("unconfigured"); return; }

      const reg = await navigator.serviceWorker.ready;

      if (status === "subscribed") {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "unsubscribe", endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setStatus("unsubscribed");
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") { setStatus("denied"); return; }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(key).buffer as ArrayBuffer,
        });

        const subJson = sub.toJSON() as {
          endpoint: string;
          keys?: { p256dh?: string; auth?: string };
        };

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          }),
        });
        setStatus("subscribed");
      }
    } catch (err) {
      console.error("[Push]", err);
    } finally {
      setLoading(false);
    }
  };

  // Ocultar si push no está disponible o configurado
  if (status === "unavailable" || status === "unconfigured" || status === "loading") return null;

  if (status === "denied") {
    return (
      <div className="flex items-center gap-2 px-4 py-3"
        style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)" }}>
        <BellOff className="h-4 w-4 shrink-0" style={{ color: "var(--pwa-muted)" }} />
        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0 }}>
          Notificaciones bloqueadas — actívalas en ajustes del navegador
        </p>
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center justify-between w-full px-4 py-3.5 transition-opacity disabled:opacity-60"
      style={{
        background: status === "subscribed"
          ? "color-mix(in srgb, var(--pwa-accent) 8%, transparent)"
          : "var(--pwa-surface-2)",
        border: `1px solid ${status === "subscribed" ? "color-mix(in srgb, var(--pwa-accent) 35%, transparent)" : "var(--pwa-border)"}`,
        cursor: "pointer",
      }}
    >
      <div className="flex items-center gap-3">
        {status === "subscribed"
          ? <BellRing className="h-4 w-4" style={{ color: "var(--pwa-accent)" }} />
          : <Bell className="h-4 w-4" style={{ color: "var(--pwa-muted)" }} />
        }
        <div className="text-left">
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: status === "subscribed" ? "var(--pwa-accent)" : "var(--pwa-ink)", margin: 0 }}>
            {status === "subscribed" ? "Notificaciones activas" : "Activar notificaciones"}
          </p>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--pwa-muted)", margin: "2px 0 0" }}>
            {status === "subscribed" ? "Toca para desactivar" : "Recibe alertas de citas, demoras y nuevos vehículos"}
          </p>
        </div>
      </div>
      <div className="h-5 w-9 rounded-full relative"
        style={{
          background: status === "subscribed" ? "var(--pwa-accent)" : "var(--pwa-border)",
          transition: "background 0.2s",
        }}>
        <div className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
          style={{
            background: "#fff",
            left: status === "subscribed" ? "calc(100% - 18px)" : "2px",
            transition: "left 0.2s",
          }} />
      </div>
    </motion.button>
  );
}
