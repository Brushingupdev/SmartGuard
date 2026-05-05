-- ============================================================================
-- SmartGuard: Deduplicación de alertas en cola
-- ============================================================================
-- Objetivo: evitar que closeAtencion() y check_proactive_alerts encolen
-- dos alertas simultáneas para el mismo registro (race condition).
--
-- Solución: índice único parcial sobre atencion_id cuando la alerta
-- está en estado pending o processing.
-- NULL en atencion_id no viola el índice (alertas sin registro asociado).
-- ============================================================================

create unique index if not exists idx_alert_queue_dedup
  on public.alert_queue (atencion_id)
  where status in ('pending', 'processing')
    and atencion_id is not null;
