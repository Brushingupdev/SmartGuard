import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { z } from "zod";
import { uuidSchema } from "@/lib/validations";

const webhookRecordSchema = z.object({
  id: uuidSchema,
  email: z.string().optional(),
  raw_user_meta_data: z.record(z.string(), z.unknown()).optional(),
});

const webhookEventSchema = z.object({
  type: z.string(),
  table: z.string().optional(),
  record: webhookRecordSchema,
  old_record: z.object({ id: uuidSchema }).optional(),
});

type WebhookEvent = z.infer<typeof webhookEventSchema>;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("SUPABASE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  if (authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: WebhookEvent;
  try {
    const body = await request.json();
    const parsed = webhookEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    event = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.deleted":
        await handleUserDeleted(event.record.id);
        break;
      case "user.updated":
        await handleUserUpdated(event.record);
        break;
      default:
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
async function handleUserUpdated(record: z.infer<typeof webhookRecordSchema>) {
  const admin = createAdminClient();
  const meta = record.raw_user_meta_data;

  if (!meta) return;

  const roleRaw      = typeof meta.role       === "string" ? meta.role       : "guardia";
  const companyRaw   = typeof meta.company_id === "string" ? meta.company_id : null;
  const plantRaw     = typeof meta.plant      === "string" ? meta.plant      : "";

  const role      = ["administrador", "supervisor", "guardia"].includes(roleRaw) ? roleRaw : "guardia";
  const companyId = companyRaw && uuidSchema.safeParse(companyRaw).success ? companyRaw : null;
  const plant     = plantRaw.slice(0, 100);

  const { error } = await admin
    .from("user_profiles")
    .upsert({
      id: record.id,
      role,
      company_id: companyId,
      plant,
      updated_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  if (error) {
    console.error(`[Webhook] Error syncing user ${record.id}:`, error);
  }
}
