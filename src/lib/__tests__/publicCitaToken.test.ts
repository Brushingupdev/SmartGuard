import { describe, expect, it, vi } from "vitest";

describe("publicCitaToken", () => {
  it("crea y valida tokens firmados con expiración", async () => {
    vi.stubEnv("PUBLIC_CITA_TOKEN_SECRET", "test-secret");
    vi.stubEnv("ALLOW_LEGACY_PUBLIC_CITA_TOKENS", "false");

    const { createPublicCitaToken, readPublicCitaToken } = await import("../publicCitaToken");
    const token = createPublicCitaToken({
      companyId: "company-1",
      plant: "Lomas",
      now: 1_000,
      ttlMs: 5_000,
    });

    expect(readPublicCitaToken(token, 2_000)).toMatchObject({
      companyId: "company-1",
      plant: "Lomas",
      legacy: false,
    });
  });

  it("rechaza tokens expirados", async () => {
    vi.stubEnv("PUBLIC_CITA_TOKEN_SECRET", "test-secret");
    vi.stubEnv("ALLOW_LEGACY_PUBLIC_CITA_TOKENS", "false");

    const { createPublicCitaToken, readPublicCitaToken } = await import("../publicCitaToken");
    const token = createPublicCitaToken({
      companyId: "company-1",
      plant: "Lomas",
      now: 1_000,
      ttlMs: 50,
    });

    expect(readPublicCitaToken(token, 2_000)).toBeNull();
  });

  it("solo acepta tokens legacy cuando la compatibilidad está habilitada", async () => {
    vi.stubEnv("PUBLIC_CITA_TOKEN_SECRET", "test-secret");
    vi.stubEnv("ALLOW_LEGACY_PUBLIC_CITA_TOKENS", "true");

    const { readPublicCitaToken } = await import("../publicCitaToken");
    const legacy = Buffer.from("company-1|Lomas", "utf-8").toString("base64url");

    expect(readPublicCitaToken(legacy)).toMatchObject({
      companyId: "company-1",
      plant: "Lomas",
      legacy: true,
    });
  });
});
