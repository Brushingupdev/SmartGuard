"use client";

import { Search, X } from "lucide-react";

interface FiltersToolbarProps {
  search: string;
  onSearch: (v: string) => void;
  filters: { key: string; label: string; active: boolean; count?: number }[];
  onToggle: (key: string) => void;
  onClear: () => void;
}

export default function FiltersToolbar({ search, onSearch, filters, onToggle, onClear }: FiltersToolbarProps) {
  const hasFilters = search || filters.some(f => f.active);

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[320px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar empresa..."
          className="sg-input pl-9 pr-3 py-2 text-[12px]"
        />
        {search && (
          <button
            onClick={() => onSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--sg-muted)] hover:text-[var(--sg-ink)]"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onToggle(f.key)}
            className={`px-3 py-1.5 sg-font-mono text-[9px] uppercase tracking-widest transition-colors border ${
              f.active
                ? "bg-[var(--sg-accent)] border-[var(--sg-accent)] text-[var(--sg-canvas)]"
                : "border-[var(--sg-line)] text-[var(--sg-muted)] hover:border-[var(--sg-accent)] hover:text-[var(--sg-accent)]"
            }`}
          >
            {f.label} {f.count != null ? `(${f.count})` : ""}
          </button>
        ))}

        {hasFilters && (
          <button
            onClick={onClear}
            className="px-2 py-1.5 sg-font-mono text-[9px] uppercase tracking-widest text-[var(--sg-muted)] hover:text-[var(--sg-danger)] transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
