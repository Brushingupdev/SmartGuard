"use client";

import { Calendar, ChevronDown, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { preRegisterCita, activateCita, cancelarCita, updateAtencion } from "@/app/actions";
import { humanizeError } from "@/lib/humanizeError";
import { formatGateLabelFromPlant } from "@/lib/gates";

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
  const [expanded, setExpanded] = useState(citas.length > 0);
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

  const groupedCitas = citas.reduce<Record<"retrasadas" | "proximas" | "activas", CitaRow[]>>((acc, cita) => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const parts = cita.horaCita.split(":").map(Number);
    const citaMin = parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])
      ? parts[0] * 60 + parts[1]
      : null;
    const todayStr = now.toISOString().substring(0, 10);
    const isToday = !cita.fecha || cita.fecha <= todayStr;
    const delayMin = isToday && citaMin !== null && citaMin < nowMin ? nowMin - citaMin : 0;

    if (cita.estado === "activo") acc.activas.push(cita);
    else if (cita.estado === "esperado" && delayMin >= 10) acc.retrasadas.push(cita);
    else acc.proximas.push(cita);
    return acc;
  }, { retrasadas: [], proximas: [], activas: [] });

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

  const sectionMeta = `${formatGateLabelFromPlant(plant)} · ${citas.length} cita${citas.length !== 1 ? "s" : ""}`;
  const summaryCounts = [
    { label: "Próximas", value: groupedCitas.proximas.length, color: "var(--sg-success)" },
    { label: "Llegaron", value: groupedCitas.activas.length, color: "#6ba7ff" },
    { label: "Retrasadas", value: groupedCitas.retrasadas.length, color: "var(--sg-danger)" },
  ];

  return (
    <section className="sg-panel p-4">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={expanded}
        >
          <div className="flex h-9 w-9 items-center justify-center bg-[var(--sg-panel-2)] text-[var(--sg-copy)]">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="sg-font-display text-[15px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
              Citas del Día
            </h2>
            <p className="truncate text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
              {sectionMeta}
            </p>
          </div>
          <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-[var(--sg-muted)] transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setExpanded(true);
          }}
          className="flex items-center gap-1.5 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-1.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {showForm ? "Cerrar" : "Agregar cita"}
        </button>
      </div>

      {!expanded && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {summaryCounts.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setExpanded(true)}
              className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-2 text-left transition-colors hover:border-[var(--sg-accent)]"
            >
              <div className="sg-font-mono text-[8px] uppercase tracking-widest" style={{ color: item.color }}>
                {item.label}
              </div>
              <div className="mt-1 text-[16px] font-bold text-[var(--sg-ink)]">{item.value}</div>
            </button>
          ))}
        </div>
      )}

      {expanded && showForm && (
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

      {expanded && <div className="mt-3 grid max-h-[460px] gap-3 overflow-y-auto pr-1">
        {[
          { key: "proximas", label: "Próximas", data: groupedCitas.proximas, color: "var(--sg-success)" },
          { key: "activas", label: "Llegaron", data: groupedCitas.activas, color: "#6ba7ff" },
          { key: "retrasadas", label: "Retrasadas", data: groupedCitas.retrasadas, color: "var(--sg-danger)" },
        ].map((group) => (
          <div key={group.key} className="mb-2">
            <div className="flex items-center justify-between border-b border-[var(--sg-line)] pb-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="h-4 w-[2px]" style={{ backgroundColor: group.color }} />
                <span className="sg-font-mono text-[9px] uppercase tracking-widest" style={{ color: group.color }}>
                  {group.label}
                </span>
              </div>
              <span className="sg-font-mono text-[9px] text-[var(--sg-muted)]">
                {group.data.length}
              </span>
            </div>
            {group.data.length === 0 ? (
              <div className="py-2.5 px-3 text-[10px] text-[var(--sg-muted)] sg-font-mono uppercase tracking-widest">
                Sin registros
              </div>
            ) : (
              <div className="flex flex-col gap-1 mt-2">
                {group.data.map((c) => {
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

              if (isLate) {
              } else if (isSoon) {
              } else if (isActive) {
              } else if (isToday && citaMin !== null) {
              } else {
              }

              const displayName = c.razonSocial !== "—"
                ? c.razonSocial
                : c.empresa !== "—"
                ? c.empresa
                : c.responsable || "Cita programada";

              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 border border-[var(--sg-line)] bg-[rgba(255,255,255,0.01)] px-3 py-2.5"
                >
                  <div
                    className="flex h-8 w-[50px] shrink-0 items-center justify-center border sg-font-mono text-[13px] font-bold"
                    style={{
                      color: group.color,
                      borderColor: `${group.color}55`,
                      background: `${group.color}14`,
                    }}
                  >
                    {c.horaCita}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[var(--sg-ink)]">
                      {displayName}
                    </p>
                    <div className="flex items-center gap-2 truncate text-[10px] text-[var(--sg-muted)]">
                      <span>{formatGateLabelFromPlant(c.planta || plant)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden text-right text-[11px] text-[var(--sg-muted)] md:block">
                      <div>{c.tipo || "Proveedor"}</div>
                      <div>{c.tipoOperacion || "Carga"}</div>
                    </div>
                    {isLate ? (
                      <span className="sg-font-mono text-[12px] font-bold text-[var(--sg-danger)]">+{delayMin} min</span>
                    ) : null}
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
                          <div className="flex items-center gap-1">
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
                              className="text-[10px] text-[var(--sg-muted)] hover:text-[var(--sg-accent)] px-1 py-1"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleActivate(c.id)}
                              disabled={activatingIds.has(c.id)}
                              className={`sg-font-mono text-[9px] uppercase tracking-widest px-2 py-1 transition-opacity disabled:opacity-50 ${
                                isLate
                                  ? "bg-[var(--sg-danger)] text-[var(--sg-canvas)] hover:opacity-90"
                                  : "bg-[var(--sg-accent)] text-[var(--sg-canvas)] hover:opacity-90"
                              }`}
                            >
                              {activatingIds.has(c.id) ? "..." : isLate ? "Llegó ahora" : "Llegó"}
                            </button>
                            <button
                              onClick={() => handleCancel(c.id)}
                              disabled={cancellingIds.has(c.id)}
                              className="text-[10px] text-[var(--sg-muted)] hover:text-[var(--sg-danger)] px-1 py-1 disabled:opacity-30"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
              </div>
            )}
          </div>
        ))}
      </div>}
    </section>
  );
}
