-- ============================================================================
-- Asegurar unique constraint en responsables para upserts idempotentes
-- ============================================================================

-- Evita duplicados y permite upsert con onConflict: "nombre,company_id"
-- Idempotente: no hace nada si ya existe
--

-- Tabla responsables (existente): asegurar unique (nombre, company_id)
-- Nota: la tabla agentes nueva ya tiene unique(nombre, company_id) en su definición

-- 1. Limpiar posibles duplicados previos (conservar el más antiguo)
delete from public.responsables
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by lower(trim(nombre)), company_id
        order by id asc
      ) as rn
    from public.responsables
  ) sub
  where rn > 1
);

-- 2. Crear índice único si no existe
create unique index if not exists idx_responsables_nombre_company
  on public.responsables(lower(trim(nombre)), company_id)
  where activo = true;
