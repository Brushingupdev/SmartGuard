"use client";

import { AnimatePresence, motion } from "framer-motion";
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
import { useEffect, useState } from "react";
import { createPublicCitaLink } from "@/app/pwa/actions";
import { preRegisterCita } from "@/app/actions";
import type { CitaRow } from "@/app/registro/types";
import { formatGateLabelFromPlant } from "@/lib/gates";
import { humanizeError } from "@/lib/humanizeError";

function LinkSheet({
  plantas,
  companyId,
  onClose,
}: {
  plantas: string[];
  companyId: string;
  onClose: () => void;
}) {
  const [selectedPlant, setSelectedPlant] = useState(plantas[0] ?? "");
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

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsApp = () => {
    if (!url) return;
    const msg = encodeURIComponent(
      `Hola, puedes registrar tu cita de visita desde este enlace:\n${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(3px)",
        }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          background: "var(--pwa-surface)",
          borderTop: "2px solid var(--pwa-accent)",
          maxHeight: "85vh",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pb-1 pt-3">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--pwa-border)" }}
          />
        </div>
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--pwa-border)" }}
        >
          <div>
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--pwa-accent)",
                margin: 0,
              }}
            >
              Link para proveedores
            </p>
            <h3
              style={{
                fontFamily: "var(--sg-font-display)",
                fontSize: 17,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--pwa-ink)",
                margin: "3px 0 0",
              }}
            >
              Portal de citas
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--pwa-muted)",
            }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {plantas.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--pwa-muted)",
                }}
              >
                Planta / portería
              </label>
              <div className="relative">
                <select
                  value={selectedPlant}
                  onChange={(event) => setSelectedPlant(event.target.value)}
                  className="h-12 w-full appearance-none px-3 text-[14px] outline-none"
                  style={{
                    background: "var(--pwa-surface-2)",
                    border: "1px solid var(--pwa-border)",
                    color: "var(--pwa-ink)",
                    fontFamily: "var(--sg-font-display)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {plantas.map((plant) => (
                    <option key={plant} value={plant}>
                      {formatGateLabelFromPlant(plant)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: "var(--pwa-muted)" }}
                />
              </div>
              {urlError ? (
                <p
                  style={{
                    fontFamily: "var(--sg-font-body)",
                    fontSize: 12,
                    color: "#d35c4f",
                    margin: "6px 0 0",
                  }}
                >
                  {urlError}
                </p>
              ) : null}
            </div>
          )}

          <div className="flex flex-col items-center gap-3 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="QR Code"
              width={160}
              height={160}
              className="rounded-sm"
              style={{ imageRendering: "pixelated" }}
            />
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
                textAlign: "center",
              }}
            >
              {formatGateLabelFromPlant(selectedPlant)} — escanea para agendar
            </p>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{
              background: "var(--pwa-surface-2)",
              border: "1px solid var(--pwa-border)",
            }}
          >
            <Link2
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: "var(--pwa-accent)" }}
            />
            <p
              className="flex-1 truncate"
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                color: "var(--pwa-ink-soft)",
                margin: 0,
              }}
            >
              {url}
            </p>
          </div>

          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: url ? 0.96 : 1 }}
              onClick={handleCopy}
              disabled={!url}
              className="flex h-12 flex-1 items-center justify-center gap-2"
              style={{
                background: copied
                  ? "rgba(107,189,138,0.15)"
                  : "var(--pwa-surface-2)",
                border: `1px solid ${copied ? "#6bbd8a" : "var(--pwa-border)"}`,
                color: copied ? "#6bbd8a" : "var(--pwa-ink)",
                cursor: url ? "pointer" : "not-allowed",
                opacity: url ? 1 : 0.6,
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              <Copy className="h-4 w-4" />
              {copied ? "¡Copiado!" : "Copiar link"}
            </motion.button>
            <motion.button
              whileTap={{ scale: url ? 0.96 : 1 }}
              onClick={handleWhatsApp}
              disabled={!url}
              className="flex h-12 flex-1 items-center justify-center gap-2"
              style={{
                background: "rgba(37,211,102,0.12)",
                border: "1px solid rgba(37,211,102,0.35)",
                color: "#25d366",
                cursor: url ? "pointer" : "not-allowed",
                opacity: url ? 1 : 0.6,
                fontFamily: "var(--sg-font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              <QrCode className="h-4 w-4" /> WhatsApp
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function NuevaCitaInline({
  plantas,
  responsables,
  onSave,
  onClose,
}: {
  plantas: string[];
  responsables: string[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [planta, setPlanta] = useState(plantas[0] ?? "");
  const [hora, setHora] = useState("");
  const [fecha, setFecha] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [responsable, setResponsable] = useState(responsables[0] ?? "");
  const [tipoOp, setTipoOp] = useState("Descarga");
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
      plant: planta,
      razonSocial: razonSocial.trim(),
      empresa: razonSocial.trim(),
      responsable,
      type: "Proveedor",
      tipoOperacion: tipoOp,
      agente: "Supervisor",
      note: "",
    });
    setSaving(false);

    if (result.success) {
      onSave();
      onClose();
    } else {
      setError(humanizeError(result.error));
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          background: "var(--pwa-surface)",
          borderTop: "2px solid var(--pwa-accent)",
          maxHeight: "90vh",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pb-1 pt-3">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--pwa-border)" }}
          />
        </div>
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--pwa-border)" }}
        >
          <h3
            style={{
              fontFamily: "var(--sg-font-display)",
              fontSize: 18,
              fontWeight: 800,
              textTransform: "uppercase",
              color: "var(--pwa-ink)",
              margin: 0,
            }}
          >
            Nueva cita
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--pwa-muted)",
            }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {plantas.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label
                style={{
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--pwa-muted)",
                }}
              >
                Planta
              </label>
              <div className="relative">
                <select
                  value={planta}
                  onChange={(event) => setPlanta(event.target.value)}
                  className="h-12 w-full appearance-none px-3 text-[14px] outline-none"
                  style={{
                    background: "var(--pwa-surface-2)",
                    border: "1px solid var(--pwa-border)",
                    color: "var(--pwa-ink)",
                    fontFamily: "var(--sg-font-display)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {plantas.map((plant) => (
                    <option key={plant} value={plant}>
                      {formatGateLabelFromPlant(plant)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: "var(--pwa-muted)" }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {[
              { label: "Hora *", type: "time", val: hora, set: setHora },
              { label: "Fecha", type: "date", val: fecha, set: setFecha },
            ].map((field) => (
              <div key={field.label} className="flex flex-1 flex-col gap-1.5">
                <label
                  style={{
                    fontFamily: "var(--sg-font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--pwa-muted)",
                  }}
                >
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={field.val}
                  onChange={(event) => field.set(event.target.value)}
                  className="h-12 w-full px-3 outline-none"
                  style={{
                    background: "var(--pwa-surface-2)",
                    border: "1px solid var(--pwa-border)",
                    color: "var(--pwa-ink)",
                    fontFamily: "var(--sg-font-mono)",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                  onFocus={(event) => {
                    event.target.style.borderColor = "var(--pwa-accent)";
                  }}
                  onBlur={(event) => {
                    event.target.style.borderColor = "var(--pwa-border)";
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
              }}
            >
              Vehículo / Razón social *
            </label>
            <input
              type="text"
              value={razonSocial}
              onChange={(event) =>
                setRazonSocial(event.target.value.toUpperCase())
              }
              placeholder="TRANSPORTES ABC SAC..."
              className="h-12 w-full px-3 text-[14px] font-bold uppercase outline-none"
              style={{
                background: "var(--pwa-surface-2)",
                border: "1px solid var(--pwa-border)",
                color: "var(--pwa-ink)",
                fontFamily: "var(--sg-font-display)",
              }}
              onFocus={(event) => {
                event.target.style.borderColor = "var(--pwa-accent)";
              }}
              onBlur={(event) => {
                event.target.style.borderColor = "var(--pwa-border)";
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--pwa-muted)",
              }}
            >
              Responsable
            </label>
            <div className="relative">
              <select
                value={responsable}
                onChange={(event) => setResponsable(event.target.value)}
                className="h-12 w-full appearance-none px-3 text-[14px] outline-none"
                style={{
                  background: "var(--pwa-surface-2)",
                  border: "1px solid var(--pwa-border)",
                  color: "var(--pwa-ink)",
                  fontFamily: "var(--sg-font-display)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {responsables.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--pwa-muted)" }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            {["Carga", "Descarga", "Servicio", "Otro"].map((option) => (
              <button
                key={option}
                onClick={() => setTipoOp(option)}
                className="flex-1 py-2.5"
                style={{
                  background:
                    tipoOp === option
                      ? "color-mix(in srgb, var(--pwa-accent) 12%, transparent)"
                      : "var(--pwa-surface-2)",
                  border: `1px solid ${tipoOp === option ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
                  color:
                    tipoOp === option
                      ? "var(--pwa-accent)"
                      : "var(--pwa-muted)",
                  cursor: "pointer",
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: tipoOp === option ? 700 : 400,
                }}
              >
                {option}
              </button>
            ))}
          </div>

          {error ? (
            <p
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--pwa-danger)",
              }}
            >
              {error}
            </p>
          ) : null}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving || !hora || !razonSocial.trim()}
            className="flex h-13 w-full items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: "var(--pwa-accent)",
              color: "var(--pwa-accent-fg)",
              fontFamily: "var(--sg-font-mono)",
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              height: 52,
            }}
          >
            {saving ? (
              "Guardando..."
            ) : (
              <>
                <Calendar className="h-4 w-4" /> Programar cita
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function TabCitasSupervisor({
  citas,
  plantas,
  companyId,
  responsables,
  onActivate,
  onCancel,
  onRefresh,
}: {
  citas: (CitaRow & { planta: string })[];
  plantas: string[];
  companyId: string;
  responsables: string[];
  onActivate: (id: number) => void;
  onCancel: (id: number) => void;
  onRefresh: () => void;
}) {
  const [showLink, setShowLink] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterPlant, setFilter] = useState("Todos");
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const filtered =
    filterPlant === "Todos"
      ? citas
      : citas.filter((cita) => cita.planta === filterPlant);
  const retrasadas = filtered.filter((cita) => {
    const [h, m] = cita.horaCita.split(":").map(Number);
    return cita.estado === "esperado" && h * 60 + m < nowMin - 10;
  });
  const proximas = filtered.filter(
    (cita) => !retrasadas.includes(cita) && cita.estado === "esperado"
  );
  const llegaron = filtered.filter(
    (cita) => cita.estado === "activo" || cita.estado === "atendido"
  );
  const groups = [
    { key: "retrasadas", label: "Retrasadas", color: "#d35c4f", items: retrasadas },
    { key: "llegaron", label: "Llegaron", color: "#6ba7ff", items: llegaron },
    { key: "proximas", label: "Próximas", color: "#6bbd8a", items: proximas },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="mx-4 flex items-center justify-between">
        <div>
          <p
            style={{
              fontFamily: "var(--sg-font-display)",
              fontSize: 22,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              color: "var(--pwa-ink)",
              margin: 0,
              lineHeight: 1,
            }}
          >
            CITAS
          </p>
          <p
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "var(--pwa-muted)",
              margin: "4px 0 0",
            }}
          >
            {now.toLocaleDateString("es-PE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLink(true)}
            className="flex items-center gap-1.5 px-3 py-2"
            style={{
              background: "var(--pwa-surface-2)",
              border: "1px solid var(--pwa-border)",
              color: "var(--pwa-muted)",
              cursor: "pointer",
              borderRadius: 6,
              fontFamily: "var(--sg-font-mono)",
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            <QrCode className="h-4 w-4" /> Link
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2.5"
            style={{
              background: "var(--pwa-accent)",
              color: "var(--pwa-accent-fg)",
              border: "none",
              cursor: "pointer",
              borderRadius: 6,
              fontFamily: "var(--sg-font-mono)",
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            <Plus className="h-4 w-4" /> Nueva
          </motion.button>
        </div>
      </div>

      {plantas.length > 1 && (
        <div className="overflow-x-auto px-4 pb-1">
          <div className="flex gap-2">
            {["Todos", ...plantas].map((plant) => (
              <button
                key={plant}
                onClick={() => setFilter(plant)}
                className="shrink-0 px-3 py-1.5"
                style={{
                  background:
                    filterPlant === plant
                      ? "var(--pwa-accent)"
                      : "var(--pwa-surface-2)",
                  border: `1px solid ${filterPlant === plant ? "var(--pwa-accent)" : "var(--pwa-border)"}`,
                  color:
                    filterPlant === plant
                      ? "var(--pwa-accent-fg)"
                      : "var(--pwa-muted)",
                  cursor: "pointer",
                  borderRadius: 999,
                  fontFamily: "var(--sg-font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: filterPlant === plant ? 700 : 400,
                }}
              >
                {plant === "Todos"
                  ? "Todos"
                  : formatGateLabelFromPlant(plant)}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div
          className="mx-4 flex flex-col items-center gap-3 py-12"
          style={{ border: "1px dashed var(--pwa-border)" }}
        >
          <Calendar
            className="h-10 w-10 opacity-10"
            style={{ color: "var(--pwa-muted)" }}
          />
          <p
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--pwa-muted)",
            }}
          >
            Sin citas programadas
          </p>
          <button
            onClick={() => setShowForm(true)}
            style={{
              fontFamily: "var(--sg-font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--pwa-accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            + Programar la primera
          </button>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.key} className="mx-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-0.5" style={{ background: group.color }} />
            <span
              style={{
                fontFamily: "var(--sg-font-mono)",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: group.color,
              }}
            >
              {group.label} · {group.items.length}
            </span>
          </div>
          <div
            className="flex flex-col"
            style={{ border: "1px solid var(--pwa-border)" }}
          >
            {group.items.map((cita) => {
              const name =
                cita.razonSocial !== "—"
                  ? cita.razonSocial
                  : cita.empresa !== "—"
                    ? cita.empresa
                    : "Cita";
              return (
                <div
                  key={cita.id}
                  className="flex items-center gap-3 px-4 py-3.5"
                  style={{
                    borderBottom: "1px solid var(--pwa-border)",
                    background: "var(--pwa-surface)",
                  }}
                >
                  <div
                    className="flex h-11 w-14 shrink-0 items-center justify-center"
                    style={{
                      background: `${group.color}15`,
                      border: `1px solid ${group.color}40`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--sg-font-mono)",
                        fontSize: 13,
                        fontWeight: 700,
                        color: group.color,
                      }}
                    >
                      {cita.horaCita.slice(0, 5)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate"
                      style={{
                        fontFamily: "var(--sg-font-display)",
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "var(--pwa-ink)",
                        margin: 0,
                      }}
                    >
                      {name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      {cita.planta ? (
                        <span
                          style={{
                            fontFamily: "var(--sg-font-mono)",
                            fontSize: 8,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "var(--pwa-accent)",
                            opacity: 0.7,
                          }}
                        >
                          {formatGateLabelFromPlant(cita.planta)}
                        </span>
                      ) : null}
                      {cita.responsable ? (
                        <span
                          style={{
                            fontFamily: "var(--sg-font-mono)",
                            fontSize: 9,
                            color: "var(--pwa-muted)",
                          }}
                        >
                          {cita.responsable.split(" ")[0]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {cita.estado === "esperado" ? (
                      <>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onActivate(cita.id)}
                          className="flex items-center gap-1 px-2.5 py-2"
                          style={{
                            background: `${group.color}15`,
                            border: `1px solid ${group.color}50`,
                            color: group.color,
                            cursor: "pointer",
                            fontFamily: "var(--sg-font-mono)",
                            fontSize: 9,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Llegó
                        </motion.button>
                        <button
                          onClick={() => onCancel(cita.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--pwa-muted)",
                            padding: "4px",
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <span
                        className="flex items-center gap-1"
                        style={{
                          fontFamily: "var(--sg-font-mono)",
                          fontSize: 9,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "#6ba7ff",
                        }}
                      >
                        <Zap className="h-3 w-3" /> Activo
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {showLink ? (
        <LinkSheet
          plantas={
            plantas.length > 0
              ? plantas
              : [...new Set(citas.map((cita) => cita.planta).filter(Boolean))]
          }
          companyId={companyId}
          onClose={() => setShowLink(false)}
        />
      ) : null}

      {showForm ? (
        <NuevaCitaInline
          plantas={plantas}
          responsables={responsables}
          onSave={onRefresh}
          onClose={() => setShowForm(false)}
        />
      ) : null}
    </div>
  );
}
