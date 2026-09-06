-- The mobile settings screen supports JAMB, WAEC, and both exams.
-- exam_goals is a text array, so each array member is normalized separately.

begin;

alter table public.users
  drop constraint if exists users_exam_goals_check;

with normalized_goals as (
  select
    id,
    array(
      select distinct lower(btrim(goal))
      from unnest(exam_goals) as goal
      where lower(btrim(goal)) in ('jamb', 'waec')
      order by 1
    ) as goals,
    cardinality(exam_goals) as original_count
  from public.users
  where exam_goals is not null
)
update public.users as users
set exam_goals = case
  when original_count between 1 and 2 and cardinality(goals) = original_count
    then goals
  else null
end
from normalized_goals
where users.id = normalized_goals.id;

alter table public.users
  add constraint users_exam_goals_check
  check (
    exam_goals is null
    or (
      cardinality(exam_goals) between 1 and 2
      and exam_goals <@ array['jamb', 'waec']::text[]
      and (
        cardinality(exam_goals) = 1
        or exam_goals @> array['jamb', 'waec']::text[]
      )
    )
  );

commit;
