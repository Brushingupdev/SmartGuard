import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/utils/supabase/user";

/**
 * GET /api/dashboard
 *
 * Retorna stats del dashboard para integraciones externas.
 * Requiere autenticación.
 *
 * Query params:
 *   - plant: filtrar por planta (default: "Todos")
 *   - timeframe: Día, Semana, Mes, o año (default: "Día")
 */
export async function GET(request: NextRequest) {
  const ctx = await getUserContext();
  if (!ctx) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const plant = searchParams.get("plant") ?? "Todos";
  const timeframe = searchParams.get("timeframe") ?? "Día";

  try {
    const { getDashboardStats, getDashboardTrends, getActivePersonnel } = await import("@/app/actions");

    const [stats, trends, personnel] = await Promise.all([
      getDashboardStats(plant, timeframe),
      getDashboardTrends(plant, timeframe),
      getActivePersonnel(),
    ]);

    return NextResponse.json({
      stats,
      trends,
      personnel,
      meta: {
        plant,
        timeframe,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
