import { beforeEach, describe, expect, it, vi } from "vitest";

type StepKind = "await" | "single" | "maybeSingle";
type Operation = "select" | "insert" | "update" | "delete";

interface Step {
  kind: StepKind;
  operation: Operation;
  table: string;
  result: { data?: unknown; error?: { message: string } | null };
}

interface QuerySnapshot {
  table: string;
  operation: Operation;
  payload?: unknown;
  filters: Array<{ type: string; args: unknown[] }>;
}

function createSupabaseMock(steps: Step[], snapshots: QuerySnapshot[]) {
  class QueryBuilder implements PromiseLike<{ data?: unknown; error?: { message: string } | null }> {
    table: string;
    operation: Operation = "select";
    payload?: unknown;
    filters: Array<{ type: string; args: unknown[] }> = [];

    constructor(table: string) {
      this.table = table;
    }

    select() {
      return this;
    }

    insert(payload: unknown) {
      this.operation = "insert";
      this.payload = payload;
      snapshots.push({ table: this.table, operation: this.operation, payload, filters: [...this.filters] });
      return this;
    }

    update(payload: unknown) {
      this.operation = "update";
      this.payload = payload;
      snapshots.push({ table: this.table, operation: this.operation, payload, filters: [...this.filters] });
      return this;
    }

    delete() {
      this.operation = "delete";
      snapshots.push({ table: this.table, operation: this.operation, filters: [...this.filters] });
      return this;
    }

    eq(...args: unknown[]) {
      this.filters.push({ type: "eq", args });
      return this;
    }

    in(...args: unknown[]) {
      this.filters.push({ type: "in", args });
      return this;
    }

    not(...args: unknown[]) {
      this.filters.push({ type: "not", args });
      return this;
    }

    limit(...args: unknown[]) {
      this.filters.push({ type: "limit", args });
      return this;
    }

    order(...args: unknown[]) {
      this.filters.push({ type: "order", args });
      return this;
    }

    maybeSingle() {
      return Promise.resolve(consumeStep("maybeSingle", this.table, this.operation));
    }

    single() {
      return Promise.resolve(consumeStep("single", this.table, this.operation));
    }

    then<TResult1 = { data?: unknown; error?: { message: string } | null }, TResult2 = never>(
      onfulfilled?: ((value: { data?: unknown; error?: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
      return Promise.resolve(consumeStep("await", this.table, this.operation)).then(onfulfilled, onrejected);
    }
  }

  function consumeStep(kind: StepKind, table: string, operation: Operation) {
    const step = steps.shift();
    if (!step) {
      throw new Error(`No mock step left for ${kind} ${operation} on ${table}`);
    }
    expect(step.kind).toBe(kind);
    expect(step.table).toBe(table);
    expect(step.operation).toBe(operation);
    return {
      data: step.result.data ?? null,
      error: step.result.error ?? null,
    };
  }

  return {
    from(table: string) {
      return new QueryBuilder(table);
    },
  };
}

const createClientMock = vi.fn();
const getUserContextMock = vi.fn();
const nowLimaMock = vi.fn();
const checkWriteAccessMock = vi.fn();
const logErrorMock = vi.fn();
const sendPushToCompanyMock = vi.fn();
const enqueueAlertMock = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/utils/supabase/user", () => ({
  getUserContext: getUserContextMock,
}));

vi.mock("@/lib/push", () => ({
  sendPushToCompany: sendPushToCompanyMock,
}));

vi.mock("@/utils/alert-queue", () => ({
  enqueueAlert: enqueueAlertMock,
}));

vi.mock("@/app/actions/_helpers", async () => {
  const actual = await vi.importActual<typeof import("@/app/actions/_helpers")>("@/app/actions/_helpers");
  return {
    ...actual,
    nowLima: nowLimaMock,
    checkWriteAccess: checkWriteAccessMock,
    logError: logErrorMock,
  };
});

describe("atenciones actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getUserContextMock.mockResolvedValue({
      companyId: "company-1",
      role: "guardia",
      isAdmin: false,
      isReadOnly: false,
      displayName: "Guardia Uno",
      email: "guardia@example.com",
    });
    nowLimaMock.mockReturnValue({
      date: "2026-05-20",
      time: "10:15:00",
      year: 2026,
      month: 5,
      day: 20,
      hour: 10,
      minute: 15,
      second: 0,
    });
    checkWriteAccessMock.mockResolvedValue(null);
    sendPushToCompanyMock.mockResolvedValue(undefined);
    enqueueAlertMock.mockResolvedValue(undefined);
  });

  it("bloquea duplicado activo en la misma puerta", async () => {
    const steps: Step[] = [
      {
        kind: "maybeSingle",
        table: "atenciones",
        operation: "select",
        result: { data: { id: 77 } },
      },
    ];
    const snapshots: QuerySnapshot[] = [];
    createClientMock.mockResolvedValue(createSupabaseMock(steps, snapshots));

    const { createAtencion } = await import("../atenciones");
    const result = await createAtencion({
      razonSocial: "ABC-123",
      empresa: "Proveedor Norte",
      plant: "Cajamarquilla",
      type: "Proveedor",
      tipoOperacion: "Descarga",
      note: "",
    });

    expect(result).toEqual({
      success: false,
      error: "Ya existe un registro pendiente para este vehículo hoy en esta puerta.",
    });
    expect(snapshots).toHaveLength(0);
  });

  it("bloquea registro manual cuando ya existe una cita esperada", async () => {
    const steps: Step[] = [
      {
        kind: "maybeSingle",
        table: "atenciones",
        operation: "select",
        result: { data: null },
      },
      {
        kind: "maybeSingle",
        table: "atenciones",
        operation: "select",
        result: { data: { id: 13, hora_cita: "11:30:00" } },
      },
    ];
    const snapshots: QuerySnapshot[] = [];
    createClientMock.mockResolvedValue(createSupabaseMock(steps, snapshots));

    const { createAtencion } = await import("../atenciones");
    const result = await createAtencion({
      razonSocial: "ABC-123",
      empresa: "Proveedor Norte",
      plant: "Cajamarquilla",
      type: "Proveedor",
      tipoOperacion: "Descarga",
      note: "",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Hay una cita pendiente para este vehículo a las 11:30");
    expect(snapshots).toHaveLength(0);
  });

  it("crea una atención válida y dispara push a supervisor", async () => {
    const steps: Step[] = [
      {
        kind: "maybeSingle",
        table: "atenciones",
        operation: "select",
        result: { data: null },
      },
      {
        kind: "maybeSingle",
        table: "atenciones",
        operation: "select",
        result: { data: null },
      },
      {
        kind: "await",
        table: "atenciones",
        operation: "insert",
        result: { error: null },
      },
    ];
    const snapshots: QuerySnapshot[] = [];
    createClientMock.mockResolvedValue(createSupabaseMock(steps, snapshots));

    const { createAtencion } = await import("../atenciones");
    const result = await createAtencion({
      razonSocial: "XYZ-999",
      empresa: "Matritech",
      plant: "Lomas",
      type: "Proveedor",
      tipoOperacion: "Descarga",
      responsable: "Carlos",
      agente: "Guardia Uno",
      note: "Ingreso normal",
    });

    expect(result).toEqual({ success: true, time: "10:15:00" });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      table: "atenciones",
      operation: "insert",
    });
    expect(snapshots[0].payload).toMatchObject({
      fecha: "2026-05-20",
      h_registro: "10:15:00",
      razon_social: "XYZ-999",
      empresa: "Matritech",
      planta: "Lomas",
      company_id: "company-1",
      estado: "activo",
    });

    await vi.waitFor(() => {
      expect(sendPushToCompanyMock).toHaveBeenCalledWith(
        "company-1",
        "Lomas",
        expect.objectContaining({
          title: "Nuevo vehículo en portería",
          body: "XYZ-999 · Lomas",
        }),
      );
    });
  });

  it("cierra atención, calcula demora y encola alerta cuando supera 45 min", async () => {
    const steps: Step[] = [
      {
        kind: "single",
        table: "atenciones",
        operation: "select",
        result: {
          data: {
            fecha: "2026-05-20",
            h_registro: "09:00:00",
            hora_cita: "09:15:00",
            razon_social: "CAMION-77",
            empresa: "Matritech",
            planta: "Cajamarquilla",
          },
        },
      },
      {
        kind: "await",
        table: "atenciones",
        operation: "update",
        result: { error: null },
      },
    ];
    const snapshots: QuerySnapshot[] = [];
    createClientMock.mockResolvedValue(createSupabaseMock(steps, snapshots));

    const { closeAtencion } = await import("../atenciones");
    const result = await closeAtencion(99, "Exceso de vehículos");

    expect(result).toEqual({
      success: true,
      espera_min: 75,
      demora_cita_min: 60,
    });

    const updateSnapshot = snapshots.find((item) => item.operation === "update");
    expect(updateSnapshot?.payload).toMatchObject({
      h_atencion: "10:15:00",
      espera_min: 75,
      demora_cita_min: 60,
      segmento_espera: "🟠 45-90 min",
      segmento_orden: 3,
      es_demora: 1,
      motivo_demora: "Exceso de vehículos",
    });

    await vi.waitFor(() => {
      expect(enqueueAlertMock).toHaveBeenCalledWith({
        companyId: "company-1",
        atencionId: 99,
        razonSocial: "CAMION-77",
        empresa: "Matritech",
        planta: "Cajamarquilla",
        hRegistro: "09:00:00",
        esperaMin: 60,
      });
    });
  });
});
