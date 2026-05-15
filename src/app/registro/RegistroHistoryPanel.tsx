import TarjetaRegistro from "@/components/TarjetaRegistro";
import SemaforoVehiculos from "@/components/SemaforoVehiculos";
import { AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  RefreshCw,
  Search,
  Timer,
  TrafficCone,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { RecentRegistration } from "./types";
import { formatGateLabelFromPlant } from "@/lib/gates";
import { isAbandonedRecord, isDelayedRecord } from "./status";

const PAGE_SIZE = 10;
type FilterKey = "todos" | "pendientes" | "atendidos" | "completados" | "demoras";

interface RegistroHistoryPanelProps {
  compact?: boolean;
  recentRegistrations: RecentRegistration[];
  recentTotal: number;
  abandonedRecords: RecentRegistration[];
  closingIds: Set<number>;
  docsIds: Set<number>;
  deletingIds: Set<number>;
  userRole: string | null;
  onRefresh: () => void;
  onClose: (reg: RecentRegistration) => void;
  onActivate: (reg: RecentRegistration) => void;
  onDocs: (reg: RecentRegistration) => void;
  onEdit: (reg: RecentRegistration) => void;
  onDelete: (id: number, razonSocial: string) => void;
  onCloseAbandoned: () => void;
}

export default function RegistroHistoryPanel({
  recentRegistrations,
  recentTotal,
  abandonedRecords,
  closingIds,
  docsIds,
  deletingIds,
  userRole,
  compact = false,
  onRefresh,
  onClose,
  onActivate,
  onDocs,
  onEdit,
  onDelete,
  onCloseAbandoned,
}: RegistroHistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("todos");
  const [view, setView] = useState<"lista" | "semaforo">("semaforo");
  const canManageClosedRecords = userRole !== "guardia";

  const filteredRecords = useMemo(() => {
    const now = new Date();
    const isAbandoned = (record: RecentRegistration) => isAbandonedRecord(record, now);
    const isDelayed = (record: RecentRegistration) => isDelayedRecord(record, now);
    const term = searchTerm.trim().toUpperCase();
    const matchesSearch = recentRegistrations.filter(
      (record) => {
        if (!term) return true;
        const searchable = [
          record.razonSocial,
          record.empresa,
          record.planta,
          formatGateLabelFromPlant(record.planta ?? ""),
          record.responsable,
          record.agente,
          record.time,
        ]
          .filter(Boolean)
          .join(" ")
          .toUpperCase();
        return searchable.includes(term);
      },
    );
    const baseRecords = term ? matchesSearch : recentRegistrations;
    const byFilter = baseRecords.filter((record) => {
      if (activeFilter === "pendientes") return !record.attended;
      if (activeFilter === "atendidos") return record.attended && !record.docsDelivered;
      if (activeFilter === "completados") return record.docsDelivered;
      if (activeFilter === "demoras") return isDelayed(record);
      return true;
    });

    return [...byFilter].sort((a, b) => {
      const score = (record: RecentRegistration) => {
        if (record.scheduledOnly) return 4500;
        if (isAbandoned(record)) return 5000;
        if (isDelayed(record)) return 4000;
        if (!record.docsDelivered && !record.attended) return 3000;
        if (!record.docsDelivered && record.attended) return 2000;
        return 1000;
      };
      return score(b) - score(a) || b.id - a.id;
    });
  }, [recentRegistrations, searchTerm, activeFilter]);

  const counts = useMemo(() => {
    const now = new Date();
    const isDelayed = (record: RecentRegistration) => isDelayedRecord(record, now);
    return {
      todos: recentRegistrations.length,
      pendientes: recentRegistrations.filter((record) => !record.attended).length,
      atendidos: recentRegistrations.filter((record) => record.attended && !record.docsDelivered).length,
      completados: recentRegistrations.filter((record) => record.docsDelivered).length,
      demoras: recentRegistrations.filter((record) => isDelayed(record)).length,
    };
  }, [recentRegistrations]);

  function isAbandoned(record: RecentRegistration) {
    return isAbandonedRecord(record);
  }

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredRecords.slice((currentPageSafe - 1) * PAGE_SIZE, currentPageSafe * PAGE_SIZE);
  const hasActiveSearch = searchTerm.trim().length > 0;
  const hasActiveFilters = hasActiveSearch || activeFilter !== "todos";
  const emptyState = recentRegistrations.length === 0
    ? {
        icon: <Truck className="h-7 w-7 opacity-20" />,
        title: "Sin registros hoy",
        detail: "Los vehículos registrados aparecerán aquí",
      }
    : {
        icon: <Search className="h-7 w-7 opacity-20" />,
        title: "Sin resultados",
        detail: hasActiveSearch ? `para "${searchTerm}"` : "con los filtros aplicados",
      };

  return (
    <div className="flex flex-col h-full">
      <section className="sg-panel flex flex-col h-full">
        {compact ? (
          /* ── Modo garita: compacto ── */
          <div className="flex flex-col gap-2 border-b border-[var(--sg-line)] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--sg-accent)] text-[var(--sg-canvas)]">
                  <Timer className="h-3.5 w-3.5" />
                </div>
                <h2 className="sg-font-display text-[13px] font-bold uppercase tracking-tight text-[var(--sg-ink)] truncate">
                  Registros de Hoy
                </h2>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Toggle semáforo / lista */}
                <div className="flex border border-[var(--sg-line)]">
                  <button
                    onClick={() => setView("semaforo")}
                    title="Vista semáforo"
                    className={`flex items-center px-2 py-1 transition-colors ${view === "semaforo" ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]" : "text-[var(--sg-muted)] hover:text-[var(--sg-accent)]"}`}
                  >
                    <TrafficCone className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setView("lista")}
                    title="Vista lista"
                    className={`flex items-center px-2 py-1 border-l border-[var(--sg-line)] transition-colors ${view === "lista" ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]" : "text-[var(--sg-muted)] hover:text-[var(--sg-accent)]"}`}
                  >
                    <LayoutList className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={onRefresh}
                  className="flex items-center gap-1 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-2.5 py-1 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] transition-colors"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--sg-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value.toUpperCase()); setCurrentPage(1); }}
                placeholder="Buscar empresa, puerta, responsable..."
                className="sg-input h-8 w-full pl-8 text-[11px]"
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(""); setCurrentPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex gap-1 flex-wrap">
              {[
                { key: "todos", label: "Todos" },
                { key: "pendientes", label: "Pendientes" },
                { key: "atendidos", label: "Atendidos" },
                { key: "completados", label: "Completados" },
                { key: "demoras", label: "Demoras" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => { setActiveFilter(filter.key as FilterKey); setCurrentPage(1); }}
                  className={`border px-2 py-0.5 sg-font-mono text-[8px] uppercase tracking-widest transition-colors ${
                    activeFilter === filter.key
                      ? "border-[var(--sg-accent)] text-[var(--sg-accent)]"
                      : "border-[var(--sg-line)] text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
                  }`}
                >
                  {filter.label} ({counts[filter.key as FilterKey]})
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Modo escritorio: responsive ── */
          <div className="flex flex-col gap-3 border-b border-[var(--sg-line)] p-4">
            {/* Fila 1: título + botón */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--sg-accent)] text-[var(--sg-canvas)]">
                  <Timer className="h-4 w-4" />
                </div>
                <h2 className="sg-font-display text-[14px] font-bold uppercase tracking-tight text-[var(--sg-ink)] truncate">
                  Registros de Hoy
                </h2>
              </div>
              <button
                onClick={onRefresh}
                className="flex shrink-0 items-center gap-1.5 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 py-1.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] transition-colors"
              >
                Actualizar <RefreshCw className="h-3 w-3" />
              </button>
            </div>
            {/* Fila 2: búsqueda */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value.toUpperCase()); setCurrentPage(1); }}
                placeholder="Buscar empresa, puerta, responsable..."
                className="sg-input h-10 w-full pl-9 text-[11px]"
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(""); setCurrentPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Fila 3: filtros */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "todos", label: "Todos" },
                { key: "pendientes", label: "Pendientes" },
                { key: "atendidos", label: "Atendidos" },
                { key: "completados", label: "Completados" },
                { key: "demoras", label: "Demoras" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => { setActiveFilter(filter.key as FilterKey); setCurrentPage(1); }}
                  className={`border px-2.5 py-1 sg-font-mono text-[9px] uppercase tracking-widest transition-colors ${
                    activeFilter === filter.key
                      ? "border-[var(--sg-accent)] text-[var(--sg-accent)]"
                      : "border-[var(--sg-line)] text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
                  }`}
                >
                  {filter.label} ({counts[filter.key as FilterKey]})
                </button>
              ))}
            </div>
          </div>
        )}

        {abandonedRecords.length > 0 && (
          <div className="flex items-center justify-between border-b border-[var(--sg-danger)] bg-[rgba(211,92,79,0.07)] px-5 py-2.5">
            <div className="flex items-center gap-2 text-[11px] text-[var(--sg-danger)]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {abandonedRecords.length} vehículo{abandonedRecords.length !== 1 ? "s" : ""} con +4h sin atención
            </div>
            <button
              onClick={onCloseAbandoned}
              className="sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-danger)] transition-opacity hover:opacity-70"
            >
              Cerrar todos →
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto p-3">
          {filteredRecords.length === 0 && (view === "semaforo" || view === "lista") ? (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 text-[var(--sg-muted)]">
              <div className="flex h-16 w-16 items-center justify-center border border-dashed border-[var(--sg-line)]">
                {emptyState.icon}
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-ink)] opacity-30">{emptyState.title}</p>
                <p className="sg-font-mono text-[9px] uppercase tracking-widest opacity-20">{emptyState.detail}</p>
                {hasActiveFilters ? (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setActiveFilter("todos");
                      setCurrentPage(1);
                    }}
                    className="mt-2 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-accent)] transition-opacity hover:opacity-70"
                  >
                    Limpiar filtros
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ── Vista semáforo ── */}
          {view === "semaforo" && filteredRecords.length > 0 && (
            <SemaforoVehiculos
              registrations={filteredRecords}
              onClose={onClose}
              onDocs={onDocs}
            />
          )}

          {/* ── Vista lista ── */}
          <AnimatePresence mode="popLayout">
            {view === "lista" && filteredRecords.length > 0 ? (
              <div className="grid gap-3">
                {paginatedRecords.map((record) => (
                  <TarjetaRegistro
                    key={record.id}
                    reg={record}
                    compact={compact}
                    onClose={() => onClose(record)}
                    onActivate={record.scheduledOnly ? () => onActivate(record) : undefined}
                    onDocs={record.attended && !record.docsDelivered ? () => onDocs(record) : undefined}
                    onEdit={!record.docsDelivered || canManageClosedRecords ? () => onEdit(record) : undefined}
                    onDelete={userRole !== "guardia" ? () => onDelete(record.id, record.razonSocial) : undefined}
                    isAbandoned={isAbandoned(record)}
                    closing={closingIds.has(record.id)}
                    docsLoading={docsIds.has(record.id)}
                    deleting={deletingIds.has(record.id)}
                  />
                ))}
              </div>
            ) : null}
          </AnimatePresence>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--sg-line)] px-3 py-2.5">
            <button
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPageSafe === 1}
              className="flex items-center justify-center gap-1 h-9 px-3 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-accent)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
            <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
              {currentPageSafe} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPageSafe === totalPages}
              className="flex items-center justify-center gap-1 h-9 px-3 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-accent)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
