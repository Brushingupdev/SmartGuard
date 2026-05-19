import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { vapidConfigured } from "@/lib/push";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  if (!vapidConfigured()) {
    return NextResponse.json({ error: "Push no configurado" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = user.user_metadata?.company_id as string | undefined;
  if (!companyId) {
    return NextResponse.json({ error: "No company" }, { status: 400 });
  }

  let endpoint: string | undefined;
  try {
    const body = (await req.json()) as { endpoint?: string };
    endpoint = body.endpoint;
  } catch {
    endpoint = undefined;
  }

  const admin = createAdminClient();
  let query = admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("company_id", companyId);

  if (endpoint) {
    query = query.eq("endpoint", endpoint);
  }

  const { data: subscription, error } = await query.limit(1).maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!subscription) {
    return NextResponse.json({ error: "No encontramos una suscripción activa para este dispositivo." }, { status: 404 });
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify({
        title: "SmartGuard activo",
        body: "Este dispositivo ya está listo para recibir alertas reales.",
        tag: "sg-test",
        url: "/pwa/home",
        icon: "/icon-192.png",
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (pushError) {
    const errorMessage = pushError instanceof Error ? pushError.message : "No se pudo enviar la notificación de prueba.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
