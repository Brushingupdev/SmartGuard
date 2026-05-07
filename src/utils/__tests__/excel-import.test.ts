import { describe, expect, it } from "vitest";
import { autoDetectMapping, prepareExcelImport, processRows } from "../excel-import";

describe("excel import", () => {
  it("keeps empty leading headers aligned with the source row", () => {
    const headers = ["__EMPTY_0", "__EMPTY_1", "Fecha", "Proveedor/ Cliente", "Razon Social", "H. registro de vehiculo", "H. atención almacén", "H. Dev. Documentos", "Responsable de Almacén"];
    const mapping = autoDetectMapping(headers);
    const { valid, invalid } = processRows(
      [[null, null, "07/05/2026", "Proveedor", "Matritech", 0.25, 0.3125, 0.375, "Ana"]],
      headers,
      mapping,
      { planta: "Cajamarquilla" },
    );

    expect(invalid).toBe(0);
    expect(valid[0]).toMatchObject({
      fecha: "2026-05-07",
      razon_social: "MATRITECH",
      h_registro: "06:00:00",
      h_atencion: "07:30:00",
      h_dev_docs: "09:00:00",
      espera_min: 90,
      tiempo_total_min: 180,
      planta: "Cajamarquilla",
      responsable: "Ana",
    });
  });

  it("chooses the sheet with vehicle records instead of the first workbook sheet", () => {
    const prepared = prepareExcelImport(
      [
        { name: "Control de errores", rows: [["Motivo estandarizado", "Categoría"], ["Rampa ocupada", "Infraestructura"]] },
        {
          name: "2025 Lomas",
          rows: [
            ["AÑO", "Fecha", "Proveedor/ Cliente", "RAZON SOCIAL", "EMPRESA", "H. registro de vehiculo", "H. atención almacén", "H. Dev. Documentos"],
            [2026, 46149, "Proveedor", "Matritech", "Destino", 0.5, 0.5416666667, 0.625],
          ],
        },
      ],
      "Eficiencia Lomas.xlsx hoy.xlsx",
    );

    expect(prepared?.sheetName).toBe("2025 Lomas");
    expect(prepared?.valid).toHaveLength(1);
    expect(prepared?.valid[0].planta).toBe("Lomas");
    expect(prepared?.valid[0].espera_min).toBe(60);
  });

  it("does not turn earlier end times into almost 24 hour waits", () => {
    const headers = ["Fecha", "Razon Social", "H. registro de vehiculo", "H. atención almacén", "H. Dev. Documentos"];
    const mapping = autoDetectMapping(headers);
    const { valid } = processRows(
      [["07/05/2026", "Matritech", "14:00", "13:55", "15:00"]],
      headers,
      mapping,
    );

    expect(valid[0].espera_min).toBeNull();
    expect(valid[0].tiempo_total_min).toBe(60);
  });
});
