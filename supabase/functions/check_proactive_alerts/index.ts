// Edge Function: check_proactive_alerts
// Con hora_cita: alerta al llegar la cita, luego cada 15 min.
// Sin hora_cita: alerta al superar umbral de empresa, luego cada alertaMinutos.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Lima = UTC-5 (sin horario de verano)
const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;

// Intervalo de re-alerta para vehículos con hora_cita (en minutos)
const CITA_REPEAT_MIN = 15;

function limaNow(): { totalMin: number } {
  const d  = new Date(Date.now() + LIMA_OFFSET_MS);
  return { totalMin: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

function limaToday(): string {
  const d = new Date(Date.now() + LIMA_OFFSET_MS);
  return d.toISOString().substring(0, 10);
}

function toMin(t: string): number {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const today    = limaToday();
  const { totalMin: nowMin } = limaNow();

  const { data: companies, error: compErr } = await supabase
    .from("companies")
    .select("id, alerta_minutos")
    .in("status", ["trial", "active"]);

  if (compErr) {
    console.error("[check_proactive_alerts] Error fetching companies:", compErr);
    return new Response(JSON.stringify({ error: compErr.message }), { status: 500 });
  }

  let totalChecked = 0;
  let totalAlerted = 0;

  for (const company of companies ?? []) {
    const alertaMinutos: number = company.alerta_minutos ?? 45;

    const { data: atenciones, error: atErr } = await supabase
      .from("atenciones")
      .select("id, h_registro, hora_cita, ultima_alerta_proactiva_at, planta, razon_social, empresa")
      .eq("company_id", company.id)
      .eq("fecha", today)
      .is("h_atencion", null);

    if (atErr) {
      console.error(`[check_proactive_alerts] Error fetching atenciones (${company.id}):`, atErr);
      continue;
    }

    for (const at of atenciones ?? []) {
      totalChecked++;

      let waitMin: number;
      let repeatIntervalMin: number;
      let threshold: number;

      if (at.hora_cita) {
        // ── Vehículo con cita ────────────────────────────────────────────────────
        const citaMin = toMin(at.hora_cita as string);
        if (nowMin < citaMin) continue; // Cita aún no llegó
        waitMin           = nowMin - citaMin;
        threshold         = 0;              // Alerta desde el momento exacto de la cita
        repeatIntervalMin = CITA_REPEAT_MIN; // Repetir cada 15 min
      } else {
        // ── Vehículo sin cita ────────────────────────────────────────────────────
        const regMin = toMin(at.h_registro as string);
        const diff   = nowMin - regMin;
        waitMin           = diff < 0 ? diff + 1440 : diff;
        threshold         = alertaMinutos;  // Alerta al superar el umbral
        repeatIntervalMin = alertaMinutos;  // Repetir cada alertaMinutos
      }

      // ¿Supera el umbral?
      if (waitMin < threshold) continue;

      // Deduplicación: ¿se envió alerta hace menos de repeatIntervalMin?
      if (at.ultima_alerta_proactiva_at) {
        const lastMs           = new Date(at.ultima_alerta_proactiva_at as string).getTime();
        const minutesSinceLast = (Date.now() - lastMs) / 60_000;
        if (minutesSinceLast < repeatIntervalMin) continue;
      }

      // Insertar en cola de alertas
      const { error: qErr } = await supabase.from("alert_queue").insert({
        company_id:   company.id,
        atencion_id:  at.id,
        razon_social: at.razon_social,
        empresa:      at.empresa,
        planta:       at.planta,
        h_registro:   (at.h_registro as string).substring(0, 5),
        espera_min:   waitMin,
      });

      if (qErr) {
        console.error(`[check_proactive_alerts] Error queueing atencion ${at.id}:`, qErr);
        continue;
      }

      await supabase
        .from("atenciones")
        .update({ ultima_alerta_proactiva_at: new Date().toISOString() })
        .eq("id", at.id);

      console.log(`[check_proactive_alerts] Alerta encolada: atencion=${at.id}, espera=${waitMin}min, conCita=${!!at.hora_cita}`);
      totalAlerted++;
    }
  }

  console.log(`[check_proactive_alerts] checked=${totalChecked}, alerted=${totalAlerted}`);
  return new Response(
    JSON.stringify({ ok: true, checked: totalChecked, alerted: totalAlerted }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
