import { describe, it, expect } from "vitest";
import { humanizeError } from "../humanizeError";

describe("humanizeError", () => {
  it("maneja null/undefined", () => {
    expect(humanizeError(null)).toBe("Error inesperado. Intenta de nuevo.");
    expect(humanizeError(undefined)).toBe("Error inesperado. Intenta de nuevo.");
    expect(humanizeError("")).toBe("Error inesperado. Intenta de nuevo.");
  });

  it("detecta clave duplicada de Postgres", () => {
    const msg = humanizeError("duplicate key value violates unique constraint atenciones_pkey");
    expect(msg).toBe("Este registro ya existe en el sistema.");
  });

  it("detecta violación de foreign key", () => {
    const msg = humanizeError('insert or update on table "atenciones" violates foreign key constraint');
    expect(msg).toBe("Referencia inválida — el recurso relacionado no existe.");
  });

  it("detecta errores de red", () => {
    expect(humanizeError("ECONNRESET connection reset by peer")).toContain("conexión");
    expect(humanizeError("fetch failed: network error")).toContain("conexión");
  });

  it("retorna mensaje genérico para errores desconocidos", () => {
    const msg = humanizeError("some unknown internal error xyz");
    expect(msg).toBe("Error inesperado. Si persiste, contacta al administrador.");
  });
});
