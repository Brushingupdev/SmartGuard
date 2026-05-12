-- ============================================================================
-- SmartGuard: Separar espera en planta de demora sobre cita
-- ============================================================================
-- espera_min       -> tiempo real desde llegada (h_registro) hasta atencion
-- demora_cita_min  -> retraso respecto a hora_cita (nunca negativo)
-- ============================================================================

alter table public.atenciones
  add column if not exists demora_cita_min integer;

comment on column public.atenciones.demora_cita_min is
  'Minutos de retraso respecto a la hora de cita. Nunca negativo.';

-- Backfill historico para registros ya atendidos con cita.
update public.atenciones
set demora_cita_min =
  case
    when hora_cita is null or h_atencion is null then null
    else greatest(
      0,
      (
        (split_part(h_atencion::text, ':', 1)::int * 60 + split_part(h_atencion::text, ':', 2)::int) -
        (split_part(hora_cita::text, ':', 1)::int * 60 + split_part(hora_cita::text, ':', 2)::int)
      )
    )
  end
where hora_cita is not null;

create index if not exists idx_atenciones_demora_cita_min
  on public.atenciones(demora_cita_min)
  where demora_cita_min is not null;
