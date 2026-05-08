// Edge Function: process_alert_queue
// Procesa la cola de alertas pendientes y envía emails + WhatsApp.
// Ejecutar con: supabase functions deploy process_alert_queue
// Cron: configurar pg_cron para ejecutar cada 1 minuto

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const GREEN_API_INSTANCE = Deno.env.get("GREEN_API_INSTANCE");
const GREEN_API_TOKEN    = Deno.env.get("GREEN_API_TOKEN");
const GREEN_API_SERVER   = Deno.env.get("GREEN_API_SERVER") ?? "7107";
const SITE_URL           = Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "";
const RESEND_FROM_EMAIL  = Deno.env.get("RESEND_FROM_EMAIL") ?? "SmartGuard <onboarding@resend.dev>";

const BATCH_SIZE = 5;

// Helper para formatear planta → Sede · Puerta
function formatGateLabelFromPlant(plant: string): string {
  if (!plant || plant === "Todos") return "Todos";
  const known: Record<string, { site: string; gate: string }> = {
    Cajamarquilla: { site: "Cajamarquilla", gate: "Principal" },
    Sanitario: { site: "Cajamarquilla", gate: "Santuario" },
    Lomas: { site: "Lomas", gate: "Principal" },
    "Lomas 02": { site: "Lomas", gate: "Lomas 02" },
  };
  const k = known[plant.trim()];
  return k ? `${k.site} · ${k.gate}` : plant.trim();
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Tomar alertas pendientes y marcarlas "processing" en la misma transacción
  const { data: pending, error: fetchError } = await supabase
    .rpc("claim_alert_queue_batch", { p_batch_size: BATCH_SIZE });

  if (fetchError) {
    console.error("Error fetching queue:", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
  }

  let processed = 0;
  let failed = 0;

  for (const alert of pending) {
    try {
      // 2. Obtener contactos de la empresa
      const { data: company } = await supabase
        .from("companies")
        .select("name, notification_emails, notification_phones")
        .eq("id", alert.company_id)
        .is("deleted_at", null)
        .maybeSingle();

      if (!company) {
        await supabase
          .from("alert_queue")
          .update({
            status: "failed",
            last_error: "Empresa eliminada (soft-delete)",
            processed_at: new Date().toISOString(),
            processing_started_at: null,
          })
          .eq("id", alert.id);

        failed++;
        continue;
      }

      let emails: string[] = (company?.notification_emails ?? []).filter(Boolean);

      // Fallback: email del supervisor
      if (emails.length === 0) {
        const { data: users } = await supabase.auth.admin.listUsers();
        const supervisor = users?.users?.find(
          (u) =>
            u.user_metadata?.company_id === alert.company_id &&
            u.user_metadata?.role === "supervisor"
        );
        if (supervisor?.email) emails = [supervisor.email];
      }

      // Contactos específicos de planta
      const { data: plantContact } = await supabase
        .from("company_plant_contacts")
        .select("emails, phones")
        .eq("company_id", alert.company_id)
        .eq("planta", alert.planta)
        .maybeSingle();

      const allEmails = [
        ...new Set([...emails, ...((plantContact?.emails ?? []) as string[])]),
      ].filter(Boolean);

      const allPhones = [
        ...new Set([
          ...((company?.notification_phones ?? []) as string[]),
          ...((plantContact?.phones ?? []) as string[]),
        ]),
      ].filter(Boolean);

      // 3. Verificar que haya al menos un destinatario
      if (allEmails.length === 0 && allPhones.length === 0) {
        await supabase
          .from("alert_queue")
          .update({
            status: "failed",
            last_error: "Sin destinatarios (sin emails ni teléfonos configurados)",
            processed_at: new Date().toISOString(),
            processing_started_at: null,
          })
          .eq("id", alert.id);
        failed++;
        continue;
      }

      // 4. Enviar alertas en paralelo
      const results = await Promise.allSettled([
        ...allEmails.map((email) =>
          sendEmailAlert({
            to: email,
            companyName: company?.name ?? "SmartGuard",
            razonSocial: alert.razon_social,
            empresa: alert.empresa,
            planta: alert.planta,
            hRegistro: alert.h_registro,
            esperaMin: alert.espera_min,
          })
        ),
        ...allPhones.map((phone) =>
          sendWhatsAppAlert({
            phone,
            razonSocial: alert.razon_social,
            empresa: alert.empresa,
            planta: alert.planta,
            esperaMin: alert.espera_min,
            hRegistro: alert.h_registro,
          })
        ),
      ]);

      // 5. Log de resultados individuales
      const logPromises: Promise<unknown>[] = [];
      for (let i = 0; i < allEmails.length; i++) {
        logPromises.push(
          supabase.from("alert_logs").insert({
            company_id: alert.company_id,
            atencion_id: alert.atencion_id,
            razon_social: alert.razon_social,
            empresa: alert.empresa,
            planta: alert.planta,
            espera_min: alert.espera_min,
            channel: "email",
            recipient: allEmails[i],
            success: results[i].status === "fulfilled",
          })
        );
      }
      for (let i = 0; i < allPhones.length; i++) {
        logPromises.push(
          supabase.from("alert_logs").insert({
            company_id: alert.company_id,
            atencion_id: alert.atencion_id,
            razon_social: alert.razon_social,
            empresa: alert.empresa,
            planta: alert.planta,
            espera_min: alert.espera_min,
            channel: "whatsapp",
            recipient: allPhones[i],
            success: results[allEmails.length + i].status === "fulfilled",
          })
        );
      }
      await Promise.allSettled(logPromises);

      // 6. Determinar estado final: "sent" solo si al menos un canal funcionó
      const allFailed = results.length > 0 && results.every(r => r.status === "rejected");
      if (allFailed) {
        const maxAttempts = alert.max_attempts ?? 3;
        const nextAttempts = (alert.attempts ?? 0) + 1;
        const firstFailed = results.find(r => r.status === "rejected");
        const reason = firstFailed && "reason" in firstFailed ? firstFailed.reason : null;
        const errorMsg = reason instanceof Error ? reason.message : String(reason ?? "todos los canales fallaron");
        await supabase
          .from("alert_queue")
          .update({
            status: nextAttempts >= maxAttempts ? "failed" : "pending",
            attempts: nextAttempts,
            last_error: errorMsg,
            processing_started_at: null,
          })
          .eq("id", alert.id);
        failed++;
        continue;
      }

      await supabase
        .from("alert_queue")
        .update({
          status: "sent",
          processed_at: new Date().toISOString(),
          processing_started_at: null,
        })
        .eq("id", alert.id);

      processed++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Alert ${alert.id} failed:`, errorMsg);

      const maxAttempts = typeof alert.max_attempts === "number" ? alert.max_attempts : 3;
      const nextAttempts = (alert.attempts ?? 0) + 1;

      await supabase
        .from("alert_queue")
        .update({
          status: nextAttempts >= maxAttempts ? "failed" : "pending",
          attempts: nextAttempts,
          last_error: errorMsg,
          processing_started_at: null,
        })
        .eq("id", alert.id);

      failed++;
    }
  }

  return new Response(
    JSON.stringify({ processed, failed, total: pending.length }),
    { status: 200 }
  );
});

// ─── Email via Resend ─────────────────────────────────────────────────────────

async function sendEmailAlert(opts: {
  to: string;
  companyName: string;
  razonSocial: string;
  empresa: string;
  planta: string;
  hRegistro: string;
  esperaMin: number;
}) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no configurada, no se puede enviar email");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [opts.to],
      subject: `⚠️ Alerta de demora — ${opts.razonSocial}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #d35c4f;">Alerta de demora</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Vehículo</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${opts.razonSocial}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Empresa</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${opts.empresa}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Planta</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${opts.planta}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Hora registro</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${opts.hRegistro}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Espera</td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #d35c4f; font-weight: bold;">${opts.esperaMin > 0 ? opts.esperaMin + " minutos" : "Cita vencida — esperando atención"}</td></tr>
          </table>
          <p style="color: #666; font-size: 12px; margin-top: 24px;">
            ${opts.companyName} · SmartGuard Control Vehicular
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend error: ${res.status} ${await res.text()}`);
  }
}

// ─── WhatsApp via Green API ───────────────────────────────────────────────────

async function sendWhatsAppAlert(opts: {
  phone: string;
  razonSocial: string;
  empresa: string;
  planta: string;
  esperaMin: number;
  hRegistro?: string;
}) {
  if (!GREEN_API_INSTANCE || !GREEN_API_TOKEN) {
    throw new Error("GREEN_API_INSTANCE o GREEN_API_TOKEN no configurados, no se puede enviar WhatsApp");
  }

  const seg =
    opts.esperaMin >= 90 ? "🔴 Crítico"
    : opts.esperaMin >= 45 ? "🟠 Alto"
    : opts.esperaMin > 0  ? "🟡 Moderado"
    : "🕐 Cita vencida";

  const horaStr = opts.hRegistro ? opts.hRegistro.substring(0, 5) : "—";

  const esperaStr = opts.esperaMin > 0
    ? `⏱ Espera: *${opts.esperaMin} min*`
    : "⏱ Cita vencida — esperando atención";

  const message =
    `⚠ *SmartGuard — Alerta de Demora*\n\n` +
    `*${opts.razonSocial}*\n` +
    `🏭 ${opts.empresa} · ${formatGateLabelFromPlant(opts.planta)}\n` +
    `🕐 Ingreso: ${horaStr}\n` +
    `${esperaStr} ${seg}\n\n` +
    `Ver en plataforma → ${SITE_URL}/alertas`;

  const chatId = `${opts.phone.replace(/\D/g, "")}@c.us`;

  const res = await fetch(
    `https://${GREEN_API_SERVER}.api.greenapi.com/waInstance${GREEN_API_INSTANCE}/sendMessage/${GREEN_API_TOKEN}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chatId, message }),
    }
  );

  if (!res.ok) {
    throw new Error(`Green API error: ${res.status} ${await res.text()}`);
  }

  console.log(`[WhatsApp] Mensaje enviado a ${opts.phone}`);
}
