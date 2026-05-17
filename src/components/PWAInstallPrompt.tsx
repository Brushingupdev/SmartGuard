"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, PlusSquare, Share2, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePWA } from "@/hooks/usePWA";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "sg-pwa-install-dismissed-at";
const DISMISS_MS = 1000 * 60 * 60 * 24;

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function wasDismissedRecently() {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  return Number.isFinite(ts) && Date.now() - ts < DISMISS_MS;
}

function rememberDismiss() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export default function PWAInstallPrompt() {
  const isStandalone = usePWA();
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  const mobile = useMemo(() => isMobileDevice(), []);
  const ios = useMemo(() => isIosSafari(), []);

  useEffect(() => {
    if (typeof window === "undefined" || isStandalone || !mobile || wasDismissedRecently()) {
      return;
    }

    if (ios) {
      setVisible(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
      window.localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [ios, isStandalone, mobile]);

  const close = () => {
    rememberDismiss();
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
        window.localStorage.removeItem(DISMISS_KEY);
      } else {
        rememberDismiss();
        setVisible(false);
      }
    } finally {
      setInstalling(false);
      setInstallEvent(null);
    }
  };

  if (isStandalone || !mobile || !visible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-x-0 bottom-4 z-[70] px-4"
      >
        <div
          className="mx-auto w-full max-w-md overflow-hidden"
          style={{
            border: "1px solid var(--pwa-border)",
            borderRadius: 22,
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--pwa-surface) 94%, black), color-mix(in srgb, var(--pwa-surface-2) 92%, black))",
            boxShadow: "0 18px 60px rgba(0,0,0,0.42)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-start gap-3 p-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center"
              style={{
                background: "color-mix(in srgb, var(--pwa-accent) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--pwa-accent) 28%, transparent)",
                borderRadius: 14,
                color: "var(--pwa-accent)",
              }}
            >
              {ios ? <Smartphone className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <p
                style={{
                  margin: 0,
                  color: "var(--pwa-ink)",
                  fontFamily: "var(--sg-font-display)",
                  fontSize: 18,
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                Instala SmartGuard
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "var(--pwa-ink-soft)",
                  fontFamily: "var(--sg-font-body)",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {ios
                  ? "Agrega la app a tu pantalla de inicio para usarla más rápido en portería."
                  : "Instálala para abrirla como app, cargar más rápido y operar mejor desde móvil."}
              </p>
            </div>

            <button
              type="button"
              onClick={close}
              className="flex h-8 w-8 shrink-0 items-center justify-center"
              style={{
                border: "none",
                borderRadius: 999,
                background: "transparent",
                color: "var(--pwa-muted)",
                cursor: "pointer",
              }}
              aria-label="Cerrar aviso de instalación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {ios ? (
            <div className="flex flex-col gap-2 px-4 pb-4">
              <div
                className="grid grid-cols-2 gap-2"
                style={{
                  color: "var(--pwa-ink-soft)",
                  fontFamily: "var(--sg-font-body)",
                  fontSize: 13,
                }}
              >
                <div
                  className="flex items-center gap-2 rounded-2xl px-3 py-3"
                  style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)" }}
                >
                  <Share2 className="h-4 w-4" style={{ color: "var(--pwa-accent)" }} />
                  <span>1. Toca Compartir</span>
                </div>
                <div
                  className="flex items-center gap-2 rounded-2xl px-3 py-3"
                  style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)" }}
                >
                  <PlusSquare className="h-4 w-4" style={{ color: "var(--pwa-accent)" }} />
                  <span>2. Agregar a inicio</span>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="mt-1 h-11 w-full"
                style={{
                  border: "1px solid var(--pwa-border)",
                  borderRadius: 14,
                  background: "var(--pwa-surface-2)",
                  color: "var(--pwa-ink)",
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Entendido
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_auto] gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={close}
                className="h-12"
                style={{
                  border: "1px solid var(--pwa-border)",
                  borderRadius: 14,
                  background: "var(--pwa-surface-2)",
                  color: "var(--pwa-ink-soft)",
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Luego
              </button>
              <button
                type="button"
                onClick={handleInstall}
                disabled={!installEvent || installing}
                className="h-12 px-5"
                style={{
                  border: "none",
                  borderRadius: 14,
                  background: "var(--pwa-accent)",
                  color: "var(--pwa-accent-fg)",
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  cursor: !installEvent || installing ? "wait" : "pointer",
                  opacity: !installEvent || installing ? 0.75 : 1,
                }}
              >
                {installing ? "Abriendo..." : "Instalar"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
