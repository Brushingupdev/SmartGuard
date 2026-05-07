// Edge Function: check_proactive_alerts
// Con hora_cita: alerta al llegar la cita, luego cada alertaMinutos.
// Sin hora_cita: alerta al superar umbral de empresa, luego cada alertaMinutos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Lima = UTC-5 (sin horario de verano)
const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;

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
  if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;
  return hh * 60 + mm;
}

function diffMin(from: number, to: number): number {
  const d = to - from;
  return d < 0 ? d + 1440 : d;
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const today    = limaToday();
  const { totalMin: nowMin } = limaNow();

  const { data: companies, error: compErr } = await supabase
    .from("companies")
    .select("id, alerta_minutos")
    .is("deleted_at", null);

  if (compErr) {
    console.error("[check_proactive_alerts] Error fetching companies:", compErr);
    return new Response(JSON.stringify({ error: compErr.message }), { status: 500 });
  }

  let totalChecked = 0;
  let totalAlerted = 0;

  for (const company of companies ?? []) {
    const alertaMinutos: number = company.alerta_minutos ?? 45;

    const yesterday = new Date(Date.now() + LIMA_OFFSET_MS - 86_400_000)
      .toISOString()
      .substring(0, 10);

    const { data: atenciones, error: atErr } = await supabase
      .from("atenciones")
      .select("id, fecha, h_registro, hora_cita, ultima_alerta_proactiva_at, planta, razon_social, empresa")
      .eq("company_id", company.id)
      .gte("fecha", yesterday)
      .is("h_atencion", null)
      .not("h_registro", "is", null);

    if (atErr) {
      console.error(`[check_proactive_alerts] Error fetching atenciones (${company.id}):`, atErr);
      continue;
    }

    for (const at of atenciones ?? []) {
      totalChecked++;

      const registroMin = toMin(at.h_registro as string);
      if (Number.isNaN(registroMin)) {
        console.error(`[check_proactive_alerts] h_registro inválido atencion=${at.id}: "${at.h_registro}"`);
        continue;
      }

      let waitMin: number;
      let repeatIntervalMin: number;
      let threshold: number;

      if (at.hora_cita) {
        const citaMin = toMin(at.hora_cita as string);
        if (Number.isNaN(citaMin)) {
          console.error(`[check_proactive_alerts] hora_cita inválida atencion=${at.id}: "${at.hora_cita}"`);
          continue;
        }

        if ((at.fecha as string) === today) {
          if (nowMin < citaMin) continue;
          waitMin = diffMin(citaMin, nowMin);
        } else {
          waitMin = nowMin + (1440 - citaMin);
        }

        threshold         = 0;
        repeatIntervalMin = alertaMinutos;
      } else {
        waitMin           = diffMin(registroMin, nowMin);
        threshold         = alertaMinutos;
        repeatIntervalMin = alertaMinutos;
      }

      if (waitMin < threshold) continue;

      if (at.ultima_alerta_proactiva_at) {
        const lastMs           = new Date(at.ultima_alerta_proactiva_at as string).getTime();
        const minutesSinceLast = (Date.now() - lastMs) / 60_000;
        if (minutesSinceLast < repeatIntervalMin) continue;
      }

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

      const { error: updErr } = await supabase
        .from("atenciones")
        .update({ ultima_alerta_proactiva_at: new Date().toISOString() })
        .eq("id", at.id);

      if (updErr) {
        console.error(`[check_proactive_alerts] Error updating ultima_alerta atencion=${at.id}:`, updErr);
      }

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
