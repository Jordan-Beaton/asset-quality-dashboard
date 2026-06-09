create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  role text,
  department text,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.people
add column if not exists email text;

create index if not exists people_active_department_name_idx
  on public.people(active, department, name);

alter table public.people enable row level security;

drop policy if exists "people_select_all" on public.people;
drop policy if exists "people_insert_all" on public.people;
drop policy if exists "people_update_all" on public.people;
drop policy if exists "people_delete_all" on public.people;

create policy "people_select_all"
on public.people
for select
to authenticated
using (true);

create policy "people_insert_all"
on public.people
for insert
to authenticated
with check (true);

create policy "people_update_all"
on public.people
for update
to authenticated
using (true)
with check (true);

create policy "people_delete_all"
on public.people
for delete
to authenticated
using (true);

insert into public.people (name, role, department, active, created_at)
select
  ap.name,
  ap.role,
  'Assets',
  ap.active,
  ap.created_at
from public.asset_people ap
where not exists (
  select 1
  from public.people p
  where lower(p.name) = lower(ap.name)
    and coalesce(lower(p.role), '') = coalesce(lower(ap.role), '')
    and coalesce(lower(p.department), '') = 'assets'
);
