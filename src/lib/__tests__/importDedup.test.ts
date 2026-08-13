import { describe, expect, it } from "vitest";
import { buildImportRowKey, dedupeImportRows, type ImportKeyRow } from "../importDedup";

describe("import deduplication", () => {
  const base: ImportKeyRow = {
    fecha: "2026-08-13",
    planta: "Cajamarquilla",
    razon_social: "Camión ABC-123",
    h_registro: "08:30:00",
  };

  it("normalizes accents, case, spaces and seconds in the duplicate key", () => {
    expect(buildImportRowKey(base)).toBe(
      buildImportRowKey({
        ...base,
        planta: " cajamarQUILLA ",
        razon_social: "CAMION ABC 123",
        h_registro: "08:30:45",
      }),
    );
  });

  it("keeps separate visits when their registration time differs", () => {
    const result = dedupeImportRows([
      base,
      { ...base, h_registro: "10:30:00" },
      { ...base, razon_social: "CAMION ABC 123", h_registro: "08:30:59" },
    ]);

    expect(result.uniqueRows).toHaveLength(2);
    expect(result.duplicateCount).toBe(1);
  });

  it("uses date, plant and vehicle when registration time is missing", () => {
    const result = dedupeImportRows([
      { ...base, h_registro: null },
      { ...base, razon_social: "CAMION ABC 123", h_registro: null },
    ]);

    expect(result.uniqueRows).toHaveLength(1);
    expect(result.duplicateCount).toBe(1);
  });
});
