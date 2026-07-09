alter table public.asset_calibration_records
  add column if not exists item_status text default 'In Use';

update public.asset_calibration_records
set item_status = 'Missing / Lost'
where item_status in ('Missing', 'Lost');

update public.asset_calibration_records
set item_status = 'In Use'
where item_status is null;

alter table public.asset_calibration_records
  alter column item_status set default 'In Use';

alter table public.asset_calibration_records
  alter column item_status set not null;

alter table public.asset_calibration_records
  drop constraint if exists asset_calibration_records_item_status_check;

alter table public.asset_calibration_records
  add constraint asset_calibration_records_item_status_check
  check (item_status in ('In Use', 'Not In Use', 'Damaged', 'Missing / Lost', 'Historic'));

create table if not exists public.asset_calibration_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.asset_calibration_suppliers (name, active)
values
  ('PASS Ltd', true),
  ('Northern Balance', true)
on conflict (name) do update
set active = excluded.active;

alter table public.asset_calibration_suppliers enable row level security;

drop policy if exists asset_calibration_suppliers_select on public.asset_calibration_suppliers;
create policy asset_calibration_suppliers_select
  on public.asset_calibration_suppliers
  for select
  using (true);

drop policy if exists asset_calibration_suppliers_insert on public.asset_calibration_suppliers;
create policy asset_calibration_suppliers_insert
  on public.asset_calibration_suppliers
  for insert
  with check (true);

drop policy if exists asset_calibration_suppliers_update on public.asset_calibration_suppliers;
create policy asset_calibration_suppliers_update
  on public.asset_calibration_suppliers
  for update
  using (true)
  with check (true);

create table if not exists public.asset_calibration_status_log (
  id uuid primary key default gen_random_uuid(),
  calibration_record_id uuid not null references public.asset_calibration_records(id) on delete cascade,
  item_status_from text,
  item_status_to text not null,
  reason text,
  created_by text,
  created_at timestamptz not null default now(),
  constraint asset_calibration_status_log_from_check
    check (item_status_from is null or item_status_from in ('In Use', 'Not In Use', 'Damaged', 'Missing / Lost', 'Historic')),
  constraint asset_calibration_status_log_to_check
    check (item_status_to in ('In Use', 'Not In Use', 'Damaged', 'Missing / Lost', 'Historic'))
);

create index if not exists asset_calibration_status_log_record_idx
  on public.asset_calibration_status_log (calibration_record_id, created_at desc);

alter table public.asset_calibration_status_log enable row level security;

drop policy if exists asset_calibration_status_log_select on public.asset_calibration_status_log;
create policy asset_calibration_status_log_select
  on public.asset_calibration_status_log
  for select
  using (true);

drop policy if exists asset_calibration_status_log_insert on public.asset_calibration_status_log;
create policy asset_calibration_status_log_insert
  on public.asset_calibration_status_log
  for insert
  with check (true);
