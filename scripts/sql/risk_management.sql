create table if not exists public.risks (
  id uuid primary key default gen_random_uuid(),
  risk_number text not null unique,
  title text not null,
  description text,
  category text,
  department text,
  project text,
  owner text,
  owner_person_id uuid null references public.people(id) on delete set null,
  likelihood integer not null default 1 check (likelihood between 1 and 5),
  consequence integer not null default 1 check (consequence between 1 and 5),
  initial_score integer not null default 1 check (initial_score between 1 and 25),
  initial_rating text not null default 'Low' check (initial_rating in ('Low', 'Medium', 'High', 'Critical')),
  existing_controls text,
  residual_likelihood integer not null default 1 check (residual_likelihood between 1 and 5),
  residual_consequence integer not null default 1 check (residual_consequence between 1 and 5),
  residual_score integer not null default 1 check (residual_score between 1 and 25),
  residual_rating text not null default 'Low' check (residual_rating in ('Low', 'Medium', 'High', 'Critical')),
  status text not null default 'Open' check (status in ('Open', 'Under Review', 'Treatment Required', 'Accepted', 'Closed', 'Archived')),
  review_date date,
  next_review_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.risks
add column if not exists owner_person_id uuid null references public.people(id) on delete set null;

alter table public.risks
add column if not exists project_phase text;

alter table public.risks
add column if not exists impacted_activities text;

alter table public.risks
add column if not exists milestones_impacted text;

alter table public.risks
add column if not exists response_strategy text;

alter table public.risks
add column if not exists target_response_date date;

alter table public.risks
add column if not exists response_status text;

alter table public.risks
add column if not exists procedure_number text;

alter table public.risks
add column if not exists quality_fit_for_purpose boolean not null default false;

alter table public.risks
add column if not exists operation boolean not null default false;

alter table public.risks
add column if not exists financial boolean not null default false;

alter table public.risks
add column if not exists schedule boolean not null default false;

alter table public.risks
add column if not exists estimated_financial_impact text;

alter table public.risks
add column if not exists date_closed date;

alter table public.risks
add column if not exists closed_by text;

alter table public.risks
add column if not exists comments text;

alter table public.risks
add column if not exists lesson_learned text;

alter table public.risks enable row level security;

drop policy if exists "risks_select_authenticated" on public.risks;
drop policy if exists "risks_insert_authenticated" on public.risks;
drop policy if exists "risks_update_authenticated" on public.risks;
drop policy if exists "risks_delete_authenticated" on public.risks;

create policy "risks_select_authenticated"
on public.risks
for select
to authenticated
using (true);

create policy "risks_insert_authenticated"
on public.risks
for insert
to authenticated
with check (true);

create policy "risks_update_authenticated"
on public.risks
for update
to authenticated
using (true)
with check (true);

create policy "risks_delete_authenticated"
on public.risks
for delete
to authenticated
using (true);

create index if not exists risks_risk_number_idx
on public.risks (risk_number);

create index if not exists risks_status_rating_idx
on public.risks (status, residual_rating);

create index if not exists risks_department_owner_idx
on public.risks (department, owner);

create index if not exists risks_next_review_due_idx
on public.risks (next_review_due);

create index if not exists risks_created_at_idx
on public.risks (created_at desc);

create index if not exists risks_response_status_idx
on public.risks (response_status);

create index if not exists risks_target_response_date_idx
on public.risks (target_response_date);

create index if not exists risks_project_phase_idx
on public.risks (project_phase);
