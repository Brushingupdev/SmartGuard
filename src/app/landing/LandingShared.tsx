"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePWA } from "@/hooks/usePWA";
import { easeOut, numberFormatter } from "./landingData";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const ROOT_PROMPT_DISMISS_KEY = "sg-root-pwa-prompt-dismissed-at";
const ROOT_PROMPT_DISMISS_MS = 1000 * 60 * 60 * 12;

export function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1600;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(id);
        return;
      }
      setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [target]);

  return <>{numberFormatter.format(count)}</>;
}

export function MobileAppPrompt() {
  const isPWA = usePWA();
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const dismissedAt = Number(window.localStorage.getItem(ROOT_PROMPT_DISMISS_KEY) ?? "0");
    const dismissedRecently =
      Number.isFinite(dismissedAt) && dismissedAt > 0 && Date.now() - dismissedAt < ROOT_PROMPT_DISMISS_MS;
    return mobile && !dismissedRecently;
  });
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosSafari] = useState(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    return ios && safari;
  });
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const dismissedAt = Number(window.localStorage.getItem(ROOT_PROMPT_DISMISS_KEY) ?? "0");
    const dismissedRecently =
      Number.isFinite(dismissedAt) && dismissedAt > 0 && Date.now() - dismissedAt < ROOT_PROMPT_DISMISS_MS;

    if (!mobile || isPWA || dismissedRecently) {
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
      window.localStorage.removeItem(ROOT_PROMPT_DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isPWA]);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ROOT_PROMPT_DISMISS_KEY, String(Date.now()));
    }
    setVisible(false);
  };

  const openPWA = () => {
    window.location.assign("/pwa");
  };

  const handleInstall = async () => {
    if (!installEvent) {
      openPWA();
      return;
    }
    setInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
        window.localStorage.removeItem(ROOT_PROMPT_DISMISS_KEY);
      } else {
        openPWA();
      }
    } finally {
      setInstalling(false);
      setInstallEvent(null);
    }
  };

  if (!visible || isPWA) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[70] flex items-end bg-[rgba(4,7,6,0.72)] px-4 pb-4 pt-10 md:hidden"
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.24, ease: easeOut }}
          className="w-full overflow-hidden rounded-[24px] border border-[var(--sg-line)] bg-[rgba(11,15,13,0.96)] shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur"
        >
          <div className="flex items-start gap-3 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[rgba(227,190,68,0.12)] text-[var(--sg-accent)]">
              {installEvent ? <Download className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <p className="sg-font-display text-[21px] font-bold leading-[1.05] text-[var(--sg-ink)]">
                Abre SmartGuard como app
              </p>
              <p className="mt-2 text-[13px] leading-[1.55] text-[var(--sg-copy)]">
                {isIosSafari
                  ? "Usa la versión PWA para registrar y operar mejor desde móvil. Luego podrás agregarla a tu pantalla de inicio."
                  : "En móvil conviene entrar por la versión app para instalarla y usarla más rápido en portería."}
              </p>
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--sg-muted)] transition-opacity active:opacity-60"
              aria-label="Cerrar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-2 px-5 pb-5">
            <button
              type="button"
              onClick={handleInstall}
              className="flex h-12 items-center justify-center rounded-[14px] bg-[var(--sg-accent)] sg-font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--sg-canvas)]"
            >
              {installing ? "Abriendo..." : installEvent ? "Instalar app" : "Abrir versión app"}
            </button>

            <button
              type="button"
              onClick={openPWA}
              className="flex h-11 items-center justify-center rounded-[14px] border border-[var(--sg-line)] bg-[rgba(255,255,255,0.02)] sg-font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--sg-copy)]"
            >
              Ir a /pwa
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
