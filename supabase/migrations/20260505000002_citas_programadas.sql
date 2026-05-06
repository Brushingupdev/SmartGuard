-- ============================================================================
-- SmartGuard: Citas Programadas (Pre-registro)
-- ============================================================================
-- Agrega el concepto de "estado" al registro para soportar:
--   esperado  — cita programada, vehículo aún no llega (h_registro = null)
--   activo    — vehículo llegó, registro abierto (h_registro not null)
--   atendido  — atención completada (h_atencion not null)
--
-- El estado se setea automáticamente via trigger según h_registro / h_atencion.
-- ============================================================================

-- 1. Agregar columna estado
alter table public.atenciones
  add column if not exists estado text not null default 'activo'
  check (estado in ('esperado', 'activo', 'atendido'));

-- Migrar registros que ya tienen h_atencion → 'atendido'
update public.atenciones
  set estado = 'atendido'
  where h_atencion is not null and estado = 'activo';

-- 2. Trigger auto: estado se deriva de h_registro / h_atencion
--    Se ejecuta antes de INSERT y UPDATE para mantener estado sincronizado.
create or replace function public.tg_set_atencion_estado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.h_atencion is not null then
    new.estado := 'atendido';
  elsif new.h_registro is not null then
    new.estado := 'activo';
  else
    new.estado := 'esperado';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_atencion_estado on public.atenciones;
create trigger trg_set_atencion_estado
  before insert or update on public.atenciones
  for each row
  execute function public.tg_set_atencion_estado();

-- 3. Índice para consultas rápidas de citas del día por empresa + planta
create index if not exists idx_atenciones_estado_fecha_planta
  on public.atenciones(company_id, estado, fecha, planta)
  where estado in ('esperado', 'activo');
