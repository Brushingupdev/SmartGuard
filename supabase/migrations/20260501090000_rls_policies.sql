-- ============================================================================
-- SmartGuard RLS Migration
-- ============================================================================
-- Objetivo: Aislar datos por company_id con Row Level Security
-- Estrategia: Defense-in-Depth (RLS + aplicación mantiene .eq("company_id"))
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de perfiles públicos (sync con auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id         uuid primary key references auth.users on delete cascade,
  role       text not null default 'guardia',
  company_id uuid references public.companies(id) on delete set null,
  plant      text not null default '',
  updated_at timestamptz not null default now()
);

-- RLS sobre user_profiles
alter table public.user_profiles enable row level security;

create policy "Usuarios leen su propio perfil"
  on public.user_profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Service role gestiona todos los perfiles"
  on public.user_profiles for all
  to service_role
  using (true)
  with check (true);


-- ----------------------------------------------------------------------------
-- 2. Función trigger: sync auth.users -> public.user_profiles
-- ----------------------------------------------------------------------------
create or replace function public.sync_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, role, company_id, plant, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'guardia'),
    (new.raw_user_meta_data ->> 'company_id')::uuid,
    coalesce(new.raw_user_meta_data ->> 'plant', ''),
    now()
  )
  on conflict (id) do update set
    role       = coalesce(excluded.role, user_profiles.role),
    company_id = coalesce(excluded.company_id, user_profiles.company_id),
    plant      = coalesce(excluded.plant, user_profiles.plant),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sync_user_profile on auth.users;
create trigger trg_sync_user_profile
  after insert or update of raw_user_meta_data
  on auth.users
  for each row
  execute function public.sync_user_profile();

-- Sincronizar usuarios existentes (one-time backfill)
insert into public.user_profiles (id, role, company_id, plant, updated_at)
select
  id,
  coalesce(raw_user_meta_data ->> 'role', 'guardia'),
  (raw_user_meta_data ->> 'company_id')::uuid,
  coalesce(raw_user_meta_data ->> 'plant', ''),
  now()
from auth.users
on conflict (id) do update set
  role       = excluded.role,
  company_id = excluded.company_id,
  plant      = excluded.plant,
  updated_at = excluded.updated_at;


-- ----------------------------------------------------------------------------
-- 3. RLS en tabla atenciones
-- ----------------------------------------------------------------------------
alter table atenciones enable row level security;

create policy "Aislamiento por company_id en atenciones"
  on atenciones for all
  to authenticated
  using (
    company_id is null
    or company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  )
  with check (
    company_id is null
    or company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

create policy "Service role bypass en atenciones"
  on atenciones for all
  to service_role
  using (true)
  with check (true);


-- ----------------------------------------------------------------------------
-- 4. RLS en tabla companies
-- ----------------------------------------------------------------------------
alter table companies enable row level security;

create policy "Usuarios leen solo su empresa"
  on companies for select
  to authenticated
  using (
    id is null
    or id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

create policy "Usuarios actualizan solo su empresa"
  on companies for update
  to authenticated
  using (
    id is null
    or id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  )
  with check (
    id is null
    or id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

create policy "Service role gestiona companies"
  on companies for all
  to service_role
  using (true)
  with check (true);


-- ----------------------------------------------------------------------------
-- 5. RLS en tabla responsables
-- ----------------------------------------------------------------------------
alter table responsables enable row level security;

create policy "Aislamiento por company_id en responsables"
  on responsables for all
  to authenticated
  using (
    company_id is null
    or company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  )
  with check (
    company_id is null
    or company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

create policy "Service role bypass en responsables"
  on responsables for all
  to service_role
  using (true)
  with check (true);


-- ----------------------------------------------------------------------------
-- 6. RLS en tabla company_plant_contacts
-- ----------------------------------------------------------------------------
alter table company_plant_contacts enable row level security;

create policy "Aislamiento por company_id en plant_contacts"
  on company_plant_contacts for all
  to authenticated
  using (
    company_id is null
    or company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  )
  with check (
    company_id is null
    or company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

create policy "Service role bypass en plant_contacts"
  on company_plant_contacts for all
  to service_role
  using (true)
  with check (true);


-- ----------------------------------------------------------------------------
-- 7. RLS en tabla alert_logs
-- ----------------------------------------------------------------------------
alter table alert_logs enable row level security;

create policy "Aislamiento por company_id en alert_logs"
  on alert_logs for select
  to authenticated
  using (
    company_id is null
    or company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

create policy "Service role bypass en alert_logs"
  on alert_logs for all
  to service_role
  using (true)
  with check (true);


-- ----------------------------------------------------------------------------
-- 8. Índices para rendimiento de RLS
-- ----------------------------------------------------------------------------
create index if not exists idx_atenciones_company_id_fecha
  on atenciones(company_id, fecha);

create index if not exists idx_atenciones_company_id_planta
  on atenciones(company_id, planta);

create index if not exists idx_alert_logs_company_id
  on alert_logs(company_id);

create index if not exists idx_responsables_company_id_activo
  on responsables(company_id) where activo = true;
