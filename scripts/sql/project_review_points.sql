-- ITP Review Points tracker.
-- Run once in the Supabase SQL editor.
--
-- Review points are the R and A (review / approval) marks in the Enshore column of an ITP.
-- Each has a simple Pending / Accepted / Failed decision with a digital sign-off. Decisions are
-- only written by the server (service role), which checks the signer list below, so a browser
-- can read these tables but not change a decision directly.

create table if not exists public.project_review_points (
  id uuid primary key default gen_random_uuid(),
  project_key text not null,
  itp_id uuid not null references public.project_itps(id) on delete cascade,
  revision_id uuid not null references public.project_itp_revisions(id) on delete cascade,
  section_number text not null,
  activity_description text not null,
  code text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Failed')),
  reviewer text,
  target_date date,
  decided_by text,
  decided_by_email text,
  decided_by_user_id uuid,
  decided_at timestamptz,
  decision_note text,
  source_location text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (revision_id, section_number, code, activity_description)
);

create index if not exists project_review_points_project_idx on public.project_review_points (project_key, status);
create index if not exists project_review_points_itp_idx on public.project_review_points (itp_id);

-- Every change to a review point: who, what and when. Never edited or deleted.
create table if not exists public.project_review_point_events (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.project_review_points(id) on delete cascade,
  event_type text not null check (event_type in ('added', 'assigned', 'accepted', 'failed', 'reopened')),
  actor_name text,
  actor_email text,
  actor_user_id uuid,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists project_review_point_events_point_idx on public.project_review_point_events (point_id, created_at);

-- Who may accept or fail a review point (matched on the IMS login email).
create table if not exists public.project_review_signers (
  email text primary key,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.project_review_signers (email, name) values
  ('jbeaton@enshoresubsea.com', 'Jordan Beaton'),
  ('lharvey@enshoresubsea.com', 'Louise Harvey')
on conflict (email) do nothing;

alter table public.project_review_points enable row level security;
alter table public.project_review_point_events enable row level security;
alter table public.project_review_signers enable row level security;

-- Signed-in users can read. All writes go through the server.
drop policy if exists "project_review_points_select_authenticated" on public.project_review_points;
create policy "project_review_points_select_authenticated"
on public.project_review_points for select to authenticated using (true);

drop policy if exists "project_review_point_events_select_authenticated" on public.project_review_point_events;
create policy "project_review_point_events_select_authenticated"
on public.project_review_point_events for select to authenticated using (true);

drop policy if exists "project_review_signers_select_authenticated" on public.project_review_signers;
create policy "project_review_signers_select_authenticated"
on public.project_review_signers for select to authenticated using (true);
