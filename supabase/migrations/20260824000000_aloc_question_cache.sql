-- Server-side source tracking for ALOC-backed question caching.
-- The mobile app never receives the ALOC API key.
alter table public.questions
  add column if not exists source text not null default 'supabase',
  add column if not exists source_question_id text;

create unique index if not exists questions_source_question_id_key
  on public.questions(source, source_question_id)
  where source_question_id is not null;

create index if not exists questions_source_subject_exam_idx
  on public.questions(source, subject_id, exam_type);
