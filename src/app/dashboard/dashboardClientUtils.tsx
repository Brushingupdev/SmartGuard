import type { DashboardAlert } from "@/types/dashboard";
import { parseDashboardMonthWeekBucket } from "@/lib/dashboardFilters";
import type { ChartTooltipProps } from "./dashboardClientTypes";

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAYS_LONG = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function formatXLabel(value: string, timeframe: string): string {
  const monthWeek = parseDashboardMonthWeekBucket(value);
  if (monthWeek) return `${MONTHS[monthWeek.month - 1] ?? value} S${monthWeek.week}`;
  if (timeframe === "Día") return `${value}h`;
  if (timeframe === "Semana") return DAYS_SHORT[parseInt(value)] ?? value;
  if (timeframe === "Mes") return `S${value}`;
  if (/^\d{4}$/.test(timeframe)) return MONTHS[parseInt(value) - 1] ?? value;
  return `d.${value}`;
}

export function formatTooltipLabel(label: string, timeframe: string): string {
  const monthWeek = parseDashboardMonthWeekBucket(label);
  if (monthWeek) return `${MONTHS[monthWeek.month - 1] ?? label} · Semana ${monthWeek.week}`;
  if (timeframe === "Día") return `${label}:00 – ${label}:59`;
  if (timeframe === "Semana") return DAYS_LONG[parseInt(label)] ?? label;
  if (timeframe === "Mes") return `Semana ${label}`;
  if (/^\d{4}$/.test(timeframe)) return MONTHS[parseInt(label) - 1] ?? label;
  return `Día ${label}`;
}

export function alertToneClasses(
  tone: DashboardAlert["tone"]
): { border: string; text: string; soft: string } {
  if (tone === "warn") {
    return {
      border: "var(--sg-warn)",
      text: "var(--sg-warn)",
      soft: "rgba(212,134,74,0.08)",
    };
  }
  if (tone === "ok") {
    return {
      border: "var(--sg-success)",
      text: "var(--sg-success)",
      soft: "rgba(107,189,138,0.08)",
    };
  }
  return {
    border: "var(--sg-danger)",
    text: "var(--sg-danger)",
    soft: "rgba(211,92,79,0.08)",
  };
}

export function ChartTooltip({
  active,
  payload,
  label,
  timeframe = "Día",
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const labelMap: Record<string, string> = {
    ok: "A tiempo",
    warn: "Revisión",
    deny: "Con demora",
  };
  const colorMap: Record<string, string> = {
    ok: "var(--sg-success)",
    warn: "var(--sg-warn)",
    deny: "var(--sg-danger)",
  };

  return (
    <div className="border border-[var(--sg-line)] bg-[var(--sg-panel)] px-3 py-2 shadow-[6px_6px_0_rgba(196,192,180,0.08)]">
      <div className="sg-slabel mb-2">
        {formatTooltipLabel(String(label), String(timeframe))}
      </div>
      {payload.map((item) => {
        const key = String(item.dataKey ?? "");
        return (
          <div
            key={key}
            className="flex items-center justify-between gap-5 text-[12px]"
          >
            <span className="flex items-center gap-2 text-[var(--sg-copy)]">
              <span className="h-2 w-2" style={{ background: colorMap[key] }} />
              {labelMap[key] ?? key}
            </span>
            <span className="sg-mono text-[var(--sg-ink)]">
              {String(item.value ?? "")}
            </span>
          </div>
        );
      })}
      <div className="mt-1.5 flex justify-between border-t border-[var(--sg-line)] pt-1.5 text-[11px]">
        <span className="text-[var(--sg-muted)]">Total</span>
        <span className="sg-mono text-[var(--sg-ink)]">
          {payload.reduce((sum, item) => sum + (Number(item.value) || 0), 0)}
        </span>
      </div>
    </div>
  );
}
