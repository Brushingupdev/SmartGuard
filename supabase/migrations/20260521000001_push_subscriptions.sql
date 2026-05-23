-- ============================================================================
-- SmartGuard: push_subscriptions
-- ============================================================================
-- Versiona en Supabase CLI la tabla de suscripciones web push que antes solo
-- existía como SQL suelto fuera de supabase/migrations.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id         bigserial primary key,
  company_id uuid        not null references public.companies(id) on delete cascade,
  user_role  text        not null default 'supervisor',
  plant      text,
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subs_company_plant
  on public.push_subscriptions (company_id, plant);

alter table public.push_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'No public access'
  ) then
    create policy "No public access"
      on public.push_subscriptions
      for all
      using (false);
  end if;
end
$$;
