-- ============================================================================
-- SmartGuard Dashboard SQL Functions
-- ============================================================================
-- Objetivo: Mover agregaciones pesadas de JavaScript a PostgreSQL
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. KPIs del dashboard (reemplaza filtrado JS en getDashboardStats)
-- ----------------------------------------------------------------------------
create or replace function public.get_dashboard_kpis(
  p_company_id  uuid,
  p_date_from   date,
  p_date_to     date,
  p_planta      text default 'Todos'
)
returns table (
  ok      int,
  warn    int,
  deny    int,
  pending int,
  total   int
)
language sql
security invoker
as $$
  select
    count(*) filter (where espera_min is not null and espera_min < 30)::int as ok,
    count(*) filter (where espera_min is not null and espera_min >= 30 and espera_min < 45)::int as warn,
    count(*) filter (where espera_min is not null and espera_min >= 45)::int as deny,
    count(*) filter (where espera_min is null)::int as pending,
    count(*)::int as total
  from atenciones
  where company_id = p_company_id
    and fecha between p_date_from and p_date_to
    and (p_planta = 'Todos' or planta = p_planta);
$$;


-- ----------------------------------------------------------------------------
-- 2. Flujo de acceso agrupado (reemplaza groupingMap JS)
-- ----------------------------------------------------------------------------
create or replace function public.get_dashboard_flow(
  p_company_id  uuid,
  p_date_from   date,
  p_date_to     date,
  p_planta      text default 'Todos',
  p_group_by    text default 'hour'
)
returns table (
  h    text,
  ok   int,
  warn int,
  deny int
)
language sql
security invoker
as $$
  select
    case p_group_by
      when 'hour'  then substring(h_registro::text from 1 for 2)
      when 'day'   then substring(fecha::text from 9 for 2)
      when 'month' then substring(fecha::text from 6 for 2)
      else '00'
    end as h,
    count(*) filter (where espera_min is not null and espera_min < 30)::int as ok,
    count(*) filter (where espera_min is not null and espera_min >= 30 and espera_min < 45)::int as warn,
    count(*) filter (where espera_min is not null and espera_min >= 45)::int as deny
  from atenciones
  where company_id = p_company_id
    and fecha between p_date_from and p_date_to
    and (p_planta = 'Todos' or planta = p_planta)
  group by 1
  order by 1;
$$;


-- ----------------------------------------------------------------------------
-- 3. Personal activo agrupado (reemplaza JS grouping en getActivePersonnel)
-- ----------------------------------------------------------------------------
create or replace function public.get_active_personnel(
  p_company_id uuid,
  p_fecha      date
)
returns table (
  initials  text,
  name      text,
  turn      text,
  status    text
)
language sql
security invoker
as $$
  select
    left(string_agg(substring(word from 1 for 1), '' order by word), 2) as initials,
    agente as name,
    format('%s registro%s · %s', count, case when count = 1 then '' else 's' end, planta) as turn,
    'active' as status
  from (
    select
      agente,
      planta,
      count(*) as count,
      max(h_registro) as last_h
    from atenciones
    where company_id = p_company_id
      and fecha = p_fecha
      and agente is not null
    group by agente, planta
    order by count(*) desc
    limit 4
  ) sub,
  lateral regexp_split_to_table(sub.agente, '\s+') as word
  group by agente, count, planta, last_h
  order by count desc, last_h desc;
$$;


-- ----------------------------------------------------------------------------
-- 4. Desglose por planta (reemplaza JS breakdown)
-- ----------------------------------------------------------------------------
create or replace function public.get_dashboard_breakdown(
  p_company_id  uuid,
  p_date_from   date,
  p_date_to     date
)
returns table (
  planta text,
  total  int,
  ok     int
)
language sql
security invoker
as $$
  select
    coalesce(planta, 'Sin planta') as planta,
    count(*)::int as total,
    count(*) filter (where espera_min is not null and espera_min < 30)::int as ok
  from atenciones
  where company_id = p_company_id
    and fecha between p_date_from and p_date_to
  group by planta
  order by total desc;
$$;


-- ----------------------------------------------------------------------------
-- 5. Eventos recientes (reemplaza JS slice + mapeo)
-- ----------------------------------------------------------------------------
create or replace function public.get_dashboard_events(
  p_company_id  uuid,
  p_date_from   date,
  p_date_to     date,
  p_limit       int default 6
)
returns table (
  plate      text,
  status     text,
  label      text,
  info       text,
  gate       text,
  "time"     text,
  espera_min int
)
language sql
security invoker
as $$
  select
    coalesce(razon_social, 'N/A') as plate,
    case
      when espera_min is null then 'pending'
      when espera_min >= 45  then 'deny'
      when espera_min >= 30  then 'warn'
      else 'ok'
    end as status,
    case
      when espera_min is null then 'En proceso'
      when espera_min >= 45  then 'Con demora'
      when espera_min >= 30  then 'Revisión'
      else 'Autorizado'
    end as label,
    coalesce(empresa, 'Sin empresa') as info,
    coalesce(planta, '') as gate,
    coalesce(substring(h_registro::text from 1 for 5), '--:--') as "time",
    coalesce(espera_min, 0)::int as espera_min
  from atenciones
  where company_id = p_company_id
    and fecha between p_date_from and p_date_to
  order by h_registro desc
  limit p_limit;
$$;


-- ----------------------------------------------------------------------------
-- 6. Reporte detallado (resumen) — reemplaza JS en getReporteData
-- ----------------------------------------------------------------------------
create or replace function public.get_reporte_stats(
  p_company_id  uuid,
  p_date_from   date,
  p_date_to     date,
  p_planta      text default 'Todos'
)
returns table (
  total        int,
  ok           int,
  warn         int,
  alto         int,
  critico      int,
  pending      int,
  avg_espera   int,
  max_espera   int,
  pct_on_time  int
)
language sql
security invoker
as $$
  select
    count(*)::int as total,
    count(*) filter (where espera_min is not null and espera_min < 30)::int as ok,
    count(*) filter (where espera_min is not null and espera_min >= 30 and espera_min < 45)::int as warn,
    count(*) filter (where espera_min is not null and espera_min >= 45 and espera_min < 90)::int as alto,
    count(*) filter (where espera_min is not null and espera_min >= 90)::int as critico,
    count(*) filter (where espera_min is null)::int as pending,
    round(avg(espera_min) filter (where espera_min is not null))::int as avg_espera,
    coalesce(max(espera_min), 0)::int as max_espera,
    case
      when count(*) filter (where espera_min is not null) > 0
      then round(
        100.0 * count(*) filter (where espera_min is not null and espera_min < 30)
        / count(*) filter (where espera_min is not null)
      )::int
      else null::int
    end as pct_on_time
  from atenciones
  where company_id = p_company_id
    and fecha between p_date_from and p_date_to
    and (p_planta = 'Todos' or planta = p_planta);
$$;


-- ----------------------------------------------------------------------------
-- 7. Historial stats (reemplaza memory scan en getHistorialStats)
-- ----------------------------------------------------------------------------
create or replace function public.get_historial_stats(
  p_company_id uuid
)
returns table (
  total  int,
  avg    int,
  max    int,
  plants int
)
language sql
security invoker
as $$
  select
    count(*)::int as total,
    round(avg(espera_min) filter (where espera_min is not null and espera_min >= 0))::int as avg,
    coalesce(max(espera_min), 0)::int as max,
    count(distinct planta)::int as plants
  from atenciones
  where company_id = p_company_id;
$$;

-- ----------------------------------------------------------------------------
-- 8. Índices para rendimiento del dashboard
-- ----------------------------------------------------------------------------
create index if not exists idx_atenciones_fecha_h_registro
  on atenciones(fecha, h_registro);

create index if not exists idx_atenciones_espera_min
  on atenciones(espera_min) where espera_min >= 30;

create index if not exists idx_atenciones_agente_fecha
  on atenciones(agente, fecha) where agente is not null;

create index if not exists idx_atenciones_company_fecha_planta
  on atenciones(company_id, fecha, planta);

create index if not exists idx_atenciones_company_fecha_espera
  on atenciones(company_id, fecha, espera_min) where espera_min >= 30;

-- ----------------------------------------------------------------------------
-- 9. Plantas configuradas (reemplaza distinct + limit 5000 en getUserPlants)
-- ----------------------------------------------------------------------------
create or replace function public.get_user_plants(
  p_company_id uuid
)
returns table (planta text)
language sql
security invoker
as $$
  select distinct planta
  from atenciones
  where company_id = p_company_id
    and planta is not null
  order by planta;
$$;
