create or replace function public.record_study_streak(p_user_id uuid, p_activity_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.streaks%rowtype;
  next_count integer;
  did_increase boolean := false;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not allowed to update this streak';
  end if;

  select * into existing
  from public.streaks
  where user_id = p_user_id
  order by last_activity_date desc nulls last, id desc
  limit 1
  for update;

  if not found then
    insert into public.streaks(user_id, current_count, longest_count, last_activity_date)
    values (p_user_id, 1, 1, p_activity_date);
    return jsonb_build_object('current_count', 1, 'increased', true);
  end if;

  if existing.last_activity_date = p_activity_date then
    return jsonb_build_object('current_count', coalesce(existing.current_count, 0), 'increased', false);
  end if;

  next_count := case
    when existing.last_activity_date = p_activity_date - 1 then coalesce(existing.current_count, 0) + 1
    else 1
  end;
  did_increase := true;

  update public.streaks
  set current_count = next_count,
      longest_count = greatest(next_count, coalesce(existing.longest_count, 0)),
      last_activity_date = p_activity_date
  where id = existing.id;

  return jsonb_build_object('current_count', next_count, 'increased', did_increase);
end;
$$;

create or replace function public.get_current_streak(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare result integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not allowed to read this streak';
  end if;
  select coalesce(current_count, 0) into result
  from public.streaks
  where user_id = p_user_id
  order by last_activity_date desc nulls last, id desc
  limit 1;
  return coalesce(result, 0);
end;
$$;

revoke all on function public.record_study_streak(uuid, date) from public;
grant execute on function public.record_study_streak(uuid, date) to authenticated;
revoke all on function public.get_current_streak(uuid) from public;
grant execute on function public.get_current_streak(uuid) to authenticated;
