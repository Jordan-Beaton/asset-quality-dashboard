create table if not exists public.lessons_learned (
  id uuid primary key default gen_random_uuid(),
  lesson_number text not null unique,
  legacy_number integer,
  project_code text,
  project_name text not null,
  report_date date,
  incident_date date,
  vessel_office text,
  assets text,
  department text,
  originator text,
  line_manager text,
  stage_phase text,
  outcome_type text not null default 'Failure',
  status text not null default 'Open',
  criticality text not null default 'Medium',
  impact_rating text not null default 'Medium',
  subject text not null,
  issue_description text not null,
  root_cause text,
  action_taken text,
  lesson_learned text not null,
  recommended_action text,
  action_owner text,
  target_date date,
  completion_date date,
  keywords text[] not null default '{}',
  repeat_group text,
  source_file text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ims_reference_projects
add column if not exists code text;

create unique index if not exists ims_reference_projects_code_unique_idx
  on public.ims_reference_projects (lower(code))
  where code is not null and btrim(code) <> '';

create table if not exists public.lessons_learned_links (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons_learned(id) on delete cascade,
  related_lesson_id uuid not null references public.lessons_learned(id) on delete cascade,
  relationship text not null default 'Repeated theme',
  notes text,
  created_at timestamptz not null default now(),
  constraint lessons_learned_links_distinct check (lesson_id <> related_lesson_id),
  constraint lessons_learned_links_unique unique (lesson_id, related_lesson_id)
);

create index if not exists lessons_learned_project_idx on public.lessons_learned (project_code, project_name);
create index if not exists lessons_learned_department_idx on public.lessons_learned (department);
create index if not exists lessons_learned_status_idx on public.lessons_learned (status);
create index if not exists lessons_learned_report_date_idx on public.lessons_learned (report_date desc);
create index if not exists lessons_learned_repeat_group_idx on public.lessons_learned (repeat_group);
create index if not exists lessons_learned_keywords_idx on public.lessons_learned using gin (keywords);
create index if not exists lessons_learned_search_idx on public.lessons_learned using gin (
  to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(issue_description, '') || ' ' || coalesce(root_cause, '') || ' ' || coalesce(lesson_learned, '') || ' ' || coalesce(recommended_action, ''))
);

alter table public.lessons_learned enable row level security;
alter table public.lessons_learned_links enable row level security;

drop policy if exists lessons_learned_select_authenticated on public.lessons_learned;
create policy lessons_learned_select_authenticated on public.lessons_learned for select to authenticated using (true);
drop policy if exists lessons_learned_insert_authenticated on public.lessons_learned;
create policy lessons_learned_insert_authenticated on public.lessons_learned for insert to authenticated with check (true);
drop policy if exists lessons_learned_update_authenticated on public.lessons_learned;
create policy lessons_learned_update_authenticated on public.lessons_learned for update to authenticated using (true) with check (true);
drop policy if exists lessons_learned_delete_authenticated on public.lessons_learned;
create policy lessons_learned_delete_authenticated on public.lessons_learned for delete to authenticated using (true);

drop policy if exists lessons_learned_links_select_authenticated on public.lessons_learned_links;
create policy lessons_learned_links_select_authenticated on public.lessons_learned_links for select to authenticated using (true);
drop policy if exists lessons_learned_links_insert_authenticated on public.lessons_learned_links;
create policy lessons_learned_links_insert_authenticated on public.lessons_learned_links for insert to authenticated with check (true);
drop policy if exists lessons_learned_links_delete_authenticated on public.lessons_learned_links;
create policy lessons_learned_links_delete_authenticated on public.lessons_learned_links for delete to authenticated using (true);

insert into storage.buckets (id, name, public)
values ('lessons-learned-evidence', 'lessons-learned-evidence', false)
on conflict (id) do nothing;

drop policy if exists lessons_evidence_select_authenticated on storage.objects;
create policy lessons_evidence_select_authenticated on storage.objects for select to authenticated using (bucket_id = 'lessons-learned-evidence');
drop policy if exists lessons_evidence_insert_authenticated on storage.objects;
create policy lessons_evidence_insert_authenticated on storage.objects for insert to authenticated with check (bucket_id = 'lessons-learned-evidence');
drop policy if exists lessons_evidence_delete_authenticated on storage.objects;
create policy lessons_evidence_delete_authenticated on storage.objects for delete to authenticated using (bucket_id = 'lessons-learned-evidence');

create or replace function public.set_lessons_learned_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lessons_learned_updated_at on public.lessons_learned;
create trigger lessons_learned_updated_at before update on public.lessons_learned
for each row execute function public.set_lessons_learned_updated_at();
