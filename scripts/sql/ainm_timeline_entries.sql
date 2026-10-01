-- Timeline of Events: an addable/removable list of timestamped entries on the
-- AINM record (Part 1), shown in the form and included in generated reports.
alter table public.hse_ainm_records
add column if not exists timeline_entries jsonb not null default '[]'::jsonb;
