-- ============================================================================
-- SmartGuard: payments
-- ============================================================================
-- Registro administrativo de pagos y activaciones de plan por empresa.
-- ============================================================================

create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  amount        numeric(12,2) not null check (amount > 0),
  currency      text not null default 'PEN',
  period_months integer not null check (period_months >= 0),
  plan          text not null check (plan in ('trial', 'active', 'suspended')),
  notes         text,
  registered_by text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_payments_company_created
  on public.payments(company_id, created_at desc);

alter table public.payments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'Aislamiento por company_id en payments'
  ) then
    create policy "Aislamiento por company_id en payments"
      on public.payments
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
      and tablename = 'payments'
      and policyname = 'Service role bypass en payments'
  ) then
    create policy "Service role bypass en payments"
      on public.payments
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;
