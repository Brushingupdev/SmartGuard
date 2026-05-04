-- ============================================================================
-- SmartGuard: Feature Flags
-- ============================================================================
-- Objetivo: Permitir activar/desactivar funciones sin deploy.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de feature flags
-- ----------------------------------------------------------------------------
create table if not exists public.feature_flags (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  description text,
  enabled     boolean not null default false,
  company_id  uuid references public.companies(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS
alter table public.feature_flags enable row level security;

create policy "Usuarios leen feature flags de su empresa"
  on public.feature_flags for select
  to authenticated
  using (
    company_id is null  -- flags globales
    or company_id = (select up.company_id from public.user_profiles up where up.id = auth.uid())
  );

create policy "Service role gestiona feature flags"
  on public.feature_flags for all
  to service_role
  using (true)
  with check (true);

-- Índices
create index if not exists idx_feature_flags_key on public.feature_flags(key);
create index if not exists idx_feature_flags_company on public.feature_flags(company_id) where company_id is not null;

-- ----------------------------------------------------------------------------
-- 2. Flags por defecto
-- ----------------------------------------------------------------------------
insert into public.feature_flags (key, description, enabled) values
  ('whatsapp_alerts', 'Enviar alertas por WhatsApp', false),
  ('pdf_export', 'Exportar reportes en PDF', true),
  ('kiosk_mode', 'Modo garita/pantalla completa', true),
  ('advanced_analytics', 'Análisis avanzado con heatmap', true),
  ('auto_close_abandoned', 'Cerrar automáticamente abandonados (+4h)', true)
on conflict (key) do nothing;
