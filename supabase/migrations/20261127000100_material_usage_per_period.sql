-- Apostilas: a contagem usada no limite do plano passa a reiniciar quando o
-- usuario migra para o Plus e a cada renovacao (novo periodo de assinatura).
-- Free continua contando todas as apostilas guardadas. Nenhuma apostila e apagada.

create or replace function public.material_usage_period_start(p_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path to 'public'
as $$
  select uc.period_start
  from public.usage_counters uc
  join public.user_plans up on up.user_id = uc.user_id
  where uc.user_id = p_user_id
    and up.plan = 'plus'
    and uc.period_type = 'subscription'
    and uc.period_start <= now()
    and (uc.period_end is null or uc.period_end > now())
  order by uc.period_start desc
  limit 1;
$$;

revoke all on function public.material_usage_period_start(uuid) from public;
grant execute on function public.material_usage_period_start(uuid) to service_role, authenticated;

create or replace function public.get_my_material_usage()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan text;
  v_limit integer;
  v_period_start timestamptz;
  v_used integer;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'reason', 'not_authenticated');
  end if;

  select up.plan into v_plan from public.user_plans up where up.user_id = v_user_id;
  select pl.material_limit into v_limit from public.plan_limits pl where pl.plan = v_plan;
  if v_plan is null or v_limit is null then
    return jsonb_build_object('success', false, 'reason', 'plan_not_found');
  end if;

  v_period_start := public.material_usage_period_start(v_user_id);
  select count(*) into v_used
  from public.materials m
  where m.user_id = v_user_id
    and (v_period_start is null or m.created_at >= v_period_start);

  return jsonb_build_object(
    'success', true,
    'plan', v_plan,
    'used', v_used,
    'limit', v_limit,
    'remaining', greatest(v_limit - v_used, 0)
  );
end;
$$;

revoke all on function public.get_my_material_usage() from public;
grant execute on function public.get_my_material_usage() to authenticated, service_role;

CREATE OR REPLACE FUNCTION "public"."create_material_with_limit"("p_user_id" "uuid", "p_title" "text", "p_file_path" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_plan text;
  v_limit integer;
  v_used integer;
  v_material public.materials%rowtype;
  v_unlimited boolean := false;
  v_period_start timestamptz;
begin

  perform pg_advisory_xact_lock(
    hashtext(p_user_id::text)
  );

  -- Verifica silenciosamente se esta conta possui acesso administrativo.
  select exists (
    select 1
    from public.admin_unlimited_access aua
    where aua.user_id = p_user_id
      and aua.unlimited = true
  )
  into v_unlimited;

  select up.plan
  into v_plan
  from public.user_plans up
  where up.user_id = p_user_id;

  if v_plan is null then
    return jsonb_build_object(
      'ok', false,
      'allowed', false,
      'reason', 'plan_not_found'
    );
  end if;

  select pl.material_limit
  into v_limit
  from public.plan_limits pl
  where pl.plan = v_plan;

  if v_limit is null then
    return jsonb_build_object(
      'ok', false,
      'allowed', false,
      'reason', 'limit_not_found',
      'plan', v_plan
    );
  end if;

  -- Plus: a contagem recomeca a cada periodo de assinatura (ativacao e
  -- renovacoes). Free: conta todas as apostilas guardadas.
  v_period_start := public.material_usage_period_start(p_user_id);

  select count(*)
  into v_used
  from public.materials m
  where m.user_id = p_user_id
    and (v_period_start is null or m.created_at >= v_period_start);

  -- Usuários normais continuam bloqueados exatamente como hoje.
  if not v_unlimited and v_used >= v_limit then
    return jsonb_build_object(
      'ok', false,
      'allowed', false,
      'reason', 'limit_reached',
      'plan', v_plan,
      'used', v_used,
      'limit', v_limit,
      'remaining', 0
    );
  end if;

  insert into public.materials (
    user_id,
    title,
    file_path,
    status
  )
  values (
    p_user_id,
    p_title,
    p_file_path,
    'pending'
  )
  returning *
  into v_material;

  return jsonb_build_object(
    'ok', true,
    'allowed', true,
    'plan', v_plan,
    'used', v_used + 1,
    'limit', v_limit,
    'remaining',
      greatest(
        v_limit - (v_used + 1),
        0
      ),
    'material',
      to_jsonb(v_material)
  );

end;
$$;

revoke all on function public.create_material_with_limit(uuid, text, text) from public;
grant all on function public.create_material_with_limit(uuid, text, text) to service_role;
