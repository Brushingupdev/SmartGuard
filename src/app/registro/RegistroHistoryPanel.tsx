import TarjetaRegistro from "@/components/TarjetaRegistro";
import { AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Timer,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { RecentRegistration } from "./types";
import { isAbandonedRecord, isDelayedRecord } from "./status";

const PAGE_SIZE = 10;
type FilterKey = "todos" | "pendientes" | "atendidos" | "completados" | "demoras";

interface RegistroHistoryPanelProps {
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
  const canManageClosedRecords = userRole !== "guardia";

  const filteredRecords = useMemo(() => {
    const now = new Date();
    const isAbandoned = (record: RecentRegistration) => isAbandonedRecord(record, now);
    const isDelayed = (record: RecentRegistration) => isDelayedRecord(record, now);
    const term = searchTerm.trim().toUpperCase();
    const matchesSearch = recentRegistrations.filter(
      (record) =>
        record.razonSocial.toUpperCase().includes(term) ||
        record.empresa.toUpperCase().includes(term),
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

  return (
    <div className="flex flex-col h-full">
      <section className="sg-panel flex flex-col h-full">
        <div className="flex flex-col gap-4 border-b border-[var(--sg-line)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[var(--sg-accent)] text-[var(--sg-canvas)]">
              <Timer className="h-5 w-5" />
            </div>
            <h2 className="sg-font-display text-[16px] font-bold uppercase tracking-tight text-[var(--sg-ink)] shrink-0">
              Registros de Hoy
            </h2>

            <div className="relative flex-1 flex justify-center"><div className="relative w-full max-w-sm xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value.toUpperCase());
                  setCurrentPage(1);
                }}
                placeholder="Buscar por placa o empresa..."
                className="sg-input h-10 w-full pl-9 text-[11px]"
              />
              {searchTerm ? (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div></div>

            <button
              onClick={onRefresh}
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)] transition-colors"
            >
              Actualizar
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "todos", label: "Todos" },
              { key: "pendientes", label: "Pendientes" },
              { key: "atendidos", label: "Atendidos" },
              { key: "completados", label: "Completados" },
              { key: "demoras", label: "Demoras" },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => {
                  setActiveFilter(filter.key as FilterKey);
                  setCurrentPage(1);
                }}
                className={`border px-2.5 py-1 sg-font-mono text-[8px] uppercase tracking-widest transition-colors ${
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
          <AnimatePresence mode="popLayout">
            {recentRegistrations.length === 0 ? (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 text-[var(--sg-muted)]">
                <div className="flex h-16 w-16 items-center justify-center border border-dashed border-[var(--sg-line)]">
                  <Truck className="h-7 w-7 opacity-20" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-ink)] opacity-30">Sin registros hoy</p>
                  <p className="sg-font-mono text-[9px] uppercase tracking-widest opacity-20">Los vehículos registrados aparecerán aquí</p>
                </div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 text-[var(--sg-muted)]">
                <div className="flex h-16 w-16 items-center justify-center border border-dashed border-[var(--sg-line)]">
                  <Search className="h-7 w-7 opacity-20" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-ink)] opacity-30">Sin resultados</p>
                  <p className="sg-font-mono text-[9px] uppercase tracking-widest opacity-20">para &quot;{searchTerm}&quot;</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {paginatedRecords.map((record) => (
                  <TarjetaRegistro
                    key={record.id}
                    reg={record}
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
            )}
          </AnimatePresence>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--sg-line)] p-3">
            <button
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPageSafe === 1}
              className="flex items-center gap-1.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-accent)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </button>
            <span className="sg-font-mono text-[10px] text-[var(--sg-muted)]">
              {currentPageSafe} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPageSafe === totalPages}
              className="flex items-center gap-1.5 sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-accent)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
