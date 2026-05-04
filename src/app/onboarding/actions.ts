"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { headers } from "next/headers";
import { registerCompanySchema, validated } from "@/lib/validations";
import { checkRateLimit, onboardingLimiter } from "@/utils/rate-limit";

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

    // Trial: 14 días desde hoy
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);
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
    const { error: userError } = await admin.auth.admin.createUser({
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

    // 4. Insert responsables with company_id
    if (data.responsables.length > 0) {
      const unique = Array.from(new Set(data.responsables.map((n) => n.trim()).filter(Boolean)));
      await admin.from("responsables").insert(unique.map((nombre) => ({ nombre, activo: true, company_id: companyId })));
    }

    // 5. Create guardia accounts
    if (data.guardias && data.guardias.length > 0) {
      for (const g of data.guardias) {
        await admin.auth.admin.createUser({
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
      }
    }

    // 6. Import Excel rows with company_id (in batches of 500)
    if (data.excelRows && data.excelRows.length > 0) {
      const rows = data.excelRows.slice(0, 10_000).map((r) => ({ ...r, company_id: companyId }));
      for (let i = 0; i < rows.length; i += 500) {
        await admin.from("atenciones").insert(rows.slice(i, i + 500));
      }
    }

    return { success: true, companyId };
  } catch {
    return { success: false, error: "Error inesperado. Intenta nuevamente." };
  }
}
