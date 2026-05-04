import { describe, it, expect } from "vitest";
import {
  validated,
  validateForm,
  createAtencionSchema,
  closeAtencionSchema,
  loginSchema,
  emailSchema,
  passwordSchema,
} from "../validations";

// ─── validated() ──────────────────────────────────────────────────────────────

describe("validated()", () => {
  it("ok:true con datos válidos", () => {
    const r = validated(loginSchema, { email: "user@example.com", password: "password123" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.email).toBe("user@example.com");
  });

  it("normaliza email a lowercase (trim + lowercase)", () => {
    const r = validated(loginSchema, { email: "  USER@EXAMPLE.COM  ", password: "password123" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.email).toBe("user@example.com");
  });

  it("ok:false con email inválido", () => {
    const r = validated(loginSchema, { email: "not-an-email", password: "password123" });
    expect(r.ok).toBe(false);
  });

  it("ok:false con contraseña vacía (loginSchema usa min:1)", () => {
    const r = validated(loginSchema, { email: "u@e.com", password: "" });
    expect(r.ok).toBe(false);
  });

  it("ok:false con objeto vacío", () => {
    const r = validated(loginSchema, {});
    expect(r.ok).toBe(false);
  });
});

// ─── validateForm() ───────────────────────────────────────────────────────────

describe("validateForm()", () => {
  it("success:true con datos correctos", () => {
    const r = validateForm(loginSchema, { email: "a@b.com", password: "12345678" });
    expect(r.success).toBe(true);
  });

  it("success:false con datos inválidos", () => {
    const r = validateForm(loginSchema, { email: "bad", password: "x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(typeof r.error).toBe("string");
  });
});

// ─── createAtencionSchema ─────────────────────────────────────────────────────

describe("createAtencionSchema", () => {
  const base = {
    razonSocial: "TRANSPORTES SAC",
    empresa: "Empresa Destino",
    plant: "Planta Norte",
    type: "Proveedor",
    tipoOperacion: "Carga",
  };

  it("válido con campos obligatorios", () => {
    const r = validated(createAtencionSchema, base);
    expect(r.ok).toBe(true);
  });

  it("válido con campos opcionales", () => {
    const r = validated(createAtencionSchema, { ...base, responsable: "Juan", agente: "Pedro", note: "ok" });
    expect(r.ok).toBe(true);
  });

  it("inválido sin razonSocial", () => {
    const r = validated(createAtencionSchema, { ...base, razonSocial: "" });
    expect(r.ok).toBe(false);
  });

  it("inválido con tipo desconocido", () => {
    const r = validated(createAtencionSchema, { ...base, type: "Desconocido" });
    expect(r.ok).toBe(false);
  });
});

// ─── closeAtencionSchema ──────────────────────────────────────────────────────

describe("closeAtencionSchema", () => {
  it("válido con id entero positivo", () => {
    expect(validated(closeAtencionSchema, { id: 1 }).ok).toBe(true);
    expect(validated(closeAtencionSchema, { id: 99999 }).ok).toBe(true);
  });

  it("inválido con id 0 o negativo", () => {
    expect(validated(closeAtencionSchema, { id: 0 }).ok).toBe(false);
    expect(validated(closeAtencionSchema, { id: -1 }).ok).toBe(false);
  });

  it("válido con motivo opcional", () => {
    const r = validated(closeAtencionSchema, { id: 1, motivoDemora: "Documentación incompleta" });
    expect(r.ok).toBe(true);
  });
});

// ─── emailSchema / passwordSchema ─────────────────────────────────────────────

describe("emailSchema", () => {
  it("acepta emails válidos con trim y lowercase", () => {
    expect(validated(emailSchema, "user@empresa.com").ok).toBe(true);
    // preprocess trimea antes de validar
    expect(validated(emailSchema, " USER@EMPRESA.COM ").ok).toBe(true);
  });

  it("rechaza emails inválidos", () => {
    expect(validated(emailSchema, "noatsign").ok).toBe(false);
    expect(validated(emailSchema, "@nodomain").ok).toBe(false);
    expect(validated(emailSchema, "").ok).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("acepta contraseñas de 8+ caracteres", () => {
    expect(validated(passwordSchema, "12345678").ok).toBe(true);
    expect(validated(passwordSchema, "abcdefgh").ok).toBe(true);
  });

  it("rechaza contraseñas cortas", () => {
    expect(validated(passwordSchema, "1234567").ok).toBe(false);
    expect(validated(passwordSchema, "").ok).toBe(false);
  });
});
