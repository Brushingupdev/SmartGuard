-- ============================================================================
-- SmartGuard: Claim transaccional de alert_queue
-- ============================================================================
-- Objetivo: evitar procesamiento duplicado cuando varias ejecuciones de la
-- Edge Function intentan tomar alertas pendientes al mismo tiempo.
-- ============================================================================

alter table public.alert_queue
  add column if not exists processing_started_at timestamptz;

create or replace function public.claim_alert_queue_batch(p_batch_size integer default 5)
returns setof public.alert_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select aq.id
    from public.alert_queue aq
    where (
        aq.status = 'pending'
        or (
          aq.status = 'processing'
          and aq.processing_started_at is not null
          and aq.processing_started_at < now() - interval '10 minutes'
        )
      )
      and aq.attempts < aq.max_attempts
    order by aq.created_at asc
    for update skip locked
    limit greatest(coalesce(p_batch_size, 1), 1)
  )
  update public.alert_queue aq
  set status = 'processing',
      processing_started_at = now(),
      last_error = null
  from claimed
  where aq.id = claimed.id
  returning aq.*;
end;
$$;

revoke all on function public.claim_alert_queue_batch(integer) from public;
grant execute on function public.claim_alert_queue_batch(integer) to service_role;
