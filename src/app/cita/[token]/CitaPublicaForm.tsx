"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Building2, Calendar, CheckCircle2, ChevronDown,
  Clock, Send, Truck,
} from "lucide-react";
import { submitCitaPublica } from "@/app/actions/citas-public";

interface Props {
  companyId: string;
  companyName: string;
  plant: string;
  gateLabel: string;
  responsables: string[];
}

const TIPOS = ["Carga", "Descarga", "Servicio", "Otro"] as const;

export default function CitaPublicaForm({
  companyId, companyName, plant, gateLabel, responsables,
}: Props) {
  const [razonSocial, setRazonSocial] = useState("");
  const [horaCita, setHoraCita]       = useState("");
  const [fecha, setFecha]             = useState("");
  const [tipo, setTipo]               = useState<string>("Descarga");
  const [responsable, setResponsable] = useState(responsables[0] ?? "");
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving]           = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!razonSocial.trim()) { setError("Ingresa tu razón social"); return; }
    if (!horaCita) { setError("Ingresa la hora de llegada"); return; }

    setSaving(true);
    const result = await submitCitaPublica({
      companyId,
      plant,
      horaCita,
      fecha: fecha || undefined,
      razonSocial: razonSocial.trim(),
      tipoOperacion: tipo,
      responsable: responsable || undefined,
      observacion: observacion.trim() || undefined,
    });
    setSaving(false);

    if (result.success) setDone(true);
    else setError(result.error ?? "Error al enviar. Intenta de nuevo.");
  };

  if (done) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ background: "#0d0f0e", color: "#e8e4da" }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-6 text-center max-w-xs"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "rgba(107,189,138,0.12)", border: "2px solid #6bbd8a" }}
          >
            <CheckCircle2 className="h-10 w-10" style={{ color: "#6bbd8a" }} />
          </motion.div>

          <div>
            <h1 style={{ fontFamily: "var(--sg-font-display)", fontSize: 22, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "-0.01em", margin: "0 0 8px" }}>
              ¡Cita registrada!
            </h1>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "#9a9589", lineHeight: 1.8 }}>
              Tu visita ha sido programada en <strong style={{ color: "#c8a84b" }}>{gateLabel}</strong>.
              El guardia de portería ya tiene tu información.
            </p>
          </div>

          <div className="w-full p-4" style={{
            background: "rgba(200,168,75,0.08)", border: "1px solid rgba(200,168,75,0.3)"
          }}>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.16em",
              textTransform: "uppercase", color: "#c8a84b", margin: "0 0 4px" }}>
              Recuerda
            </p>
            <p style={{ fontFamily: "var(--sg-font-body)", fontSize: 13, color: "#b0aa9e", margin: 0 }}>
              Preséntate a la hora indicada con tu DNI o documentos del vehículo.
            </p>
          </div>

          <button
            onClick={() => { setDone(false); setRazonSocial(""); setHoraCita(""); setFecha(""); setObservacion(""); }}
            style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "#9a9589", background: "none", border: "none",
              cursor: "pointer" }}
          >
            Registrar otra cita
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0d0f0e", color: "#e8e4da" }}
    >
      {/* Header */}
      <div className="px-5 pt-10 pb-6"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center"
            style={{ background: "rgba(200,168,75,0.12)", border: "1px solid rgba(200,168,75,0.3)" }}>
            <Truck className="h-5 w-5" style={{ color: "#c8a84b" }} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.22em",
              textTransform: "uppercase", color: "#c8a84b", margin: 0 }}>
              Portal de citas
            </p>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 13, fontWeight: 700,
              textTransform: "uppercase", color: "#e8e4da", margin: "2px 0 0" }}>
              {companyName}
            </p>
          </div>
        </div>

        <h1 style={{ fontFamily: "var(--sg-font-display)", fontSize: 26, fontWeight: 800,
          textTransform: "uppercase", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
          Programar visita
        </h1>
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#c8a84b" }} />
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 10, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "#c8a84b", margin: 0 }}>
            {gateLabel}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex-1 px-5 py-6 flex flex-col gap-5 max-w-lg w-full mx-auto">

        {/* Razón social */}
        <div className="flex flex-col gap-2">
          <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "#6b6760" }}>
            Razón social / Nombre de empresa *
          </label>
          <input
            type="text"
            value={razonSocial}
            onChange={e => setRazonSocial(e.target.value.toUpperCase())}
            placeholder="TRANSPORTES XYZ SAC..."
            className="w-full h-13 px-4 outline-none text-[15px] font-bold uppercase"
            style={{ background: "#161918", border: "1px solid #2a2d2b",
              color: "#e8e4da", fontFamily: "var(--sg-font-display)", height: 52 }}
            onFocus={e => e.target.style.borderColor = "#c8a84b"}
            onBlur={e => e.target.style.borderColor = "#2a2d2b"}
          />
        </div>

        {/* Hora + Fecha */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-2 flex-1">
            <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "#6b6760" }}>
              <Clock className="inline h-3 w-3 mr-1" />Hora de llegada *
            </label>
            <input
              type="time"
              value={horaCita}
              onChange={e => setHoraCita(e.target.value)}
              className="w-full h-13 px-4 outline-none text-[16px] font-bold"
              style={{ background: "#161918", border: "1px solid #2a2d2b",
                color: "#e8e4da", fontFamily: "var(--sg-font-mono)", height: 52 }}
              onFocus={e => e.target.style.borderColor = "#c8a84b"}
              onBlur={e => e.target.style.borderColor = "#2a2d2b"}
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "#6b6760" }}>
              <Calendar className="inline h-3 w-3 mr-1" />Fecha (hoy si vacío)
            </label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full h-13 px-4 outline-none text-[13px]"
              style={{ background: "#161918", border: "1px solid #2a2d2b",
                color: "#e8e4da", fontFamily: "var(--sg-font-mono)", height: 52 }}
              onFocus={e => e.target.style.borderColor = "#c8a84b"}
              onBlur={e => e.target.style.borderColor = "#2a2d2b"}
            />
          </div>
        </div>

        {/* Tipo operación */}
        <div className="flex flex-col gap-2">
          <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "#6b6760" }}>
            Tipo de operación
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TIPOS.map(t => (
              <button key={t} onClick={() => setTipo(t)}
                className="py-2.5 transition-all"
                style={{
                  background: tipo === t ? "rgba(200,168,75,0.1)" : "#161918",
                  border: `1px solid ${tipo === t ? "#c8a84b" : "#2a2d2b"}`,
                  color: tipo === t ? "#c8a84b" : "#6b6760",
                  cursor: "pointer",
                  fontFamily: "var(--sg-font-mono)", fontSize: 9,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  fontWeight: tipo === t ? 700 : 400,
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Responsable */}
        {responsables.length > 0 && (
          <div className="flex flex-col gap-2">
            <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
              textTransform: "uppercase", color: "#6b6760" }}>
              Responsable de almacén
            </label>
            <div className="relative">
              <select
                value={responsable}
                onChange={e => setResponsable(e.target.value)}
                className="w-full h-13 px-4 outline-none appearance-none text-[14px]"
                style={{ background: "#161918", border: "1px solid #2a2d2b",
                  color: "#e8e4da", fontFamily: "var(--sg-font-display)",
                  fontWeight: 700, textTransform: "uppercase", height: 52 }}
                onFocus={e => e.target.style.borderColor = "#c8a84b"}
                onBlur={e => e.target.style.borderColor = "#2a2d2b"}
              >
                <option value="">Sin preferencia</option>
                {responsables.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "#6b6760" }} />
            </div>
          </div>
        )}

        {/* Observación */}
        <div className="flex flex-col gap-2">
          <label style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "#6b6760" }}>
            Observaciones (opcional)
          </label>
          <textarea
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
            placeholder="Número de orden, instrucciones especiales..."
            rows={3}
            className="w-full p-4 outline-none resize-none text-[14px]"
            style={{ background: "#161918", border: "1px solid #2a2d2b",
              color: "#e8e4da", fontFamily: "var(--sg-font-body)" }}
            onFocus={e => e.target.style.borderColor = "#c8a84b"}
            onBlur={e => e.target.style.borderColor = "#2a2d2b"}
          />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ fontFamily: "var(--sg-font-mono)", fontSize: 11,
                letterSpacing: "0.1em", textTransform: "uppercase", color: "#d35c4f" }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
          style={{
            background: "#c8a84b", color: "#0d0f0e",
            border: "none", cursor: "pointer",
            fontFamily: "var(--sg-font-mono)", fontSize: 12,
            letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700,
            height: 56,
          }}
        >
          {saving ? "Enviando..." : <><Send className="h-4 w-4" /> Registrar cita</>}
        </motion.button>

        <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#3d4040", textAlign: "center" }}>
          Powered by SmartGuard · Sistema de control de acceso
        </p>
      </div>
    </div>
  );
}
