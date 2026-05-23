"use client";

import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";
import { formatGateLabelFromPlant } from "@/lib/gates";
import type {
  HistorialRecord,
  HistorialSortBy,
  HistorialSortDir,
  HistorialStats,
} from "./historialTypes";
import { fmt, getOperationalMetric, getWaitLabel } from "./historialUtils";

export function HistorialContent({
  userRole,
  stats,
  search,
  onSearchChange,
  plant,
  plants,
  onPlantChange,
  segment,
  onSegmentChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  showFilters,
  onToggleFilters,
  activeFilters,
  onResetFilters,
  canEditRecords,
  onOpenImport,
  onExport,
  exporting,
  loading,
  isAdmin,
  filterCompany,
  companiesList,
  onFilterCompanyChange,
  records,
  companiesMap,
  onSelectRecord,
  onEditRecord,
  sortBy,
  sortDir,
  onToggleSortFecha,
  onToggleSortEspera,
  page,
  totalPages,
  totalCount,
  onPageChange,
}: {
  userRole: string | null;
  stats: HistorialStats;
  search: string;
  onSearchChange: (value: string) => void;
  plant: string;
  plants: string[];
  onPlantChange: (value: string) => void;
  segment: string;
  onSegmentChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilters: number;
  onResetFilters: () => void;
  canEditRecords: boolean;
  onOpenImport: () => void;
  onExport: () => void;
  exporting: boolean;
  loading: boolean;
  isAdmin: boolean;
  filterCompany: string;
  companiesList: { id: string; name: string }[];
  onFilterCompanyChange: (value: string) => void;
  records: HistorialRecord[];
  companiesMap: Record<string, string>;
  onSelectRecord: (record: HistorialRecord) => void;
  onEditRecord: (record: HistorialRecord) => void;
  sortBy: HistorialSortBy;
  sortDir: HistorialSortDir;
  onToggleSortFecha: () => void;
  onToggleSortEspera: () => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-5">
        <div className="flex items-center gap-4">
          <div className="sg-kicker">
            {userRole === "guardia" ? "Mi historial" : "Historial"}
          </div>
          <span className="sg-live-pill">
            <span className="sg-live-dot sg-pulse" />
            {userRole === "guardia" ? "Trazabilidad personal" : "Trazabilidad"}
          </span>
        </div>
        <div className="sg-mono text-[11px] tracking-[0.12em] text-[var(--sg-muted)]">
          {stats ? fmt.format(stats.total) : "—"}{" "}
          {userRole === "guardia" ? "registros propios" : "eventos históricos"}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-0 border border-[var(--sg-line)] md:grid-cols-4">
        {[
          {
            label:
              userRole === "guardia" ? "Mis registros" : "Eventos disponibles",
            val: stats ? fmt.format(stats.total) : "—",
            suffix: "",
          },
          {
            label: "Demora promedio",
            val: stats ? stats.avg.toString() : "—",
            suffix: " min",
          },
          {
            label:
              userRole === "guardia"
                ? "Puertas operadas"
                : "Puertas monitoreadas",
            val: stats ? stats.plants.toString() : "—",
            suffix: "",
          },
          {
            label: "Demora máxima",
            val: stats ? fmt.format(stats.max) : "—",
            suffix: " min",
          },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className={`sg-stat ${index < 2 ? "border-b border-[var(--sg-line)] md:border-b-0" : ""} ${index === 0 || index === 2 ? "border-r border-[var(--sg-line)]" : ""}`}
          >
            <div>
              <span className="sg-stat-num" style={{ fontSize: 32 }}>
                {stat.val}
              </span>
              <span className="sg-stat-suffix" style={{ fontSize: 20 }}>
                {stat.suffix}
              </span>
            </div>
            <div className="sg-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <section className="sg-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--sg-line)] px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[200px] flex-1 items-center gap-2 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 lg:max-w-[360px]">
              <Search className="h-4 w-4 shrink-0 text-[var(--sg-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Razón Social o Empresa..."
                className="h-10 w-full bg-transparent text-[13px] text-[var(--sg-ink)] outline-none placeholder:text-[var(--sg-muted)]"
              />
              {search ? (
                <button
                  onClick={() => onSearchChange("")}
                  className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onToggleFilters}
                className={`sg-btn sg-btn-ghost sg-btn-sm flex items-center gap-2 ${activeFilters ? "border-[var(--sg-accent)] text-[var(--sg-accent)]" : ""}`}
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`}
                />
                Filtros{" "}
                {activeFilters > 0 ? (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--sg-accent)] text-[9px] font-bold text-[var(--sg-canvas)]">
                    {activeFilters}
                  </span>
                ) : null}
              </button>

              {activeFilters > 0 ? (
                <button
                  onClick={onResetFilters}
                  className="sg-btn sg-btn-ghost sg-btn-sm flex items-center gap-1.5 text-[var(--sg-muted)] hover:text-[var(--sg-danger)]"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              ) : null}

              {canEditRecords ? (
                <button
                  onClick={onOpenImport}
                  className="sg-btn sg-btn-ghost sg-btn-sm flex items-center gap-2"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Importar Excel
                </button>
              ) : null}

              <button
                onClick={onExport}
                disabled={exporting || loading}
                className="sg-btn sg-btn-ghost sg-btn-sm flex items-center gap-2"
              >
                {exporting ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.8,
                      ease: "linear",
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </motion.span>
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Exportar CSV
              </button>
            </div>
          </div>

          {showFilters ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 gap-3 border-t border-[var(--sg-line)] pt-2 sm:grid-cols-2 lg:grid-cols-4"
            >
              {isAdmin ? (
                <div className="sg-field col-span-2 lg:col-span-1">
                  <label className="sg-label">Empresa cliente</label>
                  <div className="relative">
                    <select
                      value={filterCompany}
                      onChange={(event) =>
                        onFilterCompanyChange(event.target.value)
                      }
                      className="sg-select appearance-none pr-8"
                    >
                      <option value="">Todas las empresas</option>
                      {companiesList.map((company) => (
                        <option
                          key={company.id}
                          value={company.id}
                          className="bg-[var(--sg-panel-2)]"
                        >
                          {company.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                  </div>
                </div>
              ) : null}

              <div className="sg-field">
                <label className="sg-label">Puerta</label>
                <div className="relative">
                  <select
                    value={plant}
                    onChange={(event) => onPlantChange(event.target.value)}
                    className="sg-select appearance-none pr-8"
                  >
                    {["Todos", ...plants].map((item) => (
                      <option
                        key={item}
                        value={item}
                        className="bg-[var(--sg-panel-2)]"
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                </div>
              </div>

              <div className="sg-field">
                <label className="sg-label">Estado / Segmento</label>
                <div className="relative">
                  <select
                    value={segment}
                    onChange={(event) => onSegmentChange(event.target.value)}
                    className="sg-select appearance-none pr-8"
                  >
                    {[
                      "Todos",
                      "Pendiente",
                      "Normal",
                      "Moderado",
                      "Alto",
                      "Crítico",
                    ].map((item) => (
                      <option
                        key={item}
                        value={item}
                        className="bg-[var(--sg-panel-2)]"
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                </div>
              </div>

              <div className="sg-field">
                <label className="sg-label">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(event) => onDateFromChange(event.target.value)}
                  className="sg-input"
                  style={{ colorScheme: "dark" }}
                />
              </div>

              <div className="sg-field">
                <label className="sg-label">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(event) => onDateToChange(event.target.value)}
                  className="sg-input"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </motion.div>
          ) : null}
        </div>

        <div className="relative min-h-[400px] overflow-x-auto">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--sg-panel)]/50 backdrop-blur-sm">
              <div className="flex items-center gap-3 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-3 shadow-lg">
                <span className="sg-live-dot sg-pulse" />
                <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)]">
                  Cargando...
                </span>
              </div>
            </div>
          ) : null}

          <table className="sg-table min-w-[360px] sm:min-w-[700px] lg:min-w-[1200px]">
            <thead>
              <tr>
                <th className="hidden sm:table-cell">ID</th>
                <th>
                  <button
                    onClick={onToggleSortFecha}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--sg-ink)]"
                    title={
                      sortBy !== "fecha"
                        ? "Ordenar por fecha ↓"
                        : sortDir === "desc"
                          ? "Ordenar por fecha ↑"
                          : "Quitar orden"
                    }
                  >
                    Fecha
                    {sortBy !== "fecha" ? (
                      <ArrowUpDown className="h-3 w-3 text-[var(--sg-muted)]" />
                    ) : sortDir === "desc" ? (
                      <ArrowDown className="h-3 w-3 text-[var(--sg-accent)]" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-[var(--sg-accent)]" />
                    )}
                  </button>
                </th>
                <th className="hidden lg:table-cell">H. Reg.</th>
                <th className="hidden lg:table-cell">H. Aten.</th>
                <th className="hidden lg:table-cell">H. Docs.</th>
                <th>Razón Social</th>
                <th className="hidden sm:table-cell">Empresa</th>
                {isAdmin ? <th className="hidden md:table-cell">Cliente</th> : null}
                <th className="hidden md:table-cell">Puerta</th>
                <th className="hidden lg:table-cell">Tipo Op.</th>
                <th>
                  <button
                    onClick={onToggleSortEspera}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--sg-ink)]"
                    title={
                      sortBy !== "espera_min"
                        ? "Ordenar por demora ↓"
                        : sortDir === "desc"
                          ? "Ordenar por demora ↑"
                          : "Quitar orden"
                    }
                  >
                    Demora
                    {sortBy !== "espera_min" ? (
                      <ArrowUpDown className="h-3 w-3 text-[var(--sg-muted)]" />
                    ) : sortDir === "desc" ? (
                      <ArrowDown className="h-3 w-3 text-[var(--sg-accent)]" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-[var(--sg-accent)]" />
                    )}
                  </button>
                </th>
                <th className="hidden sm:table-cell">T. Total</th>
                <th>Estado</th>
                {canEditRecords ? (
                  <th className="hidden sm:table-cell">Acciones</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => {
                const waitLabel = getWaitLabel(getOperationalMetric(record));
                return (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.015 }}
                    onClick={() => onSelectRecord(record)}
                    className="cursor-pointer transition-colors hover:bg-[var(--sg-panel-2)]"
                    title="Ver detalle completo"
                  >
                    <td className="sg-mono hidden text-[11px] text-[var(--sg-muted)] sm:table-cell">
                      #{record.id}
                    </td>
                    <td className="sg-mono text-[11px] text-[var(--sg-copy)]">
                      {record.fecha}
                    </td>
                    <td className="sg-mono hidden text-[11px] text-[var(--sg-copy)] lg:table-cell">
                      {record.h_registro?.substring(0, 5) || "--:--"}
                    </td>
                    <td className="sg-mono hidden text-[11px] text-[var(--sg-muted)] lg:table-cell">
                      {record.h_atencion?.substring(0, 5) || "—"}
                    </td>
                    <td className="sg-mono hidden text-[11px] text-[var(--sg-muted)] lg:table-cell">
                      {record.h_dev_docs?.substring(0, 5) || "—"}
                    </td>
                    <td>
                      <span
                        className="block max-w-[140px] truncate font-semibold text-[var(--sg-ink)] sm:max-w-[180px]"
                        title={record.razon_social ?? undefined}
                      >
                        {record.razon_social || "-"}
                      </span>
                    </td>
                    <td
                      className="hidden max-w-[140px] truncate text-[var(--sg-copy)] sm:table-cell"
                      title={record.empresa ?? undefined}
                    >
                      {record.empresa || "-"}
                    </td>
                    {isAdmin ? (
                      <td className="hidden md:table-cell">
                        <span className="sg-font-mono block max-w-[120px] truncate text-[10px] uppercase tracking-widest text-[var(--sg-accent)]">
                          {record.company_id
                            ? (companiesMap[record.company_id] ?? "—")
                            : "—"}
                        </span>
                      </td>
                    ) : null}
                    <td className="hidden md:table-cell">
                      <span className="sg-mono text-[10px] uppercase tracking-[0.12em] text-[var(--sg-muted)]">
                        {formatGateLabelFromPlant(record.planta ?? "")}
                      </span>
                    </td>
                    <td className="sg-mono hidden text-[11px] text-[var(--sg-copy)] lg:table-cell">
                      {record.tipo_operacion || record.motivo_demora || "-"}
                    </td>
                    <td>
                      <span
                        className="sg-font-mono text-[12px] font-bold"
                        style={{ color: waitLabel.color }}
                      >
                        {getOperationalMetric(record) != null
                          ? `${getOperationalMetric(record)} min`
                          : "—"}
                      </span>
                    </td>
                    <td className="sg-mono hidden text-[11px] text-[var(--sg-muted)] sm:table-cell">
                      {record.tiempo_total_min != null
                        ? `${record.tiempo_total_min} min`
                        : "—"}
                    </td>
                    <td>
                      <span className={`sg-badge ${waitLabel.badge}`}>
                        {waitLabel.text}
                      </span>
                    </td>
                    {canEditRecords ? (
                      <td className="hidden sm:table-cell">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditRecord(record);
                          }}
                          className="sg-font-mono inline-flex items-center gap-1.5 border border-[var(--sg-line)] px-2.5 py-1.5 text-[9px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </button>
                      </td>
                    ) : null}
                  </motion.tr>
                );
              })}

              {!loading && records.length === 0 ? (
                <tr>
                  <td
                    colSpan={(isAdmin ? 13 : 12) + (canEditRecords ? 1 : 0)}
                    className="py-10 text-center text-[var(--sg-muted)]"
                  >
                    No se encontraron registros con los filtros aplicados
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--sg-line)] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="sg-mono text-[11px] uppercase tracking-[0.12em] text-[var(--sg-muted)]">
            Página {Math.min(page, totalPages)} de {totalPages} ·{" "}
            {fmt.format(totalCount)} resultados ·{" "}
            <span className="text-[var(--sg-muted)] opacity-60">
              Haz click en una fila para ver el detalle
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="flex h-9 w-9 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-copy)] transition-colors hover:text-[var(--sg-ink)] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
              let start = Math.max(1, page - 2);
              const end = Math.min(totalPages, start + 4);
              if (end - start < 4) start = Math.max(1, end - 4);
              return start + index;
            })
              .filter((value) => value <= totalPages)
              .map((value) => (
                <button
                  key={value}
                  onClick={() => onPageChange(value)}
                  disabled={loading}
                  className={`flex h-9 w-9 items-center justify-center sg-font-mono text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                    page === value
                      ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]"
                      : "border border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-copy)] hover:text-[var(--sg-ink)]"
                  }`}
                >
                  {String(value).padStart(2, "0")}
                </button>
              ))}

            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="flex h-9 w-9 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-copy)] transition-colors hover:text-[var(--sg-ink)] disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
