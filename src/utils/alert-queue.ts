import { logError } from "@/app/actions/_helpers";

/**
 * Inserta una alerta en la cola para procesamiento asíncrono.
 * El envío real (email + WhatsApp) lo hace la Edge Function process_alert_queue.
 *
 * Esto desacopla el envío de alertas del server action principal,
 * evitando que el usuario espere si Resend o WhatsApp tardan.
 */

interface AlertPayload {
  companyId: string;
  atencionId?: number;
  razonSocial: string;
  empresa: string;
  planta: string;
  hRegistro: string;
  esperaMin: number;
}

export async function enqueueAlert(payload: AlertPayload): Promise<void> {
  try {
    // Usar cliente admin (service_role) porque la RLS de alert_queue
    // solo permite acceso al service_role — el cliente de usuario (anon) es bloqueado.
    const { createAdminClient } = await import("@/utils/supabase/admin");
    const supabase = createAdminClient();
    const { error } = await supabase.from("alert_queue").insert({
      company_id: payload.companyId,
      atencion_id: payload.atencionId ?? null,
      razon_social: payload.razonSocial,
      empresa: payload.empresa,
      planta: payload.planta,
      h_registro: payload.hRegistro,
      espera_min: payload.esperaMin,
      status: "pending",
    });

    if (error) {
      logError("enqueueAlert", error, { payload });
    }
  } catch (err) {
    logError("enqueueAlert", err, { payload });
  }
}
