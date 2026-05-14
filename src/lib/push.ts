/**
 * Push notification utilities — server side only
 * Requires: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL env vars
 */

export function vapidConfigured(): boolean {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_EMAIL
  );
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  icon?: string;
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Envía push a todas las suscripciones de una empresa+planta.
 * Fire-and-forget: no lanza excepciones al caller.
 */
export async function sendPushToCompany(
  companyId: string,
  plant: string,
  payload: PushPayload
): Promise<void> {
  if (!vapidConfigured()) return;

  try {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();

    // Obtener suscripciones activas para la empresa (plant=NULL = todas las plantas)
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("company_id", companyId)
      .or(`plant.eq.${plant},plant.is.null`);

    if (!subs || subs.length === 0) return;

    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    const bodyStr = JSON.stringify(payload);

    await Promise.allSettled(
      (subs as PushSubscriptionRow[]).map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          bodyStr
        ).catch(err => {
          // Suscripción expirada → eliminar
          if (err.statusCode === 410) {
            void admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        })
      )
    );
  } catch {
    // Push falla silenciosamente — no afecta el flujo principal
  }
}
