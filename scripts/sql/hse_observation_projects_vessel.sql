-- Observation Cards: project list and Vessel / Worksite field.
-- Run once in the Supabase SQL editor before relying on the new fields.

-- 1. Free-text Vessel / Worksite on each observation card.
alter table public.hse_observations add column if not exists vessel_worksite text;

-- 2. Projects added by signed-in users with the "+" button on the observation form.
--    (The standard projects are fixed in code and do not need rows here.)
create table if not exists public.hse_observation_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists hse_observation_projects_name_key
  on public.hse_observation_projects (lower(name));

-- Read and written only through the server (service role); no direct access from the browser.
alter table public.hse_observation_projects enable row level security;
