-- MOC project numbering.
--
-- Every MOC belongs to a numbering series. Company-wide MOCs use the ENS series (ENS-MOC-001...) and each project
-- has its own gap-free series with its own prefix (Wadden Sea / Nexans: NEX-MOC-001...). The database allocates
-- the next number when a MOC is inserted, so two people creating a MOC at the same moment cannot receive the same one.
--
-- Safe to run more than once. It renames the one existing company MOC (MOC-001) to ENS-MOC-001 and changes nothing else
-- about it.

create extension if not exists pgcrypto;

create table if not exists public.moc_series (
  series_key text primary key,
  label text not null,
  prefix text not null,
  project_key text,
  last_number integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.moc_series enable row level security;
drop policy if exists moc_series_read on public.moc_series;
create policy moc_series_read on public.moc_series for select to authenticated using (true);
-- No insert/update/delete policy: counters change only through the trigger below (security definer) or the service role.

insert into public.moc_series (series_key, label, prefix, project_key, last_number)
values
  ('ens', 'Enshore (company-wide)', 'ENS', null, 0),
  ('wadden-sea', 'Wadden Sea', 'NEX', 'wadden-sea', 0)
on conflict (series_key) do nothing;

alter table public.moc_reports add column if not exists series_key text references public.moc_series(series_key);
alter table public.moc_reports add column if not exists series_number integer;
alter table public.moc_reports add column if not exists project_key text;
alter table public.moc_reports add column if not exists applies_to text[] not null default '{}';
alter table public.moc_reports add column if not exists client_reference text;
alter table public.moc_reports add column if not exists implementation_from date;
alter table public.moc_reports add column if not exists implementation_to date;
alter table public.moc_reports add column if not exists next_step text;
alter table public.moc_reports add column if not exists next_step_owner text;
alter table public.moc_reports add column if not exists next_step_due date;
alter table public.moc_reports add column if not exists report_notes text;
alter table public.moc_reports add column if not exists status_to_confirm boolean not null default false;

create unique index if not exists moc_reports_series_number_idx
  on public.moc_reports (series_key, series_number) where series_key is not null;
create index if not exists moc_reports_project_key_idx on public.moc_reports (project_key);

-- Allocation. A new row without a series_number takes the next one; a row that arrives with a series_number
-- (an import keeping the numbers the client already holds) keeps it and the counter moves up if needed.
create or replace function public.moc_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  series_row public.moc_series%rowtype;
begin
  if new.series_key is null then
    return new;
  end if;

  if new.series_number is null then
    update public.moc_series
       set last_number = last_number + 1
     where series_key = new.series_key
     returning * into series_row;
    if not found then
      raise exception 'Unknown MOC series %', new.series_key;
    end if;
    new.series_number := series_row.last_number;
  else
    update public.moc_series
       set last_number = greatest(last_number, new.series_number)
     where series_key = new.series_key
     returning * into series_row;
    if not found then
      raise exception 'Unknown MOC series %', new.series_key;
    end if;
  end if;

  new.moc_report_no := series_row.prefix || '-MOC-' || lpad(new.series_number::text, 3, '0');
  if new.project_key is null then
    new.project_key := series_row.project_key;
  end if;
  return new;
end;
$$;

drop trigger if exists moc_assign_number_trigger on public.moc_reports;
create trigger moc_assign_number_trigger
  before insert on public.moc_reports
  for each row execute function public.moc_assign_number();

-- A series number never changes after it is issued.
create or replace function public.moc_lock_number()
returns trigger
language plpgsql
as $$
begin
  if old.series_key is not null and (new.series_key is distinct from old.series_key or new.series_number is distinct from old.series_number) then
    raise exception 'The MOC number % cannot be changed once issued', old.moc_report_no;
  end if;
  if old.series_key is not null then
    new.moc_report_no := old.moc_report_no;
  end if;
  return new;
end;
$$;

drop trigger if exists moc_lock_number_trigger on public.moc_reports;
create trigger moc_lock_number_trigger
  before update on public.moc_reports
  for each row execute function public.moc_lock_number();

-- If the newest number is deleted straight away (for example the Create MOC flow rolls back a failed save),
-- hand it back so the sequence has no hole.
create or replace function public.moc_release_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.series_key is not null and old.series_number is not null then
    update public.moc_series
       set last_number = old.series_number - 1
     where series_key = old.series_key and last_number = old.series_number;
  end if;
  return old;
end;
$$;

drop trigger if exists moc_release_number_trigger on public.moc_reports;
create trigger moc_release_number_trigger
  after delete on public.moc_reports
  for each row execute function public.moc_release_number();

-- The existing company MOC becomes ENS-MOC-001. Nothing else about it changes.
-- (Run the lock trigger out of the way for this one rename.)
alter table public.moc_reports disable trigger moc_lock_number_trigger;
update public.moc_reports
   set series_key = 'ens', series_number = 1, moc_report_no = 'ENS-MOC-001'
 where moc_report_no = 'MOC-001' and series_key is null;
alter table public.moc_reports enable trigger moc_lock_number_trigger;

update public.moc_series set last_number = greatest(last_number, 1) where series_key = 'ens';

-- Central Actions that were raised from that MOC carry its number as text.
update public.actions set linked_moc_number = 'ENS-MOC-001' where linked_moc_number = 'MOC-001';
