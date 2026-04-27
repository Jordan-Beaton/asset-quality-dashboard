alter table public.ncrs
add column if not exists root_cause_category text,
add column if not exists root_cause_description text;

alter table public.capas
add column if not exists correction_description text,
add column if not exists corrective_action_description text,
add column if not exists effectiveness_status text,
add column if not exists effectiveness_review_date date,
add column if not exists effectiveness_reviewer text,
add column if not exists effectiveness_comments text,
add column if not exists effectiveness_due_date date;
