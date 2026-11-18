-- One list of projects for the whole IMS.
--
-- Project Management, MOC numbering, the project workspace and the client MOC report all read the same list, so an
-- admin adds a project once (Project Management > Projects > Add project) and nothing else needs setting up.
--
-- This script:
--   * gives each project in Admin "Projects / Vessels / Sites" a stable key (used in addresses and records)
--   * stores each project's optional MOC parts with its MOC numbering series (moc_series.parts)
--   * makes MOC prefixes unique
--   * adds the two existing projects, Wadden Sea and Baltic Power (MOC prefix BAL)
--
-- Safe to run more than once. Run scripts/sql/moc_project_series.sql first if it has not been applied.

alter table public.ims_reference_projects add column if not exists project_key text;

create unique index if not exists ims_reference_projects_key_idx
  on public.ims_reference_projects (lower(project_key))
  where project_key is not null;

alter table public.moc_series add column if not exists parts text[] not null default '{}';

-- A prefix identifies the numbering series in every MOC number, so two series can never share one.
create unique index if not exists moc_series_prefix_idx on public.moc_series (upper(prefix));

insert into public.ims_reference_projects (name, type, active, project_key)
values ('Wadden Sea', 'Project', true, 'wadden-sea'), ('Baltic Power', 'Project', true, 'baltic-power')
on conflict (name) do update
  set project_key = coalesce(public.ims_reference_projects.project_key, excluded.project_key),
      type = 'Project';

update public.moc_series set parts = '{BA3,LW2,LW4}' where series_key = 'wadden-sea' and parts = '{}';

insert into public.moc_series (series_key, label, prefix, project_key, last_number, parts)
values ('baltic-power', 'Baltic Power', 'BAL', 'baltic-power', 0, '{}')
on conflict (series_key) do nothing;
