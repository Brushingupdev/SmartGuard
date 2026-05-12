import { describe, expect, it } from "vitest";
import { autoDetectMapping, inferTipoOperacion, inferHoraCitaFromObservacion, inferMotivoDemoraFromObservacion, prepareExcelImport, processRows } from "../excel-import";

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

  it("maps Matritech provider/client as type and EMPRESA as destination", () => {
    const headers = ["AÑO", "Fecha", "Proveedor/ Cliente", "RAZON SOCIAL", "EMPRESA", "H. registro de vehiculo", "H. atención almacén", "Observación"];
    const mapping = autoDetectMapping(headers);

    expect(mapping.tipo).toBe("Proveedor/ Cliente");
    expect(mapping.empresa).toBe("EMPRESA");

    const { valid } = processRows(
      [[2026, "07/05/2026", "Propio", "Camion ABC-123", "TRASLADO ENTRE PLANTAS", "08:00", "08:30", "sin obs"]],
      headers,
      mapping,
    );

    expect(valid[0]).toMatchObject({
      tipo: "Propio",
      empresa: "TRASLADO ENTRE PLANTAS",
      tipo_operacion: "Traslado",
    });
  });

  it("infers operation type from common Matritech text when no operation column exists", () => {
    expect(inferTipoOperacion("TRASLADO ENTRE PLANTAS")).toBe("Traslado");
    expect(inferTipoOperacion("DEMORA EN ATENCION POR MOTIVO DE DESCARGA DE CONTENEDOR")).toBe("Descarga");
    expect(inferTipoOperacion("SE ESTUVO DESPACHANDO MERCADERIA")).toBe("Carga");
    expect(inferTipoOperacion("NO HAY OBSERVACION")).toBeNull();
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

  it("calculates demora_cita_min and marks anticipado when atencion is before cita", () => {
    const headers = ["Fecha", "Razon Social", "H. registro", "Hora Cita", "H. atención almacén"];
    const mapping = autoDetectMapping(headers);

    expect(mapping.hora_cita).toBe("Hora Cita");

    // Anticipado: atendido 10 min antes de la cita
    const { valid: anticipado } = processRows(
      [["07/05/2026", "Transportes ABC", "08:00", "10:00", "09:50"]],
      headers, mapping,
    );
    expect(anticipado[0].hora_cita).toBe("10:00:00");
    expect(anticipado[0].demora_cita_min).toBe(0);
    expect(anticipado[0].segmento_espera).toBe("🔵 Anticipado");
    expect(anticipado[0].es_demora).toBe(0);

    // Con demora: atendido 35 min después de la cita
    const { valid: conDemora } = processRows(
      [["07/05/2026", "Transportes XYZ", "08:00", "10:00", "10:35"]],
      headers, mapping,
    );
    expect(conDemora[0].demora_cita_min).toBe(35);
    expect(conDemora[0].segmento_espera).toBe("🟡 30-45 min");
    expect(conDemora[0].es_demora).toBe(1);
  });

  it("infers hora_cita from Observacion text patterns", () => {
    expect(inferHoraCitaFromObservacion("PROGRAMADO PARA LAS 9:00 AM")).toBe("09:00:00");
    expect(inferHoraCitaFromObservacion("cita programada para las 09:00 am")).toBe("09:00:00");
    expect(inferHoraCitaFromObservacion("PROGRAMADO PARA LAS 14:00 HORAS")).toBe("14:00:00");
    expect(inferHoraCitaFromObservacion("PROGRAMADO 10:30 AM")).toBe("10:30:00");
    expect(inferHoraCitaFromObservacion("CITA PROGRAMADA PARA LAS 14 HRS")).toBe("14:00:00");
    expect(inferHoraCitaFromObservacion("PROGRAMADO PARA LAS 11:00 AM")).toBe("11:00:00");
    // Casos que NO son hora de cita
    expect(inferHoraCitaFromObservacion("DEMORA EN ATENCION POR MOTIVO DE DESCARGA DE CONTENEDOR")).toBeNull();
    expect(inferHoraCitaFromObservacion("pernocta en Lomas")).toBeNull();
    expect(inferHoraCitaFromObservacion(null)).toBeNull();
  });

  it("infers motivo_demora from Observacion text patterns", () => {
    expect(inferMotivoDemoraFromObservacion("DEMORA EN ATENCION POR MOTIVO DE DESCARGA DE CONTENEDOR")).toBe("Carga / descarga en proceso");
    expect(inferMotivoDemoraFromObservacion("motivo de demora por atencion a transportes Pimentel")).toBe("Atención previa a otra unidad");
    expect(inferMotivoDemoraFromObservacion("SE DEMORA EN LA ATENCION POR MOTIVOS POR PROBLEMAS EN LA EMISION DE GUIAS DE REMISION")).toBe("Documentación incompleta");
    expect(inferMotivoDemoraFromObservacion("DEMORA EN ATENCION POR MOTIVO DE AUDITORIA")).toBe("Evento externo (simulacro / auditoría)");
    expect(inferMotivoDemoraFromObservacion("DEMORA EN ATENCION POR MOTIVO DE ESPACIO")).toBe("Rampa ocupada");
    expect(inferMotivoDemoraFromObservacion("DEMORA EN ATENCION POR MOTIVO DE CARGAMENTO CAMION BPT-898")).toBe("Atención previa a otra unidad");
    // Casos que NO son motivo de demora
    expect(inferMotivoDemoraFromObservacion("PROGRAMADO PARA LAS 9:00 AM")).toBeNull();
    expect(inferMotivoDemoraFromObservacion("NO HAY OBSERVACION")).toBeNull();
    expect(inferMotivoDemoraFromObservacion("pernocta en Lomas")).toBeNull();
    expect(inferMotivoDemoraFromObservacion(null)).toBeNull();
  });

  it("auto-extracts hora_cita and motivo_demora from Observacion when no dedicated column", () => {
    const headers = ["Fecha", "Razon Social", "H. registro de vehiculo", "H. atención almacén", "Observación"];
    const mapping = autoDetectMapping(headers);

    // Row with cita in observacion
    const { valid } = processRows(
      [["07/05/2026", "TRUCKBRISAS SRL", "12:09:00", "14:02:00", "PROGRAMADO PARA LAS 14:00 HORAS"]],
      headers, mapping,
    );
    expect(valid[0].hora_cita).toBe("14:00:00");
    expect(valid[0].demora_cita_min).toBe(2); // 14:02 - 14:00 = 2 min

    // Row with motivo in observacion
    const { valid: v2 } = processRows(
      [["07/05/2026", "MELAFORM SAC", "09:00:00", "11:30:00", "DEMORA EN ATENCION POR MOTIVO DE DESCARGA DE CONTENEDOR"]],
      headers, mapping,
    );
    expect(v2[0].motivo_demora).toBe("Carga / descarga en proceso");
  });

  it("does not map unrelated columns to motivo_demora", () => {
    const headers = ["Fecha", "Razon Social", "Motivo del Viaje", "Motivo de Demora"];
    const mapping = autoDetectMapping(headers);
    // "Motivo del Viaje" should NOT match (too broad); "Motivo de Demora" should match
    expect(mapping.motivo_demora).toBe("Motivo de Demora");
  });
});
