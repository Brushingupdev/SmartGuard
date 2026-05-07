import { describe, it, expect } from "vitest";
import {
  validated,
  registerCompanySchema,
  updateAtencionSchema,
  companySettingsSchema,
  createUserSchema,
  dashboardQuerySchema,
  adminUpdatePlanSchema,
  plantContactSchema,
} from "../validations";

// ─── registerCompanySchema ────────────────────────────────────────────────────

describe("registerCompanySchema", () => {
  const base = {
    companyName: "Empresa Test SAC",
    sector: "Manufactura",
    contactName: "Juan Pérez",
    plantasText: "Lima, Arequipa",
    supervisorEmail: "sup@empresa.com",
    supervisorPassword: "password123",
    responsables: ["Responsable 1"],
  };

  it("válido con campos obligatorios", () => {
    const r = validated(registerCompanySchema, base);
    expect(r.ok).toBe(true);
  });

  it("inválido sin companyName", () => {
    const r = validated(registerCompanySchema, { ...base, companyName: "" });
    expect(r.ok).toBe(false);
  });

  it("inválido sin plantasText", () => {
    const r = validated(registerCompanySchema, { ...base, plantasText: "" });
    expect(r.ok).toBe(false);
  });

  it("inválido con email de supervisor inválido", () => {
    const r = validated(registerCompanySchema, { ...base, supervisorEmail: "no-email" });
    expect(r.ok).toBe(false);
  });

  it("inválido con contraseña corta", () => {
    const r = validated(registerCompanySchema, { ...base, supervisorPassword: "123" });
    expect(r.ok).toBe(false);
  });

  it("acepta logoBase64 opcional", () => {
    const r = validated(registerCompanySchema, { ...base, logoBase64: "data:image/png;base64,abc" });
    expect(r.ok).toBe(true);
  });

  it("acepta guardias opcionales", () => {
    const r = validated(registerCompanySchema, {
      ...base,
      guardias: [{ email: "g1@test.com", password: "password123", plant: "Lima" }],
    });
    expect(r.ok).toBe(true);
  });

  it("acepta notificationPhone ausente u opcional vacío", () => {
    expect(validated(registerCompanySchema, base).ok).toBe(true);
    expect(validated(registerCompanySchema, { ...base, notificationPhone: "" }).ok).toBe(true);
  });

  it("rechaza más de 20 guardias", () => {
    const guardias = Array.from({ length: 21 }, (_, i) => ({
      email: `g${i}@test.com`,
      password: "password123",
      plant: "Lima",
    }));
    const r = validated(registerCompanySchema, { ...base, guardias });
    expect(r.ok).toBe(false);
  });
});

// ─── updateAtencionSchema ─────────────────────────────────────────────────────

describe("updateAtencionSchema", () => {
  const base = {
    razonSocial: "TRANSPORTES SAC",
    empresa: "Empresa Destino",
    type: "Proveedor",
    tipoOperacion: "Carga",
  };

  it("válido con campos básicos", () => {
    const r = validated(updateAtencionSchema, base);
    expect(r.ok).toBe(true);
  });

  it("acepta hAtencion en formato HH:MM", () => {
    const r = validated(updateAtencionSchema, { ...base, hAtencion: "14:30" });
    expect(r.ok).toBe(true);
  });

  it("rechaza hAtencion con formato inválido", () => {
    const r = validated(updateAtencionSchema, { ...base, hAtencion: "2:30" });
    expect(r.ok).toBe(false);
  });

  it("acepta hDevDocs null", () => {
    const r = validated(updateAtencionSchema, { ...base, hDevDocs: null });
    expect(r.ok).toBe(true);
  });
});

// ─── companySettingsSchema ────────────────────────────────────────────────────

describe("companySettingsSchema", () => {
  it("válido con emails de notificación", () => {
    const r = validated(companySettingsSchema, {
      notificationEmails: ["admin@test.com"],
    });
    expect(r.ok).toBe(true);
  });

  it("válido con teléfonos", () => {
    const r = validated(companySettingsSchema, {
      notificationPhones: ["+51 999 888 777"],
    });
    expect(r.ok).toBe(true);
  });

  it("rechaza teléfono con formato inválido", () => {
    const r = validated(companySettingsSchema, {
      notificationPhones: ["abc"],
    });
    expect(r.ok).toBe(false);
  });

  it("acepta hasta 10 emails", () => {
    const emails = Array.from({ length: 10 }, (_, i) => `e${i}@test.com`);
    const r = validated(companySettingsSchema, { notificationEmails: emails });
    expect(r.ok).toBe(true);
  });

  it("rechaza más de 10 emails", () => {
    const emails = Array.from({ length: 11 }, (_, i) => `e${i}@test.com`);
    const r = validated(companySettingsSchema, { notificationEmails: emails });
    expect(r.ok).toBe(false);
  });
});

// ─── createUserSchema ─────────────────────────────────────────────────────────

describe("createUserSchema", () => {
  const base = {
    email: "user@test.com",
    password: "password123",
    role: "guardia",
    plant: "Lima",
  };

  it("válido con campos mínimos", () => {
    const r = validated(createUserSchema, base);
    expect(r.ok).toBe(true);
  });

  it("acepta role administrador", () => {
    const r = validated(createUserSchema, { ...base, role: "administrador" });
    expect(r.ok).toBe(true);
  });

  it("rechaza role inválido", () => {
    const r = validated(createUserSchema, { ...base, role: "superadmin" });
    expect(r.ok).toBe(false);
  });

  it("acepta companyId opcional", () => {
    const r = validated(createUserSchema, {
      ...base,
      companyId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(r.ok).toBe(true);
  });

  it("rechaza companyId con formato inválido", () => {
    const r = validated(createUserSchema, { ...base, companyId: "not-a-uuid" });
    expect(r.ok).toBe(false);
  });
});

// ─── dashboardQuerySchema ─────────────────────────────────────────────────────

describe("dashboardQuerySchema", () => {
  it("válido con defaults", () => {
    const r = validated(dashboardQuerySchema, {});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.plant).toBe("Todos");
      expect(r.data.timeframe).toBe("Día");
    }
  });

  it("acepta timeframe Día/Semana/Mes", () => {
    expect(validated(dashboardQuerySchema, { timeframe: "Día" }).ok).toBe(true);
    expect(validated(dashboardQuerySchema, { timeframe: "Semana" }).ok).toBe(true);
    expect(validated(dashboardQuerySchema, { timeframe: "Mes" }).ok).toBe(true);
  });

  it("acepta año como timeframe", () => {
    const r = validated(dashboardQuerySchema, { timeframe: "2025" });
    expect(r.ok).toBe(true);
  });

  it("rechaza timeframe inválido", () => {
    const r = validated(dashboardQuerySchema, { timeframe: "invalid" });
    expect(r.ok).toBe(false);
  });
});

// ─── adminUpdatePlanSchema ────────────────────────────────────────────────────

describe("adminUpdatePlanSchema", () => {
  it("válido con plan trial", () => {
    const r = validated(adminUpdatePlanSchema, {
      companyId: "550e8400-e29b-41d4-a716-446655440000",
      plan: "trial",
    });
    expect(r.ok).toBe(true);
  });

  it("válido con plan active", () => {
    const r = validated(adminUpdatePlanSchema, {
      companyId: "550e8400-e29b-41d4-a716-446655440000",
      plan: "active",
    });
    expect(r.ok).toBe(true);
  });

  it("acepta trialEndsAt opcional", () => {
    const r = validated(adminUpdatePlanSchema, {
      companyId: "550e8400-e29b-41d4-a716-446655440000",
      plan: "trial",
      trialEndsAt: "2026-12-31",
    });
    expect(r.ok).toBe(true);
  });

  it("rechaza trialEndsAt con formato inválido", () => {
    const r = validated(adminUpdatePlanSchema, {
      companyId: "550e8400-e29b-41d4-a716-446655440000",
      plan: "trial",
      trialEndsAt: "31/12/2026",
    });
    expect(r.ok).toBe(false);
  });
});

// ─── plantContactSchema ───────────────────────────────────────────────────────

describe("plantContactSchema", () => {
  const base = {
    companyId: "550e8400-e29b-41d4-a716-446655440000",
    planta: "Lima",
    emails: ["admin@test.com"],
    phones: ["+51999888777"],
  };

  it("válido con datos completos", () => {
    const r = validated(plantContactSchema, base);
    expect(r.ok).toBe(true);
  });

  it("inválido sin companyId", () => {
    const r = validated(plantContactSchema, { ...base, companyId: "" });
    expect(r.ok).toBe(false);
  });

  it("inválido sin planta", () => {
    const r = validated(plantContactSchema, { ...base, planta: "" });
    expect(r.ok).toBe(false);
  });

  it("acepta arrays vacíos", () => {
    const r = validated(plantContactSchema, { ...base, emails: [], phones: [] });
    expect(r.ok).toBe(true);
  });
});
