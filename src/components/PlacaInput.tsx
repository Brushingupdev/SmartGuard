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
  compact = false,
  hideLabel = false,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Llamado al seleccionar sugerencia — recibe el valor elegido */
  onSelect?: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  compact?: boolean;
  hideLabel?: boolean;
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
    <div className={hideLabel ? "" : "sg-field"}>
      {!hideLabel ? (
        <label className="sg-label">
          Razon Social / Vehiculo <span className="text-[var(--sg-accent)]">*</span>
        </label>
      ) : null}
      <div ref={containerRef} className="relative">
        <Truck
          className={`pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 transition-colors ${
            compact ? "h-4 w-4" : "h-5 w-5"
          } ${
            focused
              ? "text-[var(--sg-accent)]"
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
          className={`sg-input pl-10 uppercase font-bold tracking-[0.04em] transition-all ${
            compact ? "h-11 text-[14px] sm:text-[15px]" : "h-14 text-[18px] sm:h-16 sm:text-[22px]"
          } ${
            focused ? "border-[var(--sg-accent)] shadow-[0_0_0_3px_rgba(200,168,75,0.12)] text-[var(--sg-accent)]" : ""
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
    </div>
  );
}
