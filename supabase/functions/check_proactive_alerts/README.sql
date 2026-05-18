-- ============================================================================
-- Configuración de pg_cron para check_proactive_alerts
-- ============================================================================
-- Ejecutar DESPUÉS de deployar la Edge Function check_proactive_alerts.
-- Requiere la extensión pg_cron habilitada en Supabase.
--
-- IMPORTANTE:
-- Esta función suele devolver 401 si el cron la invoca sin cabecera
-- Authorization. Usa el SERVICE_ROLE_KEY como Bearer token, igual que
-- process_alert_queue.
-- ============================================================================

-- Habilitar pg_cron (solo si no está habilitado ya)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Ejecutar la Edge Function cada 1 minuto
-- Reemplazar <PROJECT_REF> con tu project ref de Supabase
-- Reemplazar <SERVICE_ROLE_KEY> con tu service role key

-- SELECT cron.schedule(
--   'check-proactive-alerts',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/check_proactive_alerts',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- Para ver los cron jobs activos:
-- SELECT * FROM cron.job;

-- Para desactivar el cron job:
-- SELECT cron.unschedule('check-proactive-alerts');
