-- ITP stage gate: Gate 1 (reviewer) then Gate 2 (approver), with an activity trail and a comments log.
-- Run once in the Supabase SQL editor. It is safe to run again: every step checks before it changes anything.
--
-- What it does
--   1. Adds the stage-gate columns to project_itp_revisions (one gate record per revision).
--   2. Creates project_itp_activity (who did what, when, and which emails went out) and project_itp_comments.
--   3. Locks the gate columns so only the IMS server can change them. Signed-in users can read everything,
--      but cannot approve an ITP by writing to the table directly.
--   4. Carries the existing register over:
--        - ITPs already Approved stay Approved and are marked "approved before the stage gate".
--        - ITPs with comments issued go to "With Supplier".
--        - Every other ITP enters Gate 1 (Awaiting Review) with its current reviewer matched to People.
--      No emails are sent by this script. Nobody is told anything until someone acts on an ITP.

create extension if not exists pgcrypto;

-- 1. Gate columns -------------------------------------------------------------------------------------------------

alter table public.project_itp_revisions
  add column if not exists workflow_state text not null default 'Awaiting Review',
  add column if not exists reviewer_name text,
  add column if not exists reviewer_email text,
  add column if not exists approver_name text,
  add column if not exists approver_email text,
  add column if not exists notify_list jsonb not null default '[]'::jsonb,
  add column if not exists uploader_name text,
  add column if not exists uploader_email text,
  add column if not exists gate_opened_at timestamptz,
  add column if not exists gate_due_date date,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_name text,
  add column if not exists reviewed_by_email text,
  add column if not exists review_outcome text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_name text,
  add column if not exists approved_by_email text,
  add column if not exists approval_outcome text,
  add column if not exists legacy_approved boolean not null default false,
  add column if not exists due_reminder_sent boolean not null default false,
  add column if not exists overdue_reminder_count integer not null default 0,
  add column if not exists last_reminder_on date,
  add column if not exists workflow_migrated_at timestamptz;

alter table public.project_itp_revisions drop constraint if exists project_itp_revisions_workflow_state_check;
alter table public.project_itp_revisions add constraint project_itp_revisions_workflow_state_check
  check (workflow_state in ('Awaiting Review', 'Awaiting Approval', 'With Supplier', 'Approved'));

create index if not exists project_itp_revisions_workflow_idx
  on public.project_itp_revisions (workflow_state) where is_current;

-- Three working days (Monday to Friday) from a date.
create or replace function public.itp_add_working_days(start_date date, days integer)
returns date
language plpgsql
immutable
as $$
declare
  result date := start_date;
  counted integer := 0;
begin
  while counted < days loop
    result := result + 1;
    if extract(isodow from result) < 6 then counted := counted + 1; end if;
  end loop;
  return result;
end;
$$;

-- 2. Activity trail and comments ----------------------------------------------------------------------------------

create table if not exists public.project_itp_activity (
  id uuid primary key default gen_random_uuid(),
  itp_id uuid not null references public.project_itps(id) on delete cascade,
  revision_id uuid references public.project_itp_revisions(id) on delete cascade,
  project_key text not null,
  kind text not null,
  actor_name text,
  actor_email text,
  summary text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists project_itp_activity_itp_idx on public.project_itp_activity (itp_id, created_at);

create table if not exists public.project_itp_comments (
  id uuid primary key default gen_random_uuid(),
  itp_id uuid not null references public.project_itps(id) on delete cascade,
  revision_id uuid not null references public.project_itp_revisions(id) on delete cascade,
  project_key text not null,
  kind text not null check (kind in ('Review note', 'Approval note', 'Supplier comment', 'General')),
  ref text,
  body text not null,
  author_name text,
  author_email text,
  status text check (status in ('Open', 'Closed')),
  closed_by_name text,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists project_itp_comments_itp_idx on public.project_itp_comments (itp_id, created_at);

-- Signed-in users can read both tables. Nobody but the server writes them (no insert, update or delete policy).
alter table public.project_itp_activity enable row level security;
alter table public.project_itp_comments enable row level security;
drop policy if exists project_itp_activity_select on public.project_itp_activity;
create policy project_itp_activity_select on public.project_itp_activity for select to authenticated using (true);
drop policy if exists project_itp_comments_select on public.project_itp_comments;
create policy project_itp_comments_select on public.project_itp_comments for select to authenticated using (true);

-- 3. Lock the gate columns to the server ---------------------------------------------------------------------------
-- The existing register policy lets signed-in users write project_itp_revisions. This trigger keeps that working for
-- ordinary fields (revision, dates, supersede flags) but refuses any change to the gate columns unless it comes from
-- the server or the SQL editor. A new row inserted from the browser always starts at Gate 1 with nothing decided.

create or replace function public.itp_protect_workflow_columns()
returns trigger
language plpgsql
as $$
declare
  api_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  );
begin
  -- No API role means a direct database session (SQL editor, migration). service_role is the IMS server.
  if api_role is null or api_role = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.workflow_state := 'Awaiting Review';
    new.reviewer_name := null; new.reviewer_email := null;
    new.approver_name := null; new.approver_email := null;
    new.notify_list := '[]'::jsonb;
    new.uploader_name := null; new.uploader_email := null;
    new.gate_opened_at := null; new.gate_due_date := null;
    new.reviewed_at := null; new.reviewed_by_name := null; new.reviewed_by_email := null; new.review_outcome := null;
    new.approved_at := null; new.approved_by_name := null; new.approved_by_email := null; new.approval_outcome := null;
    new.legacy_approved := false;
    new.due_reminder_sent := false; new.overdue_reminder_count := 0; new.last_reminder_on := null;
    new.workflow_migrated_at := now();
    new.enshore_decision := 'Pending Review'; new.enshore_reviewed_at := null;
    return new;
  end if;

  if (new.workflow_state, new.reviewer_name, new.reviewer_email, new.approver_name, new.approver_email, new.notify_list,
      new.uploader_name, new.uploader_email, new.gate_opened_at, new.gate_due_date, new.reviewed_at, new.reviewed_by_name,
      new.reviewed_by_email, new.review_outcome, new.approved_at, new.approved_by_name, new.approved_by_email,
      new.approval_outcome, new.legacy_approved, new.due_reminder_sent, new.overdue_reminder_count, new.last_reminder_on,
      new.enshore_decision, new.enshore_reviewed_at)
     is distinct from
     (old.workflow_state, old.reviewer_name, old.reviewer_email, old.approver_name, old.approver_email, old.notify_list,
      old.uploader_name, old.uploader_email, old.gate_opened_at, old.gate_due_date, old.reviewed_at, old.reviewed_by_name,
      old.reviewed_by_email, old.review_outcome, old.approved_at, old.approved_by_name, old.approved_by_email,
      old.approval_outcome, old.legacy_approved, old.due_reminder_sent, old.overdue_reminder_count, old.last_reminder_on,
      old.enshore_decision, old.enshore_reviewed_at) then
    raise exception 'ITP review and approval can only be changed through the stage gate in the IMS.';
  end if;

  return new;
end;
$$;

drop trigger if exists project_itp_protect_workflow on public.project_itp_revisions;
create trigger project_itp_protect_workflow
  before insert or update on public.project_itp_revisions
  for each row execute function public.itp_protect_workflow_columns();

-- 4. Carry the existing register over (runs once per revision) -------------------------------------------------------
-- workflow_migrated_at is empty for every existing row, so only they are touched. Rows created from now on are stamped
-- automatically (default below), which makes re-running this script harmless.

with src as (
  select r.id,
         r.is_current,
         r.enshore_decision,
         r.enshore_reviewed_at,
         r.uploaded_at,
         i.overall_stage,
         i.overall_status,
         (r.enshore_decision = 'Approved' or (r.is_current and i.overall_stage = 'Enshore Approved')) as was_approved
  from public.project_itp_revisions r
  join public.project_itps i on i.id = r.itp_id
  where r.workflow_migrated_at is null
)
update public.project_itp_revisions r
set workflow_state = case
      when s.was_approved then 'Approved'
      when not s.is_current then 'With Supplier'
      when s.enshore_decision in ('Comments Issued', 'Rejected') or s.overall_status in ('Comments Issued', 'Comments Only', 'Rejected') then 'With Supplier'
      else 'Awaiting Review'
    end,
    legacy_approved = s.was_approved,
    approved_at = case when s.was_approved then coalesce(s.enshore_reviewed_at::timestamptz, s.uploaded_at) end,
    approval_outcome = case when s.was_approved then 'Approved' end,
    gate_opened_at = case
      when s.is_current and not s.was_approved
        and not (s.enshore_decision in ('Comments Issued', 'Rejected') or s.overall_status in ('Comments Issued', 'Comments Only', 'Rejected'))
      then now() end,
    gate_due_date = case
      when s.is_current and not s.was_approved
        and not (s.enshore_decision in ('Comments Issued', 'Rejected') or s.overall_status in ('Comments Issued', 'Comments Only', 'Rejected'))
      then public.itp_add_working_days(current_date, 3) end
from src s
where s.id = r.id;

-- The reviewer already typed on the ITP, matched to People by name (the first name if several were typed with "/").
update public.project_itp_revisions r
set reviewer_name = p.name,
    reviewer_email = lower(p.email)
from public.project_itps i, public.people p
where i.id = r.itp_id
  and r.workflow_migrated_at is null
  and r.is_current
  and r.workflow_state in ('Awaiting Review', 'With Supplier')
  and p.active
  and p.email is not null
  and lower(p.name) = lower(trim(split_part(coalesce(i.enshore_reviewer, ''), '/', 1)));

-- Nobody to review it yet, so the clock has not really started: no due date until a reviewer is chosen.
update public.project_itp_revisions
set gate_due_date = null
where workflow_migrated_at is null
  and is_current
  and workflow_state = 'Awaiting Review'
  and reviewer_email is null;

-- Who uploaded it, from the sign-in that uploaded the file.
update public.project_itp_revisions r
set uploader_email = lower(u.email),
    uploader_name = coalesce(p.name, u.email)
from auth.users u
left join public.people p on lower(p.email) = lower(u.email)
where r.workflow_migrated_at is null
  and r.uploaded_by = u.id;

-- A first line in each ITP's trail explaining where it started.
insert into public.project_itp_activity (itp_id, revision_id, project_key, kind, summary, detail)
select r.itp_id, r.id, i.project_key, 'legacy',
       case r.workflow_state
         when 'Approved' then 'Approved before the stage gate was introduced'
         when 'With Supplier' then 'Carried into the stage gate: with the supplier'
         else 'Carried into the stage gate: awaiting review'
       end,
       case r.workflow_state
         when 'Approved' then 'No reviewer or approver names were recorded for this approval, so none are shown.'
         when 'With Supplier' then 'Comments had already been issued. A new revision restarts the review at Gate 1.'
         else 'No emails were sent. The reviewer and approver can be confirmed on the ITP record.'
       end
from public.project_itp_revisions r
join public.project_itps i on i.id = r.itp_id
where r.workflow_migrated_at is null
  and r.is_current;

-- Keep the register summary fields (used by the project dashboards) in step for ITPs that now sit at Gate 1.
update public.project_itps i
set overall_stage = 'Enshore Review',
    overall_status = 'Pending Review',
    next_action = 'Complete Enshore review',
    due_date = r.gate_due_date,
    updated_at = now()
from public.project_itp_revisions r
where r.itp_id = i.id
  and r.is_current
  and r.workflow_migrated_at is null
  and r.workflow_state = 'Awaiting Review';

-- Stamp everything that was just carried over, and stamp every future row automatically.
update public.project_itp_revisions set workflow_migrated_at = now() where workflow_migrated_at is null;
alter table public.project_itp_revisions alter column workflow_migrated_at set default now();
