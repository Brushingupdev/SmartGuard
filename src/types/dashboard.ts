// ─── Dashboard KPIs ────────────────────────────────────────────────────────────

export interface DashboardKpis {
  ok: number;
  deny: number;
  warn: number;
  pending: number;
  total: number;
  anticipado?: number; // Atendidos antes de su hora de cita
}

// ─── Flow chart rows ───────────────────────────────────────────────────────────

export interface DashboardFlowRow {
  h: string;
  ok: number;
  warn: number;
  deny: number;
}

// ─── Event rows ────────────────────────────────────────────────────────────────

export interface DashboardEvent {
  id?: number;
  plate: string;
  status: "ok" | "warn" | "deny" | "pending";
  label: string;
  info: string;
  gate: string;
  time: string;
  espera_min?: number | null;
}

export interface DashboardEventFull extends DashboardEvent {
  espera_min: number | null;
}

// ─── Alerts ────────────────────────────────────────────────────────────────────

export interface DashboardAlert {
  title: string;
  sub: string;
  tone: "deny" | "warn" | "ok";
}

// ─── Breakdown / Zones ─────────────────────────────────────────────────────────

export interface DashboardBreakdownEntry {
  total: number;
  ok: number;
}

export interface DashboardZone {
  name: string;
  count: number;
  pct: number;
  tone: "deny" | "ok";
}

// ─── Dashboard full return ─────────────────────────────────────────────────────

export interface DashboardTopProvider {
  empresa: string;
  rate: number;
  total: number;
  delayed: number;
}

export interface DashboardStatsResult {
  events: DashboardEvent[];
  kpis: DashboardKpis;
  breakdown: Record<string, DashboardBreakdownEntry>;
  flowData: DashboardFlowRow[];
  zones: DashboardZone[];
  alerts: DashboardAlert[];
  delayReasons: { motivo: string; count: number }[];
  topProvider?: DashboardTopProvider | null;
}

// ─── Active personnel ──────────────────────────────────────────────────────────

export interface ActivePersonnelRow {
  initials: string;
  name: string;
  turn: string;
  status: "active";
}

// ─── Historial stats ───────────────────────────────────────────────────────────

export interface HistorialStats {
  total: number;
  avg: number;
  max: number;
  plants: number;
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

export interface HeatmapCell {
  dow: number;      // 0=Dom … 6=Sáb
  hour: number;     // 0..23
  total: number;
  delayed: number;
  rate: number | null;
}

// ─── Reporte stats (from RPC) ──────────────────────────────────────────────────

export interface ReporteStatsRow {
  total: number;
  ok: number;
  warn: number;
  alto: number;
  critico: number;
  pending: number;
  avg_espera: number;
  max_espera: number;
  pct_on_time: number | null;
}
