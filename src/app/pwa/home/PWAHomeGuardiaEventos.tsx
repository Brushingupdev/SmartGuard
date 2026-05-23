"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Camera, CheckCircle2, Search, Send, X } from "lucide-react";
import { crearGuardiaEvento, type GuardiaEvento } from "@/app/actions";
import type { GateAssignment } from "@/lib/gates";
import { PlantScopeSelector, ScreenHeader } from "./PWAHomeGuardiaShared";
import { humanizeError } from "@/lib/humanizeError";

const TIPO_OPTIONS = [
  { key: "incidente", label: "Incidente", color: "#d4864a", desc: "Situación anormal" },
  { key: "novedad", label: "Novedad", color: "#6ba7ff", desc: "Observación del turno" },
] as const;

export function TabEventos({
  eventos,
  agente,
  planta,
  plants,
  gateOptions,
  onRefresh,
  onPlantChange,
}: {
  eventos: GuardiaEvento[];
  agente: string;
  planta: string;
  plants: string[];
  gateOptions: GateAssignment[];
  onRefresh: () => void;
  onPlantChange: (plant: string) => void;
}) {
  const [tipo, setTipo] = useState<"incidente" | "novedad">("incidente");
  const [urgent, setUrgent] = useState(false);
  const [desc, setDesc] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "incidente" | "novedad" | "urgentes">("todos");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const clearPhoto = useCallback(() => {
    setPhotoPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setPhotoBase64(null);
    setPhotoMimeType(null);
    setProcessingPhoto(false);
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const handleSend = async () => {
    if (!desc.trim()) return;
    setSending(true);
    setSendError(null);
    const result = await crearGuardiaEvento({
      tipo,
      urgente: urgent,
      descripcion: desc.trim(),
      foto_base64: photoBase64,
      foto_mime_type: photoMimeType,
      agente,
      planta,
    });
    setSending(false);
    if (result.success) {
      setDesc("");
      setUrgent(false);
      clearPhoto();
      setSent(true);
      setTimeout(() => setSent(false), 2500);
      onRefresh();
      return;
    }
    setSendError(humanizeError(result.error));
  };

  function fmtEvento(ts: string): string {
    return new Date(ts).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  }

  const plantEvents = eventos.filter((event) => event.planta === planta);
  const searchTerm = search.trim().toLowerCase();
  const filteredEvents = plantEvents.filter((event) => {
    if (filter === "urgentes" && !event.urgente && event.tipo !== "emergencia") return false;
    if (filter !== "todos" && filter !== "urgentes" && event.tipo !== filter) return false;
    if (!searchTerm) return true;
    return [event.descripcion, event.agente, event.tipo, event.planta].some((value) =>
      value?.toLowerCase().includes(searchTerm),
    );
  });
  const eventCounters = {
    incidentes: plantEvents.filter((event) => event.tipo === "incidente").length,
    novedades: plantEvents.filter((event) => event.tipo === "novedad").length,
    urgentes: plantEvents.filter((event) => event.urgente || event.tipo === "emergencia").length,
  };

  return (
    <div className="flex flex-col gap-4 mx-4">
      <ScreenHeader tab="eventos" title="Bitácora" />
      <PlantScopeSelector
        plants={plants}
        activePlant={planta}
        gateOptions={gateOptions}
        onChange={onPlantChange}
      />

      <div
        className="flex flex-col gap-3 p-4"
        style={{ background: "var(--pwa-surface)", border: "1px solid var(--pwa-border)", borderRadius: 14 }}
      >
        <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 15, fontWeight: 700, color: "var(--pwa-ink)", margin: 0 }}>
          Nuevo incidente
        </p>

        <div className="flex gap-2">
          {TIPO_OPTIONS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTipo(item.key)}
              className="flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-all"
              style={{
                background: tipo === item.key ? `${item.color}18` : "var(--pwa-surface-2)",
                border: `1px solid ${tipo === item.key ? item.color : "var(--pwa-border)"}`,
                cursor: "pointer",
              }}
            >
              <span style={{ fontFamily: "var(--sg-font-display)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: tipo === item.key ? item.color : "var(--pwa-ink-soft)" }}>
                {item.label}
              </span>
              <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
                {item.desc}
              </span>
            </button>
          ))}
        </div>

        <textarea
          value={desc}
          onChange={(event) => {
            setDesc(event.target.value);
            if (sendError) setSendError(null);
          }}
          placeholder="Describe lo que ocurrió..."
          rows={3}
          className="w-full outline-none resize-none p-3 text-[14px]"
          style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)", color: "var(--pwa-ink)", fontFamily: "var(--sg-font-body)" }}
          onFocus={(event) => (event.target.style.borderColor = tipo === "incidente" ? "#d4864a" : "#6ba7ff")}
          onBlur={(event) => (event.target.style.borderColor = "var(--pwa-border)")}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 transition-opacity active:opacity-60"
            style={{ background: "var(--pwa-surface-2)", border: "1px dashed var(--pwa-border)", color: "var(--pwa-muted)", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
            <Camera className="h-3.5 w-3.5" />
            {processingPhoto ? "Procesando..." : photoPreviewUrl ? "Foto ✓" : "Adjuntar foto"}
          </button>
          {photoPreviewUrl ? (
            <button
              onClick={clearPhoto}
              style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, color: "var(--pwa-danger)", letterSpacing: "0.1em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer" }}
            >
              Eliminar
            </button>
          ) : null}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) {
                clearPhoto();
                setProcessingPhoto(true);
                setPhotoMimeType(file.type || "image/jpeg");
                setPhotoPreviewUrl(URL.createObjectURL(file));
                try {
                  const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = typeof reader.result === "string" ? reader.result : "";
                      const payload = result.split(",")[1];
                      if (!payload) {
                        reject(new Error("No se pudo leer la imagen."));
                        return;
                      }
                      resolve(payload);
                    };
                    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen."));
                    reader.readAsDataURL(file);
                  });
                  setPhotoBase64(base64);
                } catch {
                  clearPhoto();
                } finally {
                  setProcessingPhoto(false);
                }
              }
              event.target.value = "";
            }}
          />
        </div>

        {photoPreviewUrl ? (
          <div className="relative overflow-hidden" style={{ border: "1px solid var(--pwa-border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreviewUrl} alt="evidencia" className="h-28 w-full object-cover" />
            <button
              onClick={clearPhoto}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center"
              style={{ background: "rgba(0,0,0,0.72)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer" }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}

        {sendError ? (
          <div
            className="px-3 py-2"
            style={{ background: "color-mix(in srgb, var(--pwa-danger) 10%, transparent)", borderLeft: "3px solid var(--pwa-danger)", color: "var(--pwa-danger)", fontFamily: "var(--sg-font-body)", fontSize: 12 }}
          >
            {sendError}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 14, fontWeight: 700, margin: 0, color: "var(--pwa-ink)" }}>
              ¿Urgente?
            </p>
            <p style={{ fontFamily: "var(--sg-font-body)", fontSize: 12, margin: "4px 0 0", color: "var(--pwa-ink-soft)" }}>
              Marcar si requiere atención inmediata
            </p>
          </div>
          <button
            onClick={() => setUrgent((current) => !current)}
            className="relative h-7 w-12 rounded-full"
            style={{ background: urgent ? "#d35c4f" : "rgba(255,255,255,0.12)", border: "none", cursor: "pointer" }}
          >
            <span className="absolute top-[2px] h-6 w-6 rounded-full bg-white transition-all" style={{ left: urgent ? 22 : 2 }} />
          </button>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSend}
          disabled={sending || processingPhoto || !desc.trim()}
          className="w-full h-12 flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          style={{ background: sent ? "#6bbd8a" : urgent ? "#d35c4f" : TIPO_OPTIONS.find((item) => item.key === tipo)?.color, color: "#000", border: "none", cursor: "pointer", fontFamily: "var(--sg-font-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700 }}
        >
          {sent ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Reportado
            </>
          ) : sending ? (
            "Enviando..."
          ) : processingPhoto ? (
            "Procesando foto..."
          ) : (
            <>
              <Send className="h-4 w-4" /> Enviar reporte
            </>
          )}
        </motion.button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Incidentes", value: eventCounters.incidentes, color: "#d4864a" },
          { label: "Novedades", value: eventCounters.novedades, color: "#6ba7ff" },
          { label: "Urgentes", value: eventCounters.urgentes, color: "#d35c4f" },
        ].map((item) => (
          <div key={item.label} className="px-3 py-3" style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)" }}>
            <p style={{ fontFamily: "var(--sg-font-display)", fontSize: 22, fontWeight: 800, color: item.color, margin: 0, lineHeight: 1 }}>
              {item.value}
            </p>
            <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 7, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--pwa-muted)", margin: "6px 0 0" }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "todos", label: "Todos" },
          { key: "incidente", label: "Incidentes" },
          { key: "novedad", label: "Novedades" },
          { key: "urgentes", label: "Urgentes" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key as "todos" | "incidente" | "novedad" | "urgentes")}
            className="shrink-0 px-3 py-1.5 transition-all"
            style={{ background: filter === item.key ? "var(--pwa-accent)" : "var(--pwa-surface-2)", border: `1px solid ${filter === item.key ? "var(--pwa-accent)" : "var(--pwa-border)"}`, color: filter === item.key ? "var(--pwa-accent-fg)" : "var(--pwa-muted)", cursor: "pointer", borderRadius: 999, fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: filter === item.key ? 700 : 400 }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3" style={{ background: "var(--pwa-surface-2)", border: "1px solid var(--pwa-border)", minHeight: 44 }}>
        <Search className="h-4 w-4 shrink-0" style={{ color: "var(--pwa-muted)" }} />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar en bitácora"
          className="h-11 flex-1 bg-transparent outline-none"
          style={{ color: "var(--pwa-ink)", fontFamily: "var(--sg-font-body)", fontSize: 13 }}
        />
        {search ? (
          <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--pwa-muted)", cursor: "pointer" }}>
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {filteredEvents.length > 0 ? (
        <div>
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--pwa-muted)", marginBottom: 8 }}>
            Historial reciente
          </p>
          <div className="flex flex-col" style={{ border: "1px solid var(--pwa-border)" }}>
            {filteredEvents.map((event) => {
              const color = event.urgente || event.tipo === "emergencia" ? "#d35c4f" : event.tipo === "incidente" ? "#d4864a" : "#6ba7ff";
              return (
                <div key={event.id} className="flex gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--pwa-border)", background: "var(--pwa-surface)" }}>
                  <div className="w-0.5 shrink-0 rounded-full" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color, fontWeight: 600 }}>
                        {event.urgente && event.tipo !== "emergencia" ? `${event.tipo} · urgente` : event.tipo}
                      </span>
                      <span style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, color: "var(--pwa-muted)" }}>
                        {fmtEvento(event.created_at)}
                      </span>
                    </div>
                    <p style={{ fontFamily: "var(--sg-font-body)", fontSize: 13, color: "var(--pwa-ink)", margin: 0 }}>
                      {event.descripcion}
                    </p>
                    {event.foto_url ? (
                      <div className="mt-3 overflow-hidden rounded-sm" style={{ border: "1px solid var(--pwa-border)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={event.foto_url} alt="Evidencia del evento" className="h-28 w-full object-cover" />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-10" style={{ opacity: 0.5 }}>
          <BookOpen className="h-8 w-8" style={{ color: "var(--pwa-muted)" }} />
          <p style={{ fontFamily: "var(--sg-font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--pwa-muted)" }}>
            {plantEvents.length === 0 ? "Sin reportes hoy" : "Sin coincidencias"}
          </p>
        </div>
      )}
    </div>
  );
}
