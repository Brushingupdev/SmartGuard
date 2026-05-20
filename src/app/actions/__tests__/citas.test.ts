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

vi.mock("@/utils/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/utils/supabase/user", () => ({
  getUserContext: getUserContextMock,
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

describe("citas actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getUserContextMock.mockResolvedValue({
      companyId: "company-1",
      role: "supervisor",
      isAdmin: false,
      isReadOnly: false,
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
  });

  it("bloquea preregistro cuando ya existe una cita activa o esperada", async () => {
    const steps: Step[] = [
      {
        kind: "maybeSingle",
        table: "atenciones",
        operation: "select",
        result: { data: { id: 3, hora_cita: "08:30:00", estado: "esperado" } },
      },
    ];
    const snapshots: QuerySnapshot[] = [];
    createClientMock.mockResolvedValue(createSupabaseMock(steps, snapshots));

    const { preRegisterCita } = await import("../citas");
    const result = await preRegisterCita({
      horaCita: "08:30",
      plant: "Lomas",
      razonSocial: "CAMION-10",
      empresa: "Matritech",
      type: "Proveedor",
      tipoOperacion: "Descarga",
    });

    expect(result).toEqual({
      success: false,
      error: "Ya existe una cita pendiente para este vehículo a las 08:30.",
    });
    expect(snapshots).toHaveLength(0);
  });

  it("crea una cita válida con fecha por defecto de Lima", async () => {
    const steps: Step[] = [
      {
        kind: "maybeSingle",
        table: "atenciones",
        operation: "select",
        result: { data: null },
      },
      {
        kind: "single",
        table: "atenciones",
        operation: "insert",
        result: { data: { id: 44 }, error: null },
      },
    ];
    const snapshots: QuerySnapshot[] = [];
    createClientMock.mockResolvedValue(createSupabaseMock(steps, snapshots));

    const { preRegisterCita } = await import("../citas");
    const result = await preRegisterCita({
      horaCita: "11:45",
      plant: "Cajamarquilla",
      razonSocial: "CAMION-20",
      empresa: "Matritech",
      responsable: "Carlos",
      type: "Proveedor",
      tipoOperacion: "Carga",
      note: "Programada",
    });

    expect(result).toEqual({ success: true, id: 44 });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].payload).toMatchObject({
      fecha: "2026-05-20",
      hora_cita: "11:45:00",
      razon_social: "CAMION-20",
      empresa: "Matritech",
      planta: "Cajamarquilla",
      company_id: "company-1",
    });
  });

  it("activa una cita esperada y fija hora de llegada", async () => {
    const steps: Step[] = [
      {
        kind: "maybeSingle",
        table: "atenciones",
        operation: "select",
        result: { data: { id: 55 } },
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

    const { activateCita } = await import("../citas");
    const result = await activateCita({ id: 55 });

    expect(result).toEqual({ success: true });
    const updateSnapshot = snapshots.find((item) => item.operation === "update");
    expect(updateSnapshot?.payload).toEqual({ h_registro: "10:15:00" });
  });

  it("cancela una cita esperada", async () => {
    const steps: Step[] = [
      {
        kind: "maybeSingle",
        table: "atenciones",
        operation: "select",
        result: { data: { id: 71 } },
      },
      {
        kind: "await",
        table: "atenciones",
        operation: "delete",
        result: { error: null },
      },
    ];
    const snapshots: QuerySnapshot[] = [];
    createClientMock.mockResolvedValue(createSupabaseMock(steps, snapshots));

    const { cancelarCita } = await import("../citas");
    const result = await cancelarCita(71);

    expect(result).toEqual({ success: true });
    expect(snapshots.find((item) => item.operation === "delete")).toBeTruthy();
  });
});
