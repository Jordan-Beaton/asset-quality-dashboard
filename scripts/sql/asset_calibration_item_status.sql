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
