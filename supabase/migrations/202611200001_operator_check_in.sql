begin;

do $preflight$
declare
  missing_columns text;
begin
  select string_agg(format('%I.%I (%s)', expected.table_name, expected.column_name, expected.column_type), ', ')
  into missing_columns
  from (values
    ('employees', 'id', 'uuid'),
    ('employees', 'employee_code', 'character varying'),
    ('employees', 'full_name', 'character varying'),
    ('employees', 'hub_unit', 'character varying'),
    ('employees', 'level', 'integer'),
    ('employees', 'points_balance', 'integer'),
    ('daily_moods', 'id', 'uuid'),
    ('daily_moods', 'employee_id', 'uuid'),
    ('daily_moods', 'hub_unit', 'character varying'),
    ('daily_moods', 'mood', 'character varying'),
    ('daily_moods', 'primary_reason', 'character varying'),
    ('daily_moods', 'checkin_date', 'date'),
    ('daily_moods', 'created_at', 'timestamp with time zone'),
    ('point_transactions', 'id', 'uuid'),
    ('point_transactions', 'employee_id', 'uuid'),
    ('point_transactions', 'amount', 'integer'),
    ('point_transactions', 'transaction_type', 'character varying'),
    ('point_transactions', 'description', 'character varying'),
    ('point_transactions', 'created_at', 'timestamp with time zone')
  ) as expected(table_name, column_name, column_type)
  where not exists (
    select 1
    from information_schema.columns as col
    where col.table_schema = 'public'
      and col.table_name = expected.table_name
      and col.column_name = expected.column_name
      and col.data_type = expected.column_type
  );

  if missing_columns is not null then
    raise exception 'O esquema existente não atende ao contrato do check-in. Colunas esperadas: %', missing_columns;
  end if;
end;
$preflight$;

alter table public.employees
  add column auth_user_id uuid references auth.users(id) on delete set null;

create unique index pixel_employees_auth_user_uidx
  on public.employees (auth_user_id) where auth_user_id is not null;

grant usage on schema public to service_role;
grant select (id, employee_code, full_name, auth_user_id, hub_unit, level, points_balance)
  on public.employees to service_role;
grant update (points_balance) on public.employees to service_role;
grant select (id, employee_id, checkin_date),
  insert (id, employee_id, hub_unit, mood, primary_reason, checkin_date, created_at)
  on public.daily_moods to service_role;
grant select (id, employee_id, amount, description, created_at),
  insert (id, employee_id, amount, transaction_type, description, created_at)
  on public.point_transactions to service_role;

create function public.record_operator_check_in(
  p_employee_id uuid,
  p_mood text,
  p_reason text
) returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  occurred_at timestamptz := statement_timestamp();
  local_day date := (occurred_at at time zone 'America/Recife')::date;
  award constant integer := 50;
  employee_hub_unit text;
  stored_mood text;
  stored_reason text;
  inserted_id uuid;
begin
  if p_mood is null or p_mood not in ('radiant', 'motivated', 'normal', 'exhausted')
      or p_reason is null or p_reason not in ('goals', 'team', 'fatigue', 'workload', 'other') then
    raise exception 'Humor ou motivo inválido.' using errcode = '22023';
  end if;

  stored_mood := case p_mood
    when 'radiant' then 'radiante'
    when 'motivated' then 'motivado'
    when 'normal' then 'neutro'
    when 'exhausted' then 'esgotado'
  end;

  stored_reason := case p_reason
    when 'goals' then 'Metas'
    when 'team' then 'Clima na equipe'
    when 'fatigue' then 'Cansaço físico'
    when 'workload' then 'Volume de trabalho'
    when 'other' then 'Outro'
  end;

  select hub_unit into employee_hub_unit
  from public.employees
  where id = p_employee_id
  for update;

  if not found then
    raise exception 'Operador não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.daily_moods (id, employee_id, hub_unit, mood, primary_reason, checkin_date, created_at)
  values (gen_random_uuid(), p_employee_id, employee_hub_unit, stored_mood, stored_reason, local_day, occurred_at)
  on conflict on constraint unique_daily_checkin do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return 0;
  end if;

  update public.employees
  set points_balance = coalesce(points_balance, 0) + award
  where id = p_employee_id;

  insert into public.point_transactions (id, employee_id, amount, transaction_type, description, created_at)
  values (gen_random_uuid(), p_employee_id, award, 'DAILY_LOGIN', 'Check-in diário', occurred_at);

  return award;
end;
$function$;

revoke all on function public.record_operator_check_in(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_operator_check_in(uuid, text, text) to service_role;

notify pgrst, 'reload schema';

commit;
