import { NextRequest, NextResponse } from "next/server";
import { checkProactiveAlerts } from "@/app/actions/atenciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/alertas/proactive
 *
 * Endpoint de activación manual / fallback. El cron principal corre en
 * Supabase Scheduler → Edge Function check_proactive_alerts.
 * Requiere: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  // ── Autenticación del cron ────────────────────────────────────────────────
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const secret = process.env.CRON_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const supabase = createAdminClient();

    // Obtener todas las empresas activas (trial o active)
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id")
      .in("status", ["trial", "active"]);

    if (error) {
      console.error("[proactive-alerts] Error fetching companies:", error.message);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    if (!companies?.length) {
      return NextResponse.json({ ok: true, processed: 0, alerted: 0 });
    }

    // Procesar cada empresa en paralelo (fire individual, collect results)
    const results = await Promise.allSettled(
      companies.map((c) => checkProactiveAlerts(c.id as string))
    );

    let totalChecked = 0;
    let totalAlerted = 0;

    for (const r of results) {
      if (r.status === "fulfilled") {
        totalChecked += r.value.checked;
        totalAlerted += r.value.alerted;
      }
    }

    return NextResponse.json({
      ok: true,
      processed: companies.length,
      checked: totalChecked,
      alerted: totalAlerted,
    });
  } catch (err) {
    console.error("[proactive-alerts] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
