import { describe, it, expect } from "vitest";
import { calcSegmento, nowLima, daysAgoLima } from "../_helpers";

// ─── calcSegmento ─────────────────────────────────────────────────────────────

describe("calcSegmento", () => {
  it("Normal — menos de 30 min", () => {
    const r = calcSegmento(0);
    expect(r.label).toBe("🟢 < 30 min");
    expect(r.esDemora).toBe(0);
    expect(r.orden).toBe(1);
  });

  it("Normal — límite superior (29 min)", () => {
    const r = calcSegmento(29);
    expect(r.label).toBe("🟢 < 30 min");
    expect(r.esDemora).toBe(0);
  });

  it("Moderado — exactamente 30 min", () => {
    const r = calcSegmento(30);
    expect(r.label).toBe("🟡 30-45 min");
    expect(r.esDemora).toBe(1);
    expect(r.orden).toBe(2);
  });

  it("Moderado — límite superior (44 min)", () => {
    expect(calcSegmento(44).label).toBe("🟡 30-45 min");
  });

  it("Alto — exactamente 45 min", () => {
    const r = calcSegmento(45);
    expect(r.label).toBe("🟠 45-90 min");
    expect(r.esDemora).toBe(1);
    expect(r.orden).toBe(3);
  });

  it("Alto — límite superior (89 min)", () => {
    expect(calcSegmento(89).label).toBe("🟠 45-90 min");
  });

  it("Crítico — exactamente 90 min", () => {
    const r = calcSegmento(90);
    expect(r.label).toBe("🔴 > 90 min");
    expect(r.esDemora).toBe(1);
    expect(r.orden).toBe(4);
  });

  it("Crítico — valores muy altos", () => {
    expect(calcSegmento(300).label).toBe("🔴 > 90 min");
    expect(calcSegmento(999).esDemora).toBe(1);
  });
});

// ─── nowLima ──────────────────────────────────────────────────────────────────

describe("nowLima", () => {
  it("devuelve fecha en formato YYYY-MM-DD", () => {
    const { date } = nowLima();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("devuelve hora en formato HH:MM:SS", () => {
    const { time } = nowLima();
    expect(time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it("hour está entre 0 y 23", () => {
    const { hour } = nowLima();
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
  });

  it("minute y second están entre 0 y 59", () => {
    const { minute, second } = nowLima();
    expect(minute).toBeGreaterThanOrEqual(0);
    expect(minute).toBeLessThanOrEqual(59);
    expect(second).toBeGreaterThanOrEqual(0);
    expect(second).toBeLessThanOrEqual(59);
  });
});

// ─── daysAgoLima ──────────────────────────────────────────────────────────────

describe("daysAgoLima", () => {
  it("0 días = hoy (mismo resultado que nowLima date)", () => {
    const { date: today } = nowLima();
    expect(daysAgoLima(0)).toBe(today);
  });

  it("devuelve formato YYYY-MM-DD", () => {
    expect(daysAgoLima(7)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("7 días atrás es anterior a hoy", () => {
    const { date: today } = nowLima();
    expect(daysAgoLima(7) < today).toBe(true);
  });

  it("1 día atrás es anterior a hoy", () => {
    const { date: today } = nowLima();
    expect(daysAgoLima(1) < today).toBe(true);
  });
});
