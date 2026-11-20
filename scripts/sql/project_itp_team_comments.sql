-- ITP team comments: lets the Gate 1 reviewer share an ITP revision with colleagues for comments before deciding.
-- Run once in the Supabase SQL editor, after project_itp_stage_gate.sql. Safe to run again.
--
-- What it does
--   1. Creates project_itp_comment_requests: one row per person asked to comment on a revision
--      (who, due date, a note from the reviewer, Waiting or Finished, and reminder tracking).
--   2. Lets signed-in users read it. Only the IMS server writes it (no insert, update or delete policy),
--      the same as the other stage-gate tables.
-- It changes nothing that already exists and sends no emails.

create table if not exists public.project_itp_comment_requests (
  id uuid primary key default gen_random_uuid(),
  itp_id uuid not null references public.project_itps(id) on delete cascade,
  revision_id uuid not null references public.project_itp_revisions(id) on delete cascade,
  project_key text not null,
  person_name text not null,
  person_email text not null,
  requested_by_name text,
  requested_by_email text,
  due_date date,
  note text,
  status text not null default 'Waiting' check (status in ('Waiting', 'Finished', 'Closed')),
  finished_at timestamptz,
  no_comments boolean not null default false,
  reminder_count integer not null default 0,
  last_reminded_on date,
  created_at timestamptz not null default now()
);

create unique index if not exists project_itp_comment_requests_person_idx
  on public.project_itp_comment_requests (revision_id, lower(person_email));
create index if not exists project_itp_comment_requests_itp_idx
  on public.project_itp_comment_requests (itp_id, created_at);

alter table public.project_itp_comment_requests enable row level security;
drop policy if exists project_itp_comment_requests_select on public.project_itp_comment_requests;
create policy project_itp_comment_requests_select on public.project_itp_comment_requests for select to authenticated using (true);
