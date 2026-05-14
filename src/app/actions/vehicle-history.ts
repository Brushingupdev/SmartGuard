"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/utils/supabase/user";

export type VehicleVisit = {
  id: number;
  fecha: string;
  h_registro: string | null;
  h_atencion: string | null;
  h_dev_docs: string | null;
  espera_min: number | null;
  responsable: string | null;
  agente: string | null;
  tipo_operacion: string | null;
  planta: string | null;
};

/**
 * Retorna las últimas visitas de un proveedor (por razón social).
 * Útil para el drawer de detalle del vehículo en el PWA.
 */
export async function getVehicleHistory(
  razonSocial: string,
  limit = 5
): Promise<VehicleVisit[]> {
  const supabase = await createClient();
  const ctx      = await getUserContext();
  if (!ctx?.companyId) return [];

  const { data, error } = await supabase
    .from("atenciones")
    .select("id, fecha, h_registro, h_atencion, h_dev_docs, espera_min, responsable, agente, tipo_operacion, planta")
    .eq("company_id", ctx.companyId)
    .ilike("razon_social", razonSocial)
    .not("h_registro", "is", null)
    .order("fecha", { ascending: false })
    .order("h_registro", { ascending: false })
    .limit(limit + 1); // +1 para excluir el registro actual del día

  if (error || !data) return [];

  // Excluir el día de hoy del historial (es el registro actual)
  const today = new Date().toISOString().slice(0, 10);
  return data
    .filter(r => r.fecha !== today)
    .slice(0, limit) as VehicleVisit[];
}
