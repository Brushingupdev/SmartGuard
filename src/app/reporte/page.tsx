"use client";

import AppLayout from "@/components/AppLayout";
import {
  getAvailableYears,
  getDashboardTrends,
  getReporteData,
  getUserGateOptions,
  getUserPlants,
} from "@/app/actions";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { groupGatesBySite, type GateAssignment } from "@/lib/gates";
import {
  KpiStrip,
  ReporteFilterBar,
  ReporteTopbar,
} from "./ReporteControls";
import { ReporteSections } from "./ReporteSections";
import type {
  DashboardTrendSummary,
  ReporteData,
} from "./reporteTypes";
import { exportReporteCSV } from "./reporteUtils";

// ── Main content ─────────────────────────────────────────────────────────────

function ReporteContent() {
  const searchParams  = useSearchParams();
  const [plant,          setPlant]          = useState(searchParams.get("plant")     ?? "Todos");
  const [plants,         setPlants]         = useState<string[]>([]);
  const [timeframe,      setTimeframe]      = useState(searchParams.get("timeframe") ?? "Día");
  const [selectedYear,   setSelectedYear]   = useState<string>("2026");
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [soloDemoras,    setSoloDemoras]    = useState(false);
  const [compareMode,    setCompareMode]    = useState<string>("Todas");
  const [data,           setData]           = useState<ReporteData | null>(null);
  const [trends,         setTrends]         = useState<DashboardTrendSummary>({
    ok: null,
    deny: null,
    total: null,
    puntualidad: null,
  });
  const [loading,        setLoading]        = useState(true);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [mounted,   setMounted]   = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [slaSort, setSlaSort]       = useState<{ col: string; dir: "asc" | "desc" }>({ col: "rate", dir: "desc" });
  const [slaPage, setSlaPage]       = useState(1);
  const SLA_PER_PAGE = 10;
  const [agentPage, setAgentPage]   = useState(1);
  const AGENT_PER_PAGE = 10;
  const [gateOptions, setGateOptions] = useState<GateAssignment[]>([]);
  const siteGroups = useMemo(() => groupGatesBySite(gateOptions), [gateOptions]);
  const sites = useMemo(() => siteGroups.map(s => s.site), [siteGroups]);
  // Si cada sede tiene exactamente 1 puerta, el dropdown de puertas es redundante con los pills
  const showGateDropdown = useMemo(() => siteGroups.some(s => s.gates.length > 1), [siteGroups]);

  const toggleSlaSort = (col: string) => {
    setSlaSort(prev => ({ col, dir: prev.col === col && prev.dir === "desc" ? "asc" : "desc" }));
    setSlaPage(1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [report, trendsData] = await Promise.all([
        getReporteData(plant, timeframe, selectedSegments, soloDemoras, compareMode),
        getDashboardTrends(plant, timeframe),
      ]);
      setData(report);
      setTrends(trendsData.trend);
    } finally {
      setLoading(false);
    }
  }, [plant, timeframe, selectedSegments, soloDemoras, compareMode]);

  useEffect(() => {
    getUserPlants().then(setPlants);
    getAvailableYears().then((years) => {
      setAvailableYears(years);
      if (years.includes("2026")) {
        setSelectedYear("2026");
        setTimeframe("2026");
      } else if (years.includes(timeframe)) {
        setSelectedYear(timeframe);
      } else if (years.length > 0) {
        setSelectedYear(years[0]);
        setTimeframe(years[0]);
      }
    });
    getUserGateOptions().then(setGateOptions);
  }, [timeframe]);
  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const [report, trendsData] = await Promise.all([
          getReporteData(plant, timeframe, selectedSegments, soloDemoras, compareMode),
          getDashboardTrends(plant, timeframe),
        ]);
        if (active) {
          setData(report);
          setTrends(trendsData.trend);
          setLoading(false);
        }
      } catch {
        if (active) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [plant, timeframe, selectedSegments, soloDemoras, compareMode]);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const d = data;
  const providerSLA = useMemo(() => d?.providerSLA ?? [], [d?.providerSLA]);

  const sortedSLA = useMemo(() => {
    if (providerSLA.length === 0) return [];
    return [...providerSLA].sort((a, b) => {
      type SLAKey = keyof typeof a;
      const va = a[slaSort.col as SLAKey] ?? (typeof a[slaSort.col as SLAKey] === "string" ? "" : -1);
      const vb = b[slaSort.col as SLAKey] ?? (typeof b[slaSort.col as SLAKey] === "string" ? "" : -1);
      const cmp = typeof va === "string" ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
      return slaSort.dir === "desc" ? -cmp : cmp;
    });
  }, [providerSLA, slaSort.col, slaSort.dir]);

  const slaTotalPages  = Math.ceil(sortedSLA.length / SLA_PER_PAGE);
  const slaPageData    = sortedSLA.slice((slaPage - 1) * SLA_PER_PAGE, slaPage * SLA_PER_PAGE);
  const agentTotalPages = Math.ceil((d?.agentStats?.length ?? 0) / AGENT_PER_PAGE);
  const agentPageData   = (d?.agentStats ?? []).slice((agentPage - 1) * AGENT_PER_PAGE, agentPage * AGENT_PER_PAGE);
  const exportQuery = `${selectedSegments.length > 0 ? `&segments=${encodeURIComponent(selectedSegments.join(","))}` : ""}${soloDemoras ? "&soloDemoras=1" : ""}${compareMode !== "Todas" ? `&site=${encodeURIComponent(compareMode)}` : ""}`;

  return (
    <AppLayout>
      <ReporteTopbar
        sites={sites}
        compareMode={compareMode}
        setCompareMode={setCompareMode}
        setPlant={setPlant}
        showGateDropdown={showGateDropdown}
        plant={plant}
        plants={plants}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        availableYears={availableYears}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        data={data}
        loading={loading}
        exporting={exporting}
        onExportCSV={() => {
          if (!data) return;
          setExporting(true);
          exportReporteCSV(
            data,
            plant,
            timeframe,
            selectedSegments,
            soloDemoras,
            compareMode
          );
          setExporting(false);
        }}
        excelHref={`/api/exportar/excel?plant=${encodeURIComponent(plant)}&timeframe=${encodeURIComponent(timeframe)}${exportQuery}`}
        pdfHref={`/api/exportar/pdf?plant=${encodeURIComponent(plant)}&timeframe=${encodeURIComponent(timeframe)}${exportQuery}`}
        onReload={load}
      />

      <ReporteFilterBar
        data={d}
        selectedSegments={selectedSegments}
        setSelectedSegments={setSelectedSegments}
        soloDemoras={soloDemoras}
        setSoloDemoras={setSoloDemoras}
      />

      <KpiStrip
        loading={loading}
        plant={plant}
        timeframe={timeframe}
        data={d}
      />

      <ReporteSections
        loading={loading}
        data={d}
        trends={trends}
        timeframe={timeframe}
        plant={plant}
        mounted={mounted}
        slaSort={slaSort}
        toggleSlaSort={toggleSlaSort}
        slaPage={slaPage}
        setSlaPage={setSlaPage}
        slaPageData={slaPageData}
        slaTotalPages={slaTotalPages}
        sortedSLA={sortedSLA}
        SLA_PER_PAGE={SLA_PER_PAGE}
        agentPage={agentPage}
        setAgentPage={setAgentPage}
        agentPageData={agentPageData}
        agentTotalPages={agentTotalPages}
        AGENT_PER_PAGE={AGENT_PER_PAGE}
      />
    </AppLayout>
  );
}

// ── Page export with Suspense boundary for useSearchParams ───────────────────

export default function ReportePage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex items-center gap-3 border border-[var(--sg-line)] bg-[var(--sg-panel-2)] px-5 py-4">
              <span className="sg-live-dot sg-pulse" />
              <span className="sg-font-mono text-[11px] uppercase tracking-widest text-[var(--sg-accent)]">
                Cargando análisis…
              </span>
            </div>
          </div>
        </AppLayout>
      }
    >
      <ReporteContent />
    </Suspense>
  );
}
