import { describe, expect, it } from "vitest";
import {
  countDashboardFilters,
  getDashboardMonthWeekBucket,
  getDashboardMonthWeekBuckets,
  getDashboardIntervalExpression,
  matchesDashboardDateFilter,
  normalizeDashboardFilters,
  refineDashboardDateRange,
  parseDashboardMonthWeekBucket,
} from "../dashboardFilters";

describe("dashboardFilters", () => {
  it("descarta meses inválidos y no permite semana sin meses válidos", () => {
    expect(normalizeDashboardFilters({
      months: [14, 0],
      weekOfMonth: 3,
      intervals: ["warn", "invalid" as never, "warn"],
      observation: "  ",
    })).toEqual({
      months: [],
      weekOfMonth: null,
      intervals: ["warn"],
      observation: null,
    });
  });

  it("acota el rango a un mes y semana concretos del año", () => {
    expect(refineDashboardDateRange("2024", { months: [2], weekOfMonth: 5 }, {
      from: "2024-01-01",
      to: "2024-12-31",
    })).toEqual({
      from: "2024-02-29",
      to: "2024-02-29",
    });
  });

  it("mantiene el rango base para períodos relativos", () => {
    const base = { from: "2026-06-01", to: "2026-06-19" };
    expect(refineDashboardDateRange("Mes", { months: [5] }, base)).toEqual(base);
  });

  it("filtra meses no consecutivos y aplica la semana a cada mes", () => {
    const filters = { months: [1, 3], weekOfMonth: 2 };
    expect(refineDashboardDateRange("2026", filters, {
      from: "2026-01-01",
      to: "2026-12-31",
    })).toEqual({ from: "2026-01-08", to: "2026-03-14" });
    expect(matchesDashboardDateFilter("2026-01-10", "2026", filters)).toBe(true);
    expect(matchesDashboardDateFilter("2026-02-10", "2026", filters)).toBe(false);
    expect(matchesDashboardDateFilter("2026-03-20", "2026", filters)).toBe(false);
  });

  it("genera todas las semanas de cada mes seleccionado para el flujo", () => {
    expect(getDashboardMonthWeekBuckets("2026", { months: [7] })).toEqual([
      "07-W1", "07-W2", "07-W3", "07-W4", "07-W5",
    ]);
    expect(getDashboardMonthWeekBuckets("2026", { months: [2, 7], weekOfMonth: 5 }))
      .toEqual(["07-W5"]);
    expect(getDashboardMonthWeekBucket("2026-07-23", "2026", { months: [7] }))
      .toBe("07-W4");
    expect(parseDashboardMonthWeekBucket("07-W4")).toEqual({ month: 7, week: 4 });
  });

  it("genera expresiones para los intervalos de espera", () => {
    expect(getDashboardIntervalExpression(["critical"])).toContain("gte.90");
    expect(getDashboardIntervalExpression(["ok", "warn"])).toContain("gte.30");
    expect(getDashboardIntervalExpression([])).toBeNull();
  });

  it("cuenta solo filtros activos", () => {
    expect(countDashboardFilters({
      months: [6, 7],
      weekOfMonth: 2,
      intervals: ["warn", "critical"],
      observation: "Proveedor llegó tarde",
    })).toBe(4);
  });
});
