"use client";

import AppLayout from "@/components/AppLayout";
import { getAlertsData, getIncidentsByDate, getAlertLogs, getUserProfile, getCompaniesMap } from "@/app/actions";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bell, Building2, Clock, Mail, MessageSquare, RefreshCw, Timer, TrendingUp, X } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

type AlertsData = Awaited<ReturnType<typeof getAlertsData>>;
type AlertSummary = AlertsData["alerts"][number] & {
  company_id?: string | null;
  isLive?: boolean;
  motivo_demora?: string | null;
  responsable?: string | null;
  agente?: string | null;
};
type IncidentAlert = Awaited<ReturnType<typeof getIncidentsByDate>>[number] & {
  isLive?: boolean;
};
type AlertDetail = AlertSummary | IncidentAlert;
type AlertLogRow = Awaited<ReturnType<typeof getAlertLogs>>[number];
type AlertHistoryPoint = AlertsData["histChart"][number];
type AlertKpis = AlertsData["kpis"];

const EMPTY_KPIS: AlertKpis = {
  total: 0,
  enEspera: 0,
  criticos: 0,
  altos: 0,
  moderados: 0,
};

function hasFullDate(value: unknown): value is AlertHistoryPoint {
  return Boolean(
    value &&
    typeof value === "object" &&
    "fullDate" in value &&
    typeof value.fullDate === "string"
  );
}

function severityConfig(espera: number | null) {
  if (espera == null) return { label: "N/A", color: "var(--sg-muted)", border: "var(--sg-line)", bg: "transparent" };
  if (espera >= 90) return { label: "Crítico", color: "var(--sg-danger)", border: "var(--sg-danger)", bg: "rgba(211,92,79,0.08)" };
  if (espera >= 45) return { label: "Alto",    color: "#e07b3a",          border: "#e07b3a",          bg: "rgba(224,123,58,0.08)" };
  return                   { label: "Moderado", color: "var(--sg-warn)",  border: "var(--sg-warn)",  bg: "rgba(200,168,75,0.08)" };
}

// ─── Alert Detail Modal ──────────────────────────────────────────────────────

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">{label}</span>
      <span className={`text-[13px] text-[var(--sg-ink)] ${mono ? "sg-font-mono tracking-[0.08em]" : ""}`}>
        {value ?? <span className="text-[var(--sg-muted)]">—</span>}
      </span>
    </div>
  );
}

function AlertDetailModal({ alert: a, onClose }: { alert: AlertDetail; onClose: () => void }) {
  const sev = severityConfig(a.espera_min);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.78)] backdrop-blur-sm px-4 py-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: easeOut }}
        className="w-full max-w-[520px] bg-[var(--sg-panel)] shadow-[12px_12px_0_rgba(196,192,180,0.06)]"
        style={{ border: `1px solid ${sev.border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{ borderBottom: `1px solid ${sev.border}40`, background: sev.bg }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center"
              style={{ background: sev.color }}
            >
              {a.isLive
                ? <Timer className="h-4 w-4 text-[var(--sg-canvas)]" />
                : <AlertTriangle className="h-4 w-4 text-[var(--sg-canvas)]" />
              }
            </div>
            <div>
              <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.14em]" style={{ color: sev.color }}>
                {sev.label} — {a.espera_min} min
              </div>
              <div className="sg-font-mono text-[10px] text-[var(--sg-muted)] mt-0.5">
                {a.planta} · {a.isLive ? "Actualmente en espera" : "Atención registrada"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {a.isLive && (
              <span className="sg-live-pill">
                <span className="sg-live-dot sg-pulse" />
                En vivo
              </span>
            )}
            <button onClick={onClose} className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">

          {/* Empresa */}
          <section className="border border-[var(--sg-line)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-3.5 w-3.5 text-[var(--sg-muted)]" />
              <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Vehículo / Empresa</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Razón Social" value={a.razon_social} />
              <Field label="Empresa" value={a.empresa} />
              <Field label="Planta" value={a.planta} />
              <Field label="Tipo de operación" value={a.tipo_operacion} />
            </div>
          </section>

          {/* Tiempos */}
          <section className="border p-4" style={{ borderColor: `${sev.border}50`, background: `${sev.bg}` }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-3.5 w-3.5" style={{ color: sev.color }} />
              <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: sev.color }}>Tiempos</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Field label="H. Registro" value={a.h_registro?.substring(0, 5)} mono />
              <Field
                label="H. Atención"
                value={a.isLive
                  ? <span className="text-[var(--sg-info)]">Pendiente</span>
                  : a.h_atencion?.substring(0, 5)
                }
                mono
              />
              <div className="flex flex-col gap-0.5">
                <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Espera</span>
                <span className="sg-font-mono text-[24px] font-bold leading-none" style={{ color: sev.color }}>
                  {a.espera_min}<span className="text-[14px] ml-1">min</span>
                </span>
                {a.isLive && (
                  <span className="sg-font-mono text-[9px] uppercase tracking-widest" style={{ color: sev.color }}>
                    ↑ Creciendo
                  </span>
                )}
              </div>
            </div>
            {!a.isLive && a.segmento_espera && (
              <Field label="Segmento" value={a.segmento_espera} />
            )}
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-[var(--sg-line)] px-5 py-4 flex items-center justify-between">
          <div className="sg-font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sg-muted)]">
            Incidente #{a.id} · {a.planta}
          </div>
          <button onClick={onClose} className="sg-btn sg-btn-ghost sg-btn-sm">
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Day Incidents Modal ─────────────────────────────────────────────────────

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function formatFullDate(iso: string) {
  const [, mm, dd] = iso.split("-");
  return `${parseInt(dd)} ${MONTHS[parseInt(mm) - 1]}`;
}

function DayIncidentsModal({ date, onClose }: { date: string; onClose: () => void }) {
  const [rows, setRows] = useState<IncidentAlert[]>([]);
  const [fetching, setFetching] = useState(true);
  const [inner, setInner] = useState<AlertDetail | null>(null);

  useEffect(() => {
    getIncidentsByDate(date).then(data => { setRows(data); setFetching(false); });
  }, [date]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { if (inner) setInner(null); else onClose(); }};
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, inner]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.78)] backdrop-blur-sm px-4 py-8"
      onClick={() => { if (inner) setInner(null); else onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: easeOut }}
        className="w-full max-w-[600px] border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[12px_12px_0_rgba(196,192,180,0.06)] max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--sg-line)] px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center bg-[var(--sg-danger)]">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--sg-canvas)]" />
            </div>
            <div>
              <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.14em] text-[var(--sg-ink)]">
                Incidentes · {formatFullDate(date)}
              </div>
              <div className="sg-font-mono text-[10px] text-[var(--sg-muted)] mt-0.5">
                {fetching ? "Cargando…" : `${rows.length} registro${rows.length !== 1 ? "s" : ""} con espera ≥ 30 min`}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {fetching ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-[var(--sg-panel-2)] border-l-4 border-transparent" />
            ))
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--sg-muted)]">
              <Bell className="h-10 w-10 opacity-10 mb-3" />
              <p className="sg-font-mono text-[11px] uppercase tracking-widest">Sin incidentes ese día</p>
            </div>
          ) : rows.map((r, i) => {
            const sev = severityConfig(r.espera_min);
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3, ease: easeOut }}
                onClick={() => setInner(r)}
                className="flex items-center gap-4 border-l-4 px-4 py-3 cursor-pointer transition-opacity hover:opacity-75"
                style={{ borderLeftColor: sev.color, background: sev.bg, borderTop: `1px solid ${sev.border}15`, borderRight: `1px solid ${sev.border}15`, borderBottom: `1px solid ${sev.border}15` }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="sg-font-display text-[13px] font-bold text-[var(--sg-ink)] truncate max-w-[220px]">
                      {r.razon_social || "N/A"}
                    </span>
                    <span className="sg-font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border" style={{ color: sev.color, borderColor: `${sev.color}40` }}>
                      {sev.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] text-[var(--sg-copy)]">{r.empresa || "Sin empresa"} · {r.planta}</span>
                    <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                      {r.h_registro?.substring(0, 5)} → {r.h_atencion?.substring(0, 5) ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="sg-font-mono text-[18px] font-bold" style={{ color: sev.color }}>
                    {r.espera_min} min
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="border-t border-[var(--sg-line)] px-5 py-3 shrink-0 flex justify-end">
          <button onClick={onClose} className="sg-btn sg-btn-ghost sg-btn-sm">Cerrar</button>
        </div>
      </motion.div>

      {/* Inner detail modal al hacer click en una fila */}
      <AnimatePresence>
        {inner && <AlertDetailModal alert={inner} onClose={() => setInner(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AlertasPage() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertDetail | null>(null);
  const [selectedDay,   setSelectedDay]   = useState<string | null>(null);
  const [alertLogs,     setAlertLogs]     = useState<AlertLogRow[]>([]);
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [companiesMap,  setCompaniesMap]  = useState<Record<string, string>>({});

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [result, logs] = await Promise.all([getAlertsData(), getAlertLogs()]);
      setData(result);
      setAlertLogs(logs);
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const [result, logs, profile] = await Promise.all([getAlertsData(), getAlertLogs(), getUserProfile()]);
        if (!active) return;

        setData(result);
        setAlertLogs(logs);
        setIsAdmin(Boolean(profile?.isAdmin));

        if (!profile?.isAdmin) {
          setCompaniesMap({});
          return;
        }

        const companyMap = await getCompaniesMap();
        if (active) {
          setCompaniesMap(companyMap);
        }
      } finally {
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

  const kpis = data?.kpis ?? EMPTY_KPIS;
  const alerts  = data?.alerts   ?? [];
  const histChart = data?.histChart ?? [];

  return (
    <AppLayout>
      <AnimatePresence>
        {selectedAlert && (
          <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
        )}
        {selectedDay && !selectedAlert && (
          <DayIncidentsModal date={selectedDay} onClose={() => setSelectedDay(null)} />
        )}
      </AnimatePresence>

      {/* Topbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-5">
        <div className="flex items-center gap-4">
          <div className="sg-kicker">Alertas</div>
          <span className="sg-live-pill">
            <span className="sg-live-dot sg-pulse" />
            Monitoreo en vivo
          </span>
        </div>
        <button
          onClick={() => load(true)}
          className="flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
        >
          <motion.span
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : {}}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </motion.span>
          Actualizar
        </button>
      </div>

      {/* KPI Strip */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
        className="mb-6 grid grid-cols-2 gap-0 border border-[var(--sg-line)] md:grid-cols-5"
      >
        {[
          { label: "Registros hoy",        val: kpis.total,     color: "var(--sg-ink)" },
          { label: "En espera ahora",       val: kpis.enEspera,  color: "var(--sg-info)" },
          { label: "Críticos (> 90 min)",   val: kpis.criticos,  color: "var(--sg-danger)" },
          { label: "Altos (45–90 min)",     val: kpis.altos,     color: "#e07b3a" },
          { label: "Moderados (30–45 min)", val: kpis.moderados, color: "var(--sg-warn)" },
        ].map((k, i) => (
          <div
            key={k.label}
            className={`sg-stat ${i < 4 ? "border-b border-[var(--sg-line)] md:border-b-0" : ""}`}
          >
            <div>
              <span className="sg-stat-num" style={{ color: k.color, fontSize: 36 }}>
                {loading ? "—" : k.val}
              </span>
            </div>
            <div className="sg-stat-label">{k.label}</div>
          </div>
        ))}
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Alert list */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="sg-slabel">Incidentes del día — espera ≥ 30 min</div>
            {!loading && alerts.length > 0 && (
              <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] opacity-60">
                Click para ver detalle
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={`skel-${i}`} className="flex items-center gap-4 border-l-4 p-4 border-transparent bg-[var(--sg-panel-2)] animate-pulse">
                  <div className="h-5 w-5 shrink-0 bg-[var(--sg-panel-3)] rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-[var(--sg-panel-3)]" />
                    <div className="h-3 w-1/2 bg-[var(--sg-panel-3)]" />
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    <div className="h-6 w-16 bg-[var(--sg-panel-3)] ml-auto" />
                    <div className="h-3 w-20 bg-[var(--sg-panel-3)] ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-[var(--sg-line)] py-20 text-[var(--sg-muted)]">
              <Bell className="h-12 w-12 opacity-10 mb-4" />
              <p className="sg-font-mono text-[12px] uppercase tracking-widest">Sin incidentes hoy</p>
              <p className="text-[12px] mt-1 opacity-60">Todos los vehículos dentro de tiempo normal</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {alerts.map((a, i) => {
                const sev = severityConfig(a.espera_min);
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.4, ease: easeOut }}
                    onClick={() => setSelectedAlert(a)}
                    className="flex items-center gap-4 border-l-4 p-4 cursor-pointer transition-opacity hover:opacity-80"
                    style={{ borderLeftColor: sev.color, background: sev.bg, borderTop: `1px solid ${sev.border}20`, borderRight: `1px solid ${sev.border}20`, borderBottom: `1px solid ${sev.border}20` }}
                    title="Ver detalle del incidente"
                  >
                    {a.isLive
                      ? <Timer className="h-5 w-5 shrink-0" style={{ color: sev.color }} />
                      : <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: sev.color }} />
                    }

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="sg-font-display text-[14px] font-bold text-[var(--sg-ink)] truncate max-w-[260px]">
                          {a.razon_social || "N/A"}
                        </span>
                        <span
                          className="sg-font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 border"
                          style={{ color: sev.color, borderColor: `${sev.color}40` }}
                        >
                          {sev.label}
                        </span>
                        {a.isLive && (
                          <span className="sg-live-pill">
                            <span className="sg-live-dot sg-pulse" />
                            En espera
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        {isAdmin && a.company_id && companiesMap[a.company_id] && (
                          <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)] border border-[rgba(200,168,75,0.3)] px-2 py-0.5">
                            {companiesMap[a.company_id]}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-[12px] text-[var(--sg-copy)]">
                          <Building2 className="h-3 w-3 text-[var(--sg-muted)]" />
                          {a.empresa || "Sin empresa"} · {a.planta}
                        </span>
                        <span className="flex items-center gap-1.5 text-[12px] text-[var(--sg-muted)]">
                          <Clock className="h-3 w-3" />
                          Ingreso: {a.h_registro ? a.h_registro.substring(0, 5) : "--:--"}
                          {a.isLive
                            ? " · Aún en espera"
                            : a.h_atencion ? ` · Atendido: ${a.h_atencion.substring(0, 5)}` : " · Sin atención registrada"
                          }
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="sg-font-mono text-[20px] font-bold" style={{ color: sev.color }}>
                        {a.espera_min} min
                      </div>
                      <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                        {a.isLive ? "En espera" : "Demora final"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4">
          <div className="sg-panel-soft p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--sg-accent)]" />
                <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)]">
                  Incidentes — últimos 7 días
                </div>
              </div>
              <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] opacity-60">
                Click en barra
              </span>
            </div>
            <div className="h-[160px]">
              {mounted && histChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" debounce={200}>
                  <BarChart data={histChart} barCategoryGap={6}>
                    <CartesianGrid stroke="rgba(196,192,180,0.06)" vertical={false} />
                    <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fill: "#6a706c", fontSize: 9, fontFamily: "DM Mono" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6a706c", fontSize: 9, fontFamily: "DM Mono" }} width={22} />
                    <Tooltip
                      cursor={{ fill: "rgba(196,192,180,0.05)" }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="border border-[var(--sg-line)] bg-[var(--sg-panel)] px-3 py-2 text-[12px]">
                            <div className="text-[var(--sg-muted)] mb-1">{label}</div>
                            <div className="text-[var(--sg-danger)]">{payload[0].value} incidentes · click para ver</div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="n"
                      radius={0}
                      style={{ cursor: "pointer" }}
                      onClick={(barData) => {
                        if (hasFullDate(barData)) {
                          setSelectedDay(barData.fullDate);
                        }
                      }}
                    >
                      {histChart.map((_, i) => <Cell key={i} fill="var(--sg-danger)" fillOpacity={0.75} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-[var(--sg-muted)]">
                  Sin datos históricos
                </div>
              )}
            </div>
          </div>

          <div className="sg-panel-soft p-4">
            <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)] mb-3">
              Escala de severidad
            </div>
            <div className="flex flex-col gap-2">
              {[
                { color: "var(--sg-success)", label: "Normal",   range: "< 30 min" },
                { color: "var(--sg-warn)",    label: "Moderado", range: "30 – 45 min" },
                { color: "#e07b3a",           label: "Alto",     range: "45 – 90 min" },
                { color: "var(--sg-danger)",  label: "Crítico",  range: "> 90 min" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 shrink-0" style={{ background: s.color }} />
                    <span className="text-[12px] text-[var(--sg-copy)]">{s.label}</span>
                  </div>
                  <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">{s.range}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Historial de alertas enviadas ──────────────────────────────── */}
      {alertLogs.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="sg-kicker">Alertas Enviadas</div>
            <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">últimas 50</span>
          </div>
          <div className="sg-panel overflow-x-auto">
            <table className="sg-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Canal</th>
                  <th>Vehículo</th>
                  <th>Planta</th>
                  <th>Espera</th>
                  <th>Destinatario</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {alertLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="sg-font-mono text-[10px] text-[var(--sg-muted)] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("es-PE", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5">
                        {log.channel === "email"
                          ? <Mail className="h-3.5 w-3.5 text-[var(--sg-accent)]" />
                          : <MessageSquare className="h-3.5 w-3.5 text-[var(--sg-success)]" />}
                        <span className="sg-font-mono text-[10px] uppercase">{log.channel}</span>
                      </span>
                    </td>
                    <td className="max-w-[160px] truncate text-[12px]">{log.razon_social}</td>
                    <td className="sg-font-mono text-[10px] text-[var(--sg-muted)]">{log.planta || "—"}</td>
                    <td>
                      <span className="sg-font-mono text-[12px] font-bold" style={{
                        color: log.espera_min >= 90 ? "var(--sg-danger)" : log.espera_min >= 45 ? "#e07b3a" : "var(--sg-warn)"
                      }}>
                        {log.espera_min} min
                      </span>
                    </td>
                    <td className="sg-font-mono text-[10px] text-[var(--sg-muted)] max-w-[160px] truncate">{log.recipient}</td>
                    <td>
                      <span className={`sg-font-mono text-[9px] uppercase tracking-widest ${log.success ? "text-[var(--sg-success)]" : "text-[var(--sg-danger)]"}`}>
                        {log.success ? "✓ Enviado" : "✗ Error"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
