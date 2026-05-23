"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Copy,
  Link2,
  Plus,
  QrCode,
  X,
  Zap,
} from "lucide-react";
import { createPublicCitaLink } from "@/app/pwa/actions";
import { preRegisterCita } from "@/app/actions";
import type { GateAssignment } from "@/lib/gates";
import { formatGateLabelFromPlant } from "@/lib/gates";
import type { CitaRow } from "@/app/registro/types";
import { humanizeError } from "@/lib/humanizeError";
import { PlantScopeSelector, ScreenHeader } from "./PWAHomeGuardiaShared";

function LinkSheet({
  plants,
  companyId,
  gateOptions,
  onClose,
}: {
  plants: string[];
  companyId: string;
  gateOptions: GateAssignment[];
  onClose: () => void;
}) {
  const [selectedPlant, setSelectedPlant] = useState(plants[0] ?? "");
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await createPublicCitaLink(selectedPlant, companyId);
      if (cancelled) return;
      if (result.success) {
        setUrl(result.url);
        setUrlError(null);
      } else {
        setUrl("");
        setUrlError(result.error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId, selectedPlant]);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=0d0f0e&color=c8a84b&margin=10`;

  const handleCopy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleWhatsApp = () => {
    if (!url) return;
    const msg = encodeURIComponent(`Hola, puedes registrar tu cita de visita desde este enlace:\n${url}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80]"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[81] flex flex-col"
        style={{ background: "var(--pwa-surface)", borderTop: "2px solid var(--pwa-accent)", maxHeight: "85vh" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ background: "var(--pwa-border)" }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--pwa-border)" }}>
          <div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--pwa-accent)", margin: 0 }}>
              Portal de citas
            </p>
            <h3 style={{ fontFamily: "var(--sg-font-display)", fontSize: 17, fontWeight: 800, textTransform: "uppercase", color: "var(--pwa-ink)", margin: "3px 0 0" }}>
              QR para proveedores
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pwa-muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {plants.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
                Planta / puerta
              </label>
              <div className="relative">
                <select
                  value={selectedPlant}
                  onChange={(event) => setSelectedPlant(event.target.value)}
                  className="w-full h-12 appearance-none px-3 outline-none"
                  style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)", color: "var(--pwa-ink)", fontFamily: "var(--sg-font-display)", fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}
                >
                  {plants.map((plant) => (
                    <option key={plant} value={plant}>
                      {formatGateLabelFromPlant(plant, gateOptions)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--pwa-muted)" }} />
              </div>
              {urlError ? (
                <p style={{ fontFamily: "var(--sg-font-body)", fontSize: 12, color: "#d35c4f", margin: "6px 0 0" }}>
                  {urlError}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-3 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR de citas" width={160} height={160} className="rounded-sm" style={{ imageRendering: "pixelated" }} />
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)", textAlign: "center", margin: 0 }}>
              {formatGateLabelFromPlant(selectedPlant, gateOptions)} · escanea para agendar
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)" }}>
            <Link2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--pwa-accent)" }} />
            <p className="flex-1 truncate" style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, color: "var(--pwa-ink-soft)", margin: 0 }}>
              {url}
            </p>
          </div>

          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: url ? 0.96 : 1 }}
              onClick={handleCopy}
              disabled={!url}
              className="flex-1 h-12 flex items-center justify-center gap-2"
              style={{ background: copied ? "rgba(107,189,138,0.15)" : "var(--pwa-surface-2)", border: `1px solid ${copied ? "#6bbd8a" : "var(--pwa-border)"}`, color: copied ? "#6bbd8a" : "var(--pwa-ink)", cursor: url ? "pointer" : "not-allowed", opacity: url ? 1 : 0.6, fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}
            >
              <Copy className="h-4 w-4" />
              {copied ? "¡Copiado!" : "Copiar link"}
            </motion.button>
            <motion.button
              whileTap={{ scale: url ? 0.96 : 1 }}
              onClick={handleWhatsApp}
              disabled={!url}
              className="flex-1 h-12 flex items-center justify-center gap-2"
              style={{ background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.35)", color: "#25d366", cursor: url ? "pointer" : "not-allowed", opacity: url ? 1 : 0.6, fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}
            >
              <QrCode className="h-4 w-4" />
              WhatsApp
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function NuevaCitaSheet({
  plant,
  agente,
  responsables,
  onSave,
  onClose,
}: {
  plant: string;
  agente: string;
  responsables: string[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [hora, setHora] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [responsable, setResponsable] = useState(responsables[0] ?? "");
  const [tipoOp, setTipoOp] = useState("Descarga");
  const [fecha, setFecha] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!hora || !razonSocial.trim()) {
      setError("Hora y razón social son obligatorios");
      return;
    }
    setSaving(true);
    const result = await preRegisterCita({
      horaCita: hora,
      fecha: fecha || undefined,
      plant,
      razonSocial: razonSocial.trim(),
      empresa: razonSocial.trim(),
      responsable,
      type: "Proveedor",
      tipoOperacion: tipoOp,
      agente,
      note: "",
    });
    setSaving(false);
    if (result.success) {
      onSave();
      onClose();
      return;
    }
    setError(humanizeError(result.error));
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{ background: "var(--pwa-surface)", borderTop: "2px solid var(--pwa-accent)", maxHeight: "90vh" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ background: "var(--pwa-border)" }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--pwa-border)" }}>
          <div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--pwa-accent)", margin: 0 }}>
              Nueva cita
            </p>
            <h3 style={{ fontFamily: "var(--sg-font-display)", fontSize: 18, fontWeight: 800, textTransform: "uppercase", color: "var(--pwa-ink)", margin: "4px 0 0" }}>
              Programar vehículo
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pwa-muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
                Hora de llegada *
              </label>
              <input
                type="time"
                value={hora}
                onChange={(event) => setHora(event.target.value)}
                className="w-full h-12 px-3 outline-none text-[16px] font-bold"
                style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)", color: "var(--pwa-ink)", fontFamily: "var(--sg-font-mono)" }}
                onFocus={(event) => (event.target.style.borderColor = "var(--pwa-accent)")}
                onBlur={(event) => (event.target.style.borderColor = "var(--pwa-border)")}
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
                Fecha (hoy si vacío)
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                className="w-full h-12 px-3 outline-none text-[13px]"
                style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)", color: "var(--pwa-ink)", fontFamily: "var(--sg-font-mono)" }}
                onFocus={(event) => (event.target.style.borderColor = "var(--pwa-accent)")}
                onBlur={(event) => (event.target.style.borderColor = "var(--pwa-border)")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
              Vehículo / Razón social *
            </label>
            <input
              type="text"
              value={razonSocial}
              onChange={(event) => setRazonSocial(event.target.value.toUpperCase())}
              placeholder="TRANSPORTES ABC SAC..."
              className="w-full h-12 px-3 outline-none text-[14px] font-bold uppercase"
              style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)", color: "var(--pwa-ink)", fontFamily: "var(--sg-font-display)" }}
              onFocus={(event) => (event.target.style.borderColor = "var(--pwa-accent)")}
              onBlur={(event) => (event.target.style.borderColor = "var(--pwa-border)")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
              Responsable de almacén
            </label>
            <div className="relative">
              <select
                value={responsable}
                onChange={(event) => setResponsable(event.target.value)}
                className="w-full h-12 px-3 outline-none appearance-none text-[14px]"
                style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)", color: "var(--pwa-ink)", fontFamily: "var(--sg-font-display)", fontWeight: 700, textTransform: "uppercase" }}
              >
                {responsables.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--pwa-muted)" }} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
              Tipo de operación
            </label>
            <div className="flex gap-2">
              {["Carga", "Descarga", "Servicio"].map((item) => (
                <button
                  key={item}
                  onClick={() => setTipoOp(item)}
                  className="flex-1 h-11 transition-all"
                  style={{ background: tipoOp === item ? "rgba(200,168,75,0.12)" : "var(--pwa-surface-2)", border: `1px solid ${tipoOp === item ? "var(--pwa-accent)" : "var(--pwa-border)"}`, color: tipoOp === item ? "var(--pwa-accent)" : "var(--pwa-muted)", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: tipoOp === item ? 700 : 400 }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--pwa-danger)" }}>
              {error}
            </p>
          ) : null}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving || !hora || !razonSocial.trim()}
            className="w-full h-13 flex items-center justify-center gap-2 mt-1 transition-opacity disabled:opacity-40"
            style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)", fontFamily: "var(--sg-font-mono)", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer", height: 52 }}
          >
            {saving ? "Guardando..." : <><Calendar className="h-4 w-4" /> Programar cita</>}
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function TabCitas({
  citas,
  plants,
  activePlant,
  gateOptions,
  agente,
  responsables,
  companyId,
  onActivate,
  onCancel,
  onRefresh,
  onPlantChange,
}: {
  citas: CitaRow[];
  plants: string[];
  activePlant: string;
  gateOptions: GateAssignment[];
  agente: string;
  responsables: string[];
  companyId: string;
  onActivate: (id: number) => void;
  onCancel: (id: number) => void;
  onRefresh: () => void;
  onPlantChange: (plant: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const [activeView, setActiveView] = useState<"proximas" | "retrasadas" | "llegaron">("proximas");
  const [search, setSearch] = useState("");
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const scopedCitas = citas.filter((cita) => cita.planta === activePlant);

  const retrasadas = scopedCitas.filter((cita) => {
    const parts = cita.horaCita.split(":").map(Number);
    const citaMin = parts[0] * 60 + parts[1];
    return cita.estado === "esperado" && citaMin < nowMin - 10;
  });
  const proximas = scopedCitas.filter((cita) => !retrasadas.includes(cita) && cita.estado === "esperado");
  const llegaron = scopedCitas.filter((cita) => cita.estado === "activo" || cita.estado === "atendido");

  const groups = {
    proximas: { label: "Próximas", color: "#6bbd8a", items: proximas },
    retrasadas: { label: "Retrasadas", color: "#d35c4f", items: retrasadas },
    llegaron: { label: "Llegaron", color: "#6ba7ff", items: llegaron },
  } as const;
  const searchTerm = search.trim().toLowerCase();
  const currentGroup = {
    ...groups[activeView],
    items: groups[activeView].items.filter((cita) => {
      if (!searchTerm) return true;
      return [cita.razonSocial, cita.empresa, cita.responsable ?? "", cita.horaCita].some((value) =>
        value.toLowerCase().includes(searchTerm),
      );
    }),
  };

  const getCitaMeta = (cita: CitaRow) => {
    const [hour, minute] = cita.horaCita.split(":").map(Number);
    const citaMin = hour * 60 + minute;
    const delta = citaMin - nowMin;
    if (cita.estado === "activo" || cita.estado === "atendido") {
      return { label: cita.hRegistro ? `Llegó ${cita.hRegistro}` : "Llegó", color: "#6ba7ff" };
    }
    if (delta >= 0) {
      const hours = Math.floor(delta / 60);
      const minutes = delta % 60;
      return {
        label: hours > 0 ? `En ${hours}h ${String(minutes).padStart(2, "0")}m` : `En ${minutes} min`,
        color: "#6bbd8a",
      };
    }
    const late = Math.abs(delta);
    const hours = Math.floor(late / 60);
    const minutes = late % 60;
    return {
      label: hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m tarde` : `${late} min tarde`,
      color: "#d35c4f",
    };
  };

  return (
    <div className="flex flex-col mt-4">
      <ScreenHeader tab="citas" title="Citas" />
      <PlantScopeSelector plants={plants} activePlant={activePlant} gateOptions={gateOptions} onChange={onPlantChange} />

      <div className="mx-4 p-5 relative overflow-hidden" style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)", borderRadius: 14 }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 140, height: 140, background: "radial-gradient(circle at top right, color-mix(in srgb, var(--pwa-accent) 8%, transparent), transparent)", pointerEvents: "none" }} />
        <div>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-accent)", margin: 0 }}>
            Citas
          </p>
          <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 22, fontWeight: 800, textTransform: "uppercase", color: "var(--pwa-ink)", margin: "6px 0 0" }}>
            Citas del día
          </p>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: "6px 0 0" }}>
            {formatGateLabelFromPlant(activePlant, gateOptions)} · {scopedCitas.length} programada{scopedCitas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Próximas", value: proximas.length, color: "#6bbd8a" },
            { label: "Retrasadas", value: retrasadas.length, color: "#d35c4f" },
            { label: "Llegaron", value: llegaron.length, color: "#6ba7ff" },
          ].map((item) => (
            <div key={item.label} className="px-3 py-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--pwa-border)" }}>
              <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 22, fontWeight: 800, color: item.color, margin: 0, lineHeight: 1 }}>
                {item.value}
              </p>
              <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: "6px 0 0" }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowForm(true)} className="flex h-[52px] w-full items-center justify-center gap-2" style={{ background: "var(--pwa-accent)", color: "var(--pwa-accent-fg)", border: "none", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
            <Plus className="h-4 w-4" /> Nueva cita
          </motion.button>
          <button onClick={() => setShowLinkSheet(true)} className="flex h-[52px] w-full items-center justify-center gap-2" style={{ background: "var(--pwa-surface-2)", color: "var(--pwa-ink)", border: "1px solid var(--pwa-border)", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700 }}>
            <QrCode className="h-4 w-4" /> Portal QR
          </button>
        </div>
      </div>

      <div className="flex gap-2 px-4 mt-4 overflow-x-auto pb-1">
        {(["proximas", "retrasadas", "llegaron"] as const).map((key) => {
          const group = groups[key];
          return (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className="shrink-0 px-4 py-2 transition-all"
              style={{ background: activeView === key ? "var(--pwa-surface)" : "var(--pwa-surface-2)", border: `1px solid ${activeView === key ? group.color : "var(--pwa-border)"}`, color: activeView === key ? group.color : "var(--pwa-muted)", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: activeView === key ? 700 : 500 }}
            >
              {group.label} {group.items.length > 0 ? `(${group.items.length})` : ""}
            </button>
          );
        })}
      </div>

      <div className="mx-4 mt-3">
        <div className="flex items-center gap-2 px-3" style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)" }}>
          <Calendar className="h-4 w-4 shrink-0" style={{ color: "var(--pwa-muted)" }} />
          <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por vehículo, responsable u hora" className="h-11 w-full bg-transparent outline-none" style={{ color: "var(--pwa-ink)", fontFamily: "var(--sg-font-body)", fontSize: 13 }} />
          {search ? (
            <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--pwa-muted)", cursor: "pointer" }}>
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {scopedCitas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 mx-4" style={{ border: "1px dashed var(--pwa-border)" }}>
          <Calendar className="h-10 w-10 opacity-10" style={{ color: "var(--pwa-muted)" }} />
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
            Sin citas programadas hoy
          </p>
          <button onClick={() => setShowForm(true)} style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-accent)", background: "none", border: "none", cursor: "pointer" }}>
            + Programar la primera
          </button>
        </div>
      ) : (
        <div className="mx-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-0.5" style={{ background: currentGroup.color }} />
            <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: currentGroup.color }}>
              {currentGroup.label} · {currentGroup.items.length}
            </span>
          </div>
          <div className="flex flex-col" style={{ border: "1px solid var(--pwa-border)" }}>
            {currentGroup.items.length === 0 ? (
              <div className="px-4 py-10" style={{ background: "var(--pwa-surface)" }}>
                <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: 0, textAlign: "center" }}>
                  {searchTerm ? "Sin coincidencias en esta vista" : "Sin citas en esta vista"}
                </p>
              </div>
            ) : currentGroup.items.map((cita) => {
              const name = cita.razonSocial !== "—" ? cita.razonSocial : cita.empresa !== "—" ? cita.empresa : "Cita programada";
              const meta = getCitaMeta(cita);
              return (
                <div key={cita.id} className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--pwa-border)", background: "var(--pwa-surface)" }}>
                  <div className="flex items-center justify-center h-11 w-14 shrink-0" style={{ background: `${currentGroup.color}15`, border: `1px solid ${currentGroup.color}40` }}>
                    <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 13, fontWeight: 700, color: currentGroup.color, lineHeight: 1 }}>
                      {cita.horaCita.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontFamily: "var(--sg-font-display)", fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "var(--pwa-ink)", margin: 0 }}>
                      {name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {cita.responsable ? (
                        <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
                          {cita.responsable.split(" ")[0]}
                        </span>
                      ) : null}
                      {cita.tipoOperacion ? (
                        <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: currentGroup.color, opacity: 0.7 }}>
                          {cita.tipoOperacion}
                        </span>
                      ) : null}
                    </div>
                    <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: meta.color, margin: "7px 0 0" }}>
                      {meta.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {cita.estado === "esperado" ? (
                      <>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => onActivate(cita.id)} className="flex items-center gap-1 px-2.5 py-2" style={{ background: `${currentGroup.color}15`, border: `1px solid ${currentGroup.color}50`, color: currentGroup.color, cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                          <CheckCircle2 className="h-3 w-3" /> Llegó
                        </motion.button>
                        <button onClick={() => onCancel(cita.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pwa-muted)", padding: "4px" }}>
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <span className="flex items-center gap-1" style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6ba7ff" }}>
                        <Zap className="h-3 w-3" /> Activo
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm ? (
        <NuevaCitaSheet plant={activePlant} agente={agente} responsables={responsables} onSave={onRefresh} onClose={() => setShowForm(false)} />
      ) : null}
      {showLinkSheet && companyId ? (
        <LinkSheet plants={plants} companyId={companyId} gateOptions={gateOptions} onClose={() => setShowLinkSheet(false)} />
      ) : null}
    </div>
  );
}
