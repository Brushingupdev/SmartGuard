"use client";

import AppLayout from "@/components/AppLayout";
import {
  getUsers, createUser, deleteUser, updateUser, getCompanies, getCompanyGateOptions, getCompanyPlants,
  generateUserMagicLink,
} from "@/app/actions";
import { formatGateLabel, formatGateLabelFromPlant, normalizeGateAssignments, type GateAssignment } from "@/lib/gates";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

function formatGateLabelFromPlantTitle(gate: GateAssignment) {
  return formatGateLabel(gate);
}

function ConfirmDeleteModal({
  userEmail,
  onConfirm,
  onCancel,
}: {
  userEmail: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
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
        exit={{ scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: easeOut }}
        className="w-full max-w-[400px] border border-[var(--sg-danger)] bg-[var(--sg-panel)] shadow-[8px_8px_0_rgba(211,92,79,0.08)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--sg-line)] px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-[var(--sg-danger)]" />
          <span className="sg-font-display text-[15px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
            Eliminar cuenta
          </span>
          <button onClick={onCancel} className="ml-auto text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-[13px] text-[var(--sg-copy)] mb-5 leading-relaxed">
            ¿Estás seguro de eliminar la cuenta de{" "}
            <strong className="text-[var(--sg-ink)]">{userEmail}</strong>?
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="sg-btn sg-btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="sg-btn flex-1 justify-center"
              style={{ backgroundColor: "var(--sg-danger)", color: "var(--sg-canvas)", borderColor: "var(--sg-danger)" }}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface UserRow {
  id: string;
  email: string;
  role: string;
  plant: string;
  assignedPlants: string[];
  assignedGates: GateAssignment[];
  companyId: string;
  companyName: string;
  createdAt: string | null;
  lastSignIn: string | null;
}

function roleConfig(role: string) {
  if (role === "Administrador") return { color: "var(--sg-accent)", bg: "rgba(200,168,75,0.12)" };
  if (role === "Supervisor") return { color: "var(--sg-info)", bg: "rgba(127,167,200,0.12)" };
  return { color: "var(--sg-success)", bg: "rgba(107,189,138,0.12)" };
}

function EditUserModal({
  user,
  companies,
  onSave,
  onCancel,
}: {
  user: UserRow;
  companies: { id: string; name: string }[];
  onSave: (role: string, plant: string, assignedPlants: string[], assignedGates: GateAssignment[], password: string, companyId: string, companyName: string) => void;
  onCancel: () => void;
}) {
  const currentRole = user.role === "Administrador" ? "administrador" : user.role === "Supervisor" ? "supervisor" : "guardia";
  const [role,     setRole]     = useState(currentRole);
  const [assignedPlants, setAssignedPlants] = useState<string[]>(user.assignedPlants?.length ? user.assignedPlants : user.plant ? [user.plant] : []);
  const [companyId, setCompanyId] = useState(user.companyId ?? "");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [availablePlants, setAvailablePlants] = useState<string[]>([]);
  const [availableGates, setAvailableGates] = useState<GateAssignment[]>([]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  useEffect(() => {
    let active = true;

    if (!companyId) {
      return () => {
        active = false;
      };
    }

    void Promise.all([getCompanyPlants(companyId), getCompanyGateOptions(companyId)]).then(([plants, gates]) => {
      if (active) {
        setAvailablePlants(plants);
        setAvailableGates(gates);
      }
    });

    return () => {
      active = false;
    };
  }, [companyId]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.78)] backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: easeOut }}
        className="w-full max-w-[420px] border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[8px_8px_0_rgba(196,192,180,0.06)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--sg-line)] px-5 py-4">
          <Pencil className="h-4 w-4 text-[var(--sg-accent)]" />
          <span className="sg-font-display text-[15px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
            Editar cuenta
          </span>
          <button onClick={onCancel} className="ml-auto text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="sg-font-mono text-[11px] text-[var(--sg-muted)] truncate">{user.email}</div>

          <div className="sg-field">
            <label className="sg-label">Rol *</label>
            {currentRole === "administrador" ? (
              <div className="sg-input flex items-center opacity-60 cursor-not-allowed">
                <span className="sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-accent)]">Administrador</span>
              </div>
            ) : (
              <select value={role} onChange={e => setRole(e.target.value)} className="sg-select">
                <option value="guardia">Guardia</option>
                <option value="supervisor">Supervisor</option>
              </select>
            )}
          </div>

          <div className="sg-field">
            <label className="sg-label">Empresa</label>
            <select
              value={companyId}
              onChange={e => {
                setCompanyId(e.target.value);
                setAssignedPlants([]);
              }}
              className="sg-select"
            >
              <option value="">Sin empresa</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {role === "guardia" && (
            <div className="sg-field">
              <label className="sg-label">Puertas asignadas *</label>
              <div className="grid gap-2 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-3">
                {availablePlants.map(p => {
                  const checked = assignedPlants.includes(p);
                  return (
                    <label key={p} className="flex items-center gap-2 text-[12px] text-[var(--sg-copy)]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? assignedPlants.filter(item => item !== p)
                            : [...assignedPlants, p];
                          setAssignedPlants(next);
                        }}
                      />
                      {formatGateLabelFromPlant(p, availableGates)}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="sg-field">
            <label className="sg-label">Nueva contraseña <span className="normal-case text-[var(--sg-muted)]">(dejar vacío para no cambiar)</span></label>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="sg-input pl-10 pr-10"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
                <Eye className="h-4 w-4" />
              </button>
            </div>
            {password && password.length < 8 && (
              <p className="text-[11px] text-[var(--sg-danger)]">Mínimo 8 caracteres</p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="sg-btn sg-btn-ghost flex-1 justify-center">Cancelar</button>
            <button
              onClick={() => {
                const selected = companies.find(c => c.id === companyId);
                const guardiaPlants = role === "guardia" ? assignedPlants : [];
                const guardiaGates = normalizeGateAssignments(
                  availableGates.filter((gate) => guardiaPlants.includes(gate.plant)),
                  guardiaPlants
                );
                onSave(role, guardiaPlants[0] ?? "", guardiaPlants, guardiaGates, password, companyId, selected?.name ?? "");
              }}
              disabled={(role === "guardia" && assignedPlants.length === 0) || (!!password && password.length < 8)}
              className="sg-btn sg-btn-accent flex-1 justify-center disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Guardar cambios
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Nunca";
  return new Date(dateStr).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("guardia");
  const [plant, setPlant] = useState("");
  const [assignedPlants, setAssignedPlants] = useState<string[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [companyPlants, setCompanyPlants] = useState<string[]>([]);
  const [companyGates, setCompanyGates] = useState<GateAssignment[]>([]);
  const [showPwd, setShowPwd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast,         setToast]        = useState<{ show: boolean; msg: string; ok: boolean }>({ show: false, msg: "", ok: true });
  const [deletingId,      setDeletingId]     = useState<string | null>(null);
  const [pendingDelete,   setPendingDelete]  = useState<{ id: string; email: string } | null>(null);
  const [editingUser,     setEditingUser]    = useState<UserRow | null>(null);
  const [impersonatingId, setImpersonatingId]= useState<string | null>(null);


  const showToast = (msg: string, ok = true) => {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const result = await getUsers();
    setUsers(result.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    void getCompanies().then(setCompanies);
  }, []);

  useEffect(() => {
    if (!companyId) return;

    let active = true;

    void Promise.all([getCompanyPlants(companyId), getCompanyGateOptions(companyId)]).then(([plants, gates]) => {
      if (active) {
        setCompanyPlants(plants);
        setCompanyGates(gates);
        setAssignedPlants((current) => current.filter((plant) => plants.includes(plant)));
      }
    });

    return () => {
      active = false;
    };
  }, [companyId]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const result = await getUsers();
      if (!active) return;

      setUsers(result.users);
      setLoading(false);
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setCreating(true);
    const selectedCompany = companies.find(c => c.id === companyId);
    const result = await createUser({
      email, password, role,
      plant: role === "guardia" ? (assignedPlants[0] ?? plant) : "",
      assignedPlants: role === "guardia" ? assignedPlants : [],
      assignedGates: role === "guardia"
        ? normalizeGateAssignments(companyGates.filter((gate) => assignedPlants.includes(gate.plant)), assignedPlants)
        : [],
      companyId: companyId || undefined,
      companyName: selectedCompany?.name,
    });
    setCreating(false);
    if (result.success) {
      showToast(`Usuario ${email} creado correctamente.`);
      setEmail(""); setPassword(""); setRole("guardia"); setPlant(""); setAssignedPlants([]); setCompanyId(""); setShowForm(false);
      loadUsers();
    } else {
      showToast(result.error ?? "Error al crear usuario.", false);
    }
  };

  const handleDelete = (id: string, userEmail: string) => {
    setPendingDelete({ id, email: userEmail });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    setDeletingId(id);
    const result = await deleteUser({ userId: id });
    setDeletingId(null);
    if (result.success) {
      showToast("Cuenta eliminada.");
      loadUsers();
    } else {
      showToast(result.error ?? "Error al eliminar.", false);
    }
  };

  const handleImpersonate = async (userId: string, email: string) => {
    setImpersonatingId(userId);
    const result = await generateUserMagicLink(email);
    setImpersonatingId(null);
    if (!result.success) {
      showToast(result.error ?? "Error al generar enlace.", false);
      return;
    }
    await navigator.clipboard.writeText(result.link);
    showToast("Enlace copiado — ábrelo en una ventana incógnito.", true);
  };

  const handleSaveEdit = async (role: string, plant: string, assignedPlants: string[], assignedGates: GateAssignment[], password: string, companyId: string, companyName: string) => {
    if (!editingUser) return;
    const result = await updateUser({
      userId: editingUser.id,
      role, plant,
      assignedPlants,
      assignedGates,
      password: password || undefined,
      companyId: companyId || undefined,
      companyName: companyName || undefined,
    });
    setEditingUser(null);
    if (result.success) { showToast("Cuenta actualizada."); loadUsers(); }
    else showToast(result.error ?? "Error al actualizar.", false);
  };


  return (
    <AppLayout>
      <AnimatePresence>
        {pendingDelete && (
          <ConfirmDeleteModal
            userEmail={pendingDelete.email}
            onConfirm={confirmDelete}
            onCancel={() => setPendingDelete(null)}
          />
        )}
        {editingUser && (
          <EditUserModal
            user={editingUser}
            companies={companies}
            onSave={handleSaveEdit}
            onCancel={() => setEditingUser(null)}
          />
        )}
      </AnimatePresence>

      {/* Topbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-5">
        <div className="flex items-center gap-4">
          <div className="sg-kicker">Usuarios</div>
          <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
            {users.length} cuenta{users.length !== 1 ? "s" : ""} registrada{users.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadUsers()}
            className="flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="sg-btn sg-btn-primary sg-btn-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </button>
        </div>
      </div>

      {/* Formulario de creación */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="sg-panel border-l-4 border-[var(--sg-accent)] p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="sg-font-display text-[18px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                  Nueva cuenta de acceso
                </div>
                <button onClick={() => setShowForm(false)} className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
                <div className="sg-field">
                  <label className="sg-label">Correo electrónico *</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="usuario@empresa.com"
                      required
                      className="sg-input pl-10"
                    />
                  </div>
                </div>

                <div className="sg-field">
                  <label className="sg-label">Rol *</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="sg-select"
                  >
                    <option value="guardia">Guardia</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </div>

                <div className="sg-field">
                  <label className="sg-label">Empresa *</label>
                  <select
                    value={companyId}
                    onChange={e => {
                      setCompanyId(e.target.value);
                      setPlant("");
                      setAssignedPlants([]);
                    }}
                    className="sg-select"
                    required
                  >
                    <option value="">Seleccionar empresa</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {role === "guardia" && companyId && (
                  <div className="sg-field">
                    <label className="sg-label">Puertas asignadas *</label>
                    <div className="grid max-h-[150px] gap-2 overflow-y-auto border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-3">
                      {companyPlants.map(p => {
                        const checked = assignedPlants.includes(p);
                        return (
                          <label key={p} className="flex items-center gap-2 text-[12px] text-[var(--sg-copy)]">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? assignedPlants.filter(item => item !== p)
                                  : [...assignedPlants, p];
                                setAssignedPlants(next);
                                setPlant(next[0] ?? "");
                              }}
                            />
                            {formatGateLabelFromPlant(p, companyGates)}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="sg-field">
                  <label className="sg-label">Contraseña *</label>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
                    <input
                      type={showPwd ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      required
                      className="sg-input pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  disabled={creating || (role === "guardia" && assignedPlants.length === 0)}
                  className={`sg-btn sg-btn-accent h-[42px] justify-center ${creating ? "opacity-70" : ""}`}
                >
                  {creating ? (
                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                      <RefreshCw className="h-4 w-4" />
                    </motion.span>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Crear cuenta
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabla de usuarios */}
      <section className="sg-panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--sg-line)] px-5 py-4">
          <Users className="h-4 w-4 text-[var(--sg-accent)]" />
          <div className="sg-font-display text-[15px] font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)]">
            Cuentas registradas
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[var(--sg-muted)]">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <RefreshCw className="h-6 w-6" />
            </motion.div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--sg-muted)]">
            <Users className="h-12 w-12 opacity-10 mb-4" />
            <p className="sg-font-mono text-[12px] uppercase tracking-widest">Sin usuarios registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="sg-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Correo electrónico</th>
                  <th>Rol</th>
                  <th>Empresa</th>
                  <th>Puertas</th>
                  <th>Creado</th>
                  <th>Último acceso</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const rc = roleConfig(u.role);
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <td className="text-[var(--sg-ink)]">{u.email}</td>
                      <td>
                        <span
                          className="sg-font-mono text-[9px] uppercase tracking-widest px-2 py-1 border"
                          style={{ color: rc.color, background: rc.bg, borderColor: `${rc.color}30` }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="text-[12px] text-[var(--sg-copy)]">{u.companyName || "—"}</td>
                      <td className="max-w-[220px] truncate text-[12px] text-[var(--sg-copy)]" title={(u.assignedGates ?? []).map(formatGateLabelFromPlantTitle).join(", ")}>
                        {u.role === "Guardia"
                          ? ((u.assignedGates?.length ? u.assignedGates.map(formatGateLabelFromPlantTitle).join(", ") : u.assignedPlants?.join(", ")) || u.plant || "—")
                          : "—"}
                      </td>
                      <td className="sg-mono text-[11px] text-[var(--sg-muted)]">{formatDate(u.createdAt)}</td>
                      <td className="sg-mono text-[11px] text-[var(--sg-muted)]">{formatDate(u.lastSignIn)}</td>
                      <td className="text-right">
                        {u.role === "Administrador" ? (
                          <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] px-2 py-1">
                            Tu cuenta
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleImpersonate(u.id, u.email)}
                              disabled={impersonatingId === u.id}
                              title="Generar enlace de acceso (abrir en incógnito)"
                              className="inline-flex items-center gap-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-info)] transition-colors px-2 py-1 border border-transparent hover:border-[var(--sg-info)] disabled:opacity-40"
                            >
                              {impersonatingId === u.id ? (
                                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                                  <RefreshCw className="h-3 w-3" />
                                </motion.span>
                              ) : (
                                <LogIn className="h-3 w-3" />
                              )}
                              Acceder
                            </button>
                            <button
                              onClick={() => setEditingUser(u)}
                              className="inline-flex items-center gap-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-accent)] transition-colors px-2 py-1 border border-transparent hover:border-[var(--sg-accent)]"
                            >
                              <Pencil className="h-3 w-3" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(u.id, u.email)}
                              disabled={deletingId === u.id}
                              className="inline-flex items-center gap-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors px-2 py-1 border border-transparent hover:border-[var(--sg-danger)]"
                            >
                              {deletingId === u.id ? (
                                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                                  <RefreshCw className="h-3 w-3" />
                                </motion.span>
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Toast */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 22, scale: 0.96 }}
            className="fixed bottom-6 right-6 z-[70] border bg-[var(--sg-panel)] px-5 py-4 shadow-[6px_6px_0_rgba(196,192,180,0.08)]"
            style={{ borderColor: toast.ok ? "var(--sg-success)" : "var(--sg-danger)" }}
          >
            <div className="flex items-center gap-3 text-sm text-[var(--sg-ink)]">
              <CheckCircle2 className="h-5 w-5" style={{ color: toast.ok ? "var(--sg-success)" : "var(--sg-danger)" }} />
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
