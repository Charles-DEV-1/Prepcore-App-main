create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  session_id uuid null,
  reason text not null check (reason in ('Wrong answer', 'Confusing question', 'Typo / error', 'Bad explanation', 'Other')),
  details text null,
  created_at timestamptz not null default now()
);

create index if not exists question_reports_user_id_idx on public.question_reports(user_id);
create index if not exists question_reports_question_id_idx on public.question_reports(question_id);

alter table public.question_reports enable row level security;

drop policy if exists "Users can submit their own question reports" on public.question_reports;
create policy "Users can submit their own question reports"
  on public.question_reports for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their own question reports" on public.question_reports;
create policy "Users can view their own question reports"
  on public.question_reports for select to authenticated
  using (auth.uid() = user_id);

grant select, insert on public.question_reports to authenticated;
