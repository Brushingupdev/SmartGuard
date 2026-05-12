-- ============================================================================
-- SmartGuard: Tabla agentes + RLS
-- ============================================================================
-- Objetivo: Mantener lista maestra de agentes/guardias para autocompletar
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Crear tabla agentes (igual estructura que responsables)
-- ----------------------------------------------------------------------------
create table if not exists public.agentes (
  id         serial primary key,
  nombre     text not null,
  activo     boolean not null default true,
  company_id uuid references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (nombre, company_id)
);

-- Índice para lookups rápidos por empresa
create index if not exists idx_agentes_company_id_activo
  on agentes(company_id) where activo = true;


-- ----------------------------------------------------------------------------
-- 2. RLS en tabla agentes
-- ----------------------------------------------------------------------------
alter table agentes enable row level security;

create policy "Aislamiento por company_id en agentes"
  on agentes for all
  to authenticated
  using (
    company_id is null
    or company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  )
  with check (
    company_id is null
    or company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

create policy "Service role bypass en agentes"
  on agentes for all
  to service_role
  using (true)
  with check (true);
