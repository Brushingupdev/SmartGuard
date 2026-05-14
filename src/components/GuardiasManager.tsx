"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2, Clock, KeyRound, Pencil, Plus,
  Save, Shield, Trash2, UserCheck, X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  getAgentesPerfiles,
  updateAgentePerfil,
  setAgentePIN,
  removeAgentePIN,
  addAgente,
  removeAgente,
  type AgentePerfilRow,
} from "@/app/actions";

const TURNOS = ["Día", "Tarde", "Noche"];
const AVATAR_COLORS = ["#c8a84b", "#6bbd8a", "#6ba7ff", "#d4864a", "#b07fff", "#d35c4f"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(nombre: string): string {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function formatAcceso(ts: string | null): string {
  if (!ts) return "Nunca";
  const d = new Date(ts);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ── PIN Modal ─────────────────────────────────────────────────────────────────

function PINModal({
  guardia,
  onSave,
  onCancel,
}: {
  guardia: AgentePerfilRow;
  onSave: (pin: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (pin.length !== 4) { setError("El PIN debe tener 4 dígitos"); return; }
    if (pin !== confirm)  { setError("Los PINs no coinciden"); return; }
    setSaving(true);
    await onSave(pin);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.78)] backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[380px] border border-[var(--sg-accent)] bg-[var(--sg-panel)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--sg-line)] px-5 py-4">
          <KeyRound className="h-4 w-4 text-[var(--sg-accent)]" />
          <span className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
            Configurar PIN — {guardia.nombre.split(" ")[0]}
          </span>
          <button onClick={onCancel} className="ml-auto text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <p className="text-[12px] text-[var(--sg-muted)]">
            El guardia usará este PIN de 4 dígitos para identificarse en la app y la plataforma web.
          </p>

          <div className="sg-field">
            <label className="sg-label">Nuevo PIN *</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(null); }}
              placeholder="••••"
              className="sg-input text-center text-[24px] tracking-[0.5em] font-bold"
            />
          </div>

          <div className="sg-field">
            <label className="sg-label">Confirmar PIN *</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, "")); setError(null); }}
              placeholder="••••"
              className="sg-input text-center text-[24px] tracking-[0.5em] font-bold"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[12px] text-[var(--sg-danger)] border-l-2 border-[var(--sg-danger)] pl-3 py-1">
              <X className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}

          {pin.length === 4 && confirm.length === 4 && pin === confirm && (
            <div className="flex items-center gap-2 text-[12px] text-[var(--sg-success)] border-l-2 border-[var(--sg-success)] pl-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> PINs coinciden
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="sg-btn sg-btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving || pin.length !== 4 || pin !== confirm}
              className="sg-btn sg-btn-accent flex-1 justify-center disabled:opacity-40"
            >
              {saving ? (
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                  <Save className="h-4 w-4" />
                </motion.span>
              ) : (
                <><KeyRound className="h-4 w-4" /> Guardar PIN</>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Agregar guardia modal ─────────────────────────────────────────────────────

function AddGuardiaModal({
  plantas,
  onSave,
  onCancel,
}: {
  plantas: string[];
  onSave: (nombre: string, planta: string | null, turno: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [planta, setPlanta] = useState(plantas[0] ?? "");
  const [turno, setTurno] = useState("Día");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    await onSave(nombre.trim(), planta || null, turno);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.78)] backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[380px] border border-[var(--sg-line)] bg-[var(--sg-panel)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--sg-line)] px-5 py-4">
          <Plus className="h-4 w-4 text-[var(--sg-accent)]" />
          <span className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
            Nuevo guardia
          </span>
          <button onClick={onCancel} className="ml-auto text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="sg-field">
            <label className="sg-label">Nombre completo *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toUpperCase())}
              placeholder="JUAN GARCIA LOPEZ"
              className="sg-input uppercase"
              autoFocus
            />
          </div>

          <div className="sg-field">
            <label className="sg-label">Sede asignada</label>
            <select
              value={planta}
              onChange={(e) => setPlanta(e.target.value)}
              className="sg-select"
            >
              <option value="">Todas las sedes</option>
              {plantas.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="sg-field">
            <label className="sg-label">Turno</label>
            <div className="flex gap-2">
              {TURNOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTurno(t)}
                  className={`flex-1 py-2 sg-font-mono text-[10px] uppercase tracking-widest border transition-colors ${
                    turno === t
                      ? "border-[var(--sg-accent)] text-[var(--sg-accent)] bg-[rgba(200,168,75,0.08)]"
                      : "border-[var(--sg-line)] text-[var(--sg-muted)] hover:border-[var(--sg-accent)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="sg-btn sg-btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving || !nombre.trim()}
              className="sg-btn sg-btn-accent flex-1 justify-center disabled:opacity-40"
            >
              {saving ? "Guardando..." : <><Plus className="h-4 w-4" /> Agregar</>}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  plantas: string[];
  onToast: (msg: string, ok?: boolean) => void;
}

export default function GuardiasManager({ plantas, onToast }: Props) {
  const [guardias, setGuardias] = useState<AgentePerfilRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPin, setEditingPin] = useState<AgentePerfilRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAgentesPerfiles();
    setGuardias(data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleUpdateField = async (id: number, field: "planta" | "turno" | "activo", value: string | boolean | null) => {
    setSavingId(id);
    const result = await updateAgentePerfil(id, { [field]: value });
    if (result.success) {
      setGuardias((prev) => prev.map((g) => g.id === id ? { ...g, [field]: value } : g));
      onToast("Guardado", true);
    } else {
      onToast(result.error ?? "Error", false);
    }
    setSavingId(null);
  };

  const handleSetPIN = async (pin: string) => {
    if (!editingPin) return;
    const result = await setAgentePIN(editingPin.id, pin);
    if (result.success) {
      setGuardias((prev) => prev.map((g) => g.id === editingPin.id ? { ...g, pin_configurado: true } : g));
      onToast("PIN configurado correctamente", true);
      setEditingPin(null);
    } else {
      onToast(result.error ?? "Error al guardar PIN", false);
    }
  };

  const handleRemovePIN = async (g: AgentePerfilRow) => {
    const result = await removeAgentePIN(g.id);
    if (result.success) {
      setGuardias((prev) => prev.map((x) => x.id === g.id ? { ...x, pin_configurado: false } : x));
      onToast("PIN eliminado", true);
    } else {
      onToast(result.error ?? "Error", false);
    }
  };

  const handleAdd = async (nombre: string, planta: string | null, turno: string) => {
    const result = await addAgente(nombre, planta, turno);
    if (result.success) {
      onToast("Guardia agregado", true);
      setShowAdd(false);
      await load();
    } else {
      onToast(result.error ?? "Error", false);
    }
  };

  const handleRemove = async (g: AgentePerfilRow) => {
    if (!confirm(`¿Eliminar a ${g.nombre}? Esta acción no se puede deshacer.`)) return;
    const result = await removeAgente(g.id);
    if (result.success) {
      setGuardias((prev) => prev.filter((x) => x.id !== g.id));
      onToast("Guardia eliminado", true);
    } else {
      onToast(result.error ?? "Error", false);
    }
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="sg-font-display text-[16px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
            Perfiles de Guardia
          </h2>
          <p className="text-[11px] text-[var(--sg-muted)] mt-0.5">
            Configura el PIN, sede y turno de cada guardia para acceder a la app
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="sg-btn sg-btn-accent shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Nuevo guardia
        </button>
      </div>

      {/* Tabla */}
      <section className="sg-panel overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col gap-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse bg-[var(--sg-panel-2)]" />
              ))}
            </div>
          ) : guardias.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--sg-muted)]">
              <Shield className="h-8 w-8 opacity-20" />
              <p className="sg-font-mono text-[10px] uppercase tracking-widest opacity-40">
                Sin guardias registrados
              </p>
            </div>
          ) : (
            <table className="sg-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Guardia</th>
                  <th>Sede</th>
                  <th>Turno</th>
                  <th>PIN</th>
                  <th>Último acceso</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {guardias.map((g) => (
                  <motion.tr
                    key={g.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={!g.activo ? "opacity-40" : ""}
                  >
                    {/* Guardia */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center sg-font-display text-[13px] font-bold"
                          style={{
                            background: `${g.avatar_color}22`,
                            border: `1px solid ${g.avatar_color}55`,
                            color: g.avatar_color,
                          }}
                        >
                          {initials(g.nombre)}
                        </div>
                        <span className="sg-font-display text-[13px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                          {g.nombre}
                        </span>
                      </div>
                    </td>

                    {/* Sede */}
                    <td>
                      <select
                        value={g.planta ?? ""}
                        onChange={(e) => handleUpdateField(g.id, "planta", e.target.value || null)}
                        disabled={savingId === g.id}
                        className="sg-select text-[12px] py-1 h-8 min-w-[140px]"
                      >
                        <option value="">Todas</option>
                        {plantas.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>

                    {/* Turno */}
                    <td>
                      <select
                        value={g.turno}
                        onChange={(e) => handleUpdateField(g.id, "turno", e.target.value)}
                        disabled={savingId === g.id}
                        className="sg-select text-[12px] py-1 h-8 w-24"
                      >
                        {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>

                    {/* PIN */}
                    <td>
                      <div className="flex items-center gap-2">
                        {g.pin_configurado ? (
                          <>
                            <span className="flex items-center gap-1 sg-font-mono text-[10px] text-[var(--sg-success)]">
                              <CheckCircle2 className="h-3 w-3" /> ●●●●
                            </span>
                            <button
                              onClick={() => setEditingPin(g)}
                              title="Cambiar PIN"
                              className="text-[var(--sg-muted)] hover:text-[var(--sg-accent)] transition-colors"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleRemovePIN(g)}
                              title="Eliminar PIN"
                              className="text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setEditingPin(g)}
                            className="flex items-center gap-1 sg-font-mono text-[9px] uppercase tracking-widest border border-[var(--sg-warn)] text-[var(--sg-warn)] px-2 py-1 hover:bg-[rgba(212,134,74,0.08)] transition-colors"
                          >
                            <KeyRound className="h-3 w-3" /> Configurar
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Último acceso */}
                    <td>
                      <div className="flex items-center gap-1.5 text-[var(--sg-muted)]">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="sg-font-mono text-[10px]">
                          {formatAcceso(g.ultimo_acceso)}
                        </span>
                      </div>
                    </td>

                    {/* Estado */}
                    <td>
                      <button
                        onClick={() => handleUpdateField(g.id, "activo", !g.activo)}
                        disabled={savingId === g.id}
                        className={`flex items-center gap-1.5 sg-font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 border transition-colors ${
                          g.activo
                            ? "border-[var(--sg-success)] text-[var(--sg-success)] bg-[rgba(107,189,138,0.06)] hover:opacity-70"
                            : "border-[var(--sg-line)] text-[var(--sg-muted)] hover:border-[var(--sg-success)]"
                        }`}
                      >
                        <UserCheck className="h-3 w-3" />
                        {g.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>

                    {/* Acciones */}
                    <td>
                      <button
                        onClick={() => handleRemove(g)}
                        className="text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors p-1"
                        title="Eliminar guardia"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Leyenda */}
      <div className="flex items-center gap-4 px-1">
        <p className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
          · El PIN permite al guardia identificarse en el PWA y ver sus estadísticas en la web
        </p>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editingPin && (
          <PINModal
            key="pin-modal"
            guardia={editingPin}
            onSave={handleSetPIN}
            onCancel={() => setEditingPin(null)}
          />
        )}
        {showAdd && (
          <AddGuardiaModal
            key="add-modal"
            plantas={plantas}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
