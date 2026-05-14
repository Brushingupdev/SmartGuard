import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { vapidConfigured } from "@/lib/push";

export async function GET() {
  if (!vapidConfigured()) {
    return NextResponse.json({ configured: false, publicKey: null });
  }
  return NextResponse.json({
    configured: true,
    publicKey: process.env.VAPID_PUBLIC_KEY,
  });
}

export async function POST(req: NextRequest) {
  if (!vapidConfigured()) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  // Verificar sesión (supervisor o guardia autenticado)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = user.user_metadata?.company_id as string | undefined;
  const userRole  = user.user_metadata?.role as string | undefined;
  const plant     = user.user_metadata?.plant as string | undefined;

  if (!companyId) {
    return NextResponse.json({ error: "No company" }, { status: 400 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sub = body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    action?: string;
  };

  // Acción: unsubscribe
  if (sub.action === "unsubscribe" && sub.endpoint) {
    const admin = createAdminClient();
    await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    return NextResponse.json({ ok: true });
  }

  // Subscribir
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert({
    company_id: companyId,
    user_role:  userRole ?? "supervisor",
    plant:      userRole === "supervisor" ? null : (plant ?? null),
    endpoint:   sub.endpoint,
    p256dh:     sub.keys.p256dh,
    auth:       sub.keys.auth,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
