"use client";

import AppLayout from "@/components/AppLayout";
import { getPlatformStats } from "@/app/actions";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertCircle, AlertTriangle, Bell, Building2,
  CheckCircle2, Mail, MessageSquare, RefreshCw, Users, Zap,
} from "lucide-react";

type Stats = Awaited<ReturnType<typeof getPlatformStats>>;

interface RecentLogRow {
  id: string;
  channel: string;
  companyName: string;
  success: boolean;
  razon_social: string;
  recipient: string;
  created_at: string;
}

function KpiCard({ icon: Icon, label, value, sub, color = "var(--sg-ink)" }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="sg-panel p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">{label}</span>
      </div>
      <div className="sg-font-mono text-[24px] sm:text-[30px] font-bold leading-none" style={{ color }}>{value}</div>
      {sub && <p className="text-[10px] text-[var(--sg-muted)]">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: "ok" | "warn" | "risk" }) {
  if (status === "ok")   return <span className="flex items-center gap-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-success)]"><CheckCircle2 className="h-3 w-3" />Ok</span>;
  if (status === "warn") return <span className="flex items-center gap-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-warn)]"><AlertTriangle className="h-3 w-3" />Atención</span>;
  return <span className="flex items-center gap-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-danger)]"><AlertCircle className="h-3 w-3" />Riesgo</span>;
}

function ConfigIcon({ ok, icon: Icon }: { ok: boolean; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span title={ok ? "Configurado" : "Sin configurar"}>
      <Icon className={`h-3.5 w-3.5 ${ok ? "text-[var(--sg-success)]" : "text-[var(--sg-danger)] opacity-40"}`} />
    </span>
  );
}

export default function MonitorPage() {
  const [stats,     setStats]     = useState<Stats>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const data = await getPlatformStats();
      setStats(data);
    } finally {
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const data = await getPlatformStats();
        if (active) {
          setStats(data);
          setLoading(false);
        }
      } catch {
        if (active) {
          setLoading(false);
        }
      }
    };

    void bootstrap();
    const id = setInterval(() => {
      void load(true);
    }, 60_000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [load]);

  const s = stats;

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6 border-b border-[var(--sg-line)] pb-5 flex items-center justify-between">
        <div>
          <div className="sg-kicker mb-1">Monitor de Plataforma</div>
          <h1 className="sg-font-display text-[20px] sm:text-[24px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
            Salud del sistema
          </h1>
          <p className="text-[11px] text-[var(--sg-muted)] mt-1">
            Estado operativo y entrega de alertas para todos los clientes
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors">
          <motion.span animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}>
            <RefreshCw className="h-3.5 w-3.5" />
          </motion.span>
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse bg-[var(--sg-panel-2)]" />
        )) : (
          <>
            <KpiCard icon={Bell} label="Alertas enviadas hoy"
              value={s?.sentToday ?? 0}
              sub={`${s?.successToday ?? 0} exitosas`}
              color={s?.sentToday === 0 ? "var(--sg-muted)" : "var(--sg-ink)"} />

            <KpiCard icon={Zap} label="Tasa de entrega"
              value={s?.deliveryRate != null ? `${s.deliveryRate}%` : "—"}
              sub="alertas que llegaron correctamente"
              color={s?.deliveryRate == null ? "var(--sg-muted)" : s.deliveryRate >= 90 ? "var(--sg-success)" : s.deliveryRate >= 70 ? "var(--sg-warn)" : "var(--sg-danger)"} />

            <KpiCard icon={Building2} label="Empresas activas esta semana"
              value={`${s?.activeThisWeek ?? 0}/${s?.totalCompanies ?? 0}`}
              sub="con registros en los últimos 7 días"
              color={(s?.activeThisWeek ?? 0) === (s?.totalCompanies ?? 0) ? "var(--sg-success)" : "var(--sg-warn)"} />

            <KpiCard icon={AlertTriangle} label="Configs. incompletas"
              value={s?.incompleteConfig ?? 0}
              sub="empresas con alertas o datos faltantes"
              color={(s?.incompleteConfig ?? 0) === 0 ? "var(--sg-success)" : "var(--sg-danger)"} />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">

        {/* ── Tabla salud por empresa ─────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">Estado por empresa</div>
          <div className="sg-panel overflow-x-auto">
            {loading ? <div className="h-40 animate-pulse bg-[var(--sg-panel-2)]" /> : (
              <table className="sg-table min-w-[560px]">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th title="Actividad últimos 7 días">Act. 7d</th>
                    <th title="Email configurado">✉</th>
                    <th title="WhatsApp configurado">💬</th>
                    <th title="Usuarios creados">Usuarios</th>
                    <th>Problemas</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(s?.companyStats ?? []).map((c, i) => (
                    <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          {c.logoUrl
                            ? <Image unoptimized width={28} height={28} src={c.logoUrl} alt={c.name} className="h-7 w-7 shrink-0 object-contain border border-[var(--sg-line)] bg-white p-0.5" />
                            : <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--sg-panel-2)] border border-[var(--sg-line)] sg-font-display text-[12px] font-bold text-[var(--sg-accent)]">{c.name[0]}</div>
                          }
                          <span className="sg-font-display text-[12px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">{c.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`sg-font-mono text-[12px] font-bold ${c.weekActivity > 0 ? "text-[var(--sg-success)]" : "text-[var(--sg-danger)]"}`}>
                          {c.weekActivity > 0 ? `+${c.weekActivity}` : "Inactiva"}
                        </span>
                      </td>
                      <td><ConfigIcon ok={c.hasEmail} icon={Mail} /></td>
                      <td><ConfigIcon ok={c.hasPhone} icon={MessageSquare} /></td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-[var(--sg-muted)]" />
                          <span className="sg-font-mono text-[11px]">{c.users}</span>
                        </div>
                      </td>
                      <td>
                        {c.issues.length === 0
                          ? <span className="text-[10px] text-[var(--sg-muted)]">—</span>
                          : <div className="flex flex-col gap-0.5">
                              {c.issues.map(issue => (
                                <span key={issue} className="text-[10px] text-[var(--sg-warn)]">· {issue}</span>
                              ))}
                            </div>
                        }
                      </td>
                      <td><StatusBadge status={c.status} /></td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Log de alertas recientes ────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
            Alertas enviadas recientes
          </div>
          <div className="sg-panel divide-y divide-[var(--sg-line)] max-h-[520px] overflow-y-auto">
            {loading ? (
              <div className="h-40 animate-pulse bg-[var(--sg-panel-2)]" />
            ) : (s?.recentLogs ?? []).length === 0 ? (
              <div className="p-6 text-center sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)]">
                Sin alertas enviadas aún
              </div>
            ) : (
              (s?.recentLogs ?? []).map((log: RecentLogRow) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  {log.channel === "email"
                    ? <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--sg-accent)]" />
                    : <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--sg-success)]" />
                  }
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)] truncate">
                        {log.companyName}
                      </span>
                      <span className={`sg-font-mono text-[9px] shrink-0 ${log.success ? "text-[var(--sg-success)]" : "text-[var(--sg-danger)]"}`}>
                        {log.success ? "✓" : "✗"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--sg-ink)] truncate">{log.razon_social}</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="sg-font-mono text-[9px] text-[var(--sg-muted)] truncate">{log.recipient}</span>
                      <span className="sg-font-mono text-[9px] text-[var(--sg-muted)] shrink-0 ml-2">
                        {new Date(log.created_at).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
