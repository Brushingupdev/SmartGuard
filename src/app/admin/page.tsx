"use client";

import AppLayout from "@/components/AppLayout";
import HealthScoreBar, { computeHealthScore } from "@/components/HealthScoreBar";
import OnboardingFunnel from "@/components/OnboardingFunnel";
import FiltersToolbar from "@/components/FiltersToolbar";
import { getAdminOverview } from "@/app/actions";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Activity, AlertTriangle, Bell, Building2, CheckCircle2,
  Clock, Copy, CreditCard, Eye, ExternalLink, RefreshCw, Send,
  Settings, Trash2, Users, Zap,
} from "lucide-react";
import Link from "next/link";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];
type AdminOverview     = Awaited<ReturnType<typeof getAdminOverview>>;
type AdminCompany      = NonNullable<AdminOverview>["companies"][number];
type DeletedCompany    = NonNullable<AdminOverview>["deletedCompanies"][number];
const EMPTY_COMPANIES: AdminCompany[]   = [];
const EMPTY_DELETED:   DeletedCompany[] = [];

// Resolved after mount so window.location.origin is available
function getOnboardingUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL
    ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/onboarding`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InterventionBadge({ type }: { type: "no_activity" | "no_alerts" | "no_users" | "trial_ending" | "trial_expired" }) {
  const config = {
    no_activity:    { label: "Sin actividad",    color: "var(--sg-danger)", icon: Clock },
    no_alerts:      { label: "Sin alertas",       color: "var(--sg-warn)",   icon: Bell },
    no_users:       { label: "Sin usuarios",      color: "var(--sg-danger)", icon: Users },
    trial_ending:   { label: "Trial por vencer",  color: "var(--sg-warn)",   icon: AlertTriangle },
    trial_expired:  { label: "Trial vencido",     color: "var(--sg-danger)", icon: AlertTriangle },
  };
  const c = config[type];
  const Icon = c.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 border sg-font-mono text-[8px] uppercase tracking-[0.1em]"
      style={{ color: c.color, borderColor: c.color }}>
      <Icon className="h-2.5 w-2.5" />
      {c.label}
    </span>
  );
}

function StatCard({ label, value, sub, color, dim }: {
  label: string; value: number | string; sub?: string; color?: string; dim?: boolean;
}) {
  return (
    <div className={`sg-panel p-5 flex flex-col gap-1 relative overflow-hidden transition-opacity ${dim ? "opacity-40" : ""}`}>
      {color && <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />}
      <div className="sg-font-mono text-[32px] font-bold text-[var(--sg-ink)] leading-none">{value}</div>
      <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] mt-1">{label}</div>
      {sub && <div className="text-[10px] text-[var(--sg-muted)]">{sub}</div>}
    </div>
  );
}

function PlanBadge({ plan, daysLeft, expired }: { plan: string; daysLeft: number | null; expired: boolean }) {
  if (plan === "active") return (
    <span className="sg-badge sg-badge-ok flex items-center gap-1 w-fit">
      <CheckCircle2 className="h-2.5 w-2.5" /> Activo
    </span>
  );
  if (expired) return (
    <span className="sg-badge sg-badge-deny w-fit">Expirado</span>
  );
  if (daysLeft !== null && daysLeft <= 7) return (
    <span className="sg-badge sg-badge-warn w-fit">{daysLeft}d restantes</span>
  );
  if (daysLeft !== null) return (
    <span className="sg-badge sg-badge-muted w-fit">Trial · {daysLeft}d</span>
  );
  return <span className="sg-badge sg-badge-muted w-fit">{plan}</span>;
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onCopyLink, onboardingUrl }: { onCopyLink: () => void; onboardingUrl: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
      {/* Icon */}
      <div className="relative mb-8">
        <div className="h-20 w-20 border border-[var(--sg-line)] flex items-center justify-center bg-[var(--sg-panel-2)]">
          <Building2 className="h-9 w-9 text-[var(--sg-accent)]" />
        </div>
        <div className="absolute -top-1 -right-1 h-4 w-4 bg-[var(--sg-accent)] flex items-center justify-center">
          <Zap className="h-2.5 w-2.5 text-[var(--sg-canvas)]" />
        </div>
      </div>

      <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)] mb-3">
        Plataforma lista
      </div>
      <h2 className="sg-font-display text-[28px] font-bold uppercase tracking-tight text-[var(--sg-ink)] mb-3">
        Aún no tienes clientes
      </h2>
      <p className="text-[13px] text-[var(--sg-muted)] max-w-md mb-2">
        Comparte el link de registro con tus primeros clientes. Ellos completan el onboarding
        solos en minutos — empresa, plantas, guardias y data histórica incluida.
      </p>

      {/* URL display */}
      <div className="flex items-center gap-0 border border-[var(--sg-line)] mt-6 mb-4 max-w-lg w-full">
        <span className="flex-1 px-4 py-3 sg-font-mono text-[11px] text-[var(--sg-muted)] truncate text-left">
          {onboardingUrl}
        </span>
        <button
          onClick={onCopyLink}
          className="flex items-center gap-2 px-4 py-3 border-l border-[var(--sg-line)] sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)] hover:bg-[var(--sg-panel-2)] transition-colors whitespace-nowrap"
        >
          <Copy className="h-3.5 w-3.5" /> Copiar link
        </button>
      </div>

      <a
        href={onboardingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
      >
        <ExternalLink className="h-3 w-3" /> Ver página de registro
      </a>

      {/* What you'll see */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {[
          { icon: Building2, label: "Empresas",  desc: "Estado de salud, actividad y configuración de cada cliente" },
          { icon: Bell,      label: "Alertas",   desc: "Tasa de entrega de notificaciones en tiempo real" },
          { icon: Activity,  label: "Actividad", desc: "Registros por empresa, semana y planta" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="sg-panel p-5 text-left border border-[var(--sg-line)]">
            <Icon className="h-5 w-5 text-[var(--sg-accent)] mb-3" />
            <div className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-ink)] mb-1">{label}</div>
            <p className="text-[11px] text-[var(--sg-muted)] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [data,           setData]           = useState<AdminOverview>(null);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [activeFilters,  setActiveFilters]  = useState<Set<string>>(new Set());
  const [confirmDelete,  setConfirmDelete]  = useState<AdminCompany | null>(null);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [copied,         setCopied]         = useState(false);
  const [onboardingUrl,  setOnboardingUrl]  = useState("/onboarding");
  const router = useRouter();

  useEffect(() => { setOnboardingUrl(getOnboardingUrl()); }, []);

  const reload = useCallback(async () => {
    const d = await getAdminOverview();
    setData(d);
  }, []);

  useEffect(() => {
    getAdminOverview().then(d => { setData(d); setLoading(false); });
  }, []);

  const companies        = useMemo(() => data?.companies        ?? EMPTY_COMPANIES, [data?.companies]);
  const deletedCompanies = useMemo(() => data?.deletedCompanies ?? EMPTY_DELETED,   [data?.deletedCompanies]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(onboardingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // Filtered companies
  const filtered = useMemo(() => {
    let result = companies;
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(term) || c.sector.toLowerCase().includes(term));
    }
    if (activeFilters.has("solo_alertas"))   result = result.filter(c => !c.hasContacts);
    if (activeFilters.has("sin_actividad"))  result = result.filter(c => c.recentRecords === 0);
    if (activeFilters.has("sin_usuarios"))   result = result.filter(c => c.users === 0);
    if (activeFilters.has("trial_venciendo")) result = result.filter(c => c.plan === "trial" && !c.trialExpired && (c.trialDaysLeft ?? 99) <= 7);
    if (activeFilters.has("ok"))             result = result.filter(c => c.health === "ok");
    if (activeFilters.has("problema"))       result = result.filter(c => c.health === "warn" || c.health === "issue");
    return result;
  }, [companies, search, activeFilters]);

  // Derived stats
  const trialsExpiringSoon = companies.filter(c => c.plan === "trial" && !c.trialExpired && (c.trialDaysLeft ?? 99) <= 7).length;
  const okCount            = companies.filter(c => c.health === "ok").length;

  const filterOptions = [
    { key: "solo_alertas",    label: "Sin alertas",        active: activeFilters.has("solo_alertas"),    count: companies.filter(c => !c.hasContacts).length },
    { key: "sin_actividad",   label: "Sin actividad",      active: activeFilters.has("sin_actividad"),   count: companies.filter(c => c.recentRecords === 0).length },
    { key: "sin_usuarios",    label: "Sin usuarios",       active: activeFilters.has("sin_usuarios"),    count: companies.filter(c => c.users === 0).length },
    { key: "trial_venciendo", label: "Trial por vencer",   active: activeFilters.has("trial_venciendo"), count: trialsExpiringSoon },
    { key: "ok",              label: "OK",                 active: activeFilters.has("ok") },
    { key: "problema",        label: "Problemas",          active: activeFilters.has("problema") },
  ];

  const funnelStages = [
    { label: "Registradas",            count: companies.length,                                    icon: Building2 },
    { label: "Con usuarios",           count: companies.filter(c => c.users > 0).length,           icon: Users },
    { label: "Con actividad reciente", count: companies.filter(c => c.recentRecords > 0).length,   icon: Activity },
  ];

  return (
    <AppLayout>

      {/* ── Header ────────────────────────────────────── */}
      <div className="mb-6 border-b border-[var(--sg-line)] pb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="sg-kicker mb-1">Panel de Administración</div>
          <h1 className="sg-font-display text-[26px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
            Empresas registradas
          </h1>
          <p className="text-[12px] text-[var(--sg-muted)] mt-1">
            Estado de salud y actividad de todos los clientes de SmartGuard
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Pagos shortcut */}
          {trialsExpiringSoon > 0 && (
            <Link
              href="/admin/pagos"
              className="flex items-center gap-2 border border-[var(--sg-warn)] px-4 py-2.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-warn)] hover:bg-[var(--sg-warn)] hover:text-[var(--sg-canvas)] transition-colors shrink-0"
            >
              <CreditCard className="h-3.5 w-3.5" />
              {trialsExpiringSoon} por vencer
            </Link>
          )}
          {/* Onboarding link button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 border border-[var(--sg-accent)] px-4 py-2.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)] hover:bg-[var(--sg-accent)] hover:text-[var(--sg-canvas)] transition-colors shrink-0"
          >
            {copied
              ? <><CheckCircle2 className="h-3.5 w-3.5" /> ¡Copiado!</>
              : <><Copy className="h-3.5 w-3.5" /> Copiar link de registro</>
            }
          </button>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-[var(--sg-panel-2)]" />
          ))
        ) : (
          <>
            <StatCard
              label="Empresas activas"
              value={data?.totalCompanies ?? 0}
              color="var(--sg-accent)"
              dim={(data?.totalCompanies ?? 0) === 0}
            />
            <StatCard
              label="Usuarios"
              value={data?.totalUsers ?? 0}
              sub="guardias + supervisores"
              color="var(--sg-info)"
              dim={(data?.totalUsers ?? 0) === 0}
            />
            <StatCard
              label="Trial por vencer"
              value={trialsExpiringSoon}
              sub="próximos 7 días"
              color={trialsExpiringSoon > 0 ? "var(--sg-warn)" : undefined}
              dim={trialsExpiringSoon === 0}
            />
            <StatCard
              label="Salud de la red"
              value={companies.length === 0 ? "—" : `${okCount}/${companies.length}`}
              sub={companies.length === 0 ? "Sin clientes aún" : okCount === companies.length ? "Todas OK" : `${companies.length - okCount} necesitan atención`}
              color={companies.length === 0 ? undefined : okCount === companies.length ? "var(--sg-success)" : "var(--sg-warn)"}
              dim={companies.length === 0}
            />
          </>
        )}
      </div>

      {/* ── Content ───────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse bg-[var(--sg-panel-2)]" />)}
        </div>

      ) : companies.length === 0 ? (
        <EmptyState onCopyLink={handleCopyLink} onboardingUrl={onboardingUrl} />

      ) : (
        <>
          {/* Funnel + Filters */}
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] mb-8">
            <FiltersToolbar
              search={search}
              onSearch={setSearch}
              filters={filterOptions}
              onToggle={(key) => {
                const next = new Set(activeFilters);
                if (next.has(key)) next.delete(key); else next.add(key);
                setActiveFilters(next);
              }}
              onClear={() => { setSearch(""); setActiveFilters(new Set()); }}
            />
            <OnboardingFunnel stages={funnelStages} total={companies.length} />
          </div>

          {/* Companies table */}
          {filtered.length === 0 ? (
            <div className="sg-panel p-10 text-center sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">
              Sin resultados para los filtros aplicados
            </div>
          ) : (
            <div className="sg-panel overflow-x-auto">
              <table className="sg-table min-w-[1000px]">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Plan</th>
                    <th>Salud</th>
                    <th>Sedes</th>
                    <th>Usuarios</th>
                    <th>Registros</th>
                    <th>30 días</th>
                    <th>Última actividad</th>
                    <th>Intervenciones</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const score = computeHealthScore({
                      hasUsers: c.users > 0,
                      hasContacts: c.hasContacts,
                      hasPlants: c.plantas.length > 0,
                      recentRecords: c.recentRecords,
                      totalRecords: c.totalRecords,
                    });

                    const interventions: Array<"no_activity" | "no_alerts" | "no_users" | "trial_ending" | "trial_expired"> = [];
                    if (c.trialExpired)                                              interventions.push("trial_expired");
                    else if (c.plan === "trial" && (c.trialDaysLeft ?? 99) <= 7)    interventions.push("trial_ending");
                    if (c.recentRecords === 0)                                       interventions.push("no_activity");
                    if (!c.hasContacts)                                              interventions.push("no_alerts");
                    if (c.users === 0)                                               interventions.push("no_users");

                    return (
                      <motion.tr key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, ease: easeOut }}>

                        {/* Empresa */}
                        <td>
                          <div className="flex items-center gap-3">
                            {c.logoUrl
                              ? <Image unoptimized width={28} height={28} src={c.logoUrl} alt={c.name}
                                  className="h-8 w-8 shrink-0 object-contain border border-[var(--sg-line)] bg-white p-0.5" />
                              : <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[var(--sg-panel-2)] border border-[var(--sg-line)] sg-font-display text-[13px] font-bold text-[var(--sg-accent)]">
                                  {c.name[0]}
                                </div>
                            }
                            <div className="min-w-0">
                              <span className="sg-font-display text-[13px] font-bold uppercase tracking-tight text-[var(--sg-ink)] block truncate max-w-[160px]">
                                {c.name}
                              </span>
                              <span className="text-[10px] text-[var(--sg-muted)]">{c.sector}</span>
                            </div>
                          </div>
                        </td>

                        {/* Plan */}
                        <td>
                          <PlanBadge plan={c.plan} daysLeft={c.trialDaysLeft} expired={c.trialExpired} />
                        </td>

                        {/* Health score */}
                        <td><HealthScoreBar score={score} size="sm" /></td>

                        {/* Sedes */}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-[var(--sg-muted)]" />
                            <span className="sg-font-mono text-[12px]">{c.plantas.length}</span>
                          </div>
                        </td>

                        {/* Usuarios */}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-[var(--sg-muted)]" />
                            <span className="sg-font-mono text-[12px]">{c.users}</span>
                            <span className="sg-font-mono text-[9px] text-[var(--sg-muted)]">
                              ({c.guardias}g · {c.supervisors}s)
                            </span>
                          </div>
                        </td>

                        {/* Registros */}
                        <td className="sg-font-mono text-[12px] font-bold text-[var(--sg-ink)]">
                          {c.totalRecords.toLocaleString()}
                        </td>

                        {/* 30 días */}
                        <td>
                          <span className={`sg-font-mono text-[12px] font-bold ${c.recentRecords > 0 ? "text-[var(--sg-success)]" : "text-[var(--sg-muted)]"}`}>
                            {c.recentRecords > 0 ? `+${c.recentRecords}` : "—"}
                          </span>
                        </td>

                        {/* Última actividad */}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-[var(--sg-muted)]" />
                            <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                              {c.lastActivity
                                ? new Date(c.lastActivity + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" })
                                : "Sin registros"}
                            </span>
                          </div>
                        </td>

                        {/* Intervenciones */}
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {interventions.map(type => <InterventionBadge key={type} type={type} />)}
                            {interventions.length === 0 && (
                              <span className="flex items-center gap-1 sg-font-mono text-[9px] text-[var(--sg-success)]">
                                <CheckCircle2 className="h-3 w-3" /> Todo OK
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Acciones */}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => router.push(`/admin/${c.id}`)}
                              className="flex items-center gap-1.5 border border-[var(--sg-line)] px-2.5 py-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] transition-colors"
                              title="Gestionar empresa"
                            >
                              <Settings className="h-3 w-3" /> Gestionar
                            </button>
                            <button
                              onClick={async () => {
                                const { startImpersonation } = await import("@/app/actions/companies");
                                await startImpersonation(c.id);
                                router.push("/dashboard");
                              }}
                              className="flex items-center gap-1.5 border border-[var(--sg-accent)] px-2 py-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)] hover:bg-[var(--sg-accent)] hover:text-[var(--sg-canvas)] transition-colors"
                              title="Ver como supervisor"
                            >
                              <Eye className="h-3 w-3" /> Ver como
                            </button>
                            {!c.hasContacts && (
                              <a
                                href={`mailto:soporte@smartguard.io?subject=Configurar alertas - ${encodeURIComponent(c.name)}`}
                                className="flex items-center gap-1 border border-[var(--sg-line)] px-1.5 py-1.5 text-[var(--sg-muted)] hover:text-[var(--sg-accent)] transition-colors"
                                title="Contactar supervisor"
                              >
                                <Send className="h-3 w-3" />
                              </a>
                            )}
                            <button
                              onClick={() => setConfirmDelete(c)}
                              className="flex items-center gap-1 border border-[var(--sg-line)] px-1.5 py-1.5 text-[var(--sg-muted)] hover:border-[var(--sg-danger)] hover:text-[var(--sg-danger)] transition-colors"
                              title="Eliminar empresa"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Health score legend */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Health Score:</span>
            {[
              { score: 90, label: "80-100 Saludable" },
              { score: 60, label: "50-79 Atención" },
              { score: 30, label: "0-49 Crítico" },
            ].map(({ score, label }) => (
              <div key={score} className="flex items-center gap-2">
                <HealthScoreBar score={score} size="sm" />
                <span className="text-[9px] text-[var(--sg-muted)]">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Deleted companies ─────────────────────────── */}
      {deletedCompanies.length > 0 && (
        <div className="mt-10">
          <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] mb-3">
            Empresas eliminadas ({deletedCompanies.length})
          </div>
          <div className="sg-panel overflow-x-auto">
            <table className="sg-table min-w-[600px]">
              <thead>
                <tr><th>Empresa</th><th>Eliminada el</th><th></th></tr>
              </thead>
              <tbody>
                {deletedCompanies.map(c => (
                  <tr key={c.id} className="opacity-50 hover:opacity-100 transition-opacity">
                    <td>
                      <span className="sg-font-display text-[13px] font-bold uppercase tracking-tight text-[var(--sg-ink)] line-through">
                        {c.name}
                      </span>
                    </td>
                    <td className="sg-font-mono text-[11px] text-[var(--sg-muted)]">
                      {new Date(c.deletedAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td>
                      <button
                        disabled={reactivatingId === c.id}
                        onClick={async () => {
                          setReactivatingId(c.id);
                          const { reactivateCompany } = await import("@/app/actions/companies");
                          await reactivateCompany(c.id);
                          await reload();
                          setReactivatingId(null);
                        }}
                        className="flex items-center gap-1.5 border border-[var(--sg-line)] px-2.5 py-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-success)] hover:text-[var(--sg-success)] transition-colors disabled:opacity-40"
                      >
                        <RefreshCw className={`h-3 w-3 ${reactivatingId === c.id ? "animate-spin" : ""}`} />
                        Reactivar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ──────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ ease: easeOut }}
              className="sg-panel p-8 max-w-sm w-full mx-4 flex flex-col gap-5"
              onClick={e => e.stopPropagation()}
            >
              <div>
                <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-danger)] mb-2">
                  Eliminar empresa
                </div>
                <p className="text-[13px] text-[var(--sg-copy)]">
                  ¿Eliminar <strong className="text-[var(--sg-ink)]">{confirmDelete.name}</strong>?
                  Sus datos se conservan — puedes reactivarla cuando quieras.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="border border-[var(--sg-line)] px-4 py-2 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={deletingId === confirmDelete.id}
                  onClick={async () => {
                    setDeletingId(confirmDelete.id);
                    const { deleteCompany } = await import("@/app/actions/companies");
                    await deleteCompany(confirmDelete.id);
                    await reload();
                    setDeletingId(null);
                    setConfirmDelete(null);
                  }}
                  className="border border-[var(--sg-danger)] bg-[var(--sg-danger)] px-4 py-2 sg-font-mono text-[10px] uppercase tracking-widest text-white hover:opacity-80 transition-opacity disabled:opacity-40"
                >
                  {deletingId === confirmDelete.id ? "Eliminando..." : "Sí, eliminar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </AppLayout>
  );
}
