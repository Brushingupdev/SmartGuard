"use client";

import AppLayout from "@/components/AppLayout";
import { getUserProfile, changePassword } from "@/app/actions";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MapPin,
  Shield,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

function roleLabel(role: string | null, isAdmin: boolean) {
  if (isAdmin) return "Administrador";
  if (role === "supervisor") return "Supervisor";
  if (role === "guardia") return "Guardia";
  return role ?? "Usuario";
}

function roleBadgeClass(role: string | null, isAdmin: boolean) {
  if (isAdmin) return "border-[var(--sg-accent)] text-[var(--sg-accent)] bg-[rgba(200,168,75,0.08)]";
  if (role === "supervisor") return "border-[var(--sg-accent)] text-[var(--sg-accent)] bg-transparent";
  if (role === "guardia") return "border-[var(--sg-success)] text-[var(--sg-success)] bg-transparent";
  return "border-[var(--sg-line)] text-[var(--sg-muted)] bg-transparent";
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-[var(--sg-line)] last:border-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-muted)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)] mb-0.5">{label}</div>
        <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.06em] text-[var(--sg-ink)] truncate">
          {value ?? "—"}
        </div>
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="sg-field">
      <label className="sg-label">{label}</label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sg-muted)]" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="sg-input pl-10 pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getUserProfile>>>(null);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    getUserProfile().then(setProfile);
  }, []);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      showToast(false, "Completa todos los campos.");
      return;
    }
    if (newPwd.length < 6) {
      showToast(false, "La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPwd !== confirmPwd) {
      showToast(false, "Las contraseñas no coinciden.");
      return;
    }
    setSaving(true);
    const result = await changePassword({ currentPassword: currentPwd, newPassword: newPwd });
    setSaving(false);
    if (result.success) {
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      showToast(true, "Contraseña actualizada correctamente.");
    } else {
      showToast(false, result.error ?? "Error al cambiar la contraseña.");
    }
  };

  const initials = profile?.email ? profile.email.slice(0, 2).toUpperCase() : "?";

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-5">
        <div className="flex items-center gap-3">
          <div className="sg-kicker">Mi Perfil</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        {/* Left — identity card */}
        <div className="flex flex-col gap-6">
          <div className="sg-panel p-6">
            {/* Avatar */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-[var(--sg-line)] mb-4">
              <div
                className={`flex h-20 w-20 items-center justify-center border-2 sg-font-display text-[28px] font-bold mb-4 ${
                  profile?.isAdmin
                    ? "border-[var(--sg-accent)] text-[var(--sg-accent)] bg-[rgba(200,168,75,0.1)]"
                    : "border-[var(--sg-line)] text-[var(--sg-ink)] bg-[var(--sg-panel-2)]"
                }`}
              >
                {initials}
              </div>
              <div className="sg-font-display text-[18px] font-bold uppercase tracking-[0.1em] text-[var(--sg-ink)] mb-2">
                {profile?.email?.split("@")[0] ?? "Cargando..."}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 border px-3 py-1 sg-font-mono text-[9px] uppercase tracking-[0.18em] ${roleBadgeClass(
                  profile?.role ?? null,
                  profile?.isAdmin ?? false
                )}`}
              >
                <Shield className="h-3 w-3" />
                {roleLabel(profile?.role ?? null, profile?.isAdmin ?? false)}
              </span>
            </div>

            <InfoRow icon={User} label="Correo electrónico" value={profile?.email ?? null} />
            {!profile?.isAdmin && (
              <InfoRow icon={Building2} label="Empresa" value={profile?.companyName ?? null} />
            )}
            {profile?.isAdmin && (
              <InfoRow icon={Building2} label="Acceso" value="Todas las empresas" />
            )}
            {profile?.plant && !profile.isAdmin && (
              <InfoRow icon={MapPin} label="Sede asignada" value={profile.plant} />
            )}
            {!profile?.plant && !profile?.isAdmin && profile?.plantas && profile.plantas.length > 0 && (
              <InfoRow icon={MapPin} label="Sedes" value={profile.plantas.join(", ")} />
            )}
          </div>
        </div>

        {/* Right — change password */}
        <div className="sg-panel p-6">
          <div className="flex items-center gap-3 border-b border-[var(--sg-line)] pb-4 mb-6">
            <div className="flex h-9 w-9 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-accent)]">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <div className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                Cambiar contraseña
              </div>
              <p className="text-[10px] text-[var(--sg-muted)]">
                Mínimo 6 caracteres · se cierra sesión en otros dispositivos
              </p>
            </div>
          </div>

          <div className="grid gap-4 max-w-[420px]">
            <PasswordInput
              label="Contraseña actual *"
              value={currentPwd}
              onChange={setCurrentPwd}
              placeholder="Tu contraseña actual"
            />
            <PasswordInput
              label="Nueva contraseña *"
              value={newPwd}
              onChange={setNewPwd}
              placeholder="Mínimo 6 caracteres"
            />
            <PasswordInput
              label="Confirmar nueva contraseña *"
              value={confirmPwd}
              onChange={setConfirmPwd}
              placeholder="Repite la nueva contraseña"
            />

            {newPwd && confirmPwd && newPwd !== confirmPwd && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--sg-danger)] border-l-2 border-[var(--sg-danger)] pl-3 py-1 bg-[rgba(211,92,79,0.06)]">
                <X className="h-3.5 w-3.5 shrink-0" />
                Las contraseñas no coinciden
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleChangePassword}
              disabled={saving || !currentPwd || !newPwd || !confirmPwd || newPwd !== confirmPwd}
              className="sg-btn sg-btn-accent justify-center h-11 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {saving ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                >
                  <KeyRound className="h-4 w-4" />
                </motion.span>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Actualizar contraseña
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 22, scale: 0.96 }}
            className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-auto z-[70] border bg-[var(--sg-panel)] px-5 py-4 shadow-[6px_6px_0_rgba(196,192,180,0.08)] ${
              toast.ok ? "border-[var(--sg-success)]" : "border-[var(--sg-danger)]"
            }`}
          >
            <div className="flex items-center gap-3 text-sm text-[var(--sg-ink)]">
              {toast.ok ? (
                <CheckCircle2 className="h-5 w-5 text-[var(--sg-success)]" />
              ) : (
                <X className="h-5 w-5 text-[var(--sg-danger)]" />
              )}
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
