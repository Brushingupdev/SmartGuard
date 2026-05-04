-- error_logs: persiste errores de server actions para auditoría
-- Solo accesible vía service_role (logError usa createAdminClient)

create table if not exists public.error_logs (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  context     text        not null,
  message     text        not null,
  user_id     uuid        references auth.users(id) on delete set null,
  company_id  uuid,
  extra       jsonb       not null default '{}'
);

-- Índices para consultas de monitoreo
create index if not exists error_logs_created_at_idx  on public.error_logs (created_at desc);
create index if not exists error_logs_context_idx     on public.error_logs (context);
create index if not exists error_logs_company_id_idx  on public.error_logs (company_id);

-- RLS activado — sin políticas para usuarios: solo service_role accede
alter table public.error_logs enable row level security;

-- Limpiar logs más antiguos de 90 días (ejecutar como job periódico o pg_cron)
-- delete from public.error_logs where created_at < now() - interval '90 days';
