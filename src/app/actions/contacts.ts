"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";
import { checkWriteAccess } from "./_helpers";
import {
  plantContactSchema,
  validated,
} from "@/lib/validations";

export async function getPlantContacts(companyId: string) {
  // Defense-in-depth: validar que el usuario pertenece a esa empresa
  const ctx = await getUserContext();
  if (!ctx?.isAdmin && ctx?.companyId !== companyId) {
    return [];
  }

  let data:
    | { planta: string; emails: string[]; phones: string[] }[]
    | null = null;

  if (ctx?.isAdmin) {
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const admin = createAdminClient();
    const { data: adminData } = await admin
      .from("company_plant_contacts")
      .select("planta, emails, phones")
      .eq("company_id", companyId)
      .order("planta");
    data = adminData as typeof data;
  } else {
    const supabase = await createClient();
    const { data: userData } = await supabase
      .from("company_plant_contacts")
      .select("planta, emails, phones")
      .eq("company_id", companyId)
      .order("planta");
    data = userData as typeof data;
  }

  return (data ?? []) as { planta: string; emails: string[]; phones: string[] }[];
}

export async function upsertPlantContact(
  rawPayload: unknown
) {
  const v = validated(plantContactSchema, rawPayload);
  if (!v.ok) return { success: false };
  const { companyId, planta, emails, phones } = v.data;

  // Defense-in-depth: asegurar que el usuario pertenece a esa empresa
  const ctx = await getUserContext();

  const writeError = await checkWriteAccess();
  if (writeError) return { success: false };

  if (!ctx?.isAdmin && ctx?.companyId !== companyId) {
    return { success: false };
  }

  const db = ctx?.isAdmin
    ? (await import("@/utils/supabase/admin")).createAdminClient()
    : await createClient();
  const { error } = await db
    .from("company_plant_contacts")
    .upsert(
      { company_id: companyId, planta, emails: emails.filter(Boolean), phones: phones.filter(Boolean) },
      { onConflict: "company_id,planta" }
    );
  return error ? { success: false } : { success: true };
}
