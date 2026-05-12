-- CRON semanal: detecta proveedores con Grade F (>75% demoras) en dos semanas
-- consecutivas y genera una alerta en alert_queue para notificar al supervisor.
-- Corre los lunes a las 02:00 UTC (9:00pm Lima, UTC-5).

SELECT cron.schedule(
  'chronic-provider-alerts',
  '0 2 * * 1',
  $cron$
  DO $body$
  DECLARE
    today       DATE  := CURRENT_DATE;
    w1_from     DATE  := today - 14;
    w1_to       DATE  := today - 8;
    w2_from     DATE  := today - 7;
    w2_to       DATE  := today - 1;
    r_company   RECORD;
    r_empresa   RECORD;
    rate1       INT;
    rate2       INT;
  BEGIN
    FOR r_company IN
      SELECT DISTINCT company_id
      FROM atenciones
      WHERE fecha >= today - 14
        AND company_id IS NOT NULL
    LOOP
      FOR r_empresa IN
        SELECT
          empresa,
          COUNT(*) FILTER (WHERE fecha BETWEEN w1_from AND w1_to)                                                      AS t1,
          COUNT(*) FILTER (WHERE fecha BETWEEN w1_from AND w1_to
                             AND COALESCE(demora_cita_min, espera_min) >= 30)                                          AS d1,
          COUNT(*) FILTER (WHERE fecha BETWEEN w2_from AND w2_to)                                                      AS t2,
          COUNT(*) FILTER (WHERE fecha BETWEEN w2_from AND w2_to
                             AND COALESCE(demora_cita_min, espera_min) >= 30)                                          AS d2
        FROM atenciones
        WHERE company_id = r_company.company_id
          AND fecha >= today - 14
          AND empresa IS NOT NULL AND empresa <> ''
        GROUP BY empresa
        HAVING COUNT(*) >= 6
      LOOP
        CONTINUE WHEN r_empresa.t1 < 3 OR r_empresa.t2 < 3;

        rate1 := ROUND(100.0 * r_empresa.d1 / r_empresa.t1);
        rate2 := ROUND(100.0 * r_empresa.d2 / r_empresa.t2);

        CONTINUE WHEN rate1 < 75 OR rate2 < 75;

        -- Evitar duplicados: no alertar si ya existe una en los últimos 7 días
        CONTINUE WHEN EXISTS (
          SELECT 1 FROM alert_queue
          WHERE company_id = r_company.company_id
            AND channel     = 'chronic_provider'
            AND payload->>'empresa' = r_empresa.empresa
            AND created_at  > NOW() - INTERVAL '7 days'
        );

        INSERT INTO alert_queue (company_id, channel, payload, status)
        VALUES (
          r_company.company_id,
          'chronic_provider',
          jsonb_build_object(
            'empresa',  r_empresa.empresa,
            'rate1',    rate1,
            'rate2',    rate2,
            'total1',   r_empresa.t1,
            'total2',   r_empresa.t2
          ),
          'pending'
        );
      END LOOP;
    END LOOP;
  END;
  $body$;
  $cron$
);
