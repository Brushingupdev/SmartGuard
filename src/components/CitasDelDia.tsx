"use client";

import { CalendarClock, LogIn, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { preRegisterCita, activateCita, cancelarCita, updateAtencion } from "@/app/actions";
import { humanizeError } from "@/lib/humanizeError";

export type CitaRow = {
  id: number;
  razonSocial: string;
  empresa: string;
  planta: string;
  fecha: string;
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
  const [formFecha, setFormFecha] = useState("");
  const [formResponsable, setFormResponsable] = useState("");
  const [formPending, setFormPending] = useState(false);
  const [activatingIds, setActivatingIds] = useState<Set<number>>(new Set());
  const [cancellingIds, setCancellingIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editHora, setEditHora] = useState("");
  const [editRazon, setEditRazon] = useState("");
  const [editEmpresa, setEditEmpresa] = useState("");
  const [editResponsable, setEditResponsable] = useState("");
  const [editTipo, setEditTipo] = useState("Proveedor");
  const [editTipoOperacion, setEditTipoOperacion] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);

  const handleEdit = async (id: number) => {
    setEditPending(true);
    const r = await updateAtencion(id, {
      razonSocial: editRazon || "Cita programada",
      empresa: editEmpresa || "—",
      type: editTipo,
      tipoOperacion: editTipoOperacion || "Carga",
      responsable: editResponsable || undefined,
      note: undefined,
      horaCita: editHora || null,
    });
    setEditPending(false);
    if (r.success) {
      onToast("Cita actualizada.");
      setEditingId(null);
      onRefresh();
    } else {
      onToast(humanizeError(r.error));
    }
  };

  const handlePreRegister = async () => {
    setFormPending(true);
    const r = await preRegisterCita({
      horaCita: formHora,
      fecha: formFecha || undefined,
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
      setFormFecha("");
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
              <label className="sg-label text-[11px]">Fecha (opcional, default hoy)</label>
              <input
                type="date"
                value={formFecha}
                onChange={(e) => setFormFecha(e.target.value)}
                className="sg-input text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
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
            const parts = c.horaCita.split(":").map(Number);
            const citaMin = parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])
              ? parts[0] * 60 + parts[1]
              : null;

            const todayStr = now.toISOString().substring(0, 10);
            const isToday = !c.fecha || c.fecha <= todayStr;

            const delayMin = isToday && citaMin !== null && citaMin < nowMin ? nowMin - citaMin : 0;
            const diff = citaMin !== null ? citaMin - nowMin : 0;

            const isLate = isToday && c.estado === "esperado" && delayMin >= 10;
            const isSoon = isToday && c.estado === "esperado" && !isLate && diff > 0 && diff <= 15;
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
            } else if (isToday && citaMin !== null) {
              if (diff < 0) {
                badge = "Hace " + Math.abs(diff) + " min";
                badgeColor = "var(--sg-muted)";
              } else {
                badge = "En " + diff + " min";
                badgeColor = "var(--sg-muted)";
              }
            } else {
              badge = "Programada";
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
                  {!isToday && c.fecha && (
                    <p className="text-[10px] text-[var(--sg-accent)]">
                      {c.fecha}
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
                      {editingId === c.id ? (
                        <div className="flex flex-col gap-1 w-[160px]">
                          <input
                            type="time"
                            value={editHora}
                            onChange={e => setEditHora(e.target.value)}
                            className="sg-input text-[10px] h-7"
                          />
                          <input
                            type="text"
                            value={editRazon}
                            onChange={e => setEditRazon(e.target.value.toUpperCase())}
                            placeholder="Razón social"
                            className="sg-input text-[10px] h-7 uppercase"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(c.id)}
                              disabled={editPending}
                              className="sg-font-mono text-[8px] uppercase bg-[var(--sg-accent)] text-[var(--sg-canvas)] px-2 py-1"
                            >
                              {editPending ? "..." : "Guardar"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="sg-font-mono text-[8px] uppercase text-[var(--sg-muted)] px-1 py-1"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(c.id);
                              setEditHora(c.horaCita);
                              setEditRazon(c.razonSocial !== "—" ? c.razonSocial : "");
                              setEditEmpresa(c.empresa !== "—" ? c.empresa : "");
                              setEditResponsable(c.responsable || "");
                              setEditTipo(c.tipo || "Proveedor");
                              setEditTipoOperacion(c.tipoOperacion);
                            }}
                            className="text-[10px] text-[var(--sg-muted)] hover:text-[var(--sg-accent)] px-1.5 py-1.5"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
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
                      )}  // close inner Fragment, close ternary
                    </>     // close outer Fragment
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
