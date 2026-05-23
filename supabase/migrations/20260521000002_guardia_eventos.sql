-- ============================================================================
-- SmartGuard: guardia_eventos
-- ============================================================================
-- Bitácora operativa creada por guardias/supervisores, con soporte opcional
-- para evidencia fotográfica y seguimiento de lectura.
-- ============================================================================

create table if not exists public.guardia_eventos (
  id          bigserial primary key,
  company_id  uuid not null references public.companies(id) on delete cascade,
  planta      text not null,
  agente      text not null,
  tipo        text not null check (tipo in ('incidente', 'emergencia', 'novedad')),
  descripcion text not null,
  foto_url    text,
  urgente     boolean not null default false,
  leido       boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_guardia_eventos_company_created
  on public.guardia_eventos(company_id, created_at desc);

create index if not exists idx_guardia_eventos_company_planta_created
  on public.guardia_eventos(company_id, planta, created_at desc);

alter table public.guardia_eventos enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'guardia_eventos'
      and policyname = 'Aislamiento por company_id en guardia_eventos'
  ) then
    create policy "Aislamiento por company_id en guardia_eventos"
      on public.guardia_eventos
      for select
      to authenticated
      using (
        company_id = (
          select up.company_id
          from public.user_profiles up
          where up.id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'guardia_eventos'
      and policyname = 'Usuarios crean eventos en su empresa'
  ) then
    create policy "Usuarios crean eventos en su empresa"
      on public.guardia_eventos
      for insert
      to authenticated
      with check (
        company_id = (
          select up.company_id
          from public.user_profiles up
          where up.id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'guardia_eventos'
      and policyname = 'Usuarios actualizan eventos de su empresa'
  ) then
    create policy "Usuarios actualizan eventos de su empresa"
      on public.guardia_eventos
      for update
      to authenticated
      using (
        company_id = (
          select up.company_id
          from public.user_profiles up
          where up.id = auth.uid()
        )
      )
      with check (
        company_id = (
          select up.company_id
          from public.user_profiles up
          where up.id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'guardia_eventos'
      and policyname = 'Service role bypass en guardia_eventos'
  ) then
    create policy "Service role bypass en guardia_eventos"
      on public.guardia_eventos
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;
