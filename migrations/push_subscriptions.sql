-- ─── push_subscriptions ───────────────────────────────────────────────────────
-- Almacena suscripciones de push web para supervisores y guardias.
-- Aplicar en: Supabase SQL Editor → New query → Run

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          BIGSERIAL PRIMARY KEY,
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_role   TEXT        NOT NULL DEFAULT 'supervisor',
  plant       TEXT,                                        -- NULL = recibe de todas las plantas
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para lookups rápidos por empresa+planta
CREATE INDEX IF NOT EXISTS idx_push_subs_company_plant
  ON public.push_subscriptions (company_id, plant);

-- RLS: solo admin puede ver; el backend usa service_role key (admin client)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: denegar acceso a usuarios anónimos y de cliente (el backend usa admin client)
CREATE POLICY "No public access"
  ON public.push_subscriptions
  FOR ALL
  USING (false);

-- Notas:
--   • El endpoint /api/push/subscribe usa createAdminClient() que bypasea RLS.
--   • Las suscripciones se crean/eliminan solo desde el backend autenticado.
