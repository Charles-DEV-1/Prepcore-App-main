-- Allow the signed-in learner to maintain only their own streak row.
-- Safe to run when policies already exist because they are recreated by name.
alter table if exists public.streaks enable row level security;

drop policy if exists "Users can read their own streak" on public.streaks;
create policy "Users can read their own streak"
  on public.streaks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own streak" on public.streaks;
create policy "Users can create their own streak"
  on public.streaks for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own streak" on public.streaks;
create policy "Users can update their own streak"
  on public.streaks for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.streaks to authenticated;

notify pgrst, 'reload schema';
