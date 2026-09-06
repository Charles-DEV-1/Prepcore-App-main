create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  study_reminders boolean not null default false,
  streak_alerts boolean not null default false,
  new_questions boolean not null default false,
  weekly_report boolean not null default false,
  study_reminder_hour smallint not null default 19 check (study_reminder_hour between 0 and 23),
  study_reminder_minute smallint not null default 0 check (study_reminder_minute between 0 and 59),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  event_key text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, category, event_key)
);

alter table public.notification_preferences enable row level security;
alter table public.notification_devices enable row level security;
alter table public.notification_delivery_log enable row level security;

drop policy if exists "Users can read their notification preferences" on public.notification_preferences;
create policy "Users can read their notification preferences" on public.notification_preferences for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their notification preferences" on public.notification_preferences;
create policy "Users can insert their notification preferences" on public.notification_preferences for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their notification preferences" on public.notification_preferences;
create policy "Users can update their notification preferences" on public.notification_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their notification devices" on public.notification_devices;
create policy "Users can manage their notification devices" on public.notification_devices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.claim_notification_device(p_expo_push_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.notification_devices where expo_push_token = p_expo_push_token;
  insert into public.notification_devices(user_id, expo_push_token, platform, last_seen_at)
  values (auth.uid(), p_expo_push_token, p_platform, now());
end;
$$;

grant execute on function public.claim_notification_device(text, text) to authenticated;

revoke all on public.notification_delivery_log from authenticated;

create table if not exists public.notification_question_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  question_count integer not null default 0,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.notification_question_events enable row level security;
revoke all on public.notification_question_events from authenticated;

create or replace function public.record_question_notification_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_event_key text := to_char(now(), 'YYYY-MM-DD-HH24-MI');
begin
  insert into public.notification_question_events(event_key, question_count)
  values (current_event_key, 1)
  on conflict (event_key) do update
    set question_count = public.notification_question_events.question_count + 1;
  return new;
end;
$$;

drop trigger if exists questions_notification_event on public.questions;
create trigger questions_notification_event
after insert on public.questions
for each row execute function public.record_question_notification_event();
