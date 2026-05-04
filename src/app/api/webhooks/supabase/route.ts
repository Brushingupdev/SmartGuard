import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * POST /api/webhooks/supabase
 *
 * Webhook receiver para eventos de Supabase Auth.
 * Configurar en: Supabase Dashboard → Authentication → Webhooks
 *
 * Eventos soportados:
 * - user.deleted: Limpia datos asociados al usuario
 * - user.updated: Sincroniza cambios de metadata
 */

interface SupabaseWebhookEvent {
  type: string;
  table: string;
  record: {
    id: string;
    email?: string;
    raw_user_meta_data?: Record<string, unknown>;
  };
  old_record?: {
    id: string;
  };
}

export async function POST(request: NextRequest) {
  // Verificar webhook secret
  const authHeader = request.headers.get("authorization");
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("SUPABASE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  if (authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const event: SupabaseWebhookEvent = await request.json();

    switch (event.type) {
      case "user.deleted":
        await handleUserDeleted(event.record.id);
        break;

      case "user.updated":
        await handleUserUpdated(event.record);
        break;

      default:
        // Ignorar eventos no soportados
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Limpia datos asociados cuando se borra un usuario.
 */
async function handleUserDeleted(userId: string) {
  const admin = createAdminClient();

  // Eliminar perfil del usuario
  await admin.from("user_profiles").delete().eq("id", userId);

  // Log del evento
  console.log(`[Webhook] User deleted: ${userId}`);
}

/**
 * Sincroniza cambios de metadata del usuario.
 */
async function handleUserUpdated(record: { id: string; raw_user_meta_data?: Record<string, unknown> }) {
  const admin = createAdminClient();
  const meta = record.raw_user_meta_data;

  if (!meta) return;

  // Actualizar user_profiles si cambió role, company_id, o plant
  const { error } = await admin
    .from("user_profiles")
    .upsert({
      id: record.id,
      role: (meta.role as string) ?? "guardia",
      company_id: (meta.company_id as string) ?? null,
      plant: (meta.plant as string) ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  if (error) {
    console.error(`[Webhook] Error syncing user ${record.id}:`, error);
  }
}
