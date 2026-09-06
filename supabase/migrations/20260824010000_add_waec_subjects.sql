-- Create the WAEC subject catalogue from the supported JAMB catalogue.
-- Questions remain isolated by both subject_id and exam_type.
insert into public.subjects (name, exam_type)
select name, 'waec'
from public.subjects
where exam_type = 'jamb'
on conflict do nothing;
