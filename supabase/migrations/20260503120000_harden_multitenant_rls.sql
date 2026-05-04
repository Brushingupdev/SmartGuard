-- ============================================================================
-- SmartGuard: Endurecimiento multi-tenant
-- ============================================================================
-- Objetivo:
-- 1. Evitar que usuarios autenticados lean datos operativos con company_id NULL.
-- 2. Exigir company_id en nuevas escrituras operativas sin romper filas antiguas.
-- 3. Mantener excepciones explícitas solo donde sí son válidas (feature_flags).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enforce company_id for new operational writes
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'atenciones_company_id_required'
  ) then
    alter table public.atenciones
      add constraint atenciones_company_id_required
      check (company_id is not null) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'responsables_company_id_required'
  ) then
    alter table public.responsables
      add constraint responsables_company_id_required
      check (company_id is not null) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'company_plant_contacts_company_id_required'
  ) then
    alter table public.company_plant_contacts
      add constraint company_plant_contacts_company_id_required
      check (company_id is not null) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'alert_logs_company_id_required'
  ) then
    alter table public.alert_logs
      add constraint alert_logs_company_id_required
      check (company_id is not null) not valid;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Tighten tenant RLS policies
-- ----------------------------------------------------------------------------
drop policy if exists "Aislamiento por company_id en atenciones" on public.atenciones;
create policy "Aislamiento por company_id en atenciones"
  on public.atenciones for all
  to authenticated
  using (
    company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  )
  with check (
    company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

drop policy if exists "Usuarios leen solo su empresa" on public.companies;
create policy "Usuarios leen solo su empresa"
  on public.companies for select
  to authenticated
  using (
    id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

drop policy if exists "Usuarios actualizan solo su empresa" on public.companies;
create policy "Usuarios actualizan solo su empresa"
  on public.companies for update
  to authenticated
  using (
    id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  )
  with check (
    id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

drop policy if exists "Aislamiento por company_id en responsables" on public.responsables;
create policy "Aislamiento por company_id en responsables"
  on public.responsables for all
  to authenticated
  using (
    company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  )
  with check (
    company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

drop policy if exists "Aislamiento por company_id en plant_contacts" on public.company_plant_contacts;
create policy "Aislamiento por company_id en plant_contacts"
  on public.company_plant_contacts for all
  to authenticated
  using (
    company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  )
  with check (
    company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

drop policy if exists "Aislamiento por company_id en alert_logs" on public.alert_logs;
create policy "Aislamiento por company_id en alert_logs"
  on public.alert_logs for select
  to authenticated
  using (
    company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );
