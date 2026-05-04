"use client";

import { Truck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { searchSuggestions } from "@/app/actions";

export default function PlacaInput({
  value,
  onChange,
  onSelect,
  placeholder = "TRANSP. EMPRESA ABC-1234",
  autoFocus = false,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Llamado al seleccionar sugerencia — recibe el valor elegido */
  onSelect?: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (term: string) => {
    if (term.length < 2) { setSuggestions([]); setOpen(false); return; }
    const results = await searchSuggestions({ field: "razon_social", term });
    setSuggestions(results);
    setOpen(results.length > 0);
    setActiveIdx(-1);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase();
    onChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(v), 300);
  };

  const handleSelect = (v: string) => {
    onChange(v);
    setSuggestions([]);
    setOpen(false);
    onSelect?.(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (open && activeIdx >= 0) { e.preventDefault(); handleSelect(suggestions[activeIdx]); return; }
      onEnter?.();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown")     { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp")  { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === "Escape")   { setOpen(false); }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isValid = value.trim().length >= 4;

  return (
    <div className="sg-field">
      <label className="sg-label">
        Razon Social / Vehiculo <span className="text-[var(--sg-accent)]">*</span>
      </label>
      <div ref={containerRef} className="relative">
        <Truck
          className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 z-10 transition-colors ${
            focused
              ? isValid
                ? "text-[var(--sg-success)]"
                : "text-[var(--sg-accent)]"
              : "text-[var(--sg-muted)]"
          }`}
        />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { setFocused(true); if (suggestions.length > 0) setOpen(true); }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          required
          className={`sg-input pl-12 uppercase text-[18px] sm:text-[22px] font-bold tracking-[0.06em] h-14 sm:h-16 transition-all ${
            focused ? "border-[var(--sg-accent)] shadow-[0_0_0_3px_rgba(200,168,75,0.12)]" : ""
          }`}
        />
        {open && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 border border-[var(--sg-accent)] bg-[var(--sg-panel)] shadow-[4px_4px_0_rgba(196,192,180,0.1)] max-h-[200px] overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={s}
                type="button"
                onMouseDown={() => handleSelect(s)}
                className={`w-full text-left px-4 py-2.5 sg-font-mono text-[11px] uppercase truncate transition-colors ${
                  i === activeIdx
                    ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]"
                    : "text-[var(--sg-copy)] hover:bg-[var(--sg-panel-2)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {value.length > 0 && !isValid && (
        <p className="mt-1.5 text-[11px] text-[var(--sg-muted)] flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-[var(--sg-warn)]" />
          Ej: TRANSP. EMPRESA ABC-1234
        </p>
      )}
      {isValid && (
        <p className="mt-1.5 text-[10px] text-[var(--sg-success)] flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-[var(--sg-success)]" />
          OK
        </p>
      )}
    </div>
  );
}
