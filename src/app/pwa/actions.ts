"use server";

import { createClient } from "@/utils/supabase/server";
import { createHash } from "crypto";

export type GuardSession = {
  id: number;
  nombre: string;
  planta: string | null;
  turno: string;
  avatar_color: string;
};

/**
 * Valida el PIN de un guardia dentro de una empresa.
 * Retorna los datos del guardia si el PIN es correcto.
 */
export async function validateGuardPIN(
  pin: string,
  companyId: string
): Promise<{ success: true; guard: GuardSession } | { success: false; error: string }> {
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, error: "PIN inválido" };
  }

  const pin_hash = createHash("sha256").update(pin).digest("hex");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agentes")
    .select("id, nombre, planta, turno, avatar_color")
    .eq("company_id", companyId)
    .eq("pin_hash", pin_hash)
    .eq("activo", true)
    .maybeSingle();

  if (error) return { success: false, error: "Error al validar" };
  if (!data)  return { success: false, error: "PIN incorrecto" };

  // Actualizar último acceso
  await supabase
    .from("agentes")
    .update({ ultimo_acceso: new Date().toISOString() })
    .eq("id", data.id);

  return {
    success: true,
    guard: {
      id: data.id,
      nombre: data.nombre,
      planta: data.planta ?? null,
      turno: data.turno ?? "Día",
      avatar_color: data.avatar_color ?? "#c8a84b",
    },
  };
}

/**
 * Obtiene la configuración de la empresa/planta para el dispositivo.
 * Se llama una vez cuando el supervisor configura el dispositivo.
 */
export async function getDeviceCompanyInfo(): Promise<{
  companyId: string;
  companyName: string;
  plantas: string[];
} | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const companyId = user.user_metadata?.company_id as string | undefined;
  if (!companyId) return null;

  const { data } = await supabase
    .from("companies")
    .select("id, name, plantas")
    .eq("id", companyId)
    .single();

  if (!data) return null;

  return {
    companyId: data.id,
    companyName: data.name,
    plantas: data.plantas ?? [],
  };
}
