create table if not exists public.asset_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  maintenance_number text,
  maintenance_date date,
  maintenance_type text,
  carried_out_by text,
  action_required boolean default false,
  description text,
  next_maintenance_due date,
  file_name text,
  file_path text,
  created_at timestamptz default now()
);

alter table public.asset_maintenance_records
add column if not exists maintenance_number text,
add column if not exists action_required boolean default false;

create index if not exists asset_maintenance_records_asset_id_idx
  on public.asset_maintenance_records(asset_id);
