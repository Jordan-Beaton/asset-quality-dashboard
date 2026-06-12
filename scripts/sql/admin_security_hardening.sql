-- Admin / Settings security hardening
-- Run after removing any duplicate non-blank people.email values.

alter table public.ims_audit_log
add column if not exists previous_values jsonb,
add column if not exists new_values jsonb;

create index if not exists ims_audit_log_action_created_idx
  on public.ims_audit_log(action_type, created_at desc);

update public.people
set
  access_status = 'Deactivated',
  active = false
where active = false
  and coalesce(access_status, '') <> 'Deactivated';

update public.people
set active = false
where lower(coalesce(access_status, '')) = 'deactivated'
  and active is distinct from false;

do $$
declare
  duplicate_count integer;
begin
  select count(*)
  into duplicate_count
  from (
    select lower(trim(email)) as clean_email
    from public.people
    where email is not null
      and trim(email) <> ''
    group by lower(trim(email))
    having count(*) > 1
  ) duplicates;

  if duplicate_count > 0 then
    raise exception 'Duplicate people.email values exist. Remove/merge duplicates before creating the unique email index.';
  end if;
end $$;

create unique index if not exists people_email_unique_clean_idx
  on public.people (lower(trim(email)))
  where email is not null
    and trim(email) <> '';

