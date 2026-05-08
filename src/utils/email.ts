"use server";

import { Resend } from "resend";
import { formatGateLabelFromPlant } from "@/lib/gates";

export async function sendWhatsAppAlert(opts: {
  phone: string;
  razonSocial: string;
  empresa: string;
  planta: string;
  hRegistro: string;
  esperaMin: number;
}) {
  const instance = process.env.GREEN_API_INSTANCE;
  const token    = process.env.GREEN_API_TOKEN;
  const server   = process.env.GREEN_API_SERVER ?? "7107";
  if (!instance || !token) return;

  const seg =
    opts.esperaMin >= 90 ? "🔴 Crítico"
    : opts.esperaMin >= 45 ? "🟠 Alto"
    : "🟡 Moderado";

  const message =
    `⚠ *SmartGuard — Alerta de Demora*\n\n` +
    `*${opts.razonSocial}*\n` +
    `🏭 ${opts.empresa} · ${formatGateLabelFromPlant(opts.planta)}\n` +
    `🕐 Ingreso: ${opts.hRegistro.substring(0, 5)}\n` +
    `⏱ Espera: *${opts.esperaMin} min* ${seg}\n\n` +
    `Ver en plataforma → ${process.env.NEXT_PUBLIC_SITE_URL}/alertas`;

  const chatId = `${opts.phone.replace(/\D/g, "")}@c.us`;

  await fetch(
    `https://${server}.api.greenapi.com/waInstance${instance}/sendMessage/${token}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chatId, message }),
    }
  );
}


const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendCriticalDelayAlert(opts: {
  to: string;
  razonSocial: string;
  empresa: string;
  planta: string;
  hRegistro: string;
  esperaMin: number;
  companyName: string;
}) {
  if (!resend) return;

  const seg =
    opts.esperaMin >= 90 ? "🔴 Crítico (> 90 min)"
    : opts.esperaMin >= 45 ? "🟠 Alto (45–90 min)"
    : "🟡 Moderado (30–45 min)";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Alerta de Demora — SmartGuard</title>
</head>
<body style="margin:0;padding:0;background:#0a0c0b;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0c0b;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141910;border:1px solid #2a2f2b;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding:28px 32px;border-bottom:1px solid #2a2f2b;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="display:inline-block;background:#c8a84b;width:10px;height:10px;margin-right:10px;"></span>
                  <span style="color:#c8a84b;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">SmartGuard</span>
                </td>
                <td align="right">
                  <span style="color:#6b6f6c;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;">Alerta operativa</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Alert badge -->
        <tr>
          <td style="padding:32px 32px 0;">
            <div style="display:inline-block;border:1px solid #d35c4f;background:rgba(211,92,79,0.1);padding:6px 14px;margin-bottom:20px;">
              <span style="color:#d35c4f;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">⚠ Demora Crítica Detectada</span>
            </div>
            <h1 style="margin:0 0 6px;color:#e8e4da;font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.1;">
              ${opts.razonSocial}
            </h1>
            <p style="margin:0;color:#8a8f8b;font-size:13px;">${opts.empresa} · ${formatGateLabelFromPlant(opts.planta)}</p>
          </td>
        </tr>

        <!-- Stats -->
        <tr>
          <td style="padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2f2b;">
              <tr>
                <td style="padding:16px 20px;border-right:1px solid #2a2f2b;width:33%;">
                  <div style="color:#d35c4f;font-size:32px;font-weight:800;line-height:1;">${opts.esperaMin}</div>
                  <div style="color:#6b6f6c;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;margin-top:4px;">Min de espera</div>
                </td>
                <td style="padding:16px 20px;border-right:1px solid #2a2f2b;width:33%;">
                  <div style="color:#e8e4da;font-size:18px;font-weight:700;line-height:1;">${opts.hRegistro.substring(0, 5)}</div>
                  <div style="color:#6b6f6c;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;margin-top:4px;">Hora de ingreso</div>
                </td>
                <td style="padding:16px 20px;width:34%;">
                  <div style="color:#e8e4da;font-size:13px;font-weight:600;line-height:1.3;">${seg}</div>
                  <div style="color:#6b6f6c;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;margin-top:4px;">Segmento</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/alertas"
               style="display:inline-block;background:#c8a84b;color:#0a0c0b;font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;padding:13px 28px;text-decoration:none;">
              Ver en SmartGuard →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2a2f2b;">
            <p style="margin:0;color:#4a4f4b;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;">
              Notificación automática de SmartGuard · ${opts.companyName}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from:    process.env.RESEND_FROM_EMAIL ?? "SmartGuard <onboarding@resend.dev>",
    to:      [opts.to],
    subject: `⚠ Demora crítica — ${opts.razonSocial} · ${opts.esperaMin} min`,
    html,
  });
}
