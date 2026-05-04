-- ============================================================================
-- SmartGuard: Reparación de filas huérfanas en atenciones
-- ============================================================================
-- Problema: ~15,071 filas en atenciones con company_id = NULL.
-- Con RLS endurecido (migration 20260503120000), estas filas son invisibles
-- para usuarios autenticados y contaminan queries de service_role.
--
-- Estrategia (en orden):
--   1. DIAGNÓSTICO   — ver la distribución real de huérfanas
--   2. MATCHING      — asignar company_id usando empresa/razon_social vs companies.name
--   3. ARCHIVADO     — mover filas que no matcheen a atenciones_archive
--   4. VALIDAR       — verificar que no quedan huérfanas
--
-- INSTRUCCIONES DE USO:
--   Ejecutar SECCIÓN POR SECCIÓN en el SQL Editor de Supabase Dashboard.
--   NO ejecutar todo de golpe sin revisar los resultados de DIAGNÓSTICO primero.
-- ============================================================================


-- ============================================================================
-- SECCIÓN 1: DIAGNÓSTICO
-- Ejecutar primero. NO modifica datos.
-- ============================================================================

-- 1a. Total de filas huérfanas
SELECT count(*) AS total_huerfanas
FROM public.atenciones
WHERE company_id IS NULL;

-- 1b. Distribución por campo "empresa" (texto libre)
--     Este campo es la mejor pista para identificar la empresa real.
SELECT
  empresa,
  razon_social,
  count(*) AS cantidad,
  min(fecha) AS primera_atencion,
  max(fecha) AS ultima_atencion
FROM public.atenciones
WHERE company_id IS NULL
GROUP BY empresa, razon_social
ORDER BY cantidad DESC
LIMIT 50;

-- 1c. Empresas disponibles en la tabla companies
--     Compara esta lista con los resultados de 1b para confirmar matches.
SELECT id, name, plantas
FROM public.companies
ORDER BY name;

-- 1d. Preview del matching automático (campo empresa)
--     Muestra qué filas SÍ matchearán con el UPDATE de la Sección 2.
SELECT
  a.empresa,
  c.id  AS company_id_asignado,
  c.name AS company_name,
  count(*) AS filas_a_actualizar
FROM public.atenciones a
JOIN public.companies c
  ON lower(trim(a.empresa)) = lower(trim(c.name))
WHERE a.company_id IS NULL
GROUP BY a.empresa, c.id, c.name
ORDER BY filas_a_actualizar DESC;

-- 1e. Filas que NO matchean (quedarán huérfanas después del UPDATE)
--     Estas irán a atenciones_archive en la Sección 3.
SELECT
  a.empresa,
  a.razon_social,
  count(*) AS cantidad
FROM public.atenciones a
LEFT JOIN public.companies c
  ON lower(trim(a.empresa)) = lower(trim(c.name))
WHERE a.company_id IS NULL
  AND c.id IS NULL
GROUP BY a.empresa, a.razon_social
ORDER BY cantidad DESC;


-- ============================================================================
-- SECCIÓN 2: ASIGNACIÓN AUTOMÁTICA POR NOMBRE
-- Asigna company_id a todas las filas donde el campo "empresa" coincide
-- (case-insensitive, sin espacios) con companies.name.
--
-- REVISAR SECCIÓN 1 ANTES DE EJECUTAR ESTO.
-- ============================================================================

BEGIN;

-- 2a. Matching por campo "empresa"
UPDATE public.atenciones a
SET company_id = c.id
FROM public.companies c
WHERE a.company_id IS NULL
  AND lower(trim(a.empresa)) = lower(trim(c.name));

-- Verificar cuántas se actualizaron (debería ser > 0)
-- Si el número es 0, los nombres no coinciden exactamente → revisar 1b vs 1c
-- y ajustar la condición de match antes del COMMIT.
SELECT count(*) AS filas_actualizadas_en_esta_transaccion
FROM public.atenciones
WHERE company_id IS NOT NULL
  AND ctid IN (
    SELECT ctid FROM public.atenciones
    WHERE xmax::text::bigint = (SELECT txid_current())
  );

-- Si el número es el esperado, hacer COMMIT. Si no, hacer ROLLBACK.
-- COMMIT;
-- ROLLBACK;

COMMIT;


-- ============================================================================
-- SECCIÓN 2B: MATCHING ALTERNATIVO (solo si 2a no alcanzó)
-- Si algunas filas todavía tienen company_id=NULL pero su campo "empresa"
-- se puede identificar manualmente, usar este template:
--
--   UPDATE public.atenciones
--   SET company_id = '<UUID-de-la-empresa>'
--   WHERE company_id IS NULL
--     AND lower(trim(empresa)) = 'nombre exacto como aparece en 1b';
--
-- Repetir para cada empresa identificada en el resultado de 1e.
-- ============================================================================


-- ============================================================================
-- SECCIÓN 3: ARCHIVAR FILAS QUE NO MATCHEARON
-- Las filas que aún tienen company_id=NULL no se pueden asignar
-- automáticamente. Las movemos a una tabla de archivo para no perder datos.
--
-- EJECUTAR SOLO DESPUÉS DE COMPLETAR SECCIÓN 2 Y 2B.
-- ============================================================================

-- 3a. Crear tabla de archivo (solo si no existe)
-- IMPORTANTE: usamos INCLUDING DEFAULTS solo (NO INCLUDING CONSTRAINTS) porque
-- esta tabla recibe filas con company_id=NULL y la constraint
-- atenciones_company_id_required la rechazaría si se incluyera.
CREATE TABLE IF NOT EXISTS public.atenciones_archive (
  LIKE public.atenciones INCLUDING DEFAULTS INCLUDING INDEXES INCLUDING COMMENTS,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archive_reason text NOT NULL DEFAULT 'company_id_null_cleanup_2026'
);

-- 3b. Copiar filas huérfanas restantes al archivo
INSERT INTO public.atenciones_archive
SELECT *, now(), 'company_id_null_cleanup_2026'
FROM public.atenciones
WHERE company_id IS NULL;

-- Verificar cuántas se archivaron
SELECT count(*) AS filas_archivadas
FROM public.atenciones_archive
WHERE archive_reason = 'company_id_null_cleanup_2026';

-- 3c. Eliminar huérfanas de la tabla principal
--     SOLO ejecutar si la cantidad en 3b es la esperada.
BEGIN;

DELETE FROM public.atenciones
WHERE company_id IS NULL;

-- Verificar: debe retornar 0
SELECT count(*) AS huerfanas_restantes
FROM public.atenciones
WHERE company_id IS NULL;

-- Si es 0, COMMIT. Si no, ROLLBACK.
-- COMMIT;
-- ROLLBACK;

COMMIT;


-- ============================================================================
-- SECCIÓN 4: VALIDAR CONSTRAINT Y ACTIVAR
-- Una vez que company_id=NULL no existe en atenciones, podemos validar
-- el constraint NOT VALID que agregamos en 20260503120000.
-- Esto lo vuelve completamente efectivo para queries futuras.
-- ============================================================================

-- 4a. Validar el constraint (puede tardar en tablas grandes)
ALTER TABLE public.atenciones
  VALIDATE CONSTRAINT atenciones_company_id_required;

-- Si el paso anterior falla, significa que aún hay filas NULL.
-- Volver a Sección 2B para manejarlas manualmente.


-- ============================================================================
-- SECCIÓN 5: VERIFICACIÓN FINAL
-- ============================================================================

-- 5a. Confirmar 0 huérfanas en tabla principal
SELECT count(*) AS huerfanas_en_atenciones
FROM public.atenciones
WHERE company_id IS NULL;

-- 5b. Confirmar que el constraint está validado
SELECT conname, convalidated
FROM pg_constraint
WHERE conname = 'atenciones_company_id_required';
-- convalidated debe ser TRUE

-- 5c. Confirmar distribución por empresa después de la reparación
SELECT
  c.name AS empresa,
  count(a.id) AS total_atenciones
FROM public.atenciones a
JOIN public.companies c ON a.company_id = c.id
GROUP BY c.name
ORDER BY total_atenciones DESC;

-- 5d. Resumen del archivo
SELECT
  archive_reason,
  count(*) AS filas_archivadas,
  min(archived_at) AS archivado_desde
FROM public.atenciones_archive
GROUP BY archive_reason;
