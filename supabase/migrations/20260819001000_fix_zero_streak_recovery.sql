create or replace function public.record_study_streak(p_user_id uuid, p_activity_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.streaks%rowtype;
  next_count integer;
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
    insert into public.streaks(user_id, current_count, longest_count, last_activity_date, last_activity_at)
    values (p_user_id, 1, 1, p_activity_date, now());
    return jsonb_build_object('current_count', 1, 'increased', true);
  end if;

  -- A previous reset can leave today's row at zero. A completed session must
  -- revive it to one instead of treating the zero as an already-completed day.
  if existing.last_activity_date = p_activity_date and coalesce(existing.current_count, 0) > 0 then
    return jsonb_build_object('current_count', existing.current_count, 'increased', false);
  end if;

  next_count := case
    when existing.last_activity_date = p_activity_date then 1
    when existing.last_activity_date = p_activity_date - 1 then coalesce(existing.current_count, 0) + 1
    else 1
  end;

  update public.streaks
  set current_count = next_count,
      longest_count = greatest(next_count, coalesce(existing.longest_count, 0)),
      last_activity_date = p_activity_date,
      last_activity_at = now()
  where id = existing.id;

  return jsonb_build_object('current_count', next_count, 'increased', true);
end;
$$;

notify pgrst, 'reload schema';
