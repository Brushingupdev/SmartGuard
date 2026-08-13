-- Trazabilidad de cargas masivas y vínculo opcional con las atenciones creadas.
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default 'Usuario',
  source text not null check (source in ('excel', 'image')),
  file_name text,
  fingerprint text not null,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  total_rows integer not null default 0 check (total_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  duplicate_rows integer not null default 0 check (duplicate_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  date_from date,
  date_to date,
  plants text[] not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint import_batches_company_fingerprint_key unique (company_id, fingerprint)
);

alter table public.import_batches enable row level security;

revoke all on table public.import_batches from anon;
revoke insert, update, delete on table public.import_batches from authenticated;
grant select on table public.import_batches to authenticated;

create policy "Company members can view import batches"
on public.import_batches
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles profile
    where profile.id = (select auth.uid())
      and profile.company_id = import_batches.company_id
  )
);

create index import_batches_company_created_at_idx
  on public.import_batches (company_id, created_at desc);

alter table public.atenciones
  add column if not exists import_batch_id uuid
  references public.import_batches(id) on delete set null;

create index if not exists atenciones_import_batch_id_idx
  on public.atenciones (import_batch_id)
  where import_batch_id is not null;
