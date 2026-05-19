"use client";

import { useCallback, useEffect, useState } from "react";

export type PushStatus =
  | "loading"
  | "unavailable"
  | "unconfigured"
  | "denied"
  | "subscribed"
  | "unsubscribed";

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/subscribe");
    const data = (await res.json()) as { configured: boolean; publicKey: string | null };
    return data.configured ? data.publicKey : null;
  } catch {
    return null;
  }
}

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo completar la acción.";
}

export function usePushSubscriptionStatus() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [loading, setLoading] = useState(false);
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unavailable");
      setSubscriptionEndpoint(null);
      return { key: null, subscription: null };
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      setSubscriptionEndpoint(null);
      return { key: null, subscription: null };
    }

    const key = await getVapidPublicKey();
    if (!key) {
      setStatus("unconfigured");
      setSubscriptionEndpoint(null);
      return { key: null, subscription: null };
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setSubscriptionEndpoint(subscription?.endpoint ?? null);
    setStatus(subscription ? "subscribed" : "unsubscribed");
    return { key, subscription };
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setLoading(true);
    try {
      const { key } = await refresh();
      if (!key) {
        return { ok: false, error: "Las notificaciones todavía no están configuradas en este entorno." };
      }

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return { ok: false, error: "El navegador no concedió permiso para notificaciones." };
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(key) as unknown as BufferSource,
        }));

      const serialized = subscription.toJSON() as {
        endpoint: string;
        keys?: { p256dh?: string; auth?: string };
      };

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: serialized.endpoint,
          keys: serialized.keys,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo guardar la suscripción.");
      }

      setSubscriptionEndpoint(serialized.endpoint);
      setStatus("subscribed");
      return { ok: true, endpoint: serialized.endpoint };
    } catch (error) {
      await refresh();
      return { ok: false, error: getErrorMessage(error) };
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unsubscribe", endpoint: subscription.endpoint }),
        });

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "No se pudo desactivar la suscripción.");
        }

        await subscription.unsubscribe();
      }

      setSubscriptionEndpoint(null);
      setStatus("unsubscribed");
      return { ok: true };
    } catch (error) {
      await refresh();
      return { ok: false, error: getErrorMessage(error) };
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const sendTest = useCallback(async () => {
    if (!subscriptionEndpoint) {
      return { ok: false, error: "Primero activa las notificaciones en este dispositivo." };
    }

    setLoading(true);
    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscriptionEndpoint }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo enviar la notificación de prueba.");
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    } finally {
      setLoading(false);
    }
  }, [subscriptionEndpoint]);

  return {
    status,
    loading,
    subscriptionEndpoint,
    subscribe,
    unsubscribe,
    sendTest,
    refresh,
  };
}
