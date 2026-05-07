import TarjetaRegistro from "@/components/TarjetaRegistro";
import { AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  History,
  Search,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { RecentRegistration } from "./types";

const PAGE_SIZE = 10;

interface RegistroHistoryPanelProps {
  plant: string;
  recentRegistrations: RecentRegistration[];
  recentTotal: number;
  lastRefresh: string;
  abandonedRecords: RecentRegistration[];
  closingIds: Set<number>;
  docsIds: Set<number>;
  deletingIds: Set<number>;
  userRole: string | null;
  onRefresh: () => void;
  onClose: (reg: RecentRegistration) => void;
  onDocs: (reg: RecentRegistration) => void;
  onEdit: (reg: RecentRegistration) => void;
  onDelete: (id: number, razonSocial: string) => void;
  onCloseAbandoned: () => void;
}

export default function RegistroHistoryPanel({
  plant,
  recentRegistrations,
  recentTotal,
  lastRefresh,
  abandonedRecords,
  closingIds,
  docsIds,
  deletingIds,
  userRole,
  onRefresh,
  onClose,
  onDocs,
  onEdit,
  onDelete,
  onCloseAbandoned,
}: RegistroHistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toUpperCase();
    if (!term) return recentRegistrations;
    return recentRegistrations.filter(
      (record) =>
        record.razonSocial.toUpperCase().includes(term) ||
        record.empresa.toUpperCase().includes(term),
    );
  }, [recentRegistrations, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginatedRecords = filteredRecords.slice((currentPageSafe - 1) * PAGE_SIZE, currentPageSafe * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <section className="sg-panel flex min-h-[600px] flex-col">
        <div className="flex flex-col gap-3 border-b border-[var(--sg-line)] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-[var(--sg-panel-2)] text-[var(--sg-accent)]">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="sg-font-display text-[18px] font-bold uppercase tracking-tight text-[var(--sg-ink)]">
                  Registros de Hoy
                </h2>
                <p className="text-[11px] uppercase tracking-widest text-[var(--sg-muted)]">
                  {plant} · {filteredRecords.length}{searchTerm ? ` de ${recentRegistrations.length}` : `/${recentTotal}`}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <button
                onClick={onRefresh}
                className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)] hover:underline"
              >
                Actualizar
              </button>
              {lastRefresh && (
                <span className="sg-font-mono text-[9px] text-[var(--sg-muted)]" suppressHydrationWarning>
                  ↻ {lastRefresh}
                </span>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value.toUpperCase());
                setCurrentPage(1);
              }}
              placeholder="Buscar por placa o empresa..."
              className="sg-input w-full pl-9 text-[11px]"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
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
              <div className="flex flex-col items-center justify-center py-20 text-[var(--sg-muted)]">
                <Truck className="mb-4 h-12 w-12 opacity-10" />
                <p className="sg-font-mono text-[12px] uppercase tracking-widest">Sin registros hoy</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--sg-muted)]">
                <Search className="mb-4 h-10 w-10 opacity-10" />
                <p className="sg-font-mono text-[12px] uppercase tracking-widest">
                  Sin resultados para &quot;{searchTerm}&quot;
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {paginatedRecords.map((record) => (
                  <TarjetaRegistro
                    key={record.id}
                    reg={record}
                    onClose={() => onClose(record)}
                    onDocs={record.attended && !record.docsDelivered ? () => onDocs(record) : undefined}
                    onEdit={!record.docsDelivered ? () => onEdit(record) : undefined}
                    onDelete={userRole !== "guardia" ? () => onDelete(record.id, record.razonSocial) : undefined}
                    isAbandoned={abandonedRecords.some((abandoned) => abandoned.id === record.id)}
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
