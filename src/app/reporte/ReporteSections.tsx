"use client";

import DiagnosticoOperativo from "@/components/DiagnosticoOperativo";
import { formatGateLabelFromPlant } from "@/lib/gates";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  EmptyMsg,
  GradeBadge,
  HeatmapGrid,
  Section,
  Skel,
  TrendIcon,
  TrendTip,
} from "./ReporteShared";
import { easeOut, esperaColor, pctColor, rateColor } from "./reporteUtils";
import type { DashboardTrendSummary, ReporteData } from "./reporteTypes";

export function ReporteSections({
  loading,
  data,
  trends,
  timeframe,
  plant,
  mounted,
  slaSort,
  toggleSlaSort,
  slaPage,
  setSlaPage,
  slaPageData,
  slaTotalPages,
  sortedSLA,
  SLA_PER_PAGE,
  agentPage,
  setAgentPage,
  agentPageData,
  agentTotalPages,
  AGENT_PER_PAGE,
}: {
  loading: boolean;
  data: ReporteData | null;
  trends: DashboardTrendSummary;
  timeframe: string;
  plant: string;
  mounted: boolean;
  slaSort: { col: string; dir: "asc" | "desc" };
  toggleSlaSort: (col: string) => void;
  slaPage: number;
  setSlaPage: (updater: (previous: number) => number) => void;
  slaPageData: ReporteData["providerSLA"];
  slaTotalPages: number;
  sortedSLA: ReporteData["providerSLA"];
  SLA_PER_PAGE: number;
  agentPage: number;
  setAgentPage: (updater: (previous: number) => number) => void;
  agentPageData: ReporteData["agentStats"];
  agentTotalPages: number;
  AGENT_PER_PAGE: number;
}) {
  const report = data;

  return (
    <div className="flex flex-col gap-6">
      {!loading && report && (
        <DiagnosticoOperativo
          kpis={{
            ok: report.ok,
            warn: report.warn,
            deny: report.alto + report.critico,
            pending: report.pending,
            total: report.total,
          }}
          trends={trends}
          heatmapData={report.heatmap}
          delayReasons={report.delayReasons}
          zones={report.plantStats.map((plantStat) => ({
            name: plantStat.planta,
            count: plantStat.total,
            pct: plantStat.pctOnTime ?? 0,
            tone: ((plantStat.pctOnTime ?? 0) >= 70
              ? "ok"
              : "deny") as "ok" | "deny",
          }))}
          topProvider={
            report.providerSLA.length > 0
              ? {
                  empresa: report.providerSLA[0].empresa,
                  rate: report.providerSLA[0].rate,
                  total: report.providerSLA[0].total,
                  delayed: report.providerSLA[0].delayed,
                }
              : null
          }
          timeframe={timeframe}
          reporteHref={`/reporte?plant=${encodeURIComponent(plant)}&timeframe=${encodeURIComponent(timeframe)}`}
        />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Section title="Comparativo por Puerta">
          {loading ? (
            <Skel h="h-[220px]" />
          ) : !report ? (
            <EmptyMsg />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {report.plantStats.map((plantStat) => (
                <div key={plantStat.planta} className="sg-panel p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="sg-font-display text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--sg-ink)]">
                      {formatGateLabelFromPlant(plantStat.planta)}
                    </span>
                    <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                      {plantStat.total} registros
                    </span>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    {[
                      {
                        label: "A tiempo",
                        val: plantStat.ok,
                        color: "var(--sg-success)",
                      },
                      {
                        label: "Moderado",
                        val: plantStat.warn,
                        color: "var(--sg-warn)",
                      },
                      { label: "Alto", val: plantStat.alto, color: "#e07b3a" },
                      {
                        label: "Crítico",
                        val: plantStat.critico,
                        color: "var(--sg-danger)",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="bg-[var(--sg-panel-2)] px-3 py-2.5"
                      >
                        <div
                          className="sg-font-mono text-[18px] font-bold"
                          style={{ color: item.color }}
                        >
                          {item.val}
                        </div>
                        <div className="sg-font-mono mt-0.5 text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1.5 border-t border-[var(--sg-line)] pt-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--sg-muted)]">
                        Espera promedio
                      </span>
                      <span
                        className="sg-font-mono font-bold"
                        style={{ color: esperaColor(plantStat.avg) }}
                      >
                        {plantStat.avg} min
                      </span>
                    </div>
                    {plantStat.pctOnTime !== null && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--sg-muted)]">% a tiempo</span>
                        <span
                          className="sg-font-mono font-bold"
                          style={{ color: pctColor(plantStat.pctOnTime) }}
                        >
                          {plantStat.pctOnTime}%
                        </span>
                      </div>
                    )}
                    {plantStat.pending > 0 && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--sg-muted)]">Pendientes</span>
                        <span className="sg-font-mono text-[var(--sg-info)]">
                          {plantStat.pending}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Distribución por Segmento">
          {loading ? (
            <Skel h="h-[220px]" />
          ) : !report ? (
            <EmptyMsg />
          ) : (
            <div className="sg-panel flex flex-col gap-5 p-5">
              <div className="grid grid-cols-3 gap-2 border-b border-[var(--sg-line)] pb-4">
                {[
                  { label: "Total", val: report.total, color: "var(--sg-ink)" },
                  {
                    label: "A tiempo",
                    val: `${report.pctOnTime ?? 0}%`,
                    color: pctColor(report.pctOnTime ?? 0),
                  },
                  {
                    label: "Crítico",
                    val: report.critico,
                    color: "var(--sg-danger)",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-[var(--sg-panel-2)] px-3 py-2.5"
                  >
                    <div
                      className="sg-font-mono text-[18px] font-bold leading-none"
                      style={{ color: stat.color }}
                    >
                      {stat.val}
                    </div>
                    <div className="sg-font-mono mt-1 text-[8px] uppercase tracking-widest text-[var(--sg-muted)]">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                {report.segments.map((segment) => (
                  <div key={segment.name}>
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2 text-[var(--sg-copy)]">
                        <span
                          className="h-2 w-2 shrink-0"
                          style={{ background: segment.color }}
                        />
                        <span className="font-medium">{segment.name}</span>
                        <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                          {segment.range}
                        </span>
                      </span>
                      <span className="sg-font-mono text-[var(--sg-ink)]">
                        {segment.count}
                        <span className="ml-1 text-[var(--sg-muted)]">
                          ({segment.pct}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-[5px] bg-[var(--sg-line)]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${segment.pct}%` }}
                        transition={{ duration: 0.65, ease: easeOut }}
                        className="h-[5px]"
                        style={{ background: segment.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--sg-line)] pt-4">
                <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                  Espera promedio
                </span>
                <span
                  className="sg-font-mono text-[16px] font-bold"
                  style={{ color: esperaColor(report.avgEspera) }}
                >
                  {report.avgEspera} min
                </span>
              </div>
            </div>
          )}
        </Section>
      </div>

      <Section title="Motivos de Demora">
        {loading ? (
          <Skel h="h-[280px]" />
        ) : !report || report.delayReasons.length === 0 ? (
          <div className="sg-panel p-5">
            <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-3">
              <div className="sg-font-mono text-[28px] font-bold leading-none text-[var(--sg-danger)]">
                {report?.topCompanies.reduce(
                  (sum, company) => sum + company.count,
                  0
                ) ?? 0}
              </div>
              <div className="sg-font-mono mt-1 text-[9px] uppercase tracking-[0.16em] text-[var(--sg-muted)]">
                demoras sin motivo
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-5 text-[var(--sg-copy)]">
              Para que el análisis sea más convincente, conviene registrar
              motivos estandarizados: documentación, almacén, rampa,
              programación, producción o espera de personal.
            </p>
          </div>
        ) : (
          <div className="sg-panel p-5">
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
              {(() => {
                const max = Math.max(
                  ...report.delayReasons.map((reason) => reason.count)
                );
                return report.delayReasons.map((reason, index) => (
                  <motion.div
                    key={reason.motivo}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    className="flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-[12px]">
                      <span
                        className="truncate text-[var(--sg-copy)]"
                        title={reason.motivo}
                      >
                        {reason.motivo}
                      </span>
                      <span className="sg-font-mono ml-2 shrink-0 text-[11px] text-[var(--sg-ink)]">
                        {reason.count}
                      </span>
                    </div>
                    <div className="h-[3px] bg-[var(--sg-line)]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(reason.count / max) * 100}%` }}
                        transition={{
                          duration: 0.5,
                          ease: easeOut,
                          delay: index * 0.03,
                        }}
                        className="h-[3px] bg-[var(--sg-danger)] opacity-75"
                      />
                    </div>
                  </motion.div>
                ));
              })()}
            </div>
          </div>
        )}
      </Section>

      {!loading &&
        report &&
        report.trendData.length > 1 &&
        timeframe !== "Día" && (
          <Section
            title="Tendencia Diaria"
            sub="a tiempo vs. con demora (≥ 30 min)"
          >
            <div className="sg-panel p-5">
              <div className="h-[220px]">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%" debounce={200}>
                    <BarChart data={report.trendData} barCategoryGap={4}>
                      <CartesianGrid
                        stroke="rgba(196,192,180,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#6a706c",
                          fontSize: 10,
                          fontFamily: "DM Mono",
                        }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#6a706c",
                          fontSize: 10,
                          fontFamily: "DM Mono",
                        }}
                        width={28}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={<TrendTip />}
                        cursor={{ fill: "rgba(196,192,180,0.04)" }}
                      />
                      <Bar
                        dataKey="onTime"
                        stackId="t"
                        fill="var(--sg-success)"
                        fillOpacity={0.8}
                        maxBarSize={44}
                        radius={0}
                      />
                      <Bar
                        dataKey="delayed"
                        stackId="t"
                        fill="var(--sg-danger)"
                        fillOpacity={0.8}
                        maxBarSize={44}
                        radius={0}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-3 flex gap-5 border-t border-[var(--sg-line)] pt-3">
                {[
                  { color: "var(--sg-success)", label: "A tiempo" },
                  { color: "var(--sg-danger)", label: "Con demora" },
                ].map((legend) => (
                  <span
                    key={legend.label}
                    className="sg-font-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--sg-muted)]"
                  >
                    <span
                      className="h-2.5 w-2.5"
                      style={{ background: legend.color }}
                    />
                    {legend.label}
                  </span>
                ))}
              </div>
            </div>
          </Section>
        )}

      <Section
        title="Patrones de Demora por Hora y Día"
        sub="horas 06–19 · celdas con ≥3 registros"
      >
        <div className="sg-panel p-5">
          {loading ? (
            <Skel h="h-[200px]" />
          ) : !report ? (
            <EmptyMsg />
          ) : (
            <HeatmapGrid heatmap={report.heatmap ?? []} />
          )}
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Section title="Empresas con Mayor Demora" sub="espera ≥ 30 min · top 10">
          <div className="sg-panel overflow-x-auto">
            {loading ? (
              <Skel h="h-[220px]" />
            ) : !report || report.topCompanies.length === 0 ? (
              <div className="p-8">
                <EmptyMsg text="Sin demoras registradas" />
              </div>
            ) : (
              <table className="sg-table min-w-[480px]">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Empresa</th>
                    <th>Demoras</th>
                    <th>Prom. espera</th>
                    <th>Máx. espera</th>
                    <th title="Tendencia 1ª vs 2ª mitad del período">
                      Tendencia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.topCompanies.map((company, index) => (
                    <motion.tr
                      key={company.empresa}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <td className="sg-mono text-[11px] text-[var(--sg-muted)]">
                        {index + 1}
                      </td>
                      <td>
                        <span
                          className="block max-w-[200px] truncate text-[13px] font-semibold text-[var(--sg-ink)]"
                          title={company.empresa}
                        >
                          {company.empresa}
                        </span>
                      </td>
                      <td>
                        <span className="sg-font-mono text-[14px] font-bold text-[var(--sg-danger)]">
                          {company.count}
                        </span>
                      </td>
                      <td>
                        <span
                          className="sg-font-mono text-[12px]"
                          style={{ color: esperaColor(company.avgEspera) }}
                        >
                          {company.avgEspera} min
                        </span>
                      </td>
                      <td>
                        <span
                          className="sg-font-mono text-[12px]"
                          style={{ color: esperaColor(company.maxEspera) }}
                        >
                          {company.maxEspera} min
                        </span>
                      </td>
                      <td>
                        <TrendIcon trend={company.trend ?? "stable"} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Section>

        <Section title="Tipos de Operación">
          {loading ? (
            <Skel h="h-[220px]" />
          ) : !report || report.opTypes.length === 0 ? (
            <EmptyMsg />
          ) : (
            <div className="sg-panel flex flex-col gap-3.5 p-4">
              {report.opTypes.length === 1 &&
                report.opTypes[0]?.tipo.toLowerCase().includes("sin tipo") && (
                  <div className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-2">
                    <div className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                      Clasificación pendiente
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-[var(--sg-copy)]">
                      La operación ya está medida, pero falta etiquetar tipo de
                      movimiento para comparar despacho, recepción o visita.
                    </p>
                  </div>
                )}
              {report.opTypes.map((operation) => (
                <div key={operation.tipo} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span
                      className="max-w-[160px] truncate text-[var(--sg-copy)]"
                      title={operation.tipo}
                    >
                      {operation.tipo}
                    </span>
                    <div className="ml-2 flex shrink-0 items-center gap-3">
                      <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
                        {operation.count} registros
                      </span>
                      {operation.pctDelayed > 0 && (
                        <span
                          className="sg-font-mono text-[11px] font-bold"
                          style={{
                            color: pctColor(100 - operation.pctDelayed),
                          }}
                        >
                          {operation.pctDelayed}% demora
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex h-[5px] gap-px overflow-hidden">
                    <div
                      className="h-full bg-[var(--sg-success)] opacity-80 transition-all duration-500"
                      style={{
                        flex: Math.max(operation.count - operation.delayed, 0),
                      }}
                    />
                    {operation.delayed > 0 && (
                      <div
                        className="h-full bg-[var(--sg-danger)] opacity-80 transition-all duration-500"
                        style={{ flex: operation.delayed }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {!loading && report && report.providerSLA.length > 0 && (
        <Section
          title="SLA de Proveedores"
          sub="tasa de demora por proveedor · mín. 3 visitas · ordenado por peor tasa"
        >
          <div className="sg-panel overflow-x-auto">
            <table className="sg-table min-w-[360px] sm:min-w-[600px]">
              <thead>
                <tr>
                  <th className="hidden sm:table-cell">#</th>
                  {([
                    { col: "empresa", label: "Proveedor", hide: "" },
                    {
                      col: "total",
                      label: "Visitas",
                      hide: "hidden sm:table-cell",
                    },
                    {
                      col: "onTime",
                      label: "A tiempo",
                      hide: "hidden md:table-cell",
                    },
                    {
                      col: "delayed",
                      label: "Demoras",
                      hide: "hidden md:table-cell",
                    },
                    { col: "rate", label: "Tasa demora", hide: "" },
                    { col: "grade", label: "Grade", hide: "" },
                    {
                      col: "avgEspera",
                      label: "Prom. espera",
                      hide: "hidden sm:table-cell",
                    },
                  ] as const).map(({ col, label, hide }) => (
                    <th
                      key={col}
                      onClick={() => toggleSlaSort(col)}
                      className={`cursor-pointer select-none transition-colors hover:text-[var(--sg-ink)] ${hide}`}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        <span className="sg-font-mono text-[8px] opacity-60">
                          {slaSort.col === col
                            ? slaSort.dir === "desc"
                              ? "↓"
                              : "↑"
                            : "↕"}
                        </span>
                      </span>
                    </th>
                  ))}
                  <th
                    className="hidden sm:table-cell"
                    title="Tendencia 1ª vs 2ª mitad del período"
                  >
                    Tend.
                  </th>
                </tr>
              </thead>
              <tbody>
                {slaPageData.map((provider, index) => (
                  <motion.tr
                    key={provider.empresa}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <td className="sg-mono hidden text-[11px] text-[var(--sg-muted)] sm:table-cell">
                      {(slaPage - 1) * SLA_PER_PAGE + index + 1}
                    </td>
                    <td>
                      <span
                        className="block max-w-[140px] truncate text-[13px] font-semibold text-[var(--sg-ink)] sm:max-w-[200px]"
                        title={provider.empresa}
                      >
                        {provider.empresa}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="sg-font-mono text-[12px] text-[var(--sg-copy)]">
                        {provider.total}
                      </span>
                    </td>
                    <td className="hidden md:table-cell">
                      <span className="sg-font-mono text-[12px] text-[var(--sg-success)]">
                        {provider.onTime}
                      </span>
                    </td>
                    <td className="hidden md:table-cell">
                      <span className="sg-font-mono text-[12px] text-[var(--sg-danger)]">
                        {provider.delayed}
                      </span>
                    </td>
                    <td>
                      <span
                        className="sg-font-mono text-[14px] font-bold"
                        style={{ color: rateColor(provider.rate) }}
                      >
                        {provider.rate}%
                      </span>
                    </td>
                    <td>
                      <GradeBadge grade={provider.grade} />
                    </td>
                    <td className="hidden sm:table-cell">
                      <span
                        className="sg-font-mono text-[12px]"
                        style={{
                          color:
                            provider.avgEspera != null
                              ? esperaColor(provider.avgEspera)
                              : "var(--sg-muted)",
                        }}
                      >
                        {provider.avgEspera != null
                          ? `${provider.avgEspera} min`
                          : "—"}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell">
                      <TrendIcon trend={provider.trend} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--sg-line)] px-5 py-3">
              <div className="flex flex-wrap gap-4">
                {[
                  { grade: "A", label: "≤ 10% demora" },
                  { grade: "B", label: "11–25%" },
                  { grade: "C", label: "26–50%" },
                  { grade: "D", label: "51–75%" },
                  { grade: "F", label: "> 75% demora" },
                ].map((grade) => (
                  <span
                    key={grade.grade}
                    className="sg-font-mono flex items-center gap-2 text-[9px] uppercase tracking-widest text-[var(--sg-muted)]"
                  >
                    <GradeBadge grade={grade.grade} />
                    {grade.label}
                  </span>
                ))}
              </div>
              {slaTotalPages > 1 && (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                    {(slaPage - 1) * SLA_PER_PAGE + 1}–
                    {Math.min(slaPage * SLA_PER_PAGE, sortedSLA.length)} de{" "}
                    {sortedSLA.length}
                  </span>
                  <button
                    onClick={() => setSlaPage((page) => Math.max(1, page - 1))}
                    disabled={slaPage === 1}
                    className="sg-font-mono border border-[var(--sg-line)] px-2 py-0.5 text-[10px] text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ←
                  </button>
                  {Array.from({ length: slaTotalPages }, (_, index) => index + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setSlaPage(() => page)}
                        className={`sg-font-mono border px-2 py-0.5 text-[10px] transition-colors ${
                          page === slaPage
                            ? "border-[var(--sg-accent)] bg-[var(--sg-accent)] text-[var(--sg-canvas)]"
                            : "border-[var(--sg-line)] text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    onClick={() =>
                      setSlaPage((page) => Math.min(slaTotalPages, page + 1))
                    }
                    disabled={slaPage === slaTotalPages}
                    className="sg-font-mono border border-[var(--sg-line)] px-2 py-0.5 text-[10px] text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      <Section title="Rendimiento de Agentes" sub="top 10 por volumen">
        <div className="sg-panel overflow-x-auto">
          {loading ? (
            <Skel h="h-[200px]" />
          ) : !report || report.agentStats.length === 0 ? (
            <div className="p-8">
              <EmptyMsg text="Sin datos de agentes" />
            </div>
          ) : (
            <>
              <table className="sg-table min-w-[300px] sm:min-w-[560px]">
                <thead>
                  <tr>
                    <th>Agente</th>
                    <th className="hidden sm:table-cell">Total</th>
                    <th className="hidden sm:table-cell">A tiempo</th>
                    <th className="hidden md:table-cell">Con demora</th>
                    <th>% a tiempo</th>
                    <th className="hidden sm:table-cell">Prom. espera</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPageData.map((agent, index) => (
                    <motion.tr
                      key={agent.agente}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <td>
                        <span className="text-[13px] font-semibold text-[var(--sg-ink)]">
                          {agent.agente}
                        </span>
                        {agent.pending > 0 && (
                          <span className="sg-font-mono ml-2 text-[9px] text-[var(--sg-info)]">
                            +{agent.pending} pend.
                          </span>
                        )}
                      </td>
                      <td className="sg-mono hidden text-[12px] text-[var(--sg-copy)] sm:table-cell">
                        {agent.total}
                      </td>
                      <td className="hidden sm:table-cell">
                        <span className="sg-mono text-[12px] text-[var(--sg-success)]">
                          {agent.ok}
                        </span>
                      </td>
                      <td className="hidden md:table-cell">
                        <span className="sg-mono text-[12px] text-[var(--sg-danger)]">
                          {agent.delayed}
                        </span>
                      </td>
                      <td>
                        {agent.pctOnTime !== null ? (
                          <span
                            className="sg-font-mono text-[12px] font-bold"
                            style={{ color: pctColor(agent.pctOnTime) }}
                          >
                            {agent.pctOnTime}%
                          </span>
                        ) : (
                          <span className="text-[var(--sg-muted)]">—</span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell">
                        {agent.avgEspera !== null ? (
                          <span
                            className="sg-mono text-[12px]"
                            style={{ color: esperaColor(agent.avgEspera) }}
                          >
                            {agent.avgEspera} min
                          </span>
                        ) : (
                          <span className="text-[var(--sg-muted)]">—</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {agentTotalPages > 1 && (
                <div className="flex items-center justify-end gap-2 border-t border-[var(--sg-line)] px-5 py-3">
                  <span className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)]">
                    {(agentPage - 1) * AGENT_PER_PAGE + 1}–
                    {Math.min(agentPage * AGENT_PER_PAGE, report.agentStats.length)}{" "}
                    de {report.agentStats.length}
                  </span>
                  <button
                    onClick={() =>
                      setAgentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={agentPage === 1}
                    className="sg-font-mono border border-[var(--sg-line)] px-2 py-0.5 text-[10px] text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ←
                  </button>
                  {Array.from(
                    { length: agentTotalPages },
                    (_, index) => index + 1
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => setAgentPage(() => page)}
                      className={`sg-font-mono border px-2 py-0.5 text-[10px] transition-colors ${
                        page === agentPage
                          ? "border-[var(--sg-accent)] bg-[var(--sg-accent)] text-[var(--sg-canvas)]"
                          : "border-[var(--sg-line)] text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      setAgentPage((page) =>
                        Math.min(agentTotalPages, page + 1)
                      )
                    }
                    disabled={agentPage === agentTotalPages}
                    className="sg-font-mono border border-[var(--sg-line)] px-2 py-0.5 text-[10px] text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Section>
    </div>
  );
}
