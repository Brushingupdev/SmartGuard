-- ============================================================================
-- SmartGuard: Cron para limpiar alert_queue automáticamente
-- ============================================================================
-- Ejecuta cleanup_old_alert_queue() una vez al día para borrar registros
-- con status sent o failed de más de 7 días.
--
-- Requiere: extensión pg_cron habilitada en Supabase.
-- ============================================================================

-- 1. Ajustar intervalo de 30 días a 7 días
create or replace function public.cleanup_old_alert_queue()
returns void
language sql
security definer
as $$
  delete from public.alert_queue
  where created_at < now() - interval '7 days'
    and status in ('sent', 'failed');
$$;

-- 2. Programar el cron: todos los días a las 3 AM (UTC-5 ≈ 10 PM Lima)
select cron.schedule(
  'cleanup-alert-queue',
  '0 3 * * *',
  $$
    select public.cleanup_old_alert_queue();
  $$
);
