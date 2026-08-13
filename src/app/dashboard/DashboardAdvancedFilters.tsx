"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Filter, RotateCcw } from "lucide-react";
import {
  DASHBOARD_INTERVAL_OPTIONS,
  DASHBOARD_MONTH_OPTIONS,
  countDashboardFilters,
  type DashboardFilters,
  type DashboardIntervalFilter,
} from "@/lib/dashboardFilters";

interface DashboardAdvancedFiltersProps {
  filters: DashboardFilters;
  selectedYear: string;
  observations: string[];
  onMonthChange: (months: number[]) => void;
  onWeekChange: (week: number | null) => void;
  onIntervalChange: (intervals: DashboardIntervalFilter[]) => void;
  onObservationChange: (observation: string | null) => void;
  onClear: () => void;
}

function SelectShell({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 block sg-font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--sg-muted)]"
      >
        {label}
      </label>
      <div className="relative">
        {children}
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
      </div>
    </div>
  );
}

const SELECT_CLASS =
  "h-9 w-full min-w-0 appearance-none border border-[var(--sg-line)] bg-[var(--sg-panel)] pl-3 pr-8 text-[11px] font-medium text-[var(--sg-ink)] outline-none transition-colors hover:border-[var(--sg-line-strong)] focus:border-[var(--sg-accent)] disabled:cursor-not-allowed disabled:opacity-40";

function FilterMultiSelect<T extends string | number>({
  id,
  label,
  selected,
  onChange,
  options,
  allLabel,
  pluralLabel,
}: {
  id: string;
  label: string;
  selected: T[];
  onChange: (values: T[]) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  allLabel: string;
  pluralLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const toggle = (selectedValue: T) => {
    const next = selected.includes(selectedValue)
      ? selected.filter((value) => value !== selectedValue)
      : options
          .map((option) => option.value)
          .filter((value) => value === selectedValue || selected.includes(value));
    onChange(next);
  };

  const summary = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? options.find((option) => option.value === selected[0])?.label
      : `${selected.length} ${pluralLabel}`;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <span
        id={`${id}-label`}
        className="mb-1.5 block sg-font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--sg-muted)]"
      >
        {label}
      </span>
      <button
        type="button"
        aria-labelledby={`${id}-label ${id}-summary`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        onClick={() => setOpen((current) => !current)}
        className={`${SELECT_CLASS} flex items-center justify-between gap-2 text-left`}
      >
        <span id={`${id}-summary`} className="min-w-0 truncate">
          {summary}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-[var(--sg-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          id={`${id}-options`}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-40 mt-1 w-full min-w-[260px] border border-[var(--sg-line-strong)] bg-[var(--sg-panel)] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
        >
          <button
            type="button"
            role="option"
            aria-selected={selected.length === 0}
            onClick={() => onChange([])}
            className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[11px] text-[var(--sg-ink)] transition-colors hover:bg-[var(--sg-panel-2)] focus:bg-[var(--sg-panel-2)] focus:outline-none"
          >
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center border ${selected.length === 0 ? "border-[var(--sg-accent)] bg-[var(--sg-accent)] text-[var(--sg-canvas)]" : "border-[var(--sg-line-strong)]"}`}>
              {selected.length === 0 ? <Check className="h-3 w-3" /> : null}
            </span>
            {allLabel}
          </button>

          <div className="my-1 border-t border-[var(--sg-line)]" />

          {options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(option.value)}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[11px] text-[var(--sg-ink)] transition-colors hover:bg-[var(--sg-panel-2)] focus:bg-[var(--sg-panel-2)] focus:outline-none"
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center border ${checked ? "border-[var(--sg-accent)] bg-[var(--sg-accent)] text-[var(--sg-canvas)]" : "border-[var(--sg-line-strong)]"}`}>
                  {checked ? <Check className="h-3 w-3" /> : null}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardAdvancedFilters({
  filters,
  selectedYear,
  observations,
  onMonthChange,
  onWeekChange,
  onIntervalChange,
  onObservationChange,
  onClear,
}: DashboardAdvancedFiltersProps) {
  const activeCount = countDashboardFilters(filters);
  const months = filters.months ?? [];
  const week = months.length > 0 ? filters.weekOfMonth ?? null : null;

  return (
    <section
      aria-label="Filtros avanzados"
      className="border border-[var(--sg-line)] bg-[var(--sg-panel-2)] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.18)] sm:p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[var(--sg-accent)]" />
          <div>
            <span className="sg-font-display text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--sg-ink)]">
              Filtros avanzados
            </span>
            <p className="mt-0.5 text-[10px] text-[var(--sg-muted)]">
              Refina el período, la espera y las observaciones sin perder el contexto actual.
            </p>
          </div>
          {activeCount > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center bg-[var(--sg-accent)] px-1.5 sg-font-mono text-[9px] font-bold text-[var(--sg-canvas)]">
              {activeCount}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={activeCount === 0}
          className="flex items-center gap-1.5 sg-font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--sg-muted)] transition-colors hover:text-[var(--sg-ink)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Limpiar filtros
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FilterMultiSelect
          id="dashboard-month"
          label={`Meses de ${selectedYear}`}
          selected={months}
          onChange={onMonthChange}
          options={DASHBOARD_MONTH_OPTIONS}
          allLabel={`Todos los meses de ${selectedYear}`}
          pluralLabel="meses seleccionados"
        />

        <SelectShell id="dashboard-week" label="Semana del mes">
          <select
            id="dashboard-week"
            value={week ?? ""}
            onChange={(event) => onWeekChange(event.target.value ? Number(event.target.value) : null)}
            disabled={months.length === 0}
            className={SELECT_CLASS}
          >
            <option value="">Todas las semanas</option>
            <option value="1">Semana 1 · días 1–7</option>
            <option value="2">Semana 2 · días 8–14</option>
            <option value="3">Semana 3 · días 15–21</option>
            <option value="4">Semana 4 · días 22–28</option>
            <option value="5">Semana 5 · día 29 al cierre</option>
          </select>
        </SelectShell>

        <FilterMultiSelect<DashboardIntervalFilter>
          id="dashboard-interval"
          label="Intervalo de espera"
          selected={filters.intervals ?? []}
          onChange={onIntervalChange}
          options={DASHBOARD_INTERVAL_OPTIONS}
          allLabel="Todos los intervalos"
          pluralLabel="intervalos seleccionados"
        />

        <SelectShell id="dashboard-observation" label="Registro / causa de observación">
          <select
            id="dashboard-observation"
            value={filters.observation ?? ""}
            onChange={(event) => onObservationChange(event.target.value || null)}
            className={SELECT_CLASS}
          >
            <option value="">Todas las observaciones</option>
            {observations.map((observation) => (
              <option key={observation} value={observation}>
                {observation}
              </option>
            ))}
          </select>
        </SelectShell>
      </div>
    </section>
  );
}
