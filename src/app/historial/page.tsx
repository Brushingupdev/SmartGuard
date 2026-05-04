"use client";

import AppLayout from "@/components/AppLayout";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  RefreshCw,
  Search,
  Timer,
  Truck,
  User,
  X,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { getAtenciones, getAtencionesForExport, getHistorialStats, getUserPlants, getUserProfile, getCompaniesMap, getCompanies } from "../actions";

const fmt = new Intl.NumberFormat("en-US");

interface HistorialRecord {
  id: number;
  fecha: string | null;
  h_registro: string | null;
  h_atencion: string | null;
  h_dev_docs: string | null;
  razon_social: string | null;
  empresa: string | null;
  company_id: string | null;
  planta: string | null;
  tipo: string | null;
  tipo_operacion: string | null;
  motivo_demora: string | null;
  espera_min: number | null;
  tiempo_total_min: number | null;
  segmento_espera: string | null;
  responsable: string | null;
  agente: string | null;
  observacion: string | null;
  es_demora: number | boolean | null;
}

function getWaitLabel(wait: number | null) {
  if (wait == null) return { text: "Pendiente", badge: "sg-badge-muted", color: "var(--sg-muted)" };
  if (wait >= 90) return { text: "Crítico",  badge: "sg-badge-deny", color: "var(--sg-danger)" };
  if (wait >= 45) return { text: "Alto",     badge: "sg-badge-warn", color: "#e07b3a" };
  if (wait >= 30) return { text: "Moderado", badge: "sg-badge-info", color: "var(--sg-info)" };
  return           { text: "Normal",  badge: "sg-badge-ok",   color: "var(--sg-success)" };
}

function exportCSV(rows: HistorialRecord[]) {
  const headers = ["ID", "Fecha", "H.Registro", "H.Atencion", "H.Dev.Docs", "Razon_Social", "Empresa", "Planta", "Tipo", "Tipo_Operacion", "Motivo_Demora", "Espera_Min", "Tiempo_Total_Min", "Segmento", "Responsable", "Agente", "Observacion"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.id, r.fecha, r.h_registro ?? "", r.h_atencion ?? "", r.h_dev_docs ?? "",
      `"${(r.razon_social ?? "").replace(/"/g, '""')}"`,
      `"${(r.empresa ?? "").replace(/"/g, '""')}"`,
      r.planta ?? "", r.tipo ?? "", r.tipo_operacion ?? "", r.motivo_demora ?? "",
      r.espera_min ?? "", r.tiempo_total_min ?? "", r.segmento_espera ?? "",
      r.responsable ?? "", r.agente ?? "",
      `"${(r.observacion ?? "").replace(/"/g, '""')}"`,
    ].join(","));
  }
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `historial_smartguard_${new Date().toLocaleDateString("en-CA")}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Detail Modal ───────────────────────────────────────────────────────────

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">{label}</span>
      <span className={`text-[13px] text-[var(--sg-ink)] ${mono ? "sg-font-mono tracking-[0.08em]" : ""}`}>
        {value ?? <span className="text-[var(--sg-muted)]">—</span>}
      </span>
    </div>
  );
}

function RecordDetailModal({ record, onClose }: { record: HistorialRecord; onClose: () => void }) {
  const wl = getWaitLabel(record.espera_min as number | null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,5,4,0.78)] backdrop-blur-sm px-4 py-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[640px] border border-[var(--sg-line)] bg-[var(--sg-panel)] shadow-[12px_12px_0_rgba(196,192,180,0.06)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--sg-line)] px-5 py-4 sticky top-0 bg-[var(--sg-panel)] z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center bg-[var(--sg-accent)]">
              <FileText className="h-3.5 w-3.5 text-[var(--sg-canvas)]" />
            </div>
            <div>
              <div className="sg-font-display text-[14px] font-bold uppercase tracking-[0.14em] text-[var(--sg-ink)]">
                Registro #{record.id}
              </div>
              <div className="sg-font-mono text-[10px] text-[var(--sg-muted)] mt-0.5">
                {record.fecha} · {record.planta}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`sg-badge ${wl.badge}`}>{wl.text}</span>
            <button
              onClick={onClose}
              className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)] transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-5">

          {/* Empresa / Razón social */}
          <section className="border border-[var(--sg-line)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-3.5 w-3.5 text-[var(--sg-accent)]" />
              <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Vehículo / Empresa</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Razón Social" value={record.razon_social} />
              <Field label="Empresa" value={record.empresa} />
              <Field label="Tipo" value={record.tipo} />
              <Field label="Tipo de operación" value={record.tipo_operacion} />
            </div>
          </section>

          {/* Tiempos */}
          <section className="border border-[var(--sg-line)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-3.5 w-3.5 text-[var(--sg-accent)]" />
              <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Tiempos de atención</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Field label="H. Registro" value={record.h_registro?.substring(0, 5)} mono />
              <Field label="H. Atención" value={record.h_atencion?.substring(0, 5)} mono />
              <Field label="H. Dev. Docs" value={record.h_dev_docs?.substring(0, 5)} mono />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Espera</span>
                <span className="sg-font-mono text-[20px] font-bold" style={{ color: wl.color }}>
                  {record.espera_min != null ? `${record.espera_min} min` : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="sg-font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Tiempo total</span>
                <span className="sg-font-mono text-[20px] font-bold text-[var(--sg-ink)]">
                  {record.tiempo_total_min != null ? `${record.tiempo_total_min} min` : "—"}
                </span>
              </div>
              <Field label="Segmento" value={record.segmento_espera} />
            </div>
          </section>

          {/* Personal */}
          <section className="border border-[var(--sg-line)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-3.5 w-3.5 text-[var(--sg-accent)]" />
              <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Personal</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Responsable de almacén" value={record.responsable} />
              <Field label="Agente responsable" value={record.agente} />
            </div>
          </section>

          {/* Demora / Observación */}
          {(record.motivo_demora || record.observacion || record.es_demora) && (
            <section className="border border-[var(--sg-warn)] bg-[rgba(200,168,75,0.04)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Timer className="h-3.5 w-3.5 text-[var(--sg-warn)]" />
                <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-warn)]">Demora / Incidencia</span>
              </div>
              <div className="flex flex-col gap-3">
                {record.motivo_demora && <Field label="Motivo de demora" value={record.motivo_demora} />}
                {record.observacion   && <Field label="Observación" value={record.observacion} />}
              </div>
            </section>
          )}

          {/* Observación sin demora */}
          {record.observacion && !record.motivo_demora && !record.es_demora && (
            <section className="border border-[var(--sg-line)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-3.5 w-3.5 text-[var(--sg-muted)]" />
                <span className="sg-font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--sg-muted)]">Observación</span>
              </div>
              <Field label="" value={record.observacion} />
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-[var(--sg-line)] px-5 py-4 flex items-center justify-between">
          <div className="sg-font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--sg-muted)]">
            Planta {record.planta} · ID {record.id}
          </div>
          <button onClick={onClose} className="sg-btn sg-btn-ghost sg-btn-sm">
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HistorialPage() {
  // Admin
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [companiesMap,  setCompaniesMap]  = useState<Record<string, string>>({});
  const [companiesList, setCompaniesList] = useState<{ id: string; name: string }[]>([]);
  const [filterCompany, setFilterCompany] = useState("");

  // Filters
  const [search, setSearch]     = useState("");
  const [plant, setPlant]       = useState("Todos");
  const [plants, setPlants]     = useState<string[]>([]);
  const [segment, setSegment]   = useState("Todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage]         = useState(1);
  const perPage = 12;

  // Data
  const [records, setRecords]   = useState<HistorialRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);

  // Stats
  const [stats, setStats] = useState<{ total: number; avg: number; max: number; plants: number } | null>(null);

  // Sort — default: id DESC (más reciente primero); click en Espera: espera_min DESC → ASC → id DESC
  const [sortByEspera, setSortByEspera] = useState(false);
  const [sortDir,      setSortDir]      = useState<"asc" | "desc">("desc");

  // Detail modal
  const [selectedRecord, setSelectedRecord] = useState<HistorialRecord | null>(null);

  const activeFilters = [plant !== "Todos", segment !== "Todos", !!dateFrom, !!dateTo].filter(Boolean).length;

  const toggleSort = () => {
    if (!sortByEspera) {
      setSortByEspera(true); setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortByEspera(false); setSortDir("desc");
    }
    setPage(1);
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await getAtenciones({
        page, search, perPage, plant, segment, dateFrom, dateTo,
        sortBy: sortByEspera ? "espera_min" : "id",
        sortDir: sortByEspera ? sortDir : "desc",
        filterCompanyId: filterCompany,
      });
      setRecords(data || []);
      if (count !== null) setTotalCount(count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, plant, segment, dateFrom, dateTo, sortByEspera, sortDir, filterCompany]);

  useEffect(() => {
    getHistorialStats().then(setStats);
    getUserPlants().then(setPlants);
    getUserProfile().then(p => {
      if (p?.isAdmin) {
        setIsAdmin(true);
        getCompaniesMap().then(setCompaniesMap);
        getCompanies().then(list => setCompaniesList(list as { id: string; name: string }[]));
      }
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchRecords, 280);
    return () => clearTimeout(t);
  }, [fetchRecords]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  const resetFilters = () => {
    setPlant("Todos"); setSegment("Todos"); setDateFrom(""); setDateTo(""); setSearch(""); setPage(1);
    setSortByEspera(false); setSortDir("desc"); setFilterCompany("");
  };

  const handleExport = async () => {
    setExporting(true);
    const rows = await getAtencionesForExport(
      search, plant, segment, dateFrom, dateTo,
      sortByEspera ? "espera_min" : "id",
      sortByEspera ? sortDir : "desc",
    );
    exportCSV(rows);
    setExporting(false);
  };

  return (
    <AppLayout>
      <AnimatePresence>
        {selectedRecord && (
          <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
        )}
      </AnimatePresence>

      {/* Topbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sg-line)] pb-5">
        <div className="flex items-center gap-4">
          <div className="sg-kicker">Historial</div>
          <span className="sg-live-pill">
            <span className="sg-live-dot sg-pulse" />
            Trazabilidad
          </span>
        </div>
        <div className="sg-mono text-[11px] text-[var(--sg-muted)] tracking-[0.12em]">
          {stats ? fmt.format(stats.total) : "—"} eventos históricos
        </div>
      </div>

      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-2 gap-0 border border-[var(--sg-line)] md:grid-cols-4">
        {[
          { label: "Eventos disponibles",  val: stats ? fmt.format(stats.total) : "—",   suffix: "" },
          { label: "Espera promedio",       val: stats ? stats.avg.toString() : "—",       suffix: " min" },
          { label: "Plantas monitoreadas", val: stats ? stats.plants.toString() : "—",    suffix: "" },
          { label: "Espera máxima",         val: stats ? fmt.format(stats.max) : "—",      suffix: " min" },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`sg-stat ${i < 2 ? "border-b border-[var(--sg-line)] md:border-b-0" : ""} ${i === 0 || i === 2 ? "border-r border-[var(--sg-line)]" : ""}`}
          >
            <div>
              <span className="sg-stat-num" style={{ fontSize: 32 }}>{s.val}</span>
              <span className="sg-stat-suffix" style={{ fontSize: 20 }}>{s.suffix}</span>
            </div>
            <div className="sg-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar + Table */}
      <section className="sg-panel overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-[var(--sg-line)] px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 min-w-[200px] items-center gap-2 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-3 lg:max-w-[360px]">
              <Search className="h-4 w-4 shrink-0 text-[var(--sg-muted)]" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Razón Social o Empresa..."
                className="h-10 w-full bg-transparent text-[13px] text-[var(--sg-ink)] outline-none placeholder:text-[var(--sg-muted)]"
              />
              {search && (
                <button onClick={() => { setSearch(""); setPage(1); }} className="text-[var(--sg-muted)] hover:text-[var(--sg-ink)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`sg-btn sg-btn-ghost sg-btn-sm flex items-center gap-2 ${activeFilters ? "border-[var(--sg-accent)] text-[var(--sg-accent)]" : ""}`}
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                Filtros {activeFilters > 0 && <span className="ml-1 h-4 w-4 rounded-full bg-[var(--sg-accent)] text-[var(--sg-canvas)] text-[9px] flex items-center justify-center font-bold">{activeFilters}</span>}
              </button>

              {activeFilters > 0 && (
                <button onClick={resetFilters} className="sg-btn sg-btn-ghost sg-btn-sm flex items-center gap-1.5 text-[var(--sg-muted)] hover:text-[var(--sg-danger)]">
                  <X className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              )}

              <button
                onClick={handleExport}
                disabled={exporting || loading}
                className="sg-btn sg-btn-ghost sg-btn-sm flex items-center gap-2"
              >
                {exporting ? (
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </motion.span>
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Exportar CSV
              </button>
            </div>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--sg-line)] lg:grid-cols-4"
            >
              {isAdmin && (
                <div className="sg-field col-span-2 lg:col-span-1">
                  <label className="sg-label">Empresa cliente</label>
                  <div className="relative">
                    <select value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setPage(1); }} className="sg-select appearance-none pr-8">
                      <option value="">Todas las empresas</option>
                      {companiesList.map(c => <option key={c.id} value={c.id} className="bg-[var(--sg-panel-2)]">{c.name}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                  </div>
                </div>
              )}
              <div className="sg-field">
                <label className="sg-label">Planta</label>
                <div className="relative">
                  <select value={plant} onChange={e => { setPlant(e.target.value); setPage(1); }} className="sg-select appearance-none pr-8">
                    {["Todos", ...plants].map(p => <option key={p} value={p} className="bg-[var(--sg-panel-2)]">{p}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                </div>
              </div>

              <div className="sg-field">
                <label className="sg-label">Estado / Segmento</label>
                <div className="relative">
                  <select value={segment} onChange={e => { setSegment(e.target.value); setPage(1); }} className="sg-select appearance-none pr-8">
                    {["Todos", "Pendiente", "Normal", "Moderado", "Alto", "Crítico"].map(s => <option key={s} value={s} className="bg-[var(--sg-panel-2)]">{s}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sg-muted)]" />
                </div>
              </div>

              <div className="sg-field">
                <label className="sg-label">Desde</label>
                <input type="date" value={dateFrom} max={new Date().toISOString().split("T")[0]} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="sg-input" style={{ colorScheme: "dark" }} />
              </div>

              <div className="sg-field">
                <label className="sg-label">Hasta</label>
                <input type="date" value={dateTo} max={new Date().toISOString().split("T")[0]} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="sg-input" style={{ colorScheme: "dark" }} />
              </div>
            </motion.div>
          )}
        </div>

        {/* Table */}
        <div className="relative overflow-x-auto min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--sg-panel)]/50 backdrop-blur-sm">
              <div className="flex items-center gap-3 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-4 py-3 shadow-lg">
                <span className="sg-live-dot sg-pulse" />
                <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)]">Cargando...</span>
              </div>
            </div>
          )}
          <table className="sg-table min-w-[1200px]">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>H. Reg.</th>
                <th>H. Aten.</th>
                <th>H. Docs.</th>
                <th>Razón Social</th>
                <th>Empresa</th>
                {isAdmin && <th>Cliente</th>}
                <th>Planta</th>
                <th>Tipo Op.</th>
                <th>
                  <button
                    onClick={toggleSort}
                    className="inline-flex items-center gap-1.5 hover:text-[var(--sg-ink)] transition-colors"
                    title={!sortByEspera ? "Ordenar por espera ↓" : sortDir === "desc" ? "Ordenar por espera ↑" : "Quitar orden"}
                  >
                    Espera
                    {!sortByEspera
                      ? <ArrowUpDown className="h-3 w-3 text-[var(--sg-muted)]" />
                      : sortDir === "desc"
                        ? <ArrowDown className="h-3 w-3 text-[var(--sg-accent)]" />
                        : <ArrowUp   className="h-3 w-3 text-[var(--sg-accent)]" />
                    }
                  </button>
                </th>
                <th>T. Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const wl = getWaitLabel(r.espera_min as number | null);
                return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.015 }}
                    onClick={() => setSelectedRecord(r)}
                    className="cursor-pointer hover:bg-[var(--sg-panel-2)] transition-colors"
                    title="Ver detalle completo"
                  >
                    <td className="sg-mono text-[11px] text-[var(--sg-muted)]">#{r.id}</td>
                    <td className="sg-mono text-[11px] text-[var(--sg-copy)]">{r.fecha}</td>
                    <td className="sg-mono text-[11px] text-[var(--sg-copy)]">{r.h_registro?.substring(0, 5) || "--:--"}</td>
                    <td className="sg-mono text-[11px] text-[var(--sg-muted)]">{r.h_atencion?.substring(0, 5) || "—"}</td>
                    <td className="sg-mono text-[11px] text-[var(--sg-muted)]">{r.h_dev_docs?.substring(0, 5) || "—"}</td>
                    <td>
                      <span className="font-semibold text-[var(--sg-ink)] block truncate max-w-[180px]" title={r.razon_social ?? undefined}>{r.razon_social || "-"}</span>
                    </td>
                    <td className="text-[var(--sg-copy)] truncate max-w-[140px]" title={r.empresa ?? undefined}>{r.empresa || "-"}</td>
                    {isAdmin && (
                      <td>
                        <span className="sg-font-mono text-[10px] uppercase tracking-widest text-[var(--sg-accent)] truncate max-w-[120px] block">
                          {r.company_id ? (companiesMap[r.company_id] ?? "—") : "—"}
                        </span>
                      </td>
                    )}
                    <td>
                      <span className="sg-mono text-[10px] uppercase tracking-[0.12em] text-[var(--sg-muted)]">{r.planta}</span>
                    </td>
                    <td className="sg-mono text-[11px] text-[var(--sg-copy)]">
                      {r.tipo_operacion || r.motivo_demora || "-"}
                    </td>
                    <td>
                      <span className="sg-font-mono text-[12px] font-bold" style={{ color: wl.color }}>
                        {r.espera_min != null ? `${r.espera_min} min` : "—"}
                      </span>
                    </td>
                    <td className="sg-mono text-[11px] text-[var(--sg-muted)]">
                      {r.tiempo_total_min != null ? `${r.tiempo_total_min} min` : "—"}
                    </td>
                    <td>
                      <span className={`sg-badge ${wl.badge}`}>{wl.text}</span>
                    </td>
                  </motion.tr>
                );
              })}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 13 : 12} className="py-10 text-center text-[var(--sg-muted)]">
                    No se encontraron registros con los filtros aplicados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-[var(--sg-line)] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="sg-mono text-[11px] uppercase tracking-[0.12em] text-[var(--sg-muted)]">
            Página {Math.min(page, totalPages)} de {totalPages} · {fmt.format(totalCount)} resultados
            {" · "}
            <span className="text-[var(--sg-muted)] opacity-60">Haz click en una fila para ver el detalle</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(v => Math.max(1, v - 1))}
              disabled={page <= 1 || loading}
              className="flex h-9 w-9 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-copy)] transition-colors hover:text-[var(--sg-ink)] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let start = Math.max(1, page - 2);
              const end = Math.min(totalPages, start + 4);
              if (end - start < 4) start = Math.max(1, end - 4);
              return start + i;
            })
              .filter(v => v <= totalPages)
              .map(v => (
                <button
                  key={v}
                  onClick={() => setPage(v)}
                  disabled={loading}
                  className={`flex h-9 w-9 items-center justify-center sg-font-mono text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                    page === v
                      ? "bg-[var(--sg-accent)] text-[var(--sg-canvas)]"
                      : "border border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-copy)] hover:text-[var(--sg-ink)]"
                  }`}
                >
                  {String(v).padStart(2, "0")}
                </button>
              ))}

            <button
              onClick={() => setPage(v => Math.min(totalPages, v + 1))}
              disabled={page >= totalPages || loading}
              className="flex h-9 w-9 items-center justify-center border border-[var(--sg-line)] bg-[var(--sg-panel-2)] text-[var(--sg-copy)] transition-colors hover:text-[var(--sg-ink)] disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
