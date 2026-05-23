"use client";

import HealthScoreBar from "@/components/HealthScoreBar";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  RefreshCw,
  Zap,
} from "lucide-react";
import type { AdminCompany, DeletedCompany } from "./adminTypes";
import { easeOut, HEALTH_LEGEND, INTERVENTION_META } from "./adminUtils";

export function InterventionBadge({
  type,
}: {
  type: keyof typeof INTERVENTION_META;
}) {
  const meta = INTERVENTION_META[type];
  const Icon = meta.icon;

  return (
    <span
      className="inline-flex items-center gap-1 border px-2 py-0.5 sg-font-mono text-[8px] uppercase tracking-[0.1em]"
      style={{ color: meta.color, borderColor: meta.color }}
    >
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  color,
  dim,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
  dim?: boolean;
}) {
  return (
    <div
      className={`sg-panel relative flex flex-col gap-1 overflow-hidden p-5 transition-opacity ${dim ? "opacity-40" : ""}`}
    >
      {color && (
        <div
          className="absolute left-0 right-0 top-0 h-[3px]"
          style={{ background: color }}
        />
      )}
      <div className="sg-font-mono text-[26px] font-bold leading-none text-[var(--sg-ink)] sm:text-[32px]">
        {value}
      </div>
      <div className="sg-font-mono mt-1 text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
        {label}
      </div>
      {sub && <div className="text-[10px] text-[var(--sg-muted)]">{sub}</div>}
    </div>
  );
}

export function PlanBadge({
  plan,
  daysLeft,
  expired,
}: {
  plan: string;
  daysLeft: number | null;
  expired: boolean;
}) {
  if (plan === "active") {
    return (
      <span className="sg-badge sg-badge-ok flex w-fit items-center gap-1">
        <CheckCircle2 className="h-2.5 w-2.5" /> Activo
      </span>
    );
  }
  if (expired) {
    return <span className="sg-badge sg-badge-deny w-fit">Expirado</span>;
  }
  if (daysLeft !== null && daysLeft <= 7) {
    return (
      <span className="sg-badge sg-badge-warn w-fit">
        {daysLeft}d restantes
      </span>
    );
  }
  if (daysLeft !== null) {
    return (
      <span className="sg-badge sg-badge-muted w-fit">
        Trial · {daysLeft}d
      </span>
    );
  }
  return <span className="sg-badge sg-badge-muted w-fit">{plan}</span>;
}

export function EmptyState({
  onboardingUrl,
  onCopyLink,
}: {
  onboardingUrl: string;
  onCopyLink: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="flex flex-col items-center justify-center px-6 py-24 text-center"
    >
      <div className="relative mb-8">
        <div className="flex h-20 w-20 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)]">
          <Building2 className="h-9 w-9 text-[var(--sg-accent)]" />
        </div>
        <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center bg-[var(--sg-accent)]">
          <Zap className="h-2.5 w-2.5 text-[var(--sg-canvas)]" />
        </div>
      </div>

      <div className="sg-font-mono mb-3 text-[9px] uppercase tracking-widest text-[var(--sg-accent)]">
        Plataforma lista
      </div>
      <h2 className="sg-font-display mb-3 text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
        Aún no tienes clientes
      </h2>
      <p className="mb-2 max-w-md text-[13px] text-[var(--sg-muted)]">
        Comparte el link de registro con tus primeros clientes. Ellos completan
        el onboarding solos en minutos — empresa, plantas, guardias y data
        histórica incluida.
      </p>

      <div className="mb-4 mt-6 flex w-full max-w-lg items-center gap-0 border border-[var(--sg-line)]">
        <span className="sg-font-mono flex-1 truncate px-4 py-3 text-left text-[11px] text-[var(--sg-muted)]">
          {onboardingUrl}
        </span>
        <button
          onClick={onCopyLink}
          className="sg-font-mono flex items-center gap-2 whitespace-nowrap border-l border-[var(--sg-line)] px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--sg-accent)] transition-colors hover:bg-[var(--sg-panel-2)]"
        >
          <Copy className="h-3.5 w-3.5" /> Copiar link
        </button>
      </div>

      <a
        href={onboardingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="sg-font-mono flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
      >
        <ExternalLink className="h-3 w-3" /> Ver página de registro
      </a>

      <div className="mt-16 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: Building2,
            label: "Empresas",
            desc: "Estado de salud, actividad y configuración de cada cliente",
          },
          {
            icon: Bell,
            label: "Alertas",
            desc: "Tasa de entrega de notificaciones en tiempo real",
          },
          {
            icon: Activity,
            label: "Actividad",
            desc: "Registros por empresa, semana y planta",
          },
        ].map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="sg-panel border border-[var(--sg-line)] p-5 text-left"
          >
            <Icon className="mb-3 h-5 w-5 text-[var(--sg-accent)]" />
            <div className="sg-font-mono mb-1 text-[10px] uppercase tracking-widest text-[var(--sg-ink)]">
              {label}
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--sg-muted)]">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function AdminHeader({
  copied,
  trialsExpiringSoon,
  onCopyLink,
}: {
  copied: boolean;
  trialsExpiringSoon: number;
  onCopyLink: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--sg-line)] pb-5">
      <div>
        <div className="sg-kicker mb-1">Panel de Administración</div>
        <h1 className="sg-font-display text-[20px] font-bold uppercase tracking-tight text-[var(--sg-ink)] sm:text-[26px]">
          Empresas registradas
        </h1>
        <p className="mt-1 text-[12px] text-[var(--sg-muted)]">
          Estado de salud y actividad de todos los clientes de SmartGuard
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {trialsExpiringSoon > 0 && (
          <Link
            href="/admin/pagos"
            className="sg-font-mono flex shrink-0 items-center gap-2 border border-[var(--sg-warn)] px-4 py-2.5 text-[10px] uppercase tracking-widest text-[var(--sg-warn)] transition-colors hover:bg-[var(--sg-warn)] hover:text-[var(--sg-canvas)]"
          >
            <CreditCard className="h-3.5 w-3.5" />
            {trialsExpiringSoon} por vencer
          </Link>
        )}
        <button
          onClick={onCopyLink}
          className="sg-font-mono flex shrink-0 items-center gap-2 border border-[var(--sg-accent)] px-4 py-2.5 text-[10px] uppercase tracking-widest text-[var(--sg-accent)] transition-colors hover:bg-[var(--sg-accent)] hover:text-[var(--sg-canvas)]"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> ¡Copiado!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copiar link de registro
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function AdminStatsGrid({
  loading,
  totalCompanies,
  totalUsers,
  trialsExpiringSoon,
  okCount,
  companiesCount,
}: {
  loading: boolean;
  totalCompanies: number;
  totalUsers: number;
  trialsExpiringSoon: number;
  okCount: number;
  companiesCount: number;
}) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {loading ? (
        Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse bg-[var(--sg-panel-2)]"
          />
        ))
      ) : (
        <>
          <StatCard
            label="Empresas activas"
            value={totalCompanies}
            color="var(--sg-accent)"
            dim={totalCompanies === 0}
          />
          <StatCard
            label="Usuarios"
            value={totalUsers}
            sub="guardias + supervisores"
            color="var(--sg-info)"
            dim={totalUsers === 0}
          />
          <StatCard
            label="Trial por vencer"
            value={trialsExpiringSoon}
            sub="próximos 7 días"
            color={
              trialsExpiringSoon > 0 ? "var(--sg-warn)" : undefined
            }
            dim={trialsExpiringSoon === 0}
          />
          <StatCard
            label="Salud de la red"
            value={
              companiesCount === 0 ? "—" : `${okCount}/${companiesCount}`
            }
            sub={
              companiesCount === 0
                ? "Sin clientes aún"
                : okCount === companiesCount
                  ? "Todas OK"
                  : `${companiesCount - okCount} necesitan atención`
            }
            color={
              companiesCount === 0
                ? undefined
                : okCount === companiesCount
                  ? "var(--sg-success)"
                  : "var(--sg-warn)"
            }
            dim={companiesCount === 0}
          />
        </>
      )}
    </div>
  );
}

export function HealthLegend() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
      <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
        Health Score:
      </span>
      {HEALTH_LEGEND.map(({ score, label }) => (
        <div key={score} className="flex items-center gap-2">
          <HealthScoreBar score={score} size="sm" />
          <span className="text-[9px] text-[var(--sg-muted)]">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function DeletedCompaniesSection({
  companies,
  reactivatingId,
  onReactivate,
}: {
  companies: DeletedCompany[];
  reactivatingId: string | null;
  onReactivate: (company: DeletedCompany) => void | Promise<void>;
}) {
  if (companies.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="sg-font-mono mb-3 text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
        Empresas eliminadas ({companies.length})
      </div>
      <div className="sg-panel overflow-x-auto">
        <table className="sg-table min-w-[600px]">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Eliminada el</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr
                key={company.id}
                className="opacity-50 transition-opacity hover:opacity-100"
              >
                <td>
                  <span className="sg-font-display text-[13px] font-bold uppercase tracking-tight text-[var(--sg-ink)] line-through">
                    {company.name}
                  </span>
                </td>
                <td className="sg-font-mono text-[11px] text-[var(--sg-muted)]">
                  {new Date(company.deletedAt).toLocaleDateString("es-PE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td>
                  <button
                    disabled={reactivatingId === company.id}
                    onClick={() => onReactivate(company)}
                    className="sg-font-mono flex items-center gap-1.5 border border-[var(--sg-line)] px-2.5 py-1.5 text-[9px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-success)] hover:text-[var(--sg-success)] disabled:opacity-40"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${reactivatingId === company.id ? "animate-spin" : ""}`}
                    />
                    Reactivar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DeleteCompanyModal({
  company,
  deletingId,
  onClose,
  onConfirm,
}: {
  company: AdminCompany | null;
  deletingId: string | null;
  onClose: () => void;
  onConfirm: (company: AdminCompany) => void | Promise<void>;
}) {
  return (
    <AnimatePresence>
      {company && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ ease: easeOut }}
            className="sg-panel mx-4 flex w-full max-w-sm flex-col gap-5 p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <div className="sg-font-mono mb-2 text-[9px] uppercase tracking-widest text-[var(--sg-danger)]">
                Eliminar empresa
              </div>
              <p className="text-[13px] text-[var(--sg-copy)]">
                ¿Eliminar{" "}
                <strong className="text-[var(--sg-ink)]">{company.name}</strong>
                ? Sus datos se conservan — puedes reactivarla cuando quieras.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="sg-font-mono border border-[var(--sg-line)] px-4 py-2 text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
              >
                Cancelar
              </button>
              <button
                disabled={deletingId === company.id}
                onClick={() => onConfirm(company)}
                className="sg-font-mono border border-[var(--sg-danger)] bg-[var(--sg-danger)] px-4 py-2 text-[10px] uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {deletingId === company.id ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
