import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { sanitizeSearchTerm } from "@/lib/sanitize";

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
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("perPage") ?? "20")));
  const search = sanitizeSearchTerm(searchParams.get("search") ?? "");
  const plant = searchParams.get("plant") ?? "Todos";
  const segment = searchParams.get("segment") ?? "Todos";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const sortBy = searchParams.get("sortBy") === "espera_min" ? "espera_min" : "id";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const supabase = await createClient();

  let query = supabase.from("atenciones").select("*", { count: "exact" });

  // Multi-tenant isolation
  if (!ctx.isAdmin && ctx.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }

  // Filters
  if (search) {
    query = query.or(`razon_social.ilike.%${search}%,empresa.ilike.%${search}%`);
  }
  if (plant && plant !== "Todos") {
    query = query.eq("planta", plant);
  }
  if (dateFrom) query = query.gte("fecha", dateFrom);
  if (dateTo) query = query.lte("fecha", dateTo);

  if (segment && segment !== "Todos") {
    if (segment === "Normal") query = query.lt("espera_min", 30).gt("espera_min", 0);
    else if (segment === "Moderado") query = query.gte("espera_min", 30).lt("espera_min", 45);
    else if (segment === "Alto") query = query.gte("espera_min", 45).lt("espera_min", 90);
    else if (segment === "Crítico") query = query.gte("espera_min", 90);
    else if (segment === "Pendiente") query = query.is("espera_min", null);
  }

  // Pagination
  const from = (page - 1) * perPage;
  query = query
    .order(sortBy, { ascending: sortDir === "asc", nullsFirst: sortDir === "asc" })
    .range(from, from + perPage - 1);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      perPage,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / perPage),
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
