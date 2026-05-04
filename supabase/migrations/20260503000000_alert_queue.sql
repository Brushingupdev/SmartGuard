-- ============================================================================
-- SmartGuard: Alert Queue
-- ============================================================================
-- Objetivo: Desacoplar el envío de alertas del server action principal.
-- Las alertas se insertan aquí y se procesan async por una Edge Function.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de cola de alertas
-- ----------------------------------------------------------------------------
create table if not exists public.alert_queue (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  atencion_id  integer,
  razon_social text not null,
  empresa      text not null,
  planta       text not null,
  h_registro   text not null,
  espera_min   integer not null,
  status       text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts     integer not null default 0,
  max_attempts integer not null default 3,
  last_error   text,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);

-- RLS
alter table public.alert_queue enable row level security;

create policy "Service role gestiona alert_queue"
  on public.alert_queue for all
  to service_role
  using (true)
  with check (true);

-- Índices para procesamiento eficiente
create index if not exists idx_alert_queue_status_created
  on public.alert_queue(status, created_at)
  where status = 'pending';

create index if not exists idx_alert_queue_company
  on public.alert_queue(company_id);

-- ----------------------------------------------------------------------------
-- 2. Función para limpiar alertas antiguas (> 30 días)
-- ----------------------------------------------------------------------------
create or replace function public.cleanup_old_alert_queue()
returns void
language sql
security definer
as $$
  delete from public.alert_queue
  where created_at < now() - interval '30 days'
    and status in ('sent', 'failed');
$$;
