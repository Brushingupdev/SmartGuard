-- ============================================================================
-- SmartGuard: Cancelar automáticamente citas no-show
-- ============================================================================
-- A medianoche Lima (5 AM UTC), elimina citas programadas del día anterior
-- que nunca fueron activadas (vehículo no llegó).
-- Mismo comportamiento que el botón "Cancelar" en el panel de guardia.
-- ============================================================================

select cron.schedule(
  'cancel-no-show-citas',
  '0 5 * * *',
  $$
    delete from public.atenciones
    where estado = 'esperado'
      and fecha < current_date;
  $$
);
