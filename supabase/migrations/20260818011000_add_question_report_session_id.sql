alter table if exists public.question_reports
  add column if not exists session_id uuid null;

notify pgrst, 'reload schema';
