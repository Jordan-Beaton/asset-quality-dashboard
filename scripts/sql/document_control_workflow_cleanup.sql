alter table public.documents
add column if not exists workflow_status text default 'Draft';

alter table public.documents
add column if not exists workflow_reviewer_name text;

alter table public.documents
add column if not exists workflow_reviewer_email text;

alter table public.documents
add column if not exists workflow_approver_name text;

alter table public.documents
add column if not exists workflow_approver_email text;

update public.documents
set workflow_status = case
  when lower(coalesce(status, '')) in ('superseded') then 'Superseded'
  when lower(coalesce(status, '')) in ('archived', 'obsolete') then 'Archived'
  when lower(coalesce(review_approval_status, '')) = 'approved' then 'Approved'
  when lower(coalesce(review_approval_status, '')) = 'reviewed' then 'Reviewed'
  when lower(coalesce(review_approval_status, '')) = 'pending review' then 'Pending Review'
  when lower(coalesce(review_approval_status, '')) = 'rejected' then 'Rejected'
  when lower(coalesce(status, '')) in ('live', 'approved') then 'Approved'
  when lower(coalesce(status, '')) = 'under review' then 'Pending Review'
  else 'Draft'
end
where workflow_status is null
   or workflow_status = ''
   or workflow_status not in ('Draft', 'Pending Review', 'Reviewed', 'Pending Approval', 'Approved', 'Rejected', 'Superseded', 'Archived');

update public.documents
set workflow_reviewer_name = coalesce(workflow_reviewer_name, reviewed_by),
    workflow_approver_name = coalesce(workflow_approver_name, approved_by)
where workflow_reviewer_name is null
   or workflow_approver_name is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'reviewer_email'
  ) then
    execute '
      update public.documents
      set workflow_reviewer_email = coalesce(workflow_reviewer_email, reviewer_email)
      where workflow_reviewer_email is null
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'approver_email'
  ) then
    execute '
      update public.documents
      set workflow_approver_email = coalesce(workflow_approver_email, approver_email)
      where workflow_approver_email is null
    ';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_workflow_status_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
    add constraint documents_workflow_status_check
    check (workflow_status in ('Draft', 'Pending Review', 'Reviewed', 'Pending Approval', 'Approved', 'Rejected', 'Superseded', 'Archived'));
  end if;
end $$;

create table if not exists public.document_workflow_activity (
  id uuid primary key default gen_random_uuid(),
  document_id uuid,
  document_number text,
  document_title text,
  action text not null,
  from_status text,
  to_status text,
  actor_name text,
  actor_email text,
  note text,
  created_at timestamptz default now()
);

create index if not exists document_workflow_activity_document_id_idx
on public.document_workflow_activity (document_id);

create index if not exists document_workflow_activity_created_at_idx
on public.document_workflow_activity (created_at desc);

alter table public.document_workflow_activity enable row level security;

drop policy if exists "document_workflow_activity_select_authenticated" on public.document_workflow_activity;
drop policy if exists "document_workflow_activity_insert_authenticated" on public.document_workflow_activity;

create policy "document_workflow_activity_select_authenticated"
on public.document_workflow_activity for select
to authenticated
using (true);

create policy "document_workflow_activity_insert_authenticated"
on public.document_workflow_activity for insert
to authenticated
with check (true);

create table if not exists public.document_workflow_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  document_id uuid not null,
  document_number text,
  document_title text,
  action text not null,
  intended_name text,
  intended_email text not null,
  from_status text,
  to_status text,
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists document_workflow_tokens_document_id_idx
on public.document_workflow_tokens (document_id);

create index if not exists document_workflow_tokens_token_idx
on public.document_workflow_tokens (token);

alter table public.document_workflow_tokens enable row level security;

drop policy if exists "document_workflow_tokens_service_only" on public.document_workflow_tokens;

create policy "document_workflow_tokens_service_only"
on public.document_workflow_tokens
for all
using (false)
with check (false);

create or replace function public.set_document_next_review_on_approval()
returns trigger
language plpgsql
as $$
begin
  if new.workflow_status = 'Approved'
     and (
       old.workflow_status is distinct from new.workflow_status
       or old.approved_at is distinct from new.approved_at
       or old.review_cycle_years is distinct from new.review_cycle_years
     ) then
    new.next_review_date :=
      (coalesce(new.approved_at::date, current_date)
       + make_interval(years => coalesce(new.review_cycle_years, 1)))::date;
  end if;

  return new;
end;
$$;

drop trigger if exists documents_set_next_review_on_approval on public.documents;

create trigger documents_set_next_review_on_approval
before update on public.documents
for each row
execute function public.set_document_next_review_on_approval();
