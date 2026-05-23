-- ============================================================================
-- SmartGuard: Extender alert_queue con canal y payload flexible
-- ============================================================================
-- Permite manejar alertas de distinta naturaleza dentro de la misma cola,
-- incluyendo alertas de demora operativa y alertas agregadas como
-- chronic_provider.
-- ============================================================================

alter table public.alert_queue
  add column if not exists channel text not null default 'delay_alert';

alter table public.alert_queue
  add column if not exists payload jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'alert_queue_channel_check'
  ) then
    alter table public.alert_queue
      add constraint alert_queue_channel_check
      check (channel in ('delay_alert', 'chronic_provider'));
  end if;
end
$$;

update public.alert_queue
set channel = 'delay_alert'
where channel is null or channel = '';

create index if not exists idx_alert_queue_channel_status_created
  on public.alert_queue(channel, status, created_at);

create index if not exists idx_alert_queue_payload_gin
  on public.alert_queue
  using gin (payload)
  where payload is not null;
