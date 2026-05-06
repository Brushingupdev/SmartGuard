"use client";

import { CalendarClock, LogIn, Plus, X } from "lucide-react";
import { useState } from "react";
import { preRegisterCita, activateCita, cancelarCita } from "@/app/actions";
import { humanizeError } from "@/lib/humanizeError";

export type CitaRow = {
  id: number;
  razonSocial: string;
  empresa: string;
  planta: string;
  horaCita: string;
  hRegistro: string | null;
  hAtencion: string | null;
  tipo: string;
  tipoOperacion: string | null;
  responsable: string | null;
  agente: string | null;
  observacion: string | null;
  estado: "esperado" | "activo" | "atendido";
  esperaMin: number | null;
};

interface Props {
  plant: string;
  citas: CitaRow[];
  onToast: (msg: string) => void;
  onRefresh: () => void;
}

export default function CitasDelDia({ plant, citas, onToast, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formRazon, setFormRazon] = useState("");
  const [formEmpresa, setFormEmpresa] = useState("");
  const [formHora, setFormHora] = useState("");
  const [formResponsable, setFormResponsable] = useState("");
  const [formPending, setFormPending] = useState(false);
  const [activatingIds, setActivatingIds] = useState<Set<number>>(new Set());
  const [cancellingIds, setCancellingIds] = useState<Set<number>>(new Set());

  const handlePreRegister = async () => {
    setFormPending(true);
    const r = await preRegisterCita({
      horaCita: formHora,
      plant,
      razonSocial: formRazon,
      empresa: formEmpresa,
      responsable: formResponsable,
    });
    setFormPending(false);
    if (r.success) {
      onToast("Cita programada correctamente.");
      setFormRazon("");
      setFormEmpresa("");
      setFormHora("");
      setFormResponsable("");
      setShowForm(false);
      onRefresh();
    } else {
      onToast(humanizeError(r.error));
    }
  };

  const handleActivate = async (id: number) => {
    setActivatingIds((prev) => new Set(prev).add(id));
    const r = await activateCita({ id });
    setActivatingIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
    if (r.success) {
      onToast("Vehículo registrado. Llegada confirmada.");
      onRefresh();
    } else {
      onToast(humanizeError(r.error));
    }
  };

  const handleCancel = async (id: number) => {
    setCancellingIds((prev) => new Set(prev).add(id));
    const r = await cancelarCita(id);
    setCancellingIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
    if (r.success) {
      onRefresh();
    } else {
      onToast(humanizeError(r.error));
    }
  };

  return (
    <section className="sg-panel p-4 sm:p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--sg-line)] pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-[var(--sg-panel-2)] text-[var(--sg-accent)]">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <h2 className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
              Citas del Día
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
              {plant} · {citas.length} cita{citas.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-1.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {showForm ? "Cerrar" : "Agregar cita"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sg-field">
              <label className="sg-label text-[11px]">Hora de cita *</label>
              <input
                type="time"
                value={formHora}
                onChange={(e) => setFormHora(e.target.value)}
                className="sg-input text-sm"
              />
            </div>
            <div className="sg-field">
              <label className="sg-label text-[11px]">Razón Social</label>
              <input
                type="text"
                value={formRazon}
                onChange={(e) => setFormRazon(e.target.value.toUpperCase())}
                className="sg-input text-sm uppercase"
                placeholder="Ej: TRANSP. PIMENTEL"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sg-field">
              <label className="sg-label text-[11px]">Empresa Destino</label>
              <input
                type="text"
                value={formEmpresa}
                onChange={(e) => setFormEmpresa(e.target.value.toUpperCase())}
                className="sg-input text-sm uppercase"
                placeholder="Ej: ALICORP"
              />
            </div>
            <div className="sg-field">
              <label className="sg-label text-[11px]">Responsable</label>
              <input
                type="text"
                value={formResponsable}
                onChange={(e) => setFormResponsable(e.target.value.toUpperCase())}
                className="sg-input text-sm uppercase"
                placeholder="Nombre"
              />
            </div>
          </div>
          <button
            onClick={handlePreRegister}
            disabled={
              !formHora ||
              (!formRazon && !formEmpresa && !formResponsable) ||
              formPending
            }
            className="sg-btn sg-btn-accent w-full h-10 text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {formPending ? "Programando..." : "Programar cita"}
          </button>
        </div>
      )}

      {citas.length === 0 ? (
        <p className="text-[12px] text-[var(--sg-muted)] py-2">
          No hay citas programadas para hoy en {plant}.
        </p>
      ) : (
        <div className="grid gap-2 max-h-[340px] overflow-y-auto">
          {citas.map((c) => {
            const now = new Date();
            const nowMin = now.getHours() * 60 + now.getMinutes();
            const [ch, cm] = c.horaCita.split(":").map(Number);
            const citaMin = ch * 60 + cm;
            const delayMin = citaMin < nowMin ? nowMin - citaMin : 0;
            const diff = citaMin - nowMin;

            const isLate = c.estado === "esperado" && delayMin >= 10;
            const isSoon = c.estado === "esperado" && !isLate && diff <= 15 && diff > 0;
            const isActive = c.estado === "activo";

            let badge = "";
            let badgeColor = "";
            if (isLate) {
              badge = delayMin + " min de retraso";
              badgeColor = "var(--sg-danger)";
            } else if (isSoon) {
              badge = "En " + diff + " min";
              badgeColor = "var(--sg-warn)";
            } else if (isActive) {
              badge = "Llegó";
              badgeColor = "var(--sg-success)";
            } else {
              badge = "En " + diff + " min";
              badgeColor = "var(--sg-muted)";
            }

            return (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 border border-[var(--sg-line)] p-3 bg-[var(--sg-panel-2)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="sg-font-mono text-[13px] font-bold text-[var(--sg-ink)]">
                      {c.horaCita}
                    </span>
                    {isActive && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--sg-success)]">
                        <LogIn className="h-3 w-3" /> Activo
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] font-semibold text-[var(--sg-ink)] truncate">
                    {c.razonSocial !== "—"
                      ? c.razonSocial
                      : c.empresa !== "—"
                      ? c.empresa
                      : c.responsable || "Cita programada"}
                  </p>
                  {c.razonSocial !== "—" && c.empresa !== "—" && (
                    <p className="text-[11px] text-[var(--sg-muted)] truncate">
                      {c.empresa}
                    </p>
                  )}
                  {c.responsable && (
                    <p className="text-[10px] text-[var(--sg-muted)]">
                      {c.responsable}
                    </p>
                  )}
                  <span
                    className="inline-block mt-1 sg-font-mono text-[9px] uppercase tracking-widest"
                    style={{ color: badgeColor }}
                  >
                    {badge}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {c.estado === "esperado" && (
                    <>
                      <button
                        onClick={() => handleActivate(c.id)}
                        disabled={activatingIds.has(c.id)}
                        className="sg-font-mono text-[9px] uppercase tracking-widest bg-[var(--sg-accent)] text-[var(--sg-canvas)] px-2.5 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {activatingIds.has(c.id) ? "..." : "Llegó"}
                      </button>
                      <button
                        onClick={() => handleCancel(c.id)}
                        disabled={cancellingIds.has(c.id)}
                        className="text-[10px] text-[var(--sg-muted)] hover:text-[var(--sg-danger)] px-1.5 py-1.5 disabled:opacity-30"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
