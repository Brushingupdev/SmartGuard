-- ============================================================================
-- SmartGuard: RLS para atenciones_archive
-- ============================================================================
-- Esta tabla fue creada en 20260503130000 como respaldo de filas huérfanas
-- (company_id = NULL). No tenía RLS, lo que exponía datos de todas las
-- empresas a cualquier usuario autenticado vía la API de Supabase.
--
-- Políticas:
--   - service_role: acceso total (mantenimiento/backups)
--   - authenticated: sin acceso (los datos incluyen company_id = NULL,
--     no se puede filtrar por empresa)
-- ============================================================================

ALTER TABLE public.atenciones_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atenciones_archive FORCE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass en atenciones_archive"
  ON public.atenciones_archive
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
