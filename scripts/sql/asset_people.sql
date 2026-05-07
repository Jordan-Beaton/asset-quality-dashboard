create table if not exists public.asset_people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists asset_people_active_idx
  on public.asset_people(active, name);
