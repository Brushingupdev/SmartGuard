-- ============================================================================
-- Configuración de pg_cron para process_alert_queue
-- ============================================================================
-- Ejecutar DESPUÉS de deployar la Edge Function process_alert_queue.
-- Requiere la extensión pg_cron habilitada en Supabase.
-- ============================================================================

-- Habilitar pg_cron (solo si no está habilitado ya)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Ejecutar la Edge Function cada 1 minuto
-- Reemplazar <PROJECT_REF> con tu project ref de Supabase
-- Reemplazar <SERVICE_ROLE_KEY> con tu service role key

-- SELECT cron.schedule(
--   'process-alert-queue',
--   '* * * * *',  -- cada 1 minuto
--   $$
--   SELECT net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/process_alert_queue',
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
-- SELECT cron.unschedule('process-alert-queue');
