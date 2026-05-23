"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, RefreshCw } from "lucide-react";
import Link from "next/link";
import { formatGateLabelFromPlant } from "@/lib/gates";
import { ExportDropdown } from "./ReporteShared";
import { easeOut, esperaColor, pctColor } from "./reporteUtils";
import type { ReporteData } from "./reporteTypes";

export function ReporteTopbar({
  sites,
  compareMode,
  setCompareMode,
  setPlant,
  showGateDropdown,
  plant,
  plants,
  timeframe,
  setTimeframe,
  availableYears,
  selectedYear,
  setSelectedYear,
  data,
  loading,
  exporting,
  onExportCSV,
  excelHref,
  pdfHref,
  onReload,
}: {
  sites: string[];
  compareMode: string;
  setCompareMode: (value: string) => void;
  setPlant: (value: string) => void;
  showGateDropdown: boolean;
  plant: string;
  plants: string[];
  timeframe: string;
  setTimeframe: (value: string) => void;
  availableYears: string[];
  selectedYear: string;
  setSelectedYear: (value: string) => void;
  data: ReporteData | null;
  loading: boolean;
  exporting: boolean;
  onExportCSV: () => void;
  excelHref: string;
  pdfHref: string;
  onReload: () => void;
}) {
  return (
    <div className="mb-6 flex items-center gap-4 border-b border-[var(--sg-line)] pb-5">
      <div className="flex flex-shrink-0 items-center gap-3">
        <Link
          href="/dashboard"
          className="sg-font-mono flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center gap-4">
        {sites.length > 1 && (
          <div className="flex flex-shrink-0 items-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-0.5">
            {["Todas", ...sites].map((site) => (
              <button
                key={site}
                onClick={() => {
                  setCompareMode(site);
                  if (site !== "Todas") setPlant("Todos");
                }}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  compareMode === site
                    ? "bg-[var(--sg-ink)] text-[var(--sg-canvas)]"
                    : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                }`}
              >
                {site}
              </button>
            ))}
          </div>
        )}

        {showGateDropdown && (
          <div className="relative flex-shrink-0">
            <select
              aria-label="Seleccionar puerta"
              value={plant}
              onChange={(event) => {
                setPlant(event.target.value);
                setCompareMode("Todas");
              }}
              disabled={compareMode !== "Todas"}
              className="h-[26px] cursor-pointer appearance-none border border-[var(--sg-line)] bg-[var(--sg-panel-2)] pl-2.5 pr-6 text-[10px] font-bold uppercase tracking-widest text-[var(--sg-ink)] outline-none transition-colors hover:border-[var(--sg-accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {["Todos", ...plants].map((gate) => (
                <option
                  key={gate}
                  value={gate}
                  className="bg-[var(--sg-panel)] text-[var(--sg-ink)]"
                >
                  {gate === "Todos"
                    ? "Todas las puertas"
                    : formatGateLabelFromPlant(gate)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--sg-muted)]" />
          </div>
        )}

        <div className="flex flex-shrink-0 items-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-0.5">
          {["Día", "Semana", "Mes"].map((value) => (
            <button
              key={value}
              onClick={() => setTimeframe(value)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                timeframe === value
                  ? "bg-[var(--sg-ink)] text-[var(--sg-canvas)]"
                  : "text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
              }`}
            >
              {value}
            </button>
          ))}
          {availableYears.length > 0 && (
            <>
              <div className="mx-0.5 h-4 w-px bg-[var(--sg-line)]" />
              <div className="relative">
                <select
                  aria-label="Seleccionar año"
                  value={selectedYear}
                  onChange={(event) => {
                    const year = event.target.value;
                    setSelectedYear(year);
                    setTimeframe(year);
                  }}
                  className="h-[26px] cursor-pointer appearance-none border border-[var(--sg-line)] bg-[var(--sg-panel-2)] pl-2.5 pr-6 text-[10px] font-bold uppercase tracking-widest text-[var(--sg-ink)] outline-none transition-colors hover:border-[var(--sg-accent)]"
                >
                  <option
                    value=""
                    disabled
                    className="bg-[var(--sg-panel)] text-[var(--sg-ink)]"
                  >
                    Año
                  </option>
                  {availableYears.map((year) => (
                    <option
                      key={year}
                      value={year}
                      className="bg-[var(--sg-panel)] text-[var(--sg-ink)]"
                    >
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--sg-muted)]" />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {data && !loading && (
          <ExportDropdown
            onCSV={onExportCSV}
            excelHref={excelHref}
            pdfHref={pdfHref}
            exporting={exporting}
          />
        )}
        <button
          onClick={onReload}
          disabled={loading}
          title="Actualizar datos"
          className="sg-font-mono flex items-center gap-1.5 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-2.5 py-1 text-[9px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)]"
        >
          <motion.span
            animate={loading ? { rotate: 360 } : { rotate: 0 }}
            transition={
              loading
                ? { repeat: Infinity, duration: 0.8, ease: "linear" }
                : {}
            }
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </motion.span>
          Actualizar
        </button>
      </div>
    </div>
  );
}

export function ReporteFilterBar({
  data,
  selectedSegments,
  setSelectedSegments,
  soloDemoras,
  setSoloDemoras,
}: {
  data: ReporteData | null;
  selectedSegments: string[];
  setSelectedSegments: (updater: (previous: string[]) => string[]) => void;
  soloDemoras: boolean;
  setSoloDemoras: (updater: (previous: boolean) => boolean) => void;
}) {
  const activeFilterCount = selectedSegments.length + (soloDemoras ? 1 : 0);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "Normal", label: "Normal", color: "var(--sg-success)" },
          { key: "Moderado", label: "Moderado", color: "var(--sg-warn)" },
          { key: "Alto", label: "Alto", color: "#e07b3a" },
          { key: "Crítico", label: "Crítico", color: "var(--sg-danger)" },
          { key: "Pendiente", label: "Pendiente", color: "var(--sg-info)" },
        ].map((segment) => {
          const count =
            data?.segments.find((item) => item.name === segment.key)?.count ?? 0;
          const isActive = selectedSegments.includes(segment.key);
          return (
            <button
              key={segment.key}
              onClick={() => {
                setSelectedSegments((previous) =>
                  previous.includes(segment.key)
                    ? previous.filter((item) => item !== segment.key)
                    : [...previous, segment.key]
                );
              }}
              className={`flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                isActive
                  ? "border-[var(--sg-ink)] bg-[var(--sg-ink)] text-[var(--sg-canvas)]"
                  : "border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-ink)]"
              }`}
              title={`${segment.label} (${count})`}
            >
              <span
                className="h-2 w-2 shrink-0"
                style={{ background: segment.color }}
              />
              {segment.label}
              <span className="sg-font-mono text-[9px] opacity-70">
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setSoloDemoras((value) => !value)}
        className={`flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
          soloDemoras
            ? "border-[var(--sg-danger)] bg-[var(--sg-danger)] text-white"
            : "border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-ink)]"
        }`}
      >
        Solo demoras
      </button>

      {activeFilterCount > 0 && (
        <button
          onClick={() => {
            setSelectedSegments(() => []);
            setSoloDemoras(() => false);
          }}
          className="sg-font-mono flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-danger)]"
        >
          <RefreshCw className="h-3 w-3" />
          Limpiar {activeFilterCount} filtro
          {activeFilterCount !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

export function KpiStrip({
  loading,
  plant,
  timeframe,
  data,
}: {
  loading: boolean;
  plant: string;
  timeframe: string;
  data: ReporteData | null;
}) {
  return (
    <motion.div
      key={plant + timeframe}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      {[
        {
          label: "Total atenciones",
          val: data?.total,
          color: "var(--sg-ink)",
          suffix: "",
        },
        {
          label: "% A tiempo",
          val: data?.pctOnTime != null ? `${data.pctOnTime}%` : "—",
          color: pctColor(data?.pctOnTime ?? null),
          suffix: "",
        },
        {
          label: "Espera promedio",
          val: data?.avgEspera,
          color: esperaColor(data?.avgEspera ?? null),
          suffix: " min",
        },
        {
          label: "Espera máxima",
          val: data?.maxEspera,
          color: esperaColor(data?.maxEspera ?? null),
          suffix: " min",
        },
        {
          label: "Percentil 90",
          val: data?.p90Espera,
          color: esperaColor(data?.p90Espera ?? null),
          suffix: " min",
        },
        {
          label: "Pendientes",
          val: data?.pending,
          color: "var(--sg-info)",
          suffix: "",
        },
      ].map((item) => (
        <div key={item.label} className="sg-panel flex flex-col gap-1 p-4">
          <div>
            <span
              className="sg-font-mono text-[20px] font-bold leading-none sm:text-[26px]"
              style={{ color: item.color }}
            >
              {loading ? "—" : (item.val ?? "—")}
            </span>
            {!loading && item.val != null && item.suffix && (
              <span className="sg-font-mono ml-1 text-[14px] text-[var(--sg-muted)]">
                {item.suffix}
              </span>
            )}
          </div>
          <div className="sg-font-mono mt-1 text-[9px] uppercase tracking-[0.16em] text-[var(--sg-muted)]">
            {item.label}
          </div>
        </div>
      ))}
    </motion.div>
  );
}
