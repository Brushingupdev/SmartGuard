"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { headers } from "next/headers";
import { registerCompanySchema, validated } from "@/lib/validations";
import { checkRateLimit, onboardingLimiter } from "@/utils/rate-limit";

const RESEND_API_KEY     = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL  = process.env.RESEND_FROM_EMAIL ?? "SmartGuard <onboarding@resend.dev>";
const ADMIN_EMAIL        = "adrishio09@gmail.com";
const SITE_URL           = process.env.NEXT_PUBLIC_SITE_URL ?? "https://smartguard.vercel.app";

// ─── Email helpers ────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [to], subject, html }),
  });
}

async function sendWelcomeEmail(opts: {
  supervisorEmail: string;
  companyName: string;
  sector: string;
  contactName: string;
  plantas: string[];
}): Promise<void> {
  const plantasList = opts.plantas.length > 0
    ? opts.plantas.map(p => `<li style="margin:4px 0;">${p}</li>`).join("")
    : "<li>Por configurar en /configuracion</li>";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0c0b;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0c0b;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#111310;border:1px solid #1e2420;border-radius:2px;">

        <!-- Header -->
        <tr>
          <td style="padding:32px 36px 24px;border-bottom:1px solid #1e2420;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#c8a84b;width:28px;height:28px;text-align:center;vertical-align:middle;">
                  <span style="color:#0a0c0b;font-size:16px;font-weight:900;line-height:28px;">+</span>
                </td>
                <td style="padding-left:12px;color:#c8a84b;font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">SmartGuard</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 6px;color:#8a9490;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">Registro completado</p>
            <h1 style="margin:0 0 24px;color:#e8ece9;font-size:26px;font-weight:700;line-height:1.2;">
              ¡Bienvenido,<br><em style="color:#c8a84b;">${opts.companyName}!</em>
            </h1>

            <p style="margin:0 0 24px;color:#a0aaa5;font-size:14px;line-height:1.7;">
              Tu cuenta de SmartGuard ha sido creada exitosamente. A continuación tienes todo lo que necesitas para comenzar.
            </p>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0c0b;border:1px solid #1e2420;margin:0 0 24px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid #1e2420;">
                      <span style="color:#8a9490;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:2px;">Empresa</span>
                      <span style="color:#e8ece9;font-size:13px;">${opts.companyName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid #1e2420;">
                      <span style="color:#8a9490;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:2px;">Sector</span>
                      <span style="color:#e8ece9;font-size:13px;">${opts.sector}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid #1e2420;">
                      <span style="color:#8a9490;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:2px;">Contacto</span>
                      <span style="color:#e8ece9;font-size:13px;">${opts.contactName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;border-bottom:1px solid #1e2420;">
                      <span style="color:#8a9490;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:2px;">Usuario supervisor</span>
                      <span style="color:#e8ece9;font-size:13px;">${opts.supervisorEmail}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;">
                      <span style="color:#8a9490;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:2px;">Sedes configuradas</span>
                      <ul style="margin:4px 0 0;padding-left:16px;color:#e8ece9;font-size:13px;">${plantasList}</ul>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#c8a84b;">
                  <a href="${SITE_URL}/login" style="display:block;padding:14px 32px;color:#0a0c0b;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;">
                    Iniciar sesión →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Next steps -->
            <p style="margin:0 0 12px;color:#8a9490;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">Próximos pasos</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[
                ["01", "Configura tus alertas", "Agrega tu número WhatsApp en /configuracion para recibir alertas de demoras en tiempo real."],
                ["02", "Crea cuentas de guardias", "Ve a /usuarios para crear los accesos de tus guardias de portería."],
                ["03", "Registra el primer vehículo", "Tus guardias pueden ingresar a /registro para comenzar a operar."],
                ["04", "Revisa el dashboard", "En /dashboard verás estadísticas y KPIs de operación en tiempo real."],
              ].map(([num, title, desc]) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #1e2420;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:28px;vertical-align:top;padding-top:1px;">
                        <span style="color:#c8a84b;font-size:11px;font-weight:700;font-family:monospace;">${num}</span>
                      </td>
                      <td style="padding-left:12px;">
                        <span style="color:#e8ece9;font-size:13px;font-weight:600;display:block;">${title}</span>
                        <span style="color:#8a9490;font-size:12px;line-height:1.5;">${desc}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`).join("")}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #1e2420;">
            <p style="margin:0;color:#4a5450;font-size:11px;line-height:1.6;">
              SmartGuard · Control Vehicular Industrial<br>
              ¿Necesitas ayuda? Responde este correo o escríbenos directamente.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmail(opts.supervisorEmail, `¡Bienvenido a SmartGuard, ${opts.companyName}!`, html);
}

async function sendAdminNotification(opts: {
  companyName: string;
  sector: string;
  contactName: string;
  supervisorEmail: string;
  notificationEmail?: string;
  notificationPhone?: string;
  plantas: string[];
  guardias: number;
  responsables: number;
  hasExcel: boolean;
  hasLogo: boolean;
}): Promise<void> {
  const rows = [
    ["Empresa",           opts.companyName],
    ["Sector",            opts.sector],
    ["Contacto",          opts.contactName],
    ["Supervisor",        opts.supervisorEmail],
    ["Email alertas",     opts.notificationEmail ?? "(mismo que supervisor)"],
    ["WhatsApp alertas",  opts.notificationPhone ?? "No configurado"],
    ["Sedes",             opts.plantas.join(", ") || "No especificadas"],
    ["Guardias creados",  String(opts.guardias)],
    ["Responsables",      String(opts.responsables)],
    ["Datos históricos",  opts.hasExcel ? "Sí" : "No"],
    ["Logo",              opts.hasLogo ? "Sí" : "No"],
  ];

  const html = `
<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e0e0e0;border-radius:4px;overflow:hidden;">
    <div style="background:#0a0c0b;padding:16px 24px;">
      <span style="color:#c8a84b;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">SmartGuard Admin</span>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 4px;color:#111;font-size:18px;">Nueva empresa registrada</h2>
      <p style="margin:0 0 20px;color:#666;font-size:13px;">${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${rows.map(([label, value]) => `
        <tr>
          <td style="padding:8px 12px;background:#f9f9f9;border:1px solid #eee;font-size:11px;color:#666;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;width:40%;">${label}</td>
          <td style="padding:8px 12px;border:1px solid #eee;font-size:13px;color:#111;">${value}</td>
        </tr>`).join("")}
      </table>
      <div style="margin-top:20px;">
        <a href="${SITE_URL}/admin" style="display:inline-block;padding:10px 24px;background:#0a0c0b;color:#c8a84b;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;border-radius:2px;">
          Ver en Admin →
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;

  await sendEmail(ADMIN_EMAIL, `🏭 Nueva empresa — ${opts.companyName}`, html);
}

export async function registerCompany(rawData: unknown) {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rl = await checkRateLimit(onboardingLimiter, ip);
  if (!rl.success) {
    return {
      success: false,
      error: `Demasiados intentos de registro. Intenta de nuevo en ${rl.retryAfter} segundos.`,
    };
  }

  const v = validated(registerCompanySchema, rawData);
  if (!v.ok) return { success: false, error: v.error };
  const data = v.data;
  try {
    const admin = createAdminClient();

    // 1. Logo upload
    let logoUrl: string | undefined;
    if (data.logoBase64 && data.logoMimeType) {
      try {
        const ext = data.logoMimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
        const slug = data.companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        const fileName = `${Date.now()}-${slug}.${ext}`;
        await admin.storage.createBucket("company-logos", { public: true }).catch(() => {});
        const buffer = Buffer.from(data.logoBase64, "base64");
        const { data: uploadData, error: uploadError } = await admin.storage
          .from("company-logos")
          .upload(fileName, buffer, { contentType: data.logoMimeType, upsert: false });
        if (!uploadError && uploadData) {
          const { data: urlData } = admin.storage.from("company-logos").getPublicUrl(uploadData.path);
          logoUrl = urlData.publicUrl;
        }
      } catch {
        // Logo upload failed — registration continues without logo
      }
    }

    // 2. Create company record
    const plantas = data.plantasText
      ? data.plantasText.split(",").map((p) => p.trim()).filter(Boolean)
      : [];

    // Trial: 7 días desde hoy
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);
    const trialEndsAtStr = trialEndsAt.toISOString().split("T")[0];

    const { data: company, error: companyError } = await admin
      .from("companies")
      .insert({
        name: data.companyName,
        sector: data.sector,
        contact_name: data.contactName,
        logo_url: logoUrl ?? null,
        plantas,
        notification_emails: data.notificationEmail ? [data.notificationEmail] : [],
        notification_phones: data.notificationPhone ? [data.notificationPhone] : [],
        plan: "trial",
        trial_ends_at: trialEndsAtStr,
      })
      .select("id")
      .single();

    if (companyError || !company) {
      return { success: false, error: "Error al crear el registro de empresa." };
    }

    const companyId = company.id as string;

    // 3. Create supervisor user
    const createdUserIds: string[] = [];
    const { data: supervisorUser, error: userError } = await admin.auth.admin.createUser({
      email: data.supervisorEmail,
      password: data.supervisorPassword,
      email_confirm: true,
      user_metadata: {
        role: "supervisor",
        company: data.companyName,
        company_id: companyId,
        sector: data.sector,
        contact_name: data.contactName,
        plantas,
        ...(logoUrl ? { logo_url: logoUrl } : {}),
      },
    });

    if (userError) {
      // Rollback company
      await admin.from("companies").delete().eq("id", companyId);
      if (userError.message.toLowerCase().includes("already registered") || userError.message.toLowerCase().includes("already been registered")) {
        return { success: false, error: "Este correo ya está registrado en el sistema." };
      }
      return { success: false, error: userError.message };
    }
    if (supervisorUser.user?.id) createdUserIds.push(supervisorUser.user.id);

    // 4. Insert responsables with company_id
    if (data.responsables.length > 0) {
      const unique = Array.from(new Set(data.responsables.map((n) => n.trim()).filter(Boolean)));
      await admin.from("responsables").insert(unique.map((nombre) => ({ nombre, activo: true, company_id: companyId })));
    }

    // 5. Create guardia accounts
    if (data.guardias && data.guardias.length > 0) {
      for (const g of data.guardias) {
        const { data: guardiaUser, error: guardiaError } = await admin.auth.admin.createUser({
          email: g.email,
          password: g.password,
          email_confirm: true,
          user_metadata: {
            role: "guardia",
            company: data.companyName,
            company_id: companyId,
            plant: g.plant || "",
            plantas,
            ...(logoUrl ? { logo_url: logoUrl } : {}),
          },
        });
        if (guardiaError) {
          await Promise.allSettled(createdUserIds.map((id) => admin.auth.admin.deleteUser(id)));
          await admin.from("responsables").delete().eq("company_id", companyId);
          await admin.from("companies").delete().eq("id", companyId);
          return { success: false, error: guardiaError.message };
        }
        if (guardiaUser.user?.id) createdUserIds.push(guardiaUser.user.id);
      }
    }

    // 6. Import Excel rows with company_id (in batches of 500)
    if (data.excelRows && data.excelRows.length > 0) {
      const rows = data.excelRows.slice(0, 10_000).map((r) => ({ ...r, company_id: companyId }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error: excelError } = await admin.from("atenciones").insert(rows.slice(i, i + 500));
        if (excelError) {
          await Promise.allSettled(createdUserIds.map((id) => admin.auth.admin.deleteUser(id)));
          await admin.from("atenciones").delete().eq("company_id", companyId);
          await admin.from("responsables").delete().eq("company_id", companyId);
          await admin.from("companies").delete().eq("id", companyId);
          return { success: false, error: `No se pudo importar el Excel: ${excelError.message}` };
        }
      }
    }

    // 7. Emails en background (no bloquean el registro)
    Promise.allSettled([
      sendWelcomeEmail({
        supervisorEmail: data.supervisorEmail,
        companyName:     data.companyName,
        sector:          data.sector,
        contactName:     data.contactName,
        plantas,
      }),
      sendAdminNotification({
        companyName:       data.companyName,
        sector:            data.sector,
        contactName:       data.contactName,
        supervisorEmail:   data.supervisorEmail,
        notificationEmail: data.notificationEmail,
        notificationPhone: data.notificationPhone,
        plantas,
        guardias:          data.guardias?.length ?? 0,
        responsables:      data.responsables.length,
        hasExcel:          (data.excelRows?.length ?? 0) > 0,
        hasLogo:           !!logoUrl,
      }),
    ]).catch(() => {});

    return { success: true, companyId };
  } catch {
    return { success: false, error: "Error inesperado. Intenta nuevamente." };
  }
}
