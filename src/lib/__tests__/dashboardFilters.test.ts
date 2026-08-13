import { describe, expect, it } from "vitest";
import {
  countDashboardFilters,
  getDashboardIntervalExpression,
  normalizeDashboardFilters,
  refineDashboardDateRange,
} from "../dashboardFilters";

describe("dashboardFilters", () => {
  it("normaliza valores inválidos y no permite semana sin mes", () => {
    expect(normalizeDashboardFilters({
      month: 14,
      weekOfMonth: 3,
      interval: "invalid" as never,
      observation: "  ",
    })).toEqual({
      month: null,
      weekOfMonth: null,
      interval: "all",
      observation: null,
    });
  });

  it("acota el rango a un mes y semana concretos del año", () => {
    expect(refineDashboardDateRange("2024", { month: 2, weekOfMonth: 5 }, {
      from: "2024-01-01",
      to: "2024-12-31",
    })).toEqual({
      from: "2024-02-29",
      to: "2024-02-29",
    });
  });

  it("mantiene el rango base para períodos relativos", () => {
    const base = { from: "2026-06-01", to: "2026-06-19" };
    expect(refineDashboardDateRange("Mes", { month: 5 }, base)).toEqual(base);
  });

  it("genera expresiones para los intervalos de espera", () => {
    expect(getDashboardIntervalExpression("critical")).toContain("gte.90");
    expect(getDashboardIntervalExpression("all")).toBeNull();
  });

  it("cuenta solo filtros activos", () => {
    expect(countDashboardFilters({
      month: 6,
      weekOfMonth: 2,
      interval: "warn",
      observation: "Proveedor llegó tarde",
    })).toBe(4);
  });
});
