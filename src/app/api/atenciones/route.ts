import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/utils/supabase/user";

/**
 * GET /api/atenciones
 *
 * Lista atenciones con filtros opcionales.
 * Requiere autenticación (Bearer token o cookie de sesión).
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - perPage: resultados por página (default: 20, max: 100)
 *   - search: búsqueda por razón social o empresa
 *   - plant: filtrar por planta
 *   - segment: filtrar por segmento (Normal, Moderado, Alto, Crítico, Pendiente)
 *   - dateFrom: fecha desde (YYYY-MM-DD)
 *   - dateTo: fecha hasta (YYYY-MM-DD)
 *   - sortBy: campo de ordenamiento (id, espera_min)
 *   - sortDir: dirección (asc, desc)
 */
export async function GET(request: NextRequest) {
  const ctx = await getUserContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = searchParams.get("page") ?? "1";
  const perPage = searchParams.get("perPage") ?? "20";
  const plant = searchParams.get("plant") ?? "Todos";
  const segment = searchParams.get("segment") ?? "Todos";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "id";
  const sortDir = searchParams.get("sortDir") ?? "desc";
  const search = searchParams.get("search") ?? "";
  const filterCompanyId = searchParams.get("filterCompanyId") ?? "";

  const { getAtenciones } = await import("@/app/actions");
  const result = await getAtenciones({
    page,
    perPage,
    search,
    plant,
    segment,
    dateFrom,
    dateTo,
    sortBy,
    sortDir,
    filterCompanyId,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    data: result.data ?? [],
    pagination: {
      page: Number(page),
      perPage: Number(perPage),
      total: result.count ?? 0,
      totalPages: Math.ceil((result.count ?? 0) / Math.max(1, Number(perPage))),
    },
  });
}

/**
 * POST /api/atenciones
 *
 * Crea una nueva atención.
 * Body: { razonSocial, empresa, plant, type, tipoOperacion, responsable?, agente?, note? }
 */
export async function POST(request: NextRequest) {
  const ctx = await getUserContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!ctx.companyId) {
    return NextResponse.json({ error: "Sin empresa asignada" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { createAtencion } = await import("@/app/actions");
    const result = await createAtencion(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
