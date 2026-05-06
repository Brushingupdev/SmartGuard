-- ============================================================================
-- SmartGuard: Unique parcial en atenciones para prevenir duplicados
-- ============================================================================
-- Problema: createAtencion hace SELECT → INSERT en dos pasos no atómicos.
-- Dos requests simultáneos pueden pasar el check y crear duplicados.
--
-- Solución: unique index parcial sobre (razon_social, planta, fecha, company_id)
-- solo para registros activos (h_atencion IS NULL). La aplicación mantiene
-- su check client-side como primera barrera; este índice es la segunda.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_atenciones_unico_activo
  ON public.atenciones (razon_social, planta, fecha, company_id)
  WHERE h_atencion IS NULL;
