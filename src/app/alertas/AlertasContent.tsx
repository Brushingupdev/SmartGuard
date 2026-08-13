"use client";

import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  Clock,
  Mail,
  MessageSquare,
  RefreshCw,
  Timer,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatGateLabelFromPlant } from "@/lib/gates";
import ClientChartFrame from "@/components/ClientChartFrame";
import type {
  AlertDetail,
  AlertHistoryPoint,
  AlertLogRow,
  AlertSummary,
  GuardiaEventoAlert,
  GuardiaEventosAlertData,
} from "./alertasTypes";
import {
  easeOut,
  hasFullDate,
  severityConfig,
} from "./alertasUtils";

export function AlertasContent({
  loading,
  refreshing,
  onRefresh,
  kpis,
  alerts,
  isAdmin,
  companiesMap,
  onSelectAlert,
  histChart,
  onSelectDay,
  guardiaEventos,
  alertLogs,
  totalLogPages,
  currentLogsPage,
  onLogsPageChange,
  asOfDate,
}: {
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  kpis: {
    total: number;
    enEspera: number;
    criticos: number;
    altos: number;
    moderados: number;
  };
  alerts: AlertSummary[];
  isAdmin: boolean;
  companiesMap: Record<string, string>;
  onSelectAlert: (alert: AlertDetail) => void;
  histChart: AlertHistoryPoint[];
  onSelectDay: (date: string) => void;
  guardiaEventos: GuardiaEventosAlertData | null;
  alertLogs: AlertLogRow[];
  totalLogPages: number;
  currentLogsPage: number;
  onLogsPageChange: (page: number) => void;
  asOfDate: string | null;
}) {
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const guardiaEventSummary = guardiaEventos?.summary ?? {
    total: 0,
    urgentes: 0,
    incidentes: 0,
    novedades: 0,
  };
  const guardiaEventRows = guardiaEventos?.events ?? [];

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-5">
        <div className="flex items-center gap-4">
          <div className="sg-kicker">Alertas</div>
          <span className="sg-live-pill">
            <span className="sg-live-dot sg-pulse" />
            Monitoreo en vivo
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
        >
          <motion.span
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={
              refreshing
                ? { repeat: Infinity, duration: 0.8, ease: "linear" }
                : {}
            }
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </motion.span>
          Actualizar
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
        className="mb-6 grid grid-cols-2 gap-px border border-[var(--sg-line)] bg-[var(--sg-line)] sm:grid-cols-3 md:grid-cols-5"
      >
        {[
          { label: "Registros hoy", val: kpis.total, color: "var(--sg-ink)" },
          {
            label: "En espera ahora",
            val: kpis.enEspera,
            color: "var(--sg-info)",
          },
          {
            label: "Críticos (> 90 min)",
            val: kpis.criticos,
            color: "var(--sg-danger)",
          },
          { label: "Altos (45–90 min)", val: kpis.altos, color: "#e07b3a" },
          {
            label: "Moderados (30–45 min)",
            val: kpis.moderados,
            color: "var(--sg-warn)",
          },
        ].map((item, index) => (
          <div
            key={item.label}
            className={`sg-stat ${index < 4 ? "border-b border-[var(--sg-line)] md:border-b-0" : ""}`}
          >
            <div>
              <span
                className="sg-stat-num"
                style={{ color: item.color, fontSize: 36 }}
              >
                {loading ? "—" : item.val}
              </span>
            </div>
            <div className="sg-stat-label">{item.label}</div>
          </div>
        ))}
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="sg-slabel">Incidentes del día — espera ≥ 30 min</div>
            {!loading && alerts.length > 0 ? (
              <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] opacity-60">
                Click para ver detalle
              </span>
            ) : null}
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[...Array(4)].map((_, index) => (
                <div
                  key={`skel-${index}`}
                  className="animate-pulse border-l-4 border-transparent bg-[var(--sg-panel-2)] p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-5 w-5 shrink-0 rounded-full bg-[var(--sg-panel-3)]" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-1/3 bg-[var(--sg-panel-3)]" />
                      <div className="h-3 w-1/2 bg-[var(--sg-panel-3)]" />
                    </div>
                    <div className="shrink-0 space-y-1 text-right">
                      <div className="ml-auto h-6 w-16 bg-[var(--sg-panel-3)]" />
                      <div className="ml-auto h-3 w-20 bg-[var(--sg-panel-3)]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-[var(--sg-line)] py-20 text-[var(--sg-muted)]">
              <Bell className="mb-4 h-12 w-12 opacity-10" />
              <p className="sg-font-mono text-[12px] uppercase tracking-widest">
                Sin incidentes hoy
              </p>
              <p className="mt-1 text-[12px] opacity-60">
                {asOfDate
                  ? `Datos disponibles hasta ${asOfDate.split("-").reverse().join("/")}.`
                  : "No hay registros disponibles para la fecha actual."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {alerts.map((alert, index) => {
                const sev = severityConfig(alert.espera_min);
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: index * 0.04,
                      duration: 0.4,
                      ease: easeOut,
                    }}
                    onClick={() => onSelectAlert(alert)}
                    className="flex cursor-pointer items-center gap-4 border-l-4 p-4 transition-opacity hover:opacity-80"
                    style={{
                      borderLeftColor: sev.color,
                      background: sev.bg,
                      borderTop: `1px solid ${sev.border}20`,
                      borderRight: `1px solid ${sev.border}20`,
                      borderBottom: `1px solid ${sev.border}20`,
                    }}
                    title="Ver detalle del incidente"
                  >
                    {alert.isLive ? (
                      <Timer
                        className="h-5 w-5 shrink-0"
                        style={{ color: sev.color }}
                      />
                    ) : (
                      <AlertTriangle
                        className="h-5 w-5 shrink-0"
                        style={{ color: sev.color }}
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-3">
                        <span className="sg-font-display max-w-[260px] truncate text-[14px] font-bold text-[var(--sg-ink)]">
                          {alert.razon_social || "N/A"}
                        </span>
                        <span
                          className="sg-font-mono border px-2 py-0.5 text-[9px] uppercase tracking-widest"
                          style={{
                            color: sev.color,
                            borderColor: `${sev.color}40`,
                          }}
                        >
                          {sev.label}
                        </span>
                        {alert.isLive ? (
                          <span className="sg-live-pill">
                            <span className="sg-live-dot sg-pulse" />
                            En espera
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        {isAdmin && alert.company_id && companiesMap[alert.company_id] ? (
                          <span className="sg-font-mono border border-[rgba(200,168,75,0.3)] px-2 py-0.5 text-[9px] uppercase tracking-widest text-[var(--sg-accent)]">
                            {companiesMap[alert.company_id]}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1.5 text-[12px] text-[var(--sg-copy)]">
                          <Building2 className="h-3 w-3 text-[var(--sg-muted)]" />
                          {alert.empresa || "Sin empresa"} ·{" "}
                          {formatGateLabelFromPlant(alert.planta ?? "")}
                        </span>
                        <span className="flex items-center gap-1.5 text-[12px] text-[var(--sg-muted)]">
                          <Clock className="h-3 w-3" />
                          Ingreso:{" "}
                          {alert.h_registro ? alert.h_registro.substring(0, 5) : "--:--"}
                          {alert.isLive
                            ? " · Aún en espera"
                            : alert.h_atencion
                              ? ` · Atendido: ${alert.h_atencion.substring(0, 5)}`
                              : " · Sin atención registrada"}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div
                        className="sg-font-mono text-[20px] font-bold"
                        style={{ color: sev.color }}
                      >
                        {alert.espera_min} min
                      </div>
                      <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                        {alert.isLive ? "En espera" : "Demora final"}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <div className="sg-panel-soft p-4">
            <div className="mb-4 flex items-center justify-between">
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
            <ClientChartFrame className="h-[160px]">
              {(chartSize) => (
              <>
              {chartsReady && histChart.length > 0 ? (
                <ResponsiveContainer width={chartSize.width} height={chartSize.height} minWidth={0} minHeight={1} debounce={200}>
                  <BarChart data={histChart} barCategoryGap={6}>
                    <CartesianGrid
                      stroke="rgba(196,192,180,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="d"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6a706c", fontSize: 9, fontFamily: "DM Mono" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6a706c", fontSize: 9, fontFamily: "DM Mono" }}
                      width={22}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(196,192,180,0.05)" }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="border border-[var(--sg-line)] bg-[var(--sg-panel)] px-3 py-2 text-[12px]">
                            <div className="mb-1 text-[var(--sg-muted)]">
                              {label}
                            </div>
                            <div className="text-[var(--sg-danger)]">
                              {payload[0].value} incidentes · click para ver
                            </div>
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
                          onSelectDay(barData.fullDate);
                        }
                      }}
                    >
                      {histChart.map((_, index) => (
                        <Cell
                          key={index}
                          fill="var(--sg-danger)"
                          fillOpacity={0.75}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : chartsReady ? (
                <div className="flex h-full items-center justify-center text-[11px] text-[var(--sg-muted)]">
                  Sin datos históricos
                </div>
              ) : (
                <div className="h-full w-full animate-pulse bg-[var(--sg-panel-2)]" />
              )}
              </>
              )}
            </ClientChartFrame>
          </div>

          <div className="sg-panel-soft p-4">
            <div className="mb-3 sg-font-display text-[14px] font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)]">
              Escala de severidad
            </div>
            <div className="flex flex-col gap-2">
              {[
                {
                  color: "var(--sg-success)",
                  label: "Normal",
                  range: "< 30 min",
                },
                {
                  color: "var(--sg-warn)",
                  label: "Moderado",
                  range: "30 – 45 min",
                },
                { color: "#e07b3a", label: "Alto", range: "45 – 90 min" },
                {
                  color: "var(--sg-danger)",
                  label: "Crítico",
                  range: "> 90 min",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 shrink-0"
                      style={{ background: item.color }}
                    />
                    <span className="text-[12px] text-[var(--sg-copy)]">
                      {item.label}
                    </span>
                  </div>
                  <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                    {item.range}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="sg-panel-soft p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[var(--sg-accent)]" />
                <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)]">
                  Bitácora del día
                </div>
              </div>
              <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                {guardiaEventSummary.total} reporte
                {guardiaEventSummary.total === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                {
                  label: "Urgentes",
                  value: guardiaEventSummary.urgentes,
                  color: "var(--sg-danger)",
                },
                {
                  label: "Incidentes",
                  value: guardiaEventSummary.incidentes,
                  color: "#e07b3a",
                },
                {
                  label: "Novedades",
                  value: guardiaEventSummary.novedades,
                  color: "var(--sg-info)",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="border border-[var(--sg-line)] bg-[var(--sg-panel)] px-3 py-3"
                >
                  <div
                    className="sg-font-mono text-[18px] font-bold"
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </div>
                  <div className="mt-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {guardiaEventRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-[var(--sg-line)] py-8 text-[var(--sg-muted)]">
                <Bell className="mb-3 h-8 w-8 opacity-10" />
                <p className="sg-font-mono text-[10px] uppercase tracking-widest">
                  Sin reportes de bitácora hoy
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {guardiaEventRows.slice(0, 4).map((event: GuardiaEventoAlert) => {
                  const color =
                    event.urgente || event.tipo === "emergencia"
                      ? "var(--sg-danger)"
                      : event.tipo === "incidente"
                        ? "#e07b3a"
                        : "var(--sg-info)";
                  return (
                    <div
                      key={event.id}
                      className="border border-[var(--sg-line)] border-l-2 bg-[var(--sg-panel)] px-3 py-3"
                      style={{ borderLeftColor: color }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className="sg-font-mono text-[9px] uppercase tracking-widest"
                          style={{ color }}
                        >
                          {event.urgente && event.tipo !== "emergencia"
                            ? `${event.tipo} · urgente`
                            : event.tipo}
                        </span>
                        <span className="sg-font-mono text-[9px] text-[var(--sg-muted)]">
                          {new Date(event.created_at).toLocaleTimeString(
                            "es-PE",
                            { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }
                          )}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] leading-5 text-[var(--sg-copy)]">
                        {event.descripcion}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {isAdmin &&
                        event.company_id &&
                        companiesMap[event.company_id] ? (
                          <span className="sg-font-mono border border-[rgba(200,168,75,0.3)] px-2 py-0.5 text-[8px] uppercase tracking-widest text-[var(--sg-accent)]">
                            {companiesMap[event.company_id]}
                          </span>
                        ) : null}
                        <span className="sg-font-mono text-[8px] uppercase tracking-widest text-[var(--sg-muted)]">
                          {formatGateLabelFromPlant(event.planta ?? "")}
                        </span>
                        {event.foto_url ? (
                          <span className="sg-font-mono text-[8px] uppercase tracking-widest text-[var(--sg-muted)]">
                            Con evidencia
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {alertLogs.length > 0 ? (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="sg-kicker">Alertas Enviadas</div>
            <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
              {alertLogs.length} total
            </span>
          </div>
          <div className="sg-panel overflow-x-auto">
            <table className="sg-table min-w-[360px] sm:min-w-[640px]">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="hidden sm:table-cell">Canal</th>
                  <th>Vehículo</th>
                  <th className="hidden md:table-cell">Puerta</th>
                  <th>Espera</th>
                  <th className="hidden sm:table-cell">Destinatario</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {alertLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="sg-font-mono whitespace-nowrap text-[10px] text-[var(--sg-muted)]">
                      {new Date(log.created_at).toLocaleString("es-PE", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Lima",
                      })}
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="flex items-center gap-1.5">
                        {log.channel === "email" ? (
                          <Mail className="h-3.5 w-3.5 text-[var(--sg-accent)]" />
                        ) : (
                          <MessageSquare className="h-3.5 w-3.5 text-[var(--sg-success)]" />
                        )}
                        <span className="sg-font-mono text-[10px] uppercase">
                          {log.channel}
                        </span>
                      </span>
                    </td>
                    <td className="max-w-[120px] truncate text-[12px] sm:max-w-[160px]">
                      {log.razon_social}
                    </td>
                    <td className="sg-font-mono hidden text-[10px] text-[var(--sg-muted)] md:table-cell">
                      {formatGateLabelFromPlant(log.planta ?? "") || "—"}
                    </td>
                    <td>
                      <span
                        className="sg-font-mono text-[12px] font-bold"
                        style={{
                          color:
                            log.espera_min >= 90
                              ? "var(--sg-danger)"
                              : log.espera_min >= 45
                                ? "#e07b3a"
                                : "var(--sg-warn)",
                        }}
                      >
                        {log.espera_min} min
                      </span>
                    </td>
                    <td className="sg-font-mono hidden max-w-[160px] truncate text-[10px] text-[var(--sg-muted)] sm:table-cell">
                      {log.recipient}
                    </td>
                    <td>
                      <span
                        className={`sg-font-mono text-[9px] uppercase tracking-widest ${log.success ? "text-[var(--sg-success)]" : "text-[var(--sg-danger)]"}`}
                      >
                        {log.success ? "✓" : "✗"}
                        <span className="hidden sm:inline">
                          {log.success ? " Enviado" : " Error"}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalLogPages > 1 ? (
              <div className="flex items-center justify-between border-t border-[var(--sg-line)] px-4 py-3">
                <button
                  onClick={() => onLogsPageChange(Math.max(1, currentLogsPage - 1))}
                  disabled={currentLogsPage === 1}
                  className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ← Anterior
                </button>
                <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                  {currentLogsPage} / {totalLogPages}
                </span>
                <button
                  onClick={() =>
                    onLogsPageChange(Math.min(totalLogPages, currentLogsPage + 1))
                  }
                  disabled={currentLogsPage === totalLogPages}
                  className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-ink)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Siguiente →
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
